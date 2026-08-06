<?php

declare(strict_types=1);

/**
 * JSONレスポンスを返して処理を終了する。
 *
 * @param bool $success 成功かどうか
 * @param mixed $data 成功時のデータ
 * @param string|null $error エラーメッセージ
 * @param int $statusCode HTTPステータスコード
 */
function respondJson(
    bool $success,
    mixed $data = null,
    ?string $error = null,
    int $statusCode = 200
): never {
    http_response_code($statusCode);

    echo json_encode(
        [
            'success' => $success,
            'data' => $data,
            'error' => $error,
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

    exit;
}

/**
 * 成功レスポンスを返す。
 *
 * @param mixed $data
 * @param int $statusCode
 */
function respondSuccess(
    mixed $data = null,
    int $statusCode = 200
): never {
    respondJson(
        true,
        $data,
        null,
        $statusCode
    );
}

/**
 * エラーレスポンスを返す。
 *
 * @param string $message
 * @param int $statusCode
 * @param mixed $data
 */
function respondError(
    string $message,
    int $statusCode = 500,
    mixed $data = null
): never {
    respondJson(
        false,
        $data,
        $message,
        $statusCode
    );
}