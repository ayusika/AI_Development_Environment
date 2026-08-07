<?php

declare(strict_types=1);

require_once '/home/users/2/her.jp-mikipiano/koppy-private/auth-config.php';

session_start();

$state =
    bin2hex(
        random_bytes(32)
    );

$_SESSION['github_oauth_state'] =
    $state;

$query =
    http_build_query(
        [
            'client_id' =>
                KOPPY_GITHUB_CLIENT_ID,

            'redirect_uri' =>
                KOPPY_GITHUB_CALLBACK_URL,

            'state' =>
                $state,
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