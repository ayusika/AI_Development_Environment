<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/*
|--------------------------------------------------------------------------
| GET：チャットAPIの準備状態を確認
|--------------------------------------------------------------------------
*/

if ($requestMethod === 'GET') {
    respondSuccess([
        'service' => 'Koppy Chat API',
        'version' => 'v1',
        'status' => 'ready',
        'method' => 'POST',
        'message' => 'Koppy Chat API is ready.',
    ]);
}

/*
|--------------------------------------------------------------------------
| POST以外は拒否
|--------------------------------------------------------------------------
*/

if ($requestMethod !== 'POST') {
    respondError(
        'Method not allowed.',
        405
    );
}

/*
|--------------------------------------------------------------------------
| JSONを受け取る
|--------------------------------------------------------------------------
*/

$rawBody = file_get_contents('php://input');

if ($rawBody === false || trim($rawBody) === '') {
    respondError(
        'Request body is empty.',
        400
    );
}

$payload = json_decode(
    $rawBody,
    true
);

if (!is_array($payload)) {
    respondError(
        'Invalid JSON body.',
        400
    );
}

$message = trim(
    (string) ($payload['message'] ?? '')
);

if ($message === '') {
    respondError(
        'The message field is required.',
        422
    );
}

/*
|--------------------------------------------------------------------------
| OpenAI接続前の確認
|--------------------------------------------------------------------------
*/

$apiKey = trim(
    (string) ($config['openai_api_key'] ?? '')
);

if ($apiKey === '') {
    respondError(
        'OpenAI API key is not configured.',
        503
    );
}

/*
|--------------------------------------------------------------------------
| 次の工程でOpenAI APIを接続
|--------------------------------------------------------------------------
*/

respondSuccess([
    'message' => $message,
    'reply' => 'OpenAI connection is not implemented yet.',
]);