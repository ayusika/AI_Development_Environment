<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$requestMethod =
    $_SERVER['REQUEST_METHOD']
    ?? 'GET';


/* =========================================================
   GET：稼働確認
========================================================= */

if ($requestMethod === 'GET') {

    respondSuccess([
        'service' =>
            'Kohaku Work Heaven Diary API',

        'version' =>
            'v1',

        'status' =>
            'ready',

        'method' =>
            'POST',

        'message' =>
            'Heaven Diary API is ready.',
    ]);
}


/* =========================================================
   POST以外は拒否
========================================================= */

if ($requestMethod !== 'POST') {

    respondError(
        'Method not allowed.',
        405
    );
}


/* =========================================================
   JSON受信
========================================================= */

$rawBody =
    file_get_contents(
        'php://input'
    );


if (
    $rawBody === false
    || trim($rawBody) === ''
) {

    respondError(
        'Request body is empty.',
        400
    );
}


$payload =
    json_decode(
        $rawBody,
        true
    );


if (!is_array($payload)) {

    respondError(
        'Invalid JSON body.',
        400
    );
}


/* =========================================================
   入力値
========================================================= */

$note =
    trim(
        (string) (
            $payload['note']
            ?? ''
        )
    );


$extraNote =
    trim(
        (string) (
            $payload['extra_note']
            ?? ''
        )
    );


$courseMinutes =
    (int) (
        $payload['course_minutes']
        ?? 0
    );


$customerStatus =
    trim(
        (string) (
            $payload['customer_status']
            ?? ''
        )
    );


$place =
    trim(
        (string) (
            $payload['place']
            ?? ''
        )
    );


$options =
    $payload['options']
    ?? [];


if (!is_array($options)) {
    $options = [];
}


$options =
    array_values(
        array_filter(
            array_map(
                static function (
                    mixed $value
                ): string {

                    return trim(
                        (string) $value
                    );
                },
                $options
            ),
            static function (
                string $value
            ): bool {

                return
                    $value !== '';
            }
        )
    );


if ($note === '') {

    respondError(
        '接客で書きたいことを入力してください。',
        422
    );
}


/* =========================================================
   OpenAI設定
========================================================= */

$apiKey =
    trim(
        (string) (
            $config[
                'openai_api_key'
            ]
            ?? ''
        )
    );


$model =
    trim(
        (string) (
            $config[
                'openai_model'
            ]
            ?? 'gpt-5.6-luna'
        )
    );


if ($apiKey === '') {

    respondError(
        'OpenAI API key is not configured.',
        503
    );
}


/* =========================================================
   日記生成用入力
========================================================= */

$optionText =
    $options
        ? implode(
            '、',
            $options
        )
        : 'なし';


$placeText =
    $place === 'room'
        ? 'ルーム'
        : (
            $place === 'hotel'
                ? 'ホテル'
                : '未指定'
        );


$input =
    "【接客メモ】\n"
    . $note
    . "\n\n"
    . "【追加の文章指示】\n"
    . (
        $extraNote !== ''
            ? $extraNote
            : '特になし'
    )
    . "\n\n"
    . "【予約情報】\n"
    . "コース時間: "
    . $courseMinutes
    . "分\n"
    . "顧客区分: "
    . $customerStatus
    . "\n"
    . "接客場所: "
    . $placeText
    . "\n"
    . "OP: "
    . $optionText;


/* =========================================================
   OpenAI Responses API
========================================================= */

$requestData = [

    'model' =>
        $model,


    'instructions' =>
        'あなたは「こはく」の写メ日記を書く文章アシスタントです。'
        . '札幌のヘブンに投稿する、接客後のお礼日記本文を作成してください。'
        . '入力された接客メモに書かれている事実だけを使ってください。'
        . '書かれていない出来事、会話、感情、相手の人物像を勝手に創作しないでください。'
        . '文章は自然で親しみやすく、少し可愛らしい口調にしてください。'
        . '過度に大げさ、営業的、定型文的な文章は避けてください。'
        . '本人が実際に書いたような自然な日本語にしてください。'
        . '追加の文章指示がある場合は優先して反映してください。'
        . 'タイトルは作らないでください。'
        . '冒頭の「さっき○○分〜お兄さん♡」は別処理で付けるため、出力に含めないでください。'
        . '末尾の「❄︎こはく❄︎」も別処理で付けるため、出力に含めないでください。'
        . '完成した本文部分だけを返してください。'
        . '説明、前置き、Markdown、引用符は付けないでください。',


    'input' =>
        $input,
];


$jsonBody =
    json_encode(
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


/* =========================================================
   OpenAIへ送信
========================================================= */

$curl =
    curl_init(
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
        CURLOPT_POST =>
            true,

        CURLOPT_RETURNTRANSFER =>
            true,

        CURLOPT_TIMEOUT =>
            60,

        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer '
            . $apiKey,

            'Content-Type: application/json',
        ],

        CURLOPT_POSTFIELDS =>
            $jsonBody,
    ]
);


$responseBody =
    curl_exec(
        $curl
    );


$curlError =
    curl_error(
        $curl
    );


$statusCode =
    (int) curl_getinfo(
        $curl,
        CURLINFO_HTTP_CODE
    );


curl_close(
    $curl
);


if ($responseBody === false) {

    respondError(
        'OpenAI connection failed: '
        . $curlError,
        502
    );
}


/* =========================================================
   OpenAI応答解析
========================================================= */

$responseData =
    json_decode(
        $responseBody,
        true
    );


if (!is_array($responseData)) {

    respondError(
        'Invalid response from OpenAI.',
        502
    );
}


if (
    $statusCode < 200
    || $statusCode >= 300
) {

    $openAiMessage =
        $responseData[
            'error'
        ][
            'message'
        ]
        ?? 'OpenAI API request failed.';


    respondError(
        $openAiMessage,
        $statusCode
    );
}


/* =========================================================
   生成テキスト抽出
========================================================= */

$reply = '';


foreach (
    (
        $responseData[
            'output'
        ]
        ?? []
    )
    as $outputItem
) {

    foreach (
        (
            $outputItem[
                'content'
            ]
            ?? []
        )
        as $contentItem
    ) {

        if (
            (
                $contentItem[
                    'type'
                ]
                ?? ''
            )
            === 'output_text'
            && isset(
                $contentItem[
                    'text'
                ]
            )
        ) {

            $reply .=
                (string) $contentItem[
                    'text'
                ];
        }
    }
}


$reply =
    trim(
        $reply
    );


if ($reply === '') {

    respondError(
        'OpenAI returned no text.',
        502
    );
}


/* =========================================================
   成功
========================================================= */

respondSuccess([
    'model' =>
        $model,

    'reply' =>
        $reply,
]);