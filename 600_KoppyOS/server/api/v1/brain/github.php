<?php

declare(strict_types=1);

require __DIR__ . '/../bootstrap.php';

/*
|--------------------------------------------------------------------------
| GET以外は拒否
|--------------------------------------------------------------------------
*/

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($requestMethod !== 'GET') {
    respondError(
        'Method not allowed.',
        405
    );
}

/*
|--------------------------------------------------------------------------
| GitHub Brain設定
|--------------------------------------------------------------------------
*/

$owner = 'ayusika';
$repository = 'AI_Development_Environment';
$branch = 'main';

$documentPath =
    '040_Koppy/koppy設計書/Koppy設計書.md';

/*
|--------------------------------------------------------------------------
| GitHub APIへGETリクエスト
|--------------------------------------------------------------------------
*/

function fetchGitHubJson(string $url): array
{
    if (!function_exists('curl_init')) {
        respondError(
            'PHP cURL extension is not available.',
            500
        );
    }

    $curl = curl_init($url);

    if ($curl === false) {
        respondError(
            'Failed to initialize GitHub connection.',
            500
        );
    }

    curl_setopt_array(
        $curl,
        [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'Accept: application/vnd.github+json',
                'User-Agent: KoppyOS',
                'X-GitHub-Api-Version: 2022-11-28',
            ],
        ]
    );

    $responseBody = curl_exec($curl);
    $curlError = curl_error($curl);

    $statusCode = (int) curl_getinfo(
        $curl,
        CURLINFO_HTTP_CODE
    );

    curl_close($curl);

    if ($responseBody === false) {
        respondError(
            'GitHub connection failed: ' . $curlError,
            502
        );
    }

    $responseData = json_decode(
        $responseBody,
        true
    );

    if (!is_array($responseData)) {
        respondError(
            'GitHub returned invalid JSON.',
            502
        );
    }

    if ($statusCode < 200 || $statusCode >= 300) {
        $githubMessage =
            $responseData['message']
            ?? 'GitHub API request failed.';

        respondError(
            $githubMessage,
            $statusCode
        );
    }

    return $responseData;
}

/*
|--------------------------------------------------------------------------
| 最新コミット取得
|--------------------------------------------------------------------------
*/

$commitUrl =
    'https://api.github.com/repos/'
    . rawurlencode($owner)
    . '/'
    . rawurlencode($repository)
    . '/commits/'
    . rawurlencode($branch);

$commitData =
    fetchGitHubJson($commitUrl);

$commitSha =
    (string) ($commitData['sha'] ?? '');

$commitMessage =
    (string) (
        $commitData['commit']['message']
        ?? ''
    );

$commitDate =
    (string) (
        $commitData['commit']['committer']['date']
        ?? ''
    );

/*
|--------------------------------------------------------------------------
| Brain本文取得
|--------------------------------------------------------------------------
*/

$encodedDocumentPath = implode(
    '/',
    array_map(
        'rawurlencode',
        explode('/', $documentPath)
    )
);

$documentUrl =
    'https://api.github.com/repos/'
    . rawurlencode($owner)
    . '/'
    . rawurlencode($repository)
    . '/contents/'
    . $encodedDocumentPath
    . '?ref='
    . rawurlencode($branch);

$documentData =
    fetchGitHubJson($documentUrl);

$encodedContent =
    (string) ($documentData['content'] ?? '');

$encodedContent = str_replace(
    ["\r", "\n"],
    '',
    $encodedContent
);

$documentContent =
    base64_decode(
        $encodedContent,
        true
    );

if ($documentContent === false) {
    respondError(
        'Failed to decode GitHub Brain.',
        502
    );
}

/*
|--------------------------------------------------------------------------
| 成功レスポンス
|--------------------------------------------------------------------------
*/

respondSuccess([
    'repository' => [
        'owner' => $owner,
        'name' => $repository,
        'branch' => $branch,
    ],

    'latest_commit' => [
        'sha' => $commitSha,
        'short_sha' => substr($commitSha, 0, 7),
        'message' => $commitMessage,
        'date' => $commitDate,
    ],

    'document' => [
        'path' => $documentPath,
        'name' => basename($documentPath),
        'content' => $documentContent,
    ],
]);