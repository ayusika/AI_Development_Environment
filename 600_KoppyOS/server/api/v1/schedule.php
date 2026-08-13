<?php

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/lib/database.php';

$pdo = null;

try {
    $pdo = koppyDatabase();

    $method =
        $_SERVER['REQUEST_METHOD']
        ?? 'GET';

    /*
     * ======================================================
     * GET
     * 指定日の予約一覧
     * ======================================================
     */

    if ($method === 'GET') {

        $date =
            trim(
                (string) (
                    $_GET['date']
                    ?? ''
                )
            );

        if (
            !preg_match(
                '/^\d{4}-\d{2}-\d{2}$/',
                $date
            )
        ) {
            throw new RuntimeException(
                'date must be YYYY-MM-DD.'
            );
        }

        $statement = $pdo->prepare(
            "
            SELECT
                v.id,
                v.started_at,
                v.course_minutes,
                v.customer_status,
                v.status,

                s.id AS store_id,
                s.name AS store_name,

                c.customer_code,

                cn.name AS customer_name

            FROM visits v

            JOIN stores s
                ON s.id = v.store_id

            LEFT JOIN customers c
                ON c.id = v.customer_id

            LEFT JOIN customer_names cn
                ON cn.customer_id = c.id
               AND cn.is_primary = 1

            WHERE substr(
                v.started_at,
                1,
                10
            ) = ?

            ORDER BY
                v.started_at ASC,
                v.id ASC
            "
        );

        $statement->execute([
            $date
        ]);

        $visits =
            $statement->fetchAll();

        echo json_encode(
            [
                'success' => true,
                'date' => $date,
                'visits' => $visits,
                'error' => null,
            ],
            JSON_UNESCAPED_UNICODE |
            JSON_PRETTY_PRINT
        );

        exit;
    }

    /*
     * ======================================================
     * POST
     * 新規予約 / 接客登録
     * ======================================================
     */

    if ($method === 'POST') {

        $rawBody =
            file_get_contents(
                'php://input'
            );

        if (
            $rawBody === false
            || trim($rawBody) === ''
        ) {
            throw new RuntimeException(
                'Request body is empty.'
            );
        }

        $payload =
            json_decode(
                $rawBody,
                true
            );

        if (!is_array($payload)) {
            throw new RuntimeException(
                'Invalid JSON body.'
            );
        }

        $storeId =
            (int) (
                $payload['store_id']
                ?? 0
            );

        $startedAt =
            trim(
                (string) (
                    $payload['started_at']
                    ?? ''
                )
            );

        $courseMinutes =
            isset(
                $payload['course_minutes']
            )
                ? (int) $payload['course_minutes']
                : null;

        $customerStatus =
            trim(
                (string) (
                    $payload['customer_status']
                    ?? ''
                )
            );

        $customerId =
            isset(
                $payload['customer_id']
            )
                && $payload['customer_id'] !== ''
                && $payload['customer_id'] !== null

                ? (int) $payload['customer_id']
                : null;

        /*
         * 必須チェック
         */

        if ($storeId <= 0) {
            throw new RuntimeException(
                'store_id is required.'
            );
        }

        if (
            !preg_match(
                '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/',
                $startedAt
            )
        ) {
            throw new RuntimeException(
                'started_at must be YYYY-MM-DD HH:MM.'
            );
        }

        if (
            $courseMinutes === null
            || $courseMinutes <= 0
        ) {
            throw new RuntimeException(
                'course_minutes must be a positive integer.'
            );
        }

        $allowedCustomerStatuses = [
            'new',
            'repeat',
            'other_store_repeat',
            'repeat_unknown_id',
        ];

        if (
            !in_array(
                $customerStatus,
                $allowedCustomerStatuses,
                true
            )
        ) {
            throw new RuntimeException(
                'Invalid customer_status.'
            );
        }

        /*
         * 店舗存在確認
         */

        $storeStatement =
            $pdo->prepare(
                'SELECT id
                 FROM stores
                 WHERE id = ?
                   AND active = 1'
            );

        $storeStatement->execute([
            $storeId
        ]);

        if (
            !$storeStatement->fetchColumn()
        ) {
            throw new RuntimeException(
                'Store was not found.'
            );
        }

        /*
         * 顧客IDがある場合のみ存在確認
         */

        if ($customerId !== null) {

            $customerStatement =
                $pdo->prepare(
                    'SELECT id
                     FROM customers
                     WHERE id = ?'
                );

            $customerStatement->execute([
                $customerId
            ]);

            if (
                !$customerStatement->fetchColumn()
            ) {
                throw new RuntimeException(
                    'Customer was not found.'
                );
            }
        }

        /*
         * visit作成
         */

        $statement =
            $pdo->prepare(
                'INSERT INTO visits
                (
                    store_id,
                    customer_id,
                    started_at,
                    course_minutes,
                    customer_status,
                    is_dummy,
                    status
                )
                VALUES (?, ?, ?, ?, ?, 0, ?)'
            );

        $statement->execute([
            $storeId,
            $customerId,
            $startedAt,
            $courseMinutes,
            $customerStatus,
            'scheduled',
        ]);

        $visitId =
            (int) $pdo->lastInsertId();

        /*
         * 作成結果を読み戻す
         */

        $readStatement =
            $pdo->prepare(
                "
                SELECT
                    v.id,
                    v.started_at,
                    v.course_minutes,
                    v.customer_status,
                    v.status,

                    s.id AS store_id,
                    s.name AS store_name

                FROM visits v

                JOIN stores s
                    ON s.id = v.store_id

                WHERE v.id = ?
                "
            );

        $readStatement->execute([
            $visitId
        ]);

        $visit =
            $readStatement->fetch();

        echo json_encode(
            [
                'success' => true,
                'visit' => $visit,
                'error' => null,
            ],
            JSON_UNESCAPED_UNICODE |
            JSON_PRETTY_PRINT
        );

        exit;
    }

    http_response_code(405);

    echo json_encode(
        [
            'success' => false,
            'error' => 'Method not allowed.',
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    );

} catch (Throwable $e) {

    http_response_code(400);

    echo json_encode(
        [
            'success' => false,
            'error' => $e->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    );
}