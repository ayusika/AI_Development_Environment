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

$searchUploadId =
    trim(
        (string) (
            $payload['search_upload_id']
            ?? ''
        )
    );

$searchTotalChunks =
    $payload['search_total_chunks']
    ?? null;

$searchSha256 =
    strtolower(
        trim(
            (string) (
                $payload['search_sha256']
                ?? ''
            )
        )
    );

$replaceIsEmpty =
    ($payload['replace_is_empty'] ?? false)
    === true;

$replaceUploadId =
    trim(
        (string) (
            $payload['replace_upload_id']
            ?? ''
        )
    );

$replaceTotalChunks =
    $payload['replace_total_chunks']
    ?? null;

$replaceSha256 =
    strtolower(
        trim(
            (string) (
                $payload['replace_sha256']
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

$reason =
    trim(
        (string) (
            $payload['reason']
            ?? ''
        )
    );

/*
|--------------------------------------------------------------------------
| Validation helpers
|--------------------------------------------------------------------------
*/

function validateUploadId(
    string $uploadId
): void {
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
}

function validateTotalChunks(
    mixed $totalChunks
): void {
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
}

function validateSha256(
    string $sha256
): void {
    if (
        !preg_match(
            '/^[a-f0-9]{64}$/',
            $sha256
        )
    ) {
        respondError(
            'Invalid SHA-256.',
            422
        );
    }
}

validateUploadId(
    $searchUploadId
);

validateTotalChunks(
    $searchTotalChunks
);

validateSha256(
    $searchSha256
);

validateSha256(
    $replaceSha256
);

if (!$replaceIsEmpty) {
    validateUploadId(
        $replaceUploadId
    );

    validateTotalChunks(
        $replaceTotalChunks
    );
}


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

$uploadRoot =
    $privateRoot
    . '/proposal-uploads';

/*
|--------------------------------------------------------------------------
| Load upload session
|--------------------------------------------------------------------------
*/

function loadUploadSession(
    string $uploadRoot,
    string $uploadId,
    int $totalChunks,
    string $expectedSha256,
    bool $allowEmpty
): array {
    $uploadDirectory =
        $uploadRoot
        . '/'
        . $uploadId;

    if (!is_dir($uploadDirectory)) {
        respondError(
            'Upload session was not found.',
            404
        );
    }

    $encodedContent =
        '';

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

        if (
            $chunkData === false
            || $chunkData === ''
        ) {
            respondError(
                'Failed to read upload chunk: '
                . $chunkFilename,
                500
            );
        }

        if (
            preg_match(
                '/[^A-Za-z0-9+\/=]/',
                $chunkData
            )
        ) {
            respondError(
                'Upload chunk contains invalid Base64 characters.',
                422
            );
        }

        $encodedContent .=
            $chunkData;
    }

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

    if (
        !$allowEmpty
        && $content === ''
    ) {
        respondError(
            'Decoded content is empty.',
            422
        );
    }

    $actualSha256 =
        hash(
            'sha256',
            $content
        );

    if (
        !hash_equals(
            $expectedSha256,
            $actualSha256
        )
    ) {
        respondError(
            'SHA-256 verification failed.',
            409
        );
    }

    return [
        'content' =>
            $content,

        'encoded_length' =>
            strlen(
                $encodedContent
            ),

        'decoded_length' =>
            strlen(
                $content
            ),

        'sha256' =>
            $actualSha256,

        'directory' =>
            $uploadDirectory,

        'chunk_files' =>
            $existingChunkFiles,
    ];
}

/*
|--------------------------------------------------------------------------
| Load search and replacement
|--------------------------------------------------------------------------
*/

$searchUpload =
    loadUploadSession(
        $uploadRoot,
        $searchUploadId,
        $searchTotalChunks,
        $searchSha256,
        false
    );

if ($replaceIsEmpty) {
    $replaceWith =
        '';

    $actualReplaceSha256 =
        hash(
            'sha256',
            ''
        );

    if (
        !hash_equals(
            $replaceSha256,
            $actualReplaceSha256
        )
    ) {
        respondError(
            'Empty replacement SHA-256 verification failed.',
            409
        );
    }

    $replaceTransport = [
        'upload_id' =>
            null,

        'total_chunks' =>
            0,

        'encoded_length' =>
            0,

        'decoded_length' =>
            0,

        'sha256' =>
            $actualReplaceSha256,

        'integrity_verified' =>
            true,

        'empty_value' =>
            true,
    ];
} else {
    $replaceUpload =
        loadUploadSession(
            $uploadRoot,
            $replaceUploadId,
            $replaceTotalChunks,
            $replaceSha256,
            true
        );

    $replaceWith =
        $replaceUpload['content'];

    $replaceTransport = [
        'upload_id' =>
            $replaceUploadId,

        'total_chunks' =>
            $replaceTotalChunks,

        'encoded_length' =>
            $replaceUpload['encoded_length'],

        'decoded_length' =>
            $replaceUpload['decoded_length'],

        'sha256' =>
            $replaceUpload['sha256'],

        'integrity_verified' =>
            true,

        'empty_value' =>
            false,
    ];
}

/*
|--------------------------------------------------------------------------
| Proposal generation
|--------------------------------------------------------------------------
*/

$proposal =
    createWriterProposal(
        $targetPath,
        'patch',
        '',
        $searchUpload['content'],
        $replaceWith,
        $reason

    );

saveWriterProposal(
    $proposal
);

/*
|--------------------------------------------------------------------------
| Cleanup helper
|--------------------------------------------------------------------------
*/

function cleanupUploadSession(
    array $upload
): void {
    foreach (
        $upload['chunk_files']
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
        is_dir(
            $upload['directory']
        )
        && !rmdir(
            $upload['directory']
        )
    ) {
        respondError(
            'Proposal was saved, but upload directory cleanup failed.',
            500
        );
    }
}

cleanupUploadSession(
    $searchUpload
);

if (!$replaceIsEmpty) {
    cleanupUploadSession(
        $replaceUpload
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
        'type' =>
            'adaptive_patch',

        'search' => [
            'upload_id' =>
                $searchUploadId,

            'total_chunks' =>
                $searchTotalChunks,

            'encoded_length' =>
                $searchUpload['encoded_length'],

            'decoded_length' =>
                $searchUpload['decoded_length'],

            'sha256' =>
                $searchUpload['sha256'],

            'integrity_verified' =>
                true,
        ],

        'replace_with' =>
            $replaceTransport,

        'temporary_upload_removed' =>
            true,
    ],

    'safety' => [
        'proposal_saved' =>
            true,

        'github_write_performed' =>
            false,

        'message' =>
            'Adaptive patch upload finalized and Proposal saved. GitHub has not been modified.',
    ],
]);