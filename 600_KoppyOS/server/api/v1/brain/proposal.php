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
    (string) (
        $payload['content']
        ?? ''
    );

$reason =
    trim(
        (string) (
            $payload['reason']
            ?? ''
        )
    );

if ($targetPath === '') {
    respondError(
        'target_path is required.',
        422
    );
}

if (
    str_starts_with($targetPath, '/')
    || str_contains($targetPath, '..')
    || str_contains($targetPath, "\0")
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
        'operation must be append, replace, or create.',
        422
    );
}

if (trim($content) === '') {
    respondError(
        'content is required.',
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
    . $createdAt
    . '|'
    . bin2hex(random_bytes(8));

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
    'id' => $proposalId,
    'status' => 'awaiting_approval',
    'target_path' => $targetPath,
    'operation' => $operation,
    'content' => $content,
    'reason' => $reason,
    'created_at' => $createdAt,
    'approved_at' => null,
];

/*
|--------------------------------------------------------------------------
| 非公開領域へ保存
|--------------------------------------------------------------------------
*/

$documentRoot =
    $_SERVER['DOCUMENT_ROOT'] ?? '';

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

respondSuccess([
    'proposal' => $proposal,

    'safety' => [
        'proposal_saved' => true,
        'github_write_performed' => false,
        'message' =>
            'Proposal saved. GitHub has not been modified.',
    ],
]);