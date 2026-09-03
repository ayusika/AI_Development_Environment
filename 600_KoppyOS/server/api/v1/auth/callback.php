<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| KoppyOS Authentication - GitHub Callback
|--------------------------------------------------------------------------
*/

$authConfigPath =
    '/home/users/2/her.jp-mikipiano/.koppy-private/auth-config.php';

if (!is_file($authConfigPath)) {
    http_response_code(500);

    exit(
        'Authentication configuration was not found.'
    );
}

$authConfig =
    require $authConfigPath;

if (!is_array($authConfig)) {
    http_response_code(500);

    exit(
        'Authentication configuration is invalid.'
    );
}

$githubAuth =
    $authConfig['github_auth']
    ?? [];

$koppyWorld =
    $authConfig['koppy_world']
    ?? [];

$sessionConfig =
    $authConfig['session']
    ?? [];

$clientId =
    trim(
        (string) (
            $githubAuth['client_id']
            ?? ''
        )
    );

$clientSecret =
    trim(
        (string) (
            $githubAuth['client_secret']
            ?? ''
        )
    );

$callbackUrl =
    trim(
        (string) (
            $githubAuth['callback_url']
            ?? ''
        )
    );

$allowedUsers =
    $githubAuth['allowed_users']
    ?? [];

$redirectAfterLogin =
    trim(
        (string) (
            $koppyWorld['redirect_after_login']
            ?? 'https://ayusika.github.io/'
        )
    );

if (
    $clientId === ''
    || $clientSecret === ''
    || $callbackUrl === ''
    || !is_array($allowedUsers)
) {
    http_response_code(500);

    exit(
        'Authentication configuration is incomplete.'
    );
}

/*
|--------------------------------------------------------------------------
| Session
|--------------------------------------------------------------------------
*/

$sessionName =
    trim(
        (string) (
            $sessionConfig['name']
            ?? 'KOPPYSESSID'
        )
    );

if ($sessionName === '') {
    $sessionName =
        'KOPPYSESSID';
}

$sessionLifetimeSeconds =
    60 * 60 * 24 * 30;

session_name(
    $sessionName
);

ini_set(
    'session.gc_maxlifetime',
    (string) $sessionLifetimeSeconds
);

session_set_cookie_params([
    'lifetime' =>
        $sessionLifetimeSeconds,

    'path' =>
        '/',

    'secure' =>
        true,

    'httponly' =>
        true,

    'samesite' =>
        'None',
]);

session_start();

/*
|--------------------------------------------------------------------------
| GitHub Callback Error
|--------------------------------------------------------------------------
*/

$githubError =
    trim(
        (string) (
            $_GET['error']
            ?? ''
        )
    );

if ($githubError !== '') {
    unset(
        $_SESSION['github_auth']
    );

    http_response_code(401);

    exit(
        'GitHub authentication was cancelled or denied.'
    );
}

/*
|--------------------------------------------------------------------------
| Callback Values
|--------------------------------------------------------------------------
*/

$code =
    trim(
        (string) (
            $_GET['code']
            ?? ''
        )
    );

$returnedState =
    trim(
        (string) (
            $_GET['state']
            ?? ''
        )
    );

$temporaryAuth =
    $_SESSION['github_auth']
    ?? null;

if (
    $code === ''
    || $returnedState === ''
    || !is_array($temporaryAuth)
) {
    http_response_code(400);

    exit(
        'Authentication callback is invalid.'
    );
}

$expectedState =
    (string) (
        $temporaryAuth['state']
        ?? ''
    );

$codeVerifier =
    (string) (
        $temporaryAuth['code_verifier']
        ?? ''
    );

$createdAt =
    (int) (
        $temporaryAuth['created_at']
        ?? 0
    );

/*
|--------------------------------------------------------------------------
| State Validation
|--------------------------------------------------------------------------
*/

if (
    $expectedState === ''
    || !hash_equals(
        $expectedState,
        $returnedState
    )
) {
    unset(
        $_SESSION['github_auth']
    );

    http_response_code(403);

    exit(
        'Authentication state validation failed.'
    );
}

/*
|--------------------------------------------------------------------------
| Expiration
|--------------------------------------------------------------------------
*/

if (
    $createdAt <= 0
    || (
        time() - $createdAt
    ) > 600
) {
    unset(
        $_SESSION['github_auth']
    );

    http_response_code(401);

    exit(
        'Authentication request expired.'
    );
}

if ($codeVerifier === '') {
    unset(
        $_SESSION['github_auth']
    );

    http_response_code(400);

    exit(
        'PKCE verifier is unavailable.'
    );
}

/*
|--------------------------------------------------------------------------
| One-time State
|--------------------------------------------------------------------------
*/

unset(
    $_SESSION['github_auth']
);

/*
|--------------------------------------------------------------------------
| Exchange Code for GitHub User Access Token
|--------------------------------------------------------------------------
*/

$tokenRequest =
    curl_init(
        'https://github.com/login/oauth/access_token'
    );

if ($tokenRequest === false) {
    http_response_code(500);

    exit(
        'Could not initialize GitHub token request.'
    );
}

$tokenPayload =
    http_build_query(
        [
            'client_id' =>
                $clientId,

            'client_secret' =>
                $clientSecret,

            'code' =>
                $code,

            'redirect_uri' =>
                $callbackUrl,

            'code_verifier' =>
                $codeVerifier,
        ],
        '',
        '&',
        PHP_QUERY_RFC3986
    );

curl_setopt_array(
    $tokenRequest,
    [
        CURLOPT_POST =>
            true,

        CURLOPT_POSTFIELDS =>
            $tokenPayload,

        CURLOPT_RETURNTRANSFER =>
            true,

        CURLOPT_TIMEOUT =>
            15,

        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'User-Agent: KoppyOS',
        ],
    ]
);

$tokenResponse =
    curl_exec(
        $tokenRequest
    );

$tokenHttpStatus =
    (int) curl_getinfo(
        $tokenRequest,
        CURLINFO_HTTP_CODE
    );

curl_close(
    $tokenRequest
);

if (
    !is_string($tokenResponse)
    || $tokenHttpStatus < 200
    || $tokenHttpStatus >= 300
) {
    http_response_code(502);

    exit(
        'GitHub token exchange failed.'
    );
}

$tokenData =
    json_decode(
        $tokenResponse,
        true
    );

if (!is_array($tokenData)) {
    http_response_code(502);

    exit(
        'GitHub token response was invalid.'
    );
}

$accessToken =
    trim(
        (string) (
            $tokenData['access_token']
            ?? ''
        )
    );

if ($accessToken === '') {
    http_response_code(401);

    exit(
        'GitHub access token was not issued.'
    );
}

/*
|--------------------------------------------------------------------------
| Fetch GitHub User
|--------------------------------------------------------------------------
*/

$userRequest =
    curl_init(
        'https://api.github.com/user'
    );

if ($userRequest === false) {
    http_response_code(500);

    exit(
        'Could not initialize GitHub user request.'
    );
}

curl_setopt_array(
    $userRequest,
    [
        CURLOPT_RETURNTRANSFER =>
            true,

        CURLOPT_TIMEOUT =>
            15,

        CURLOPT_HTTPHEADER => [
            'Accept: application/vnd.github+json',
            'Authorization: Bearer ' . $accessToken,
            'User-Agent: KoppyOS',
            'X-GitHub-Api-Version: 2022-11-28',
        ],
    ]
);

$userResponse =
    curl_exec(
        $userRequest
    );

$userHttpStatus =
    (int) curl_getinfo(
        $userRequest,
        CURLINFO_HTTP_CODE
    );

curl_close(
    $userRequest
);

$accessToken =
    '';

if (
    !is_string($userResponse)
    || $userHttpStatus < 200
    || $userHttpStatus >= 300
) {
    http_response_code(502);

    exit(
        'GitHub user identity request failed.'
    );
}

$userData =
    json_decode(
        $userResponse,
        true
    );

if (!is_array($userData)) {
    http_response_code(502);

    exit(
        'GitHub user identity response was invalid.'
    );
}

$githubUserId =
    (int) (
        $userData['id']
        ?? 0
    );

$githubLogin =
    trim(
        (string) (
            $userData['login']
            ?? ''
        )
    );

if (
    $githubUserId <= 0
    || $githubLogin === ''
) {
    http_response_code(502);

    exit(
        'GitHub user identity is incomplete.'
    );
}

/*
|--------------------------------------------------------------------------
| KoppyOS User Allowlist
|--------------------------------------------------------------------------
*/

$isAllowed =
    false;

foreach (
    $allowedUsers
    as $allowedUser
) {
    if (
        strcasecmp(
            trim(
                (string) $allowedUser
            ),
            $githubLogin
        ) === 0
    ) {
        $isAllowed =
            true;

        break;
    }
}

if (!$isAllowed) {
    $_SESSION = [];

    session_destroy();

    http_response_code(403);

    exit(
        'This GitHub user is not allowed to access KoppyOS.'
    );
}

/*
|--------------------------------------------------------------------------
| Authentication Success
|--------------------------------------------------------------------------
*/

session_regenerate_id(
    true
);

$_SESSION['authenticated'] =
    true;

$_SESSION['github_user_id'] =
    $githubUserId;

$_SESSION['github_login'] =
    $githubLogin;

$_SESSION['role'] =
    'owner';

$_SESSION['authenticated_at'] =
    time();

$_SESSION['last_activity_at'] =
    time();

/*
|--------------------------------------------------------------------------
| Redirect
|--------------------------------------------------------------------------
*/

if ($redirectAfterLogin === '') {
    $redirectAfterLogin =
        'https://ayusika.github.io/';
}

header(
    'Location: '
    . $redirectAfterLogin,
    true,
    302
);

exit;