<?php

declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

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
| Private proposal path
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

$proposalPath =
    dirname(
        $documentRoot,
        2
    )
    . '/.koppy-private/deploy-proposals/'
    . $proposalId
    . '.json';

if (!is_file($proposalPath)) {
    respondError(
        'Deploy proposal was not found.',
        404
    );
}

/*
|--------------------------------------------------------------------------
| Load proposal
|--------------------------------------------------------------------------
*/

$proposalJson =
    file_get_contents(
        $proposalPath
    );

if ($proposalJson === false) {
    respondError(
        'Failed to read deploy proposal.',
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
        'Deploy proposal data is invalid.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| State validation
|--------------------------------------------------------------------------
*/

$status =
    (string) (
        $proposal['status']
        ?? ''
    );

if ($status !== 'awaiting_approval') {
    respondError(
        'Deploy proposal is not awaiting approval.',
        409
    );
}

if (
    !empty(
        $proposal['executed_at']
    )
) {
    respondError(
        'Deploy proposal has already been executed.',
        409
    );
}

/*
|--------------------------------------------------------------------------
| Approval
|--------------------------------------------------------------------------
*/

$proposal['status'] =
    'approved';

$proposal['approved_at'] =
    date(
        DATE_ATOM
    );

/*
|--------------------------------------------------------------------------
| Save
|--------------------------------------------------------------------------
*/

$json =
    json_encode(
        $proposal,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

if ($json === false) {
    respondError(
        'Failed to encode deploy proposal.',
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
        'Failed to approve deploy proposal.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| Response
|--------------------------------------------------------------------------
*/

respondSuccess([
    'deploy_proposal' =>
        $proposal,

    'safety' => [
        'approved' =>
            true,

        'deploy_performed' =>
            false,

        'message' =>
            'Deploy proposal approved. Server has not been modified.',
    ],
]);