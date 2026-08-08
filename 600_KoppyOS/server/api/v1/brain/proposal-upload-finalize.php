<?php

declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/../lib/proposal.php';

/*
|--------------------------------------------------------------------------
| POST only
|--------------------------------------------------------------------------
*/

$requestMethod =
    $_SERVER['REQUEST_METHOD']
    ?? 'GET';

if ($requestMethod !== 'POST') {
    respondError(
        'Method not allowed.',
        405
    );
}

/*
|--------------------------------------------------------------------------
| Request body
|--------------------------------------------------------------------------
*/

$rawBody =
    file_get_contents(
        'php://input'
    );

if (
    $rawBody === false
    || trim($rawBody) === ''
) {
    respondError(
        'Request body is empty.',
        400
    );
}

$payload =
    json_decode(
        $rawBody,
        true
    );

if (!is_array($payload)) {
    respondError(
        'Invalid JSON body.',
        400
    );
}

/*
|--------------------------------------------------------------------------
| Request values
|--------------------------------------------------------------------------
*/

$uploadId =
    trim(
        (string) (
            $payload['upload_id']
            ?? ''
        )
    );

$totalChunks =
    $payload['total_chunks']
    ?? null;

$contentSha256 =
    strtolower(
        trim(
            (string) (
                $payload['content_sha256']
                ?? ''
            )
        )
    );

$targetPath =
    trim(
        (string) (
            $payload['target_path']
            ?? ''
        )
    );

$operation =
    trim(
        (string) (
            $payload['operation']
            ?? ''
        )
    );

$reason =
    trim(
        (string) (
            $payload['reason']
            ?? ''
        )
    );

/*
|--------------------------------------------------------------------------
| Upload validation
|--------------------------------------------------------------------------
*/

if (
    $uploadId === ''
    || !preg_match(
        '/^[a-f0-9]{16,64}$/',
        $uploadId
    )
) {
    respondError(
        'Invalid upload_id.',
        422
    );
}

if (
    !is_int($totalChunks)
    || $totalChunks < 1
    || $totalChunks > 10000
) {
    respondError(
        'Invalid total_chunks.',
        422
    );
}

if (
    !preg_match(
        '/^[a-f0-9]{64}$/',
        $contentSha256
    )
) {
    respondError(
        'Invalid content_sha256.',
        422
    );
}

/*
|--------------------------------------------------------------------------
| Writer Proposal validation
|--------------------------------------------------------------------------
*/

if ($targetPath === '') {
    respondError(
        'target_path is required.',
        422
    );
}

if (
    str_starts_with(
        $targetPath,
        '/'
    )
    || str_contains(
        $targetPath,
        '..'
    )
    || str_contains(
        $targetPath,
        "\0"
    )
) {
    respondError(
        'Invalid target_path.',
        422
    );
}

$allowedOperations = [
    'append',
    'replace',
    'create',
];

if (
    !in_array(
        $operation,
        $allowedOperations,
        true
    )
) {
    respondError(
        'Chunk finalize currently supports append, replace, or create.',
        422
    );
}

/*
|--------------------------------------------------------------------------
| Private upload storage
|--------------------------------------------------------------------------
*/

$documentRoot =
    $_SERVER['DOCUMENT_ROOT']
    ?? '';

if ($documentRoot === '') {
    respondError(
        'DOCUMENT_ROOT is unavailable.',
        500
    );
}

$privateRoot =
    dirname(
        $documentRoot,
        2
    )
    . '/.koppy-private';

$uploadDirectory =
    $privateRoot
    . '/proposal-uploads/'
    . $uploadId;

if (!is_dir($uploadDirectory)) {
    respondError(
        'Upload session was not found.',
        404
    );
}

/*
|--------------------------------------------------------------------------
| Load every chunk
|--------------------------------------------------------------------------
|
| 000000.chunk
| 000001.chunk
| ...
|
| total_chunksで指定された全chunkが存在することを必須とする。
|--------------------------------------------------------------------------
*/

$encodedContent =
    '';

$chunkLengths =
    [];

for (
    $index = 0;
    $index < $totalChunks;
    $index++
) {
    $chunkFilename =
        sprintf(
            '%06d.chunk',
            $index
        );

    $chunkPath =
        $uploadDirectory
        . '/'
        . $chunkFilename;

    if (!is_file($chunkPath)) {
        respondError(
            'Required upload chunk is missing: '
            . $chunkFilename,
            409
        );
    }

    $chunkData =
        file_get_contents(
            $chunkPath
        );

    if ($chunkData === false) {
        respondError(
            'Failed to read upload chunk: '
            . $chunkFilename,
            500
        );
    }

    if ($chunkData === '') {
        respondError(
            'Upload chunk is empty: '
            . $chunkFilename,
            409
        );
    }

    if (
        preg_match(
            '/[^A-Za-z0-9+\/=]/',
            $chunkData
        )
    ) {
        respondError(
            'Upload chunk contains invalid Base64 characters: '
            . $chunkFilename,
            422
        );
    }

    $chunkLengths[] =
        strlen(
            $chunkData
        );

    $encodedContent .=
        $chunkData;
}

/*
|--------------------------------------------------------------------------
| Reject unexpected extra chunks
|--------------------------------------------------------------------------
|
| total_chunks外のchunkが存在する場合、
| 古いupload sessionや不整合を誤って結合しないよう拒否する。
|--------------------------------------------------------------------------
*/

$existingChunkFiles =
    glob(
        $uploadDirectory
        . '/*.chunk'
    );

if ($existingChunkFiles === false) {
    respondError(
        'Failed to inspect upload session.',
        500
    );
}

if (
    count($existingChunkFiles)
    !== $totalChunks
) {
    respondError(
        'Upload chunk count does not match total_chunks.',
        409
    );
}

/*
|--------------------------------------------------------------------------
| Base64 decode
|--------------------------------------------------------------------------
*/

$content =
    base64_decode(
        $encodedContent,
        true
    );

if ($content === false) {
    respondError(
        'Combined upload is not valid Base64.',
        422
    );
}

if (trim($content) === '') {
    respondError(
        'Decoded content is empty.',
        422
    );
}

/*
|--------------------------------------------------------------------------
| Integrity verification
|--------------------------------------------------------------------------
*/

$actualContentSha256 =
    hash(
        'sha256',
        $content
    );

if (
    !hash_equals(
        $contentSha256,
        $actualContentSha256
    )
) {
    respondError(
        'Content SHA-256 verification failed.',
        409
    );
}

/*
|--------------------------------------------------------------------------
| Proposal generation
|--------------------------------------------------------------------------
|
| 通常Writerと同じ共通helperを利用する。
|--------------------------------------------------------------------------
*/

$proposal =
    createWriterProposal(
        $targetPath,
        $operation,
        $content,
        '',
        '',
        $reason
    );

saveWriterProposal(
    $proposal
);

/*
|--------------------------------------------------------------------------
| Cleanup temporary chunks
|--------------------------------------------------------------------------
|
| Proposal保存成功後のみtemporary uploadを削除する。
|--------------------------------------------------------------------------
*/

foreach (
    $existingChunkFiles
    as $chunkPath
) {
    if (
        is_file($chunkPath)
        && !unlink($chunkPath)
    ) {
        respondError(
            'Proposal was saved, but temporary chunk cleanup failed.',
            500
        );
    }
}

if (
    is_dir($uploadDirectory)
    && !rmdir($uploadDirectory)
) {
    respondError(
        'Proposal was saved, but upload directory cleanup failed.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| Response
|--------------------------------------------------------------------------
*/

respondSuccess([
    'proposal' =>
        $proposal,

    'transport' => [
        'upload_id' =>
            $uploadId,

        'total_chunks' =>
            $totalChunks,

        'encoded_length' =>
            strlen(
                $encodedContent
            ),

        'decoded_length' =>
            strlen(
                $content
            ),

        'content_sha256' =>
            $actualContentSha256,

        'integrity_verified' =>
            true,

        'temporary_upload_removed' =>
            true,
    ],

    'safety' => [
        'proposal_saved' =>
            true,

        'github_write_performed' =>
            false,

        'message' =>
            'Chunk upload finalized and Proposal saved. GitHub has not been modified.',
    ],
]);