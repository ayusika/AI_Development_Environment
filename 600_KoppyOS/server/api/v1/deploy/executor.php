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
| Request
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
| Roots
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

$backupDirectory =
    $privateRoot
    . '/deploy-backups';

$logDirectory =
    $privateRoot
    . '/deploy-logs';

foreach (
    [
        $proposalDirectory,
        $backupDirectory,
        $logDirectory,
    ]
    as $directory
) {
    if (
        !is_dir($directory)
        && !mkdir(
            $directory,
            0700,
            true
        )
        && !is_dir($directory)
    ) {
        respondError(
            'Deploy private directory could not be created.',
            500
        );
    }
}

/*
|--------------------------------------------------------------------------
| Proposal
|--------------------------------------------------------------------------
*/

$proposalPath =
    $proposalDirectory
    . '/'
    . $proposalId
    . '.json';

if (!is_file($proposalPath)) {
    respondError(
        'Deploy proposal was not found.',
        404
    );
}

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
| State
|--------------------------------------------------------------------------
*/

if (
    ($proposal['status'] ?? '')
    !== 'approved'
) {
    respondError(
        'Deploy proposal has not been approved.',
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
| Proposal values
|--------------------------------------------------------------------------
*/

$targetPath =
    trim(
        (string) (
            $proposal['target_path']
            ?? ''
        )
    );

$commitSha =
    strtolower(
        trim(
            (string) (
                $proposal['commit_sha']
                ?? ''
            )
        )
    );

/*
|--------------------------------------------------------------------------
| Path Safety
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
        'Invalid deploy target path.',
        422
    );
}

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
        || str_ends_with(
            $relativePath,
            '/'
        )
    ) {
        respondError(
            'Deploy target must be a file.',
            422
        );
    }
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
| Commit Binding
|--------------------------------------------------------------------------
*/

if (
    !preg_match(
        '/^[a-f0-9]{40}$/',
        $commitSha
    )
) {
    respondError(
        'Invalid commit SHA.',
        422
    );
}

/*
|--------------------------------------------------------------------------
| GitHub Config
|--------------------------------------------------------------------------
*/

$githubToken =
    trim(
        (string) (
            $config['github_token']
            ?? ''
        )
    );

if ($githubToken === '') {
    respondError(
        'GitHub token is not configured.',
        500
    );
}

$owner =
    'ayusika';

$repository =
    'AI_Development_Environment';

/*
|--------------------------------------------------------------------------
| GitHub Request
|--------------------------------------------------------------------------
*/

$encodedTargetPath =
    implode(
        '/',
        array_map(
            'rawurlencode',
            explode(
                '/',
                $targetPath
            )
        )
    );

$githubUrl =
    'https://api.github.com/repos/'
    . rawurlencode($owner)
    . '/'
    . rawurlencode($repository)
    . '/contents/'
    . $encodedTargetPath
    . '?ref='
    . rawurlencode($commitSha);

$curl =
    curl_init(
        $githubUrl
    );

if ($curl === false) {
    respondError(
        'Failed to initialize GitHub request.',
        500
    );
}

curl_setopt_array(
    $curl,
    [
        CURLOPT_RETURNTRANSFER =>
            true,

        CURLOPT_TIMEOUT =>
            30,

        CURLOPT_HTTPHEADER => [
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . $githubToken,
            'User-Agent: KoppyOS',
            'X-GitHub-Api-Version: 2022-11-28',
        ],
    ]
);

$responseBody =
    curl_exec(
        $curl
    );

$curlError =
    curl_error(
        $curl
    );

$statusCode =
    (int) curl_getinfo(
        $curl,
        CURLINFO_HTTP_CODE
    );

curl_close(
    $curl
);

if ($responseBody === false) {
    respondError(
        'GitHub connection failed: '
        . $curlError,
        502
    );
}

if ($statusCode !== 200) {
    respondError(
        'GitHub file could not be fetched for the bound commit.',
        502
    );
}

$githubData =
    json_decode(
        $responseBody,
        true
    );

if (
    !is_array($githubData)
    || ($githubData['type'] ?? '')
        !== 'file'
) {
    respondError(
        'GitHub target is not a file.',
        422
    );
}

$encodedContent =
    (string) (
        $githubData['content']
        ?? ''
    );

$encoding =
    (string) (
        $githubData['encoding']
        ?? ''
    );

if (
    $encoding !== 'base64'
    || $encodedContent === ''
) {
    respondError(
        'GitHub file content is unavailable.',
        502
    );
}

$githubContent =
    base64_decode(
        $encodedContent,
        true
    );

if ($githubContent === false) {
    respondError(
        'GitHub file content could not be decoded.',
        502
    );
}

$githubHash =
    hash(
        'sha256',
        $githubContent
    );

/*
|--------------------------------------------------------------------------
| Server target
|--------------------------------------------------------------------------
*/
if ($isApiTarget) {
    $deployRoot =
        $documentRoot
        . '/api';

    $serverPath =
        $deployRoot
        . '/'
        . $relativePath;
} else {
    $serverPath =
        $documentRoot
        . '/index.html';
}

$serverDirectory =
    dirname(
        $serverPath
    );

if (
    !is_dir($serverDirectory)
    && !mkdir(
        $serverDirectory,
        0755,
        true
    )
    && !is_dir($serverDirectory)
) {
    respondError(
        'Server target directory could not be created.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| Previous Version
|--------------------------------------------------------------------------
*/

$previousExists =
    is_file(
        $serverPath
    );

$previousHash =
    null;

$backupPath =
    null;

if ($previousExists) {
    $previousContent =
        file_get_contents(
            $serverPath
        );

    if ($previousContent === false) {
        respondError(
            'Current server file could not be read.',
            500
        );
    }

    $previousHash =
        hash(
            'sha256',
            $previousContent
        );

    $backupPath =
        $backupDirectory
        . '/'
        . $proposalId
        . '-'
        . basename(
            $serverPath
        )
        . '.bak';

    if (
        file_put_contents(
            $backupPath,
            $previousContent,
            LOCK_EX
        ) === false
    ) {
        respondError(
            'Server backup could not be created.',
            500
        );
    }
}

/*
|--------------------------------------------------------------------------
| Temporary File
|--------------------------------------------------------------------------
*/

$tempPath =
    $serverDirectory
    . '/.'
    . basename(
        $serverPath
    )
    . '.koppy-'
    . $proposalId
    . '.tmp';

if (
    file_put_contents(
        $tempPath,
        $githubContent,
        LOCK_EX
    ) === false
) {
    respondError(
        'Temporary deploy file could not be written.',
        500
    );
}

$tempContent =
    file_get_contents(
        $tempPath
    );

if ($tempContent === false) {
    @unlink(
        $tempPath
    );

    respondError(
        'Temporary deploy file could not be verified.',
        500
    );
}

$tempHash =
    hash(
        'sha256',
        $tempContent
    );

if (
    !hash_equals(
        $githubHash,
        $tempHash
    )
) {
    @unlink(
        $tempPath
    );

    respondError(
        'Temporary file hash verification failed.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| Optional PHP Syntax Check
|--------------------------------------------------------------------------
*/

$syntaxCheck = [
    'performed' =>
        false,

    'passed' =>
        null,

    'message' =>
        'Syntax check was not required.',
];

if (
    strtolower(
        pathinfo(
            $serverPath,
            PATHINFO_EXTENSION
        )
    ) === 'php'
) {
    $disabledFunctions =
        array_map(
            'trim',
            explode(
                ',',
                (string) ini_get(
                    'disable_functions'
                )
            )
        );

    if (
        function_exists('exec')
        && !in_array(
            'exec',
            $disabledFunctions,
            true
        )
    ) {
        $syntaxOutput = [];
        $syntaxExitCode = 1;

        exec(
            escapeshellarg(
                PHP_BINARY
            )
            . ' -l '
            . escapeshellarg(
                $tempPath
            )
            . ' 2>&1',
            $syntaxOutput,
            $syntaxExitCode
        );

        $syntaxMessage =
            implode(
                "\n",
                $syntaxOutput
            );

        if ($syntaxExitCode === 0) {
            $syntaxCheck = [
                'performed' =>
                    true,

                'passed' =>
                    true,

                'message' =>
                    $syntaxMessage,
            ];
        } elseif (
            str_contains(
                strtolower(
                    $syntaxMessage
                ),
                'permission denied'
            )
        ) {
            $syntaxCheck = [
                'performed' =>
                    false,

                'passed' =>
                    null,

                'message' =>
                    'PHP syntax check unavailable on this server: '
                    . $syntaxMessage,
            ];
        } else {
            @unlink(
                $tempPath
            );

            respondError(
                'PHP syntax verification failed: '
                . $syntaxMessage,
                422
            );
        }
    } else {
        $syntaxCheck = [
            'performed' =>
                false,

            'passed' =>
                null,

            'message' =>
                'PHP syntax check unavailable on this server.',
        ];
    }
}

/*
|--------------------------------------------------------------------------
| Mark Executing
|--------------------------------------------------------------------------
*/

$proposal['status'] =
    'executing';

$executingJson =
    json_encode(
        $proposal,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

if (
    $executingJson === false
    || file_put_contents(
        $proposalPath,
        $executingJson,
        LOCK_EX
    ) === false
) {
    @unlink(
        $tempPath
    );

    respondError(
        'Deploy proposal state could not be updated.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| Atomic Replace
|--------------------------------------------------------------------------
*/

if (
    !rename(
        $tempPath,
        $serverPath
    )
) {
    $proposal['status'] =
        'deploy_failed';

    $proposal['error'] =
        'Atomic replace failed.';

    file_put_contents(
        $proposalPath,
        json_encode(
            $proposal,
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
            | JSON_PRETTY_PRINT
        ),
        LOCK_EX
    );

    respondError(
        'Atomic server file replacement failed.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| Verification
|--------------------------------------------------------------------------
*/

$deployedContent =
    file_get_contents(
        $serverPath
    );

if ($deployedContent === false) {
    respondError(
        'Deployed file could not be read.',
        500
    );
}

$deployedHash =
    hash(
        'sha256',
        $deployedContent
    );

$hashMatches =
    hash_equals(
        $githubHash,
        $deployedHash
    );

$sizeMatches =
    strlen(
        $githubContent
    )
    === filesize(
        $serverPath
    );

$verificationPassed =
    $hashMatches
    && $sizeMatches;

if (!$verificationPassed) {
    /*
    |--------------------------------------------------------------------------
    | Automatic Restore
    |--------------------------------------------------------------------------
    */

    if (
        $previousExists
        && $backupPath !== null
        && is_file(
            $backupPath
        )
    ) {
        $backupContent =
            file_get_contents(
                $backupPath
            );

        if ($backupContent !== false) {
            file_put_contents(
                $serverPath,
                $backupContent,
                LOCK_EX
            );
        }
    } elseif (!$previousExists) {
        @unlink(
            $serverPath
        );
    }

    $proposal['status'] =
        'verification_failed';

    $proposal['verification'] = [
        'passed' =>
            false,

        'hash_matches' =>
            $hashMatches,

        'size_matches' =>
            $sizeMatches,

        'syntax' =>
            $syntaxCheck,
    ];

    $proposal['error'] =
        'Post-deploy verification failed.';

    file_put_contents(
        $proposalPath,
        json_encode(
            $proposal,
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
            | JSON_PRETTY_PRINT
        ),
        LOCK_EX
    );

    respondError(
        'Deploy verification failed. Previous version was restored when possible.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| Success
|--------------------------------------------------------------------------
*/

$executedAt =
    date(
        DATE_ATOM
    );

$proposal['status'] =
    'executed';

$proposal['executed_at'] =
    $executedAt;

$proposal['verification'] = [
    'passed' =>
        true,

    'hash_matches' =>
        true,

    'size_matches' =>
        true,

    'syntax' =>
        $syntaxCheck,
];

$proposal['error'] =
    null;

$finalProposalJson =
    json_encode(
        $proposal,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

if (
    $finalProposalJson === false
    || file_put_contents(
        $proposalPath,
        $finalProposalJson,
        LOCK_EX
    ) === false
) {
    respondError(
        'Deploy succeeded but proposal state could not be finalized.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| Deploy Log
|--------------------------------------------------------------------------
*/

$deployLog = [
    'deploy_id' =>
        $proposalId,

    'proposal_id' =>
        $proposalId,

    'target_github_path' =>
        $targetPath,

    'target_server_path' =>
        '/koppy/api/'
        . $relativePath,

    'github_commit_sha' =>
        $commitSha,

    'deployed_at' =>
        $executedAt,

    'status' =>
        'success',

    'verification' =>
        $proposal['verification'],

    'github_sha256' =>
        $githubHash,

    'server_sha256' =>
        $deployedHash,

    'previous_server_sha256' =>
        $previousHash,

    'backup_location' =>
        $backupPath,
];

$logPath =
    $logDirectory
    . '/'
    . $proposalId
    . '.json';

$logJson =
    json_encode(
        $deployLog,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

if ($logJson !== false) {
    file_put_contents(
        $logPath,
        $logJson,
        LOCK_EX
    );
}

/*
|--------------------------------------------------------------------------
| Response
|--------------------------------------------------------------------------
*/

respondSuccess([
    'deploy' => [
        'id' =>
            $proposalId,

        'target_path' =>
            $targetPath,

        'server_target' =>
            '/koppy/api/'
            . $relativePath,

        'commit_sha' =>
            $commitSha,

        'status' =>
            'executed',

        'verification' =>
            $proposal['verification'],

        'previous_hash' =>
            $previousHash,

        'deployed_hash' =>
            $deployedHash,
    ],
]);