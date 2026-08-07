<?php

declare(strict_types=1);

require __DIR__ . '/../../bootstrap.php';

/*
|--------------------------------------------------------------------------
| POST only
|--------------------------------------------------------------------------
*/

$requestMethod =
    $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($requestMethod !== 'POST') {
    respondError(
        'Method not allowed.',
        405
    );
}

/*
|--------------------------------------------------------------------------
| Request JSON
|--------------------------------------------------------------------------
*/

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
| GitHub config
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

$branch =
    'main';

/*
|--------------------------------------------------------------------------
| Proposal loading
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
| Approval check
|--------------------------------------------------------------------------
*/

if (
    ($proposal['status'] ?? '')
    !== 'approved'
) {
    respondError(
        'Proposal has not been approved.',
        409
    );
}

/*
|--------------------------------------------------------------------------
| Prevent duplicate execution
|--------------------------------------------------------------------------
*/

if (
    !empty(
        $proposal['executed_at']
    )
) {
    respondError(
        'Proposal has already been executed.',
        409
    );
}

$targetPath =
    trim(
        (string) (
            $proposal['target_path']
            ?? ''
        )
    );

$operation =
    trim(
        (string) (
            $proposal['operation']
            ?? ''
        )
    );

$content =
    (string) (
        $proposal['content']
        ?? ''
    );

/*
|--------------------------------------------------------------------------
| TEMPORARY SAFETY LOCK
|
| 初回実験ではこのファイル以外を変更禁止。
|--------------------------------------------------------------------------
*/

$allowedTestPath =
    '900_Lab/KoppyOS_GITHUB_WRITE_TEST.md';

if ($targetPath !== $allowedTestPath) {
    respondError(
        'Executor is currently locked to the GitHub write test file.',
        403
    );
}

/*
|--------------------------------------------------------------------------
| GitHub request helper
|--------------------------------------------------------------------------
*/

function githubRequest(
    string $url,
    string $token,
    string $method = 'GET',
    ?array $body = null
): array {
    $curl =
        curl_init($url);

    if ($curl === false) {
        respondError(
            'Failed to initialize GitHub request.',
            500
        );
    }

    $headers = [
        'Accept: application/vnd.github+json',
        'Authorization: Bearer ' . $token,
        'User-Agent: KoppyOS',
        'X-GitHub-Api-Version: 2022-11-28',
    ];

    curl_setopt_array(
        $curl,
        [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
        ]
    );

    if ($body !== null) {
        $encodedBody =
            json_encode(
                $body,
                JSON_UNESCAPED_UNICODE
                | JSON_UNESCAPED_SLASHES
            );

        if ($encodedBody === false) {
            respondError(
                'Failed to encode GitHub request.',
                500
            );
        }

        curl_setopt(
            $curl,
            CURLOPT_POSTFIELDS,
            $encodedBody
        );
    }

    $responseBody =
        curl_exec($curl);

    $curlError =
        curl_error($curl);

    $statusCode =
        (int) curl_getinfo(
            $curl,
            CURLINFO_HTTP_CODE
        );

    curl_close($curl);

    if ($responseBody === false) {
        respondError(
            'GitHub connection failed: '
            . $curlError,
            502
        );
    }

    $data =
        json_decode(
            $responseBody,
            true
        );

    if (!is_array($data)) {
        $data = [];
    }

    return [
        'status' => $statusCode,
        'data' => $data,
    ];
}

/*
|--------------------------------------------------------------------------
| GitHub Contents API URL
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

$fileApiUrl =
    'https://api.github.com/repos/'
    . rawurlencode($owner)
    . '/'
    . rawurlencode($repository)
    . '/contents/'
    . $encodedTargetPath;

/*
|--------------------------------------------------------------------------
| Existing file check
|--------------------------------------------------------------------------
*/

$existingResponse =
    githubRequest(
        $fileApiUrl
        . '?ref='
        . rawurlencode($branch),
        $githubToken
    );

$fileExists =
    $existingResponse['status']
    === 200;

$existingContent = '';
$existingSha = '';

if ($fileExists) {
    $existingSha =
        (string) (
            $existingResponse['data']['sha']
            ?? ''
        );

    $encodedExistingContent =
        (string) (
            $existingResponse['data']['content']
            ?? ''
        );

    $encodedExistingContent =
        str_replace(
            ["\r", "\n"],
            '',
            $encodedExistingContent
        );

    $decoded =
        base64_decode(
            $encodedExistingContent,
            true
        );

    if ($decoded === false) {
        respondError(
            'Failed to decode existing GitHub file.',
            502
        );
    }

    $existingContent =
        $decoded;
}

/*
|--------------------------------------------------------------------------
| Apply operation
|--------------------------------------------------------------------------
*/

switch ($operation) {
    case 'create':
        if ($fileExists) {
            respondError(
                'Target file already exists.',
                409
            );
        }

        $newContent =
            $content;

        break;

    case 'append':
        $newContent =
            $fileExists
                ? rtrim($existingContent)
                    . "\n\n"
                    . $content
                    . "\n"
                : $content . "\n";

        break;

    case 'replace':
        if (!$fileExists) {
            respondError(
                'Target file does not exist.',
                404
            );
        }

        $newContent =
            $content;

        break;

    default:
        respondError(
            'Unsupported operation.',
            422
        );
}

/*
|--------------------------------------------------------------------------
| GitHub commit
|--------------------------------------------------------------------------
*/

$commitMessage =
    'KoppyOS: execute proposal '
    . $proposalId;

$githubPayload = [
    'message' =>
        $commitMessage,

    'content' =>
        base64_encode(
            $newContent
        ),

    'branch' =>
        $branch,
];

if ($fileExists) {
    $githubPayload['sha'] =
        $existingSha;
}

$writeResponse =
    githubRequest(
        $fileApiUrl,
        $githubToken,
        'PUT',
        $githubPayload
    );

if (
    $writeResponse['status'] !== 200
    && $writeResponse['status'] !== 201
) {
    $githubError =
        $writeResponse['data']['message']
        ?? 'GitHub write failed.';

    respondError(
        'GitHub write failed: '
        . $githubError,
        502
    );
}

/*
|--------------------------------------------------------------------------
| Record execution
|--------------------------------------------------------------------------
*/

$commitSha =
    (string) (
        $writeResponse['data']['commit']['sha']
        ?? ''
    );

$proposal['status'] =
    'executed';

$proposal['executed_at'] =
    date(DATE_ATOM);

$proposal['github'] = [
    'repository' =>
        $owner . '/' . $repository,

    'branch' =>
        $branch,

    'commit_sha' =>
        $commitSha,

    'commit_message' =>
        $commitMessage,
];

$updatedProposalJson =
    json_encode(
        $proposal,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

if ($updatedProposalJson === false) {
    respondError(
        'GitHub was updated, but proposal state could not be encoded.',
        500
    );
}

file_put_contents(
    $proposalPath,
    $updatedProposalJson,
    LOCK_EX
);

/*
|--------------------------------------------------------------------------
| Complete
|--------------------------------------------------------------------------
*/

respondSuccess([
    'proposal' => $proposal,

    'github' => [
        'write_performed' => true,
        'repository' =>
            $owner . '/' . $repository,

        'branch' =>
            $branch,

        'target_path' =>
            $targetPath,

        'commit_sha' =>
            $commitSha,
    ],
]);