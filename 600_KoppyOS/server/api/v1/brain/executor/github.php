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

$search =
    (string) (
        $proposal['search']
        ?? ''
    );

$replaceWith =
    (string) (
        $proposal['replace_with']
        ?? ''
    );

/*
|--------------------------------------------------------------------------
| WRITE ALLOWLIST
|--------------------------------------------------------------------------
|
| KoppyOSがGitHubへ書き込める領域を限定する。
|
| 現在許可:
|
| 600_KoppyOS/
| 900_Lab/
|
| Exact Match:
| 000_HOME/決定事項.md
| 000_HOME/現在の状態.md
| 000_HOME/更新履歴.md
| 000_HOME/次にやること.md
|
| Allowlist外はProposalが承認済みでもExecutorが拒否する。
|--------------------------------------------------------------------------
*/

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
        'Invalid target path.',
        403
    );
}

/*
|--------------------------------------------------------------------------
| Allowed roots
|--------------------------------------------------------------------------
*/
$allowedRoots = [
    '600_KoppyOS/',
    '900_Lab/',
    '200_Miki_Piano/site/',
];

$allowedExactPaths = [
    '000_HOME/決定事項.md',
    '000_HOME/現在の状態.md',
    '000_HOME/更新履歴.md',
    '000_HOME/次にやること.md',
    '000_BOOT/PROTOCOL_INDEX.md',
    '040_Koppy/性格/README.md',
    '000_BOOT/README.md',
];

$isAllowedPath =
    false;

foreach (
    $allowedRoots as $allowedRoot
) {
    if (
        str_starts_with(
            $targetPath,
            $allowedRoot
        )
    ) {
        $isAllowedPath =
            true;

        break;
    }
}

if (
    !$isAllowedPath
    && in_array(
        $targetPath,
        $allowedExactPaths,
        true
    )
) {
    $isAllowedPath =
        true;
}

if (!$isAllowedPath) {
    respondError(
        'Target path is outside the KoppyOS write allowlist.',
        403
    );
}

/*
|--------------------------------------------------------------------------
| Protected filenames
|--------------------------------------------------------------------------
|
| Allowlist内部でも秘密情報を置きそうなファイル名は書き込み禁止。
|--------------------------------------------------------------------------
*/

$targetBasename =
    basename(
        $targetPath
    );

$protectedBasenames = [
    '.env',
    '.env.local',
    '.env.production',
    'config.php',
    'credentials.json',
    'secrets.json',
];

if (
    in_array(
        $targetBasename,
        $protectedBasenames,
        true
    )
) {
    respondError(
        'Target file is protected from KoppyOS writes.',
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
        'status' =>
            $statusCode,

        'data' =>
            $data,
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
            [
                "\r",
                "\n",
            ],
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

$patchInfo = null;

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
                ? rtrim(
                    $existingContent
                )
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

    case 'patch':

        /*
        |--------------------------------------------------------------------------
        | PATCH safety
        |--------------------------------------------------------------------------
        */

        if (!$fileExists) {
            respondError(
                'Target file does not exist.',
                404
            );
        }

        if ($search === '') {
            respondError(
                'Patch search string is empty.',
                422
            );
        }

        /*
        |--------------------------------------------------------------------------
        | 完全一致数を確認
        |--------------------------------------------------------------------------
        |
        | 0件:
        |   想定していたコードとGitHub正本が違う。
        |
        | 2件以上:
        |   どこを変更すべきか曖昧。
        |
        | 1件:
        |   安全に置換可能。
        |--------------------------------------------------------------------------
        */

        $matchCount =
            substr_count(
                $existingContent,
                $search
            );

        if ($matchCount === 0) {
            respondError(
                'Patch target was not found. GitHub has not been modified.',
                409
            );
        }

        if ($matchCount > 1) {
            respondError(
                'Patch target matched multiple locations. GitHub has not been modified.',
                409
            );
        }

        /*
        |--------------------------------------------------------------------------
        | 1件だけ置換
        |--------------------------------------------------------------------------
        */

        $searchPosition =
            strpos(
                $existingContent,
                $search
            );

        if ($searchPosition === false) {
            respondError(
                'Patch position could not be determined.',
                500
            );
        }

        $newContent =
            substr_replace(
                $existingContent,
                $replaceWith,
                $searchPosition,
                strlen($search)
            );

        $patchInfo = [
            'match_count' =>
                $matchCount,

            'search_length' =>
                strlen($search),

            'replacement_length' =>
                strlen($replaceWith),
        ];

        break;

    default:

        respondError(
            'Unsupported operation.',
            422
        );
}

/*
|--------------------------------------------------------------------------
| No-op protection
|--------------------------------------------------------------------------
|
| patchやreplaceの結果、内容が全く変化していない場合はCommitしない。
|--------------------------------------------------------------------------
*/

if (
    $fileExists
    && $newContent === $existingContent
) {
    respondError(
        'No changes detected. GitHub has not been modified.',
        409
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
        $owner
        . '/'
        . $repository,

    'branch' =>
        $branch,

    'commit_sha' =>
        $commitSha,

    'commit_message' =>
        $commitMessage,
];

if ($patchInfo !== null) {
    $proposal['patch_result'] =
        $patchInfo;
}

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

$result =
    file_put_contents(
        $proposalPath,
        $updatedProposalJson,
        LOCK_EX
    );

if ($result === false) {
    respondError(
        'GitHub was updated, but proposal state could not be saved.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| Complete
|--------------------------------------------------------------------------
*/

respondSuccess([
    'proposal' =>
        $proposal,

    'github' => [
        'write_performed' =>
            true,

        'repository' =>
            $owner
            . '/'
            . $repository,

        'branch' =>
            $branch,

        'target_path' =>
            $targetPath,

        'operation' =>
            $operation,

        'commit_sha' =>
            $commitSha,

        'patch' =>
            $patchInfo,
    ],
]);

