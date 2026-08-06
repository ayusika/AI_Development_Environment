<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: https://ayusika.github.io');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

date_default_timezone_set('Asia/Tokyo');

$configPath =
    ($_SERVER['DOCUMENT_ROOT'] ?? '')
    . '/../../.koppy-private/config.php';

if (
    $configPath === '/../../.koppy-private/config.php'
    || !file_exists($configPath)
) {
    http_response_code(500);

    echo json_encode(
        [
            'success' => false,
            'data' => null,
            'error' => 'Koppy private config was not found.',
        ],
        JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
    );

    exit;
}

$config = require $configPath;

if (!is_array($config)) {
    http_response_code(500);

    echo json_encode(
        [
            'success' => false,
            'data' => null,
            'error' => 'Koppy private config is invalid.',
        ],
        JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
    );

    exit;
}