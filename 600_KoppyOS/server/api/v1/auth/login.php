<?php

declare(strict_types=1);

$authConfigPath =
    '/home/users/2/her.jp-mikipiano/.koppy-private/auth-config.php';

if (!is_file($authConfigPath)) {
    http_response_code(500);
    exit('Authentication configuration was not found.');
}

$authConfig =
    require $authConfigPath;

if (!is_array($authConfig)) {
    http_response_code(500);
    exit('Authentication configuration is invalid.');
}

$githubAuth =
    $authConfig['github_auth']
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

$callbackUrl =
    trim(
        (string) (
            $githubAuth['callback_url']
            ?? ''
        )
    );

if (
    $clientId === ''
    || $callbackUrl === ''
) {
    http_response_code(500);
    exit('Authentication configuration is incomplete.');
}

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

session_name(
    $sessionName
);

session_set_cookie_params([
    'lifetime' =>
        0,

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

$state =
    bin2hex(
        random_bytes(32)
    );

$codeVerifier =
    rtrim(
        strtr(
            base64_encode(
                random_bytes(64)
            ),
            '+/',
            '-_'
        ),
        '='
    );

$codeChallenge =
    rtrim(
        strtr(
            base64_encode(
                hash(
                    'sha256',
                    $codeVerifier,
                    true
                )
            ),
            '+/',
            '-_'
        ),
        '='
    );

$_SESSION['github_auth'] = [
    'state' =>
        $state,

    'code_verifier' =>
        $codeVerifier,

    'created_at' =>
        time(),
];

$query =
    http_build_query(
        [
            'client_id' =>
                $clientId,

            'redirect_uri' =>
                $callbackUrl,

            'state' =>
                $state,

            'code_challenge' =>
                $codeChallenge,

            'code_challenge_method' =>
                'S256',
        ],
        '',
        '&',
        PHP_QUERY_RFC3986
    );

$authorizationUrl =
    'https://github.com/login/oauth/authorize'
    . '?'
    . $query;

header(
    'Location: '
    . $authorizationUrl,
    true,
    302
);

exit;