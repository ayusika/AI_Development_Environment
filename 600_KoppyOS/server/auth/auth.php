<?php

declare(strict_types=1);


/*
 * ========================================
 * KOPPY AUTH
 * ========================================
 */


function koppyStartSession(): void
{
    if (
        session_status()
        === PHP_SESSION_ACTIVE
    ) {
        return;
    }


    $sessionLifetimeSeconds =
        60 * 60 * 24 * 30;


    session_name(
        'koppy_session'
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
            'Lax',
    ]);


    session_start();
}


function koppyIsAuthenticated(): bool
{
    koppyStartSession();


    $authenticated =
        (
            isset(
                $_SESSION[
                    'koppy_authenticated'
                ]
            )
            &&
            $_SESSION[
                'koppy_authenticated'
            ] === true
        );


    if (!$authenticated) {
        return false;
    }


    $sessionLifetimeSeconds =
        60 * 60 * 24 * 30;


    $lastActivityAt =
        (int) (
            $_SESSION[
                'koppy_last_activity_at'
            ]
            ?? 0
        );


    if (
        $lastActivityAt > 0
        &&
        (
            time()
            - $lastActivityAt
        ) > $sessionLifetimeSeconds
    ) {

        $_SESSION = [];


        setcookie(
            session_name(),
            '',
            [
                'expires' =>
                    time() - 42000,

                'path' =>
                    '/',

                'secure' =>
                    true,

                'httponly' =>
                    true,

                'samesite' =>
                    'Lax',
            ]
        );


        session_destroy();


        return false;
    }


    $_SESSION[
        'koppy_last_activity_at'
    ] = time();


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
                'Lax',
        ]
    );


    return true;
}


function koppyLogin(
    string $password,
    string $passwordHash
): bool {

    koppyStartSession();


    if (
        !password_verify(
            $password,
            $passwordHash
        )
    ) {
        return false;
    }


    session_regenerate_id(
        true
    );


    $_SESSION[
        'koppy_authenticated'
    ] = true;


    $_SESSION[
        'koppy_authenticated_at'
    ] = time();


    return true;
}


function koppyLogout(): void
{
    koppyStartSession();


    $_SESSION = [];


    if (
        ini_get(
            'session.use_cookies'
        )
    ) {

        $params =
            session_get_cookie_params();


        setcookie(
            session_name(),
            '',
            [
                'expires' =>
                    time() - 42000,

                'path' =>
                    $params['path'],

                'secure' =>
                    $params['secure'],

                'httponly' =>
                    $params['httponly'],

                'samesite' =>
                    'Lax',
            ]
        );
    }


    session_destroy();
}


function koppyRequirePageAuth(
    string $loginUrl =
        '/kohaku-work/login.php'
): void {

    if (
        koppyIsAuthenticated()
    ) {
        return;
    }


    $returnUrl =
        $_SERVER[
            'REQUEST_URI'
        ]
        ?? '/kohaku-work/';


    header(
        'Location: '
        . $loginUrl
        . '?return='
        . rawurlencode(
            $returnUrl
        )
    );


    exit;
}


function koppyRequireApiAuth(): void
{
    if (
        koppyIsAuthenticated()
    ) {
        return;
    }


    http_response_code(
        401
    );


    header(
        'Content-Type: application/json; charset=utf-8'
    );


    echo json_encode(
        [
            'success' =>
                false,

            'error' =>
                'Authentication required.',
        ],
        JSON_UNESCAPED_UNICODE
    );


    exit;
}