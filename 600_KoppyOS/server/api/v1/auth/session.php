<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| KoppyOS Authentication - Session
|--------------------------------------------------------------------------
|
| 現在のKoppyOS Authentication Sessionを確認する。
|
| GitHub Access TokenやSession IDなどの秘密情報は返さない。
|
|--------------------------------------------------------------------------
*/

$authConfigPath =
    '/home/users/2/her.jp-mikipiano/.koppy-private/auth-config.php';

if (!is_file($authConfigPath)) {
    http_response_code(500);

    header(
        'Content-Type: application/json; charset=utf-8'
    );

    echo json_encode([
        'success' => false,
        'error' =>
            'Authentication configuration was not found.',
    ]);

    exit;
}

$authConfig =
    require $authConfigPath;

if (!is_array($authConfig)) {
    http_response_code(500);

    header(
        'Content-Type: application/json; charset=utf-8'
    );

    echo json_encode([
        'success' => false,
        'error' =>
            'Authentication configuration is invalid.',
    ]);

    exit;
}

$koppyWorld =
    $authConfig['koppy_world']
    ?? [];

$sessionConfig =
    $authConfig['session']
    ?? [];

$allowedOrigin =
    trim(
        (string) (
            $koppyWorld['origin']
            ?? ''
        )
    );

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
|
| Koppy World:
|   https://ayusika.github.io
|
| Koppy API:
|   https://koppy.miki-piano.com
|
| Cross-Origin Cookieを利用するため、
| Originを固定してCredentialsを許可する。
|--------------------------------------------------------------------------
*/

$requestOrigin =
    trim(
        (string) (
            $_SERVER['HTTP_ORIGIN']
            ?? ''
        )
    );

if (
    $allowedOrigin !== ''
    && $requestOrigin === $allowedOrigin
) {
    header(
        'Access-Control-Allow-Origin: '
        . $allowedOrigin
    );

    header(
        'Access-Control-Allow-Credentials: true'
    );

    header(
        'Vary: Origin'
    );
}

$requestMethod =
    $_SERVER['REQUEST_METHOD']
    ?? 'GET';

if ($requestMethod === 'OPTIONS') {
    header(
        'Access-Control-Allow-Methods: GET, OPTIONS'
    );

    header(
        'Access-Control-Allow-Headers: Content-Type'
    );

    http_response_code(204);

    exit;
}

if ($requestMethod !== 'GET') {
    http_response_code(405);

    header(
        'Content-Type: application/json; charset=utf-8'
    );

    echo json_encode([
        'success' => false,
        'error' =>
            'Method not allowed.',
    ]);

    exit;
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

/*
|--------------------------------------------------------------------------
| Session Timeout
|--------------------------------------------------------------------------
*/

$idleTimeoutSeconds =
    (int) (
        $sessionConfig['idle_timeout_seconds']
        ?? 3600
    );

if ($idleTimeoutSeconds <= 0) {
    $idleTimeoutSeconds =
        3600;
}

$authenticated =
    (
        $_SESSION['authenticated']
        ?? false
    ) === true;

$lastActivityAt =
    (int) (
        $_SESSION['last_activity_at']
        ?? 0
    );

if (
    $authenticated
    && (
        $lastActivityAt <= 0
        || (
            time() - $lastActivityAt
        ) > $idleTimeoutSeconds
    )
) {
    $_SESSION = [];

    session_destroy();

    $authenticated =
        false;
}

/*
|--------------------------------------------------------------------------
| Response
|--------------------------------------------------------------------------
*/

header(
    'Content-Type: application/json; charset=utf-8'
);

header(
    'Cache-Control: no-store'
);

if (!$authenticated) {
    echo json_encode(
        [
            'success' =>
                true,

            'data' => [
                'authenticated' =>
                    false,
            ],
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );

    exit;
}

/*
|--------------------------------------------------------------------------
| Refresh activity
|--------------------------------------------------------------------------
*/

$_SESSION['last_activity_at'] =
    time();

echo json_encode(
    [
        'success' =>
            true,

        'data' => [
            'authenticated' =>
                true,

            'user' => [
                'github_user_id' =>
                    (int) (
                        $_SESSION['github_user_id']
                        ?? 0
                    ),

                'github_login' =>
                    (string) (
                        $_SESSION['github_login']
                        ?? ''
                    ),

                'role' =>
                    (string) (
                        $_SESSION['role']
                        ?? ''
                    ),
            ],

            'authenticated_at' =>
                (int) (
                    $_SESSION['authenticated_at']
                    ?? 0
                ),
        ],
    ],
    JSON_UNESCAPED_UNICODE
    | JSON_UNESCAPED_SLASHES
);

exit;