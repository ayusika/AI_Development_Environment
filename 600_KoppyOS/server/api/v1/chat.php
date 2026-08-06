<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/*
|--------------------------------------------------------------------------
| GET：稼働確認
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
| JSON受信
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
| OpenAI設定
|--------------------------------------------------------------------------
*/

$apiKey = trim(
    (string) ($config['openai_api_key'] ?? '')
);

$model = trim(
    (string) ($config['openai_model'] ?? 'gpt-5.6-luna')
);

if ($apiKey === '') {
    respondError(
        'OpenAI API key is not configured.',
        503
    );
}

/*
|--------------------------------------------------------------------------
| OpenAI Responses API
|--------------------------------------------------------------------------
*/

$requestData = [
    'model' => $model,

    'instructions' =>
        'あなたはKoppyです。'
        . 'ユーザー名はしいちゃんです。'
        . '日本語で、自然で親しみやすく、簡潔に返答してください。'
        . '不明なことは分かったふりをせず、正直に伝えてください。',

    'input' => $message,
];

$jsonBody = json_encode(
    $requestData,
    JSON_UNESCAPED_UNICODE
    | JSON_UNESCAPED_SLASHES
);

if ($jsonBody === false) {
    respondError(
        'Failed to encode OpenAI request.',
        500
    );
}

$curl = curl_init(
    'https://api.openai.com/v1/responses'
);

if ($curl === false) {
    respondError(
        'Failed to initialize HTTP client.',
        500
    );
}

curl_setopt_array(
    $curl,
    [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => $jsonBody,
    ]
);

$responseBody = curl_exec($curl);
$curlError = curl_error($curl);
$statusCode = (int) curl_getinfo(
    $curl,
    CURLINFO_HTTP_CODE
);

curl_close($curl);

if ($responseBody === false) {
    respondError(
        'OpenAI connection failed: ' . $curlError,
        502
    );
}

$responseData = json_decode(
    $responseBody,
    true
);

if (!is_array($responseData)) {
    respondError(
        'Invalid response from OpenAI.',
        502
    );
}

if ($statusCode < 200 || $statusCode >= 300) {
    $openAiMessage =
        $responseData['error']['message']
        ?? 'OpenAI API request failed.';

    respondError(
        $openAiMessage,
        $statusCode
    );
}

/*
|--------------------------------------------------------------------------
| テキスト抽出
|--------------------------------------------------------------------------
*/

$reply = '';

foreach (($responseData['output'] ?? []) as $outputItem) {
    foreach (($outputItem['content'] ?? []) as $contentItem) {
        if (
            ($contentItem['type'] ?? '') === 'output_text'
            && isset($contentItem['text'])
        ) {
            $reply .= (string) $contentItem['text'];
        }
    }
}

$reply = trim($reply);

if ($reply === '') {
    respondError(
        'OpenAI returned no text.',
        502
    );
}

/*
|--------------------------------------------------------------------------
| 成功
|--------------------------------------------------------------------------
*/

respondSuccess([
    'model' => $model,
    'message' => $message,
    'reply' => $reply,
]);