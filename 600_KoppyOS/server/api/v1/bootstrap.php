<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';

header(
    'Content-Type: application/json; charset=utf-8'
);

header(
    'Access-Control-Allow-Origin: https://ayusika.github.io'
);

header(
    'Access-Control-Allow-Credentials: true'
);

header(
    'Access-Control-Allow-Methods: GET, POST, OPTIONS'
);

header(
    'Access-Control-Allow-Headers: Content-Type'
);

header(
    'Vary: Origin'
);

if (
    ($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS'
) {
    http_response_code(204);
    exit;
}

date_default_timezone_set(
    'Asia/Tokyo'
);

/*
|--------------------------------------------------------------------------
| Private Config
|--------------------------------------------------------------------------
*/

$documentRoot =
    $_SERVER['DOCUMENT_ROOT']
    ?? '';

$configPath =
    $documentRoot
    . '/../../.koppy-private/config.php';

if (
    $documentRoot === ''
    || !file_exists(
        $configPath
    )
) {
    respondError(
        'Koppy private config was not found.',
        500
    );
}

$config =
    require $configPath;

if (!is_array($config)) {
    respondError(
        'Koppy private config is invalid.',
        500
    );
}

/*
|--------------------------------------------------------------------------
| Authentication Config
|--------------------------------------------------------------------------
*/

$authConfigPath =
    $documentRoot
    . '/../../.koppy-private/auth-config.php';

if (!file_exists($authConfigPath)) {
    respondError(
        'Authentication configuration was not found.',
        500
    );
}

$authConfig =
    require $authConfigPath;

if (!is_array($authConfig)) {
    respondError(
        'Authentication configuration is invalid.',
        500
    );
}

$sessionConfig =
    $authConfig['session']
    ?? [];

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

/*
|--------------------------------------------------------------------------
| Session
|--------------------------------------------------------------------------
*/

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
| Idle Timeout
|--------------------------------------------------------------------------
*/

$idleTimeoutSeconds =
    $sessionLifetimeSeconds;

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
| Authentication Guard
|--------------------------------------------------------------------------
*/

if (!$authenticated) {
    respondError(
        'Authentication required.',
        401
    );
}

$_SESSION['last_activity_at'] =
    time();

setcookie(
    session_name(),
    session_id(),
    [
        'expires' =>
            time()
            + $sessionLifetimeSeconds,

        'path' =>
            '/',

        'secure' =>
            true,

        'httponly' =>
            true,

        'samesite' =>
            'None',
    ]
);

/*
|--------------------------------------------------------------------------
| Authorization Context
|--------------------------------------------------------------------------
*/

$koppyAuth = [
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
];

if (
    $koppyAuth['github_user_id'] <= 0
    || $koppyAuth['github_login'] === ''
    || $koppyAuth['role'] === ''
) {
    $_SESSION = [];

    session_destroy();

    respondError(
        'Authentication session is invalid.',
        401
    );
}