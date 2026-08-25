<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/../../auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/lib/database.php';


function paletteJsonResponse(
    array $data,
    int $statusCode = 200
): never {
    http_response_code(
        $statusCode
    );

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE
        | JSON_PRETTY_PRINT
    );

    exit;
}


function paletteReadJsonBody(): array
{
    $raw =
        file_get_contents(
            'php://input'
        );

    if (
        $raw === false
        ||
        trim($raw) === ''
    ) {
        return [];
    }

    $decoded =
        json_decode(
            $raw,
            true
        );

    if (!is_array($decoded)) {
        throw new RuntimeException(
            'Invalid JSON body.'
        );
    }

    return $decoded;
}


function paletteNormalizeColor(
    mixed $value
): string {
    $color =
        strtolower(
            trim(
                (string)
                ($value ?? '')
            )
        );

    if (
        !preg_match(
            '/^#[0-9a-f]{6}$/',
            $color
        )
    ) {
        throw new RuntimeException(
            'Invalid color.'
        );
    }

    return $color;
}


try {
    $pdo =
        koppyDatabase();


    $pdo->exec(
        '
        CREATE TABLE IF NOT EXISTS
            calendar_color_palette
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            color TEXT NOT NULL UNIQUE,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        '
    );


    $method =
        $_SERVER['REQUEST_METHOD']
        ?? 'GET';


    if ($method === 'GET') {

        $statement =
            $pdo->query(
                '
                SELECT
                    id,
                    color,
                    sort_order,
                    created_at
                FROM
                    calendar_color_palette
                ORDER BY
                    sort_order ASC,
                    id ASC
                LIMIT 8
                '
            );


        paletteJsonResponse([
            'success' =>
                true,

            'colors' =>
                $statement->fetchAll(),

            'error' =>
                null,
        ]);
    }


    if ($method === 'POST') {

        $body =
            paletteReadJsonBody();

        $color =
            paletteNormalizeColor(
                $body['color']
                ?? null
            );


        $count =
            (int)
            $pdo
                ->query(
                    '
                    SELECT
                        COUNT(*)
                    FROM
                        calendar_color_palette
                    '
                )
                ->fetchColumn();


        if ($count >= 8) {
            throw new RuntimeException(
                '登録できる色は8色までです。'
            );
        }


        $sortOrder =
            (int)
            $pdo
                ->query(
                    '
                    SELECT
                        COALESCE(
                            MAX(sort_order),
                            -1
                        )
                        + 1
                    FROM
                        calendar_color_palette
                    '
                )
                ->fetchColumn();


        $statement =
            $pdo->prepare(
                '
                INSERT OR IGNORE INTO
                    calendar_color_palette
                (
                    color,
                    sort_order
                )
                VALUES
                (
                    :color,
                    :sort_order
                )
                '
            );


        $statement->execute([
            ':color' =>
                $color,

            ':sort_order' =>
                $sortOrder,
        ]);


        paletteJsonResponse([
            'success' =>
                true,

            'color' =>
                $color,

            'error' =>
                null,
        ]);
    }


    if ($method === 'DELETE') {

        $body =
            paletteReadJsonBody();

        $color =
            paletteNormalizeColor(
                $body['color']
                ?? null
            );


        $statement =
            $pdo->prepare(
                '
                DELETE FROM
                    calendar_color_palette
                WHERE
                    color = :color
                '
            );


        $statement->execute([
            ':color' =>
                $color,
        ]);


        paletteJsonResponse([
            'success' =>
                true,

            'error' =>
                null,
        ]);
    }


    paletteJsonResponse(
        [
            'success' =>
                false,

            'error' =>
                'Method not allowed.',
        ],
        405
    );

} catch (Throwable $error) {

    paletteJsonResponse(
        [
            'success' =>
                false,

            'error' =>
                $error->getMessage(),
        ],
        400
    );
}