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

$commitSha =
    strtolower(
        trim(
            (string) (
                $payload['commit_sha']
                ?? ''
            )
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
| Path safety
|--------------------------------------------------------------------------
*/

if (
    $targetPath === ''
    || str_starts_with(
        $targetPath,
        '/'
    )
    || str_contains(
        $targetPath,
        '..'
    )
    || str_contains(
        $targetPath,
        "\\"
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
| Deploy Allowlist v2
|--------------------------------------------------------------------------
|
| API:
|   600_KoppyOS/server/api/*
|
| Koppy World UI:
|   900_Lab/Web_KoppyOS_Beta/index.html
|
| UI側はディレクトリ単位では許可せず、
| index.html 1ファイルのみExact Matchで許可する。
|--------------------------------------------------------------------------
*/

$allowedApiRoot =
    '600_KoppyOS/server/api/';

$allowedUiPath =
    '900_Lab/Web_KoppyOS_Beta/index.html';

$isApiTarget =
    str_starts_with(
        $targetPath,
        $allowedApiRoot
    );

$isUiTarget =
    hash_equals(
        $allowedUiPath,
        $targetPath
    );

if (
    !$isApiTarget
    && !$isUiTarget
) {
    respondError(
        'Target path is outside the Deploy Allowlist.',
        403
    );
}

/*
|--------------------------------------------------------------------------
| Protected Files
|--------------------------------------------------------------------------
*/

$protectedFiles = [
    'config.php',
    '.env',
    '.env.local',
    '.env.production',
    'credentials.json',
    'secrets.json',
];

$targetFilename =
    basename(
        $targetPath
    );

if (
    in_array(
        $targetFilename,
        $protectedFiles,
        true
    )
) {
    respondError(
        'Protected file cannot be deployed.',
        403
    );
}

/*
|--------------------------------------------------------------------------
| Commit SHA
|--------------------------------------------------------------------------
*/

if (
    !preg_match(
        '/^[a-f0-9]{40}$/',
        $commitSha
    )
) {
    respondError(
        'Invalid commit_sha.',
        422
    );
}

/*
|--------------------------------------------------------------------------
| Server target mapping
|--------------------------------------------------------------------------
*/

$relativePath =
    null;

if ($isApiTarget) {
    $relativePath =
        substr(
            $targetPath,
            strlen(
                $allowedApiRoot
            )
        );

    if (
        $relativePath === ''
    ) {
        respondError(
            'Deploy target must be a file.',
            422
        );
    }

    $serverTarget =
        '/koppy/api/'
        . $relativePath;
} else {
    $serverTarget =
        '/koppy/index.html';
}


/*
|--------------------------------------------------------------------------
| Proposal
|--------------------------------------------------------------------------
*/

$createdAt =
    date(
        DATE_ATOM
    );

$proposalSeed =
    $targetPath
    . '|'
    . $commitSha
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

    'server_target' =>
        $serverTarget,

    'commit_sha' =>
        $commitSha,

    'reason' =>
        $reason,

    'created_at' =>
        $createdAt,

    'approved_at' =>
        null,

    'executed_at' =>
        null,

    'verification' =>
        null,

    'error' =>
        null,
];

/*
|--------------------------------------------------------------------------
| Private storage
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
    . '/deploy-proposals';

if (!is_dir($proposalDirectory)) {
    if (
        !mkdir(
            $proposalDirectory,
            0700,
            true
        )
        && !is_dir(
            $proposalDirectory
        )
    ) {
        respondError(
            'Deploy proposal directory could not be created.',
            500
        );
    }
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
        'Failed to save deploy proposal.',
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
        'deploy_performed' =>
            false,

        'message' =>
            'Deploy proposal saved. Server has not been modified.',
    ],
]);