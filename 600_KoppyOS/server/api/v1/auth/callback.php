<?php

declare(strict_types=1);

require_once '/home/users/2/her.jp-mikipiano/koppy-private/auth-config.php';

session_start();

$code = trim(
    (string) (
        $_GET['code']
        ?? ''
    )
);

$state = trim(
    (string) (
        $_GET['state']
        ?? ''
    )
);

$storedState = trim(
    (string) (
        $_SESSION['github_oauth_state']
        ?? ''
    )
);

unset(
    $_SESSION['github_oauth_state']
);

if (
    $code === ''
    || $state === ''
    || $storedState === ''
    || !hash_equals(
        $storedState,
        $state
    )
) {
    http_response_code(400);

    exit(
        'Invalid OAuth state.'
    );
}

$tokenRequest = curl_init(
    'https://github.com/login/oauth/access_token'
);

if ($tokenRequest === false) {
    http_response_code(500);

    exit(
        'Failed to initialize token request.'
    );
}

curl_setopt_array(
    $tokenRequest,
    [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: application/x-www-form-urlencoded',
            'User-Agent: Koppy-World-Auth',
        ],
        CURLOPT_POSTFIELDS => http_build_query(
            [
                'client_id' =>
                    KOPPY_GITHUB_CLIENT_ID,

                'client_secret' =>
                    KOPPY_GITHUB_CLIENT_SECRET,

                'code' =>
                    $code,

                'redirect_uri' =>
                    KOPPY_GITHUB_CALLBACK_URL,
            ],
            '',
            '&',
            PHP_QUERY_RFC3986
        ),
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
    ]
);

$tokenResponse = curl_exec(
    $tokenRequest
);

$tokenHttpStatus = (int) curl_getinfo(
    $tokenRequest,
    CURLINFO_HTTP_CODE
);

$tokenCurlError = curl_error(
    $tokenRequest
);

curl_close(
    $tokenRequest
);

if (
    $tokenResponse === false
    || $tokenCurlError !== ''
    || $tokenHttpStatus < 200
    || $tokenHttpStatus >= 300
) {
    http_response_code(502);

    exit(
        'GitHub token request failed.'
    );
}

$tokenData = json_decode(
    $tokenResponse,
    true
);

if (
    !is_array($tokenData)
    || !isset($tokenData['access_token'])
    || !is_string($tokenData['access_token'])
    || trim($tokenData['access_token']) === ''
) {
    http_response_code(502);

    exit(
        'GitHub access token was not returned.'
    );
}

$accessToken = trim(
    $tokenData['access_token']
);

$userRequest = curl_init(
    'https://api.github.com/user'
);

if ($userRequest === false) {
    http_response_code(500);

    exit(
        'Failed to initialize user request.'
    );
}

curl_setopt_array(
    $userRequest,
    [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . $accessToken,
            'User-Agent: Koppy-World-Auth',
            'X-GitHub-Api-Version: 2022-11-28',
        ],
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
    ]
);

$userResponse = curl_exec(
    $userRequest
);

$userHttpStatus = (int) curl_getinfo(
    $userRequest,
    CURLINFO_HTTP_CODE
);

$userCurlError = curl_error(
    $userRequest
);

curl_close(
    $userRequest
);

if (
    $userResponse === false
    || $userCurlError !== ''
    || $userHttpStatus < 200
    || $userHttpStatus >= 300
) {
    http_response_code(502);

    exit(
        'GitHub user request failed.'
    );
}

$userData = json_decode(
    $userResponse,
    true
);

$githubLogin = strtolower(
    trim(
        (string) (
            $userData['login']
            ?? ''
        )
    )
);

if (
    $githubLogin === ''
    || !in_array(
        $githubLogin,
        KOPPY_ALLOWED_GITHUB_USERS,
        true
    )
) {
    $_SESSION = [];

    session_destroy();

    http_response_code(403);

    exit(
        'This GitHub user is not allowed.'
    );
}

session_regenerate_id(
    true
);

$_SESSION['koppy_authenticated'] = true;
$_SESSION['koppy_github_login'] = $githubLogin;
$_SESSION['koppy_authenticated_at'] = time();

$redirectAfterLogin =
    KOPPY_WORLD_URL;

header(
    'Location: '
    . $redirectAfterLogin,
    true,
    302
);

exit;