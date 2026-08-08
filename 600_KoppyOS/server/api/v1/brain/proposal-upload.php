<?php

declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

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
| Request Body
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
| Request Values
|--------------------------------------------------------------------------
*/

$uploadId =
    trim(
        (string) (
            $payload['upload_id']
            ?? ''
        )
    );

$chunkIndex =
    $payload['chunk_index']
    ?? null;

$chunkData =
    (string) (
        $payload['chunk_data']
        ?? ''
    );

$encoding =
    trim(
        (string) (
            $payload['encoding']
            ?? ''
        )
    );

/*
|--------------------------------------------------------------------------
| Validation
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
    !is_int($chunkIndex)
    || $chunkIndex < 0
    || $chunkIndex > 9999
) {
    respondError(
        'Invalid chunk_index.',
        422
    );
}

if ($encoding !== 'base64') {
    respondError(
        'encoding must be base64.',
        422
    );
}

if ($chunkData === '') {
    respondError(
        'chunk_data is required.',
        422
    );
}

/*
|--------------------------------------------------------------------------
| Chunk Size Limit
|--------------------------------------------------------------------------
|
| 最小実験版。
| 1リクエストにつきBase64文字列1024文字まで受け取る。
|--------------------------------------------------------------------------
*/

$chunkLength =
    strlen(
        $chunkData
    );

if ($chunkLength > 1024) {
    respondError(
        'chunk_data is too large.',
        422
    );
}

/*
|--------------------------------------------------------------------------
| Base64 Format Validation
|--------------------------------------------------------------------------
|
| このEndpointではまだdecodeしない。
|
| chunkを一時保存し、
| 将来のfinalize処理で全chunkを順番に結合してから
| Base64 decodeする。
|--------------------------------------------------------------------------
*/

if (
    preg_match(
        '/[^A-Za-z0-9+\/=]/',
        $chunkData
    )
) {
    respondError(
        'chunk_data contains invalid Base64 characters.',
        422
    );
}

/*
|--------------------------------------------------------------------------
| Private Storage
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

if (!is_dir($uploadRoot)) {
    $created =
        mkdir(
            $uploadRoot,
            0700,
            true
        );

    if (
        !$created
        && !is_dir($uploadRoot)
    ) {
        respondError(
            'Failed to create proposal upload directory.',
            500
        );
    }
}

$uploadDirectory =
    $uploadRoot
    . '/'
    . $uploadId;

if (!is_dir($uploadDirectory)) {
    $created =
        mkdir(
            $uploadDirectory,
            0700,
            true
        );

    if (
        !$created
        && !is_dir($uploadDirectory)
    ) {
        respondError(
            'Failed to create upload session directory.',
            500
        );
    }
}

/*
|--------------------------------------------------------------------------
| Save Chunk
|--------------------------------------------------------------------------
*/

$chunkFilename =
    sprintf(
        '%06d.chunk',
        $chunkIndex
    );

$chunkPath =
    $uploadDirectory
    . '/'
    . $chunkFilename;

$result =
    file_put_contents(
        $chunkPath,
        $chunkData,
        LOCK_EX
    );

if ($result === false) {
    respondError(
        'Failed to save chunk.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| Response
|--------------------------------------------------------------------------
*/

respondSuccess([
    'upload' => [
        'upload_id' =>
            $uploadId,

        'chunk_index' =>
            $chunkIndex,

        'chunk_length' =>
            $chunkLength,

        'encoding' =>
            'base64',

        'saved' =>
            true,
    ],

    'safety' => [
        'proposal_created' =>
            false,

        'github_write_performed' =>
            false,

        'message' =>
            'Chunk saved to private temporary storage. GitHub has not been modified.',
    ],
]);