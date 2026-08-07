<?php

declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

$requestMethod =
    $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($requestMethod !== 'POST') {
    respondError(
        'Method not allowed.',
        405
    );
}

$rawBody =
    file_get_contents('php://input');

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
| Payload decoding
|--------------------------------------------------------------------------
|
| Writer Payload Transport v2
|
| content / search / replace_with は、
| Browser側からBase64で送信できる。
|
| Base64はTransport用途のみ。
| Proposal内部では元のUTF-8文字列へ戻して保存する。
|--------------------------------------------------------------------------
*/

function decodeTransportValue(
    array $payload,
    string $valueKey,
    string $encodingKey
): string {
    $rawValue =
        (string) (
            $payload[$valueKey]
            ?? ''
        );

    $encoding =
        trim(
            (string) (
                $payload[$encodingKey]
                ?? ''
            )
        );

    if ($encoding === '') {
        return $rawValue;
    }

    if ($encoding !== 'base64') {
        respondError(
            'Unsupported payload encoding.',
            400
        );
    }

    $decodedValue =
        base64_decode(
            $rawValue,
            true
        );

    if ($decodedValue === false) {
        respondError(
            'Invalid Base64 payload.',
            400
        );
    }

    return $decodedValue;
}

/*
|--------------------------------------------------------------------------
| Request values
|--------------------------------------------------------------------------
*/

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

$content =
    decodeTransportValue(
        $payload,
        'content',
        'content_encoding'
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
| PATCH専用
|--------------------------------------------------------------------------
|
| search:
|   既存ファイル内で探す文字列
|
| replace_with:
|   searchと置き換える新しい文字列
|
| replace_with は空文字も許可する。
| これにより「文字列の削除」も可能。
|--------------------------------------------------------------------------
*/

$search =
    decodeTransportValue(
        $payload,
        'search',
        'search_encoding'
    );

$replaceWith =
    decodeTransportValue(
        $payload,
        'replace_with',
        'replace_with_encoding'
    );

/*
|--------------------------------------------------------------------------
| Validation
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
    'patch',
];

if (
    !in_array(
        $operation,
        $allowedOperations,
        true
    )
) {
    respondError(
        'operation must be append, replace, create, or patch.',
        422
    );
}

/*
|--------------------------------------------------------------------------
| Operation別Validation
|--------------------------------------------------------------------------
*/

if (
    in_array(
        $operation,
        [
            'append',
            'replace',
            'create',
        ],
        true
    )
    && trim($content) === ''
) {
    respondError(
        'content is required.',
        422
    );
}

if (
    $operation === 'patch'
    && $search === ''
) {
    respondError(
        'search is required for patch operation.',
        422
    );
}

/*
|--------------------------------------------------------------------------
| Proposal生成
|--------------------------------------------------------------------------
*/

$createdAt =
    date(DATE_ATOM);

$proposalSeed =
    $targetPath
    . '|'
    . $operation
    . '|'
    . $content
    . '|'
    . $search
    . '|'
    . $replaceWith
    . '|'
    . $createdAt
    . '|'
    . bin2hex(
        random_bytes(8)
    );

$proposalId =
    substr(
        hash(
            'sha256',
            $proposalSeed
        ),
        0,
        16
    );

$proposal = [
    'id' =>
        $proposalId,

    'status' =>
        'awaiting_approval',

    'target_path' =>
        $targetPath,

    'operation' =>
        $operation,

    'content' =>
        $operation === 'patch'
            ? null
            : $content,

    'search' =>
        $operation === 'patch'
            ? $search
            : null,

    'replace_with' =>
        $operation === 'patch'
            ? $replaceWith
            : null,

    'reason' =>
        $reason,

    'created_at' =>
        $createdAt,

    'approved_at' =>
        null,

    'executed_at' =>
        null,
];

/*
|--------------------------------------------------------------------------
| 非公開領域へ保存
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

$proposalDirectory =
    $privateRoot
    . '/proposals';

if (!is_dir($proposalDirectory)) {
    respondError(
        'Proposal directory was not found.',
        500
    );
}

$proposalPath =
    $proposalDirectory
    . '/'
    . $proposalId
    . '.json';

$json =
    json_encode(
        $proposal,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

if ($json === false) {
    respondError(
        'Failed to encode proposal.',
        500
    );
}

$result =
    file_put_contents(
        $proposalPath,
        $json,
        LOCK_EX
    );

if ($result === false) {
    respondError(
        'Failed to save proposal.',
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

    'safety' => [
        'proposal_saved' =>
            true,

        'github_write_performed' =>
            false,

        'message' =>
            'Proposal saved. GitHub has not been modified.',
    ],
]);