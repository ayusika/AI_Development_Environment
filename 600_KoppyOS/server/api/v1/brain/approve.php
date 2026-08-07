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

$proposalId =
    trim(
        (string) (
            $payload['proposal_id']
            ?? ''
        )
    );

if (
    !preg_match(
        '/^[a-f0-9]{16}$/',
        $proposalId
    )
) {
    respondError(
        'Invalid proposal_id.',
        422
    );
}

/*
|--------------------------------------------------------------------------
| Proposal取得
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

$proposalPath =
    dirname(
        $documentRoot,
        2
    )
    . '/.koppy-private/proposals/'
    . $proposalId
    . '.json';

if (!is_file($proposalPath)) {
    respondError(
        'Proposal was not found.',
        404
    );
}

$proposalJson =
    file_get_contents(
        $proposalPath
    );

if ($proposalJson === false) {
    respondError(
        'Failed to read proposal.',
        500
    );
}

$proposal =
    json_decode(
        $proposalJson,
        true
    );

if (!is_array($proposal)) {
    respondError(
        'Proposal data is invalid.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| 承認
|
| まだGitHubには書かない。
|--------------------------------------------------------------------------
*/

if (
    ($proposal['status'] ?? '')
    !== 'awaiting_approval'
) {
    respondError(
        'Proposal is not awaiting approval.',
        409
    );
}

$proposal['status'] =
    'approved';

$proposal['approved_at'] =
    date(DATE_ATOM);

$updatedJson =
    json_encode(
        $proposal,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

if ($updatedJson === false) {
    respondError(
        'Failed to encode approved proposal.',
        500
    );
}

$result =
    file_put_contents(
        $proposalPath,
        $updatedJson,
        LOCK_EX
    );

if ($result === false) {
    respondError(
        'Failed to update proposal.',
        500
    );
}

respondSuccess([
    'proposal' => $proposal,

    'safety' => [
        'approved' => true,
        'github_write_performed' => false,
        'message' =>
            'Proposal approved. GitHub has not been modified yet.',
    ],
]);