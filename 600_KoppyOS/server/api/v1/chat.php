<?php

header('Content-Type: application/json; charset=utf-8');

$configPath = $_SERVER['DOCUMENT_ROOT'] . '/../../.koppy-private/config.php';

try {
    if (!file_exists($configPath)) {
        throw new RuntimeException(
            'config.php が見つかりません: ' . $configPath
        );
    }

    $config = require $configPath;

    if (!is_array($config)) {
        throw new RuntimeException(
            'config.php の戻り値が配列ではありません。'
        );
    }

    echo json_encode(
        [
            'success' => true,
            'message' => 'chat endpoint ready',
            'project' => $config['project_name'] ?? 'unknown',
            'api_key_exists' => !empty($config['openai_api_key']),
            'config_path' => $configPath,
        ],
        JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
    );

} catch (Throwable $error) {
    http_response_code(500);

    echo json_encode(
        [
            'success' => false,
            'error' => $error->getMessage(),
            'config_path' => $configPath,
        ],
        JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
    );
}
