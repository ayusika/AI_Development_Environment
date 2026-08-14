<?php

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/lib/database.php';

$pdo = null;


/* =========================================================
   HELPERS
========================================================= */

function readJsonBody(): array
{
    $rawBody =
        file_get_contents(
            'php://input'
        );

    if (
        $rawBody === false
        || trim($rawBody) === ''
    ) {
        return [];
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

    return $payload;
}


function validateDate(
    string $value,
    string $label
): void {
    if (
        !preg_match(
            '/^\d{4}-\d{2}-\d{2}$/',
            $value
        )
    ) {
        throw new RuntimeException(
            $label . ' must be YYYY-MM-DD.'
        );
    }
}


function validateStartedAt(
    string $value
): void {
    if (
        !preg_match(
            '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/',
            $value
        )
    ) {
        throw new RuntimeException(
            'started_at must be YYYY-MM-DD HH:MM.'
        );
    }
}


function validateCustomerStatus(
    string $status
): void {
    $allowed = [
        'new',
        'repeat',
        'other_store_repeat',
        'repeat_unknown_id',
    ];

    if (
        !in_array(
            $status,
            $allowed,
            true
        )
    ) {
        throw new RuntimeException(
            'Invalid customer_status.'
        );
    }
}


function validateStore(
    PDO $pdo,
    int $storeId
): void {
    if ($storeId <= 0) {
        throw new RuntimeException(
            'store_id is required.'
        );
    }

    $statement =
        $pdo->prepare(
            'SELECT id
             FROM stores
             WHERE id = ?
               AND active = 1'
        );

    $statement->execute([
        $storeId
    ]);

    if (!$statement->fetchColumn()) {
        throw new RuntimeException(
            'Store was not found.'
        );
    }
}


function validateCustomer(
    PDO $pdo,
    ?int $customerId
): void {
    if ($customerId === null) {
        return;
    }

    $statement =
        $pdo->prepare(
            'SELECT id
             FROM customers
             WHERE id = ?'
        );

    $statement->execute([
        $customerId
    ]);

    if (!$statement->fetchColumn()) {
        throw new RuntimeException(
            'Customer was not found.'
        );
    }
}


function fetchVisit(
    PDO $pdo,
    int $visitId
): array {
    $statement =
        $pdo->prepare(
            "
            SELECT
                v.id,
                v.started_at,
                v.course_minutes,
                v.customer_status,
                v.status,
                v.customer_id,

                s.id AS store_id,
                s.name AS store_name,

                c.customer_code,

                cn.name AS customer_name,

                CASE
                    WHEN v.customer_id IS NOT NULL
                    THEN 1
                    ELSE 0
                END AS customer_linked,

                CASE
                    WHEN vs.id IS NOT NULL
                    THEN 1
                    ELSE 0
                END AS sales_entered,

                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM diary_visits dv
                        WHERE dv.visit_id = v.id
                    )
                    THEN 1
                    ELSE 0
                END AS diary_linked

            FROM visits v

            JOIN stores s
                ON s.id = v.store_id

            LEFT JOIN customers c
                ON c.id = v.customer_id

            LEFT JOIN customer_names cn
                ON cn.customer_id = c.id
               AND cn.is_primary = 1

            LEFT JOIN visit_sales vs
                ON vs.visit_id = v.id

            WHERE v.id = ?
            "
        );

    $statement->execute([
        $visitId
    ]);

    $visit =
        $statement->fetch();

    if (!$visit) {
        throw new RuntimeException(
            'Visit was not found.'
        );
    }

    return $visit;
}


/* =========================================================
   MAIN
========================================================= */

try {

    $pdo =
        koppyDatabase();

    $method =
        $_SERVER['REQUEST_METHOD']
        ?? 'GET';


    /* ======================================================
       GET
       1日 / 期間取得
    ====================================================== */

    if ($method === 'GET') {

        $date =
            trim(
                (string) (
                    $_GET['date']
                    ?? ''
                )
            );

        $dateFrom =
            trim(
                (string) (
                    $_GET['date_from']
                    ?? ''
                )
            );

        $dateTo =
            trim(
                (string) (
                    $_GET['date_to']
                    ?? ''
                )
            );


        if ($date !== '') {

            validateDate(
                $date,
                'date'
            );

            $dateFrom = $date;
            $dateTo = $date;

        } else {

            validateDate(
                $dateFrom,
                'date_from'
            );

            validateDate(
                $dateTo,
                'date_to'
            );
        }


        if ($dateFrom > $dateTo) {
            throw new RuntimeException(
                'date_from must be before date_to.'
            );
        }


        $statement =
            $pdo->prepare(
                "
                SELECT
                    v.id,
                    v.started_at,
                    v.course_minutes,
                    v.customer_status,
                    v.status,
                    v.customer_id,

                    s.id AS store_id,
                    s.name AS store_name,

                    c.customer_code,

                    cn.name AS customer_name,

                    CASE
                        WHEN v.customer_id IS NOT NULL
                        THEN 1
                        ELSE 0
                    END AS customer_linked,

                    CASE
                        WHEN vs.id IS NOT NULL
                        THEN 1
                        ELSE 0
                    END AS sales_entered,

                    CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM diary_visits dv
                            WHERE dv.visit_id = v.id
                        )
                        THEN 1
                        ELSE 0
                    END AS diary_linked

                FROM visits v

                JOIN stores s
                    ON s.id = v.store_id

                LEFT JOIN customers c
                    ON c.id = v.customer_id

                LEFT JOIN customer_names cn
                    ON cn.customer_id = c.id
                   AND cn.is_primary = 1

                LEFT JOIN visit_sales vs
                    ON vs.visit_id = v.id

                WHERE substr(
                    v.started_at,
                    1,
                    10
                ) BETWEEN ? AND ?

                ORDER BY
                    v.started_at ASC,
                    v.id ASC
                "
            );

        $statement->execute([
            $dateFrom,
            $dateTo,
        ]);

        echo json_encode(
            [
                'success' => true,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'visits' =>
                    $statement->fetchAll(),
                'error' => null,
            ],
            JSON_UNESCAPED_UNICODE |
            JSON_PRETTY_PRINT
        );

        exit;
    }


    /* ======================================================
       POST
       予約作成
    ====================================================== */

    if ($method === 'POST') {

        $payload =
            readJsonBody();


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

        $customerId =
            isset(
                $payload['customer_id']
            )
            && $payload['customer_id'] !== ''
            && $payload['customer_id'] !== null

                ? (int) $payload['customer_id']
                : null;


        validateStore(
            $pdo,
            $storeId
        );

        validateStartedAt(
            $startedAt
        );

        if ($courseMinutes <= 0) {
            throw new RuntimeException(
                'course_minutes must be a positive integer.'
            );
        }

        validateCustomerStatus(
            $customerStatus
        );

        validateCustomer(
            $pdo,
            $customerId
        );


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


        echo json_encode(
            [
                'success' => true,
                'visit' =>
                    fetchVisit(
                        $pdo,
                        $visitId
                    ),
                'error' => null,
            ],
            JSON_UNESCAPED_UNICODE |
            JSON_PRETTY_PRINT
        );

        exit;
    }


    /* ======================================================
       PATCH
       予約編集
    ====================================================== */

    if ($method === 'PATCH') {

        $payload =
            readJsonBody();

        $visitId =
            (int) (
                $payload['id']
                ?? 0
            );

        if ($visitId <= 0) {
            throw new RuntimeException(
                'id is required.'
            );
        }


        $currentVisit =
            fetchVisit(
                $pdo,
                $visitId
            );


        $storeId =
            array_key_exists(
                'store_id',
                $payload
            )
                ? (int) $payload['store_id']
                : (int) $currentVisit['store_id'];


        $startedAt =
            array_key_exists(
                'started_at',
                $payload
            )
                ? trim(
                    (string)
                    $payload['started_at']
                )
                : $currentVisit['started_at'];


        $courseMinutes =
            array_key_exists(
                'course_minutes',
                $payload
            )
                ? (int)
                    $payload['course_minutes']
                : (int)
                    $currentVisit['course_minutes'];


        $customerStatus =
            array_key_exists(
                'customer_status',
                $payload
            )
                ? trim(
                    (string)
                    $payload['customer_status']
                )
                : $currentVisit['customer_status'];


        $customerId =
            array_key_exists(
                'customer_id',
                $payload
            )
                ? (
                    $payload['customer_id'] === null
                    || $payload['customer_id'] === ''

                        ? null
                        : (int)
                            $payload['customer_id']
                )
                : (
                    $currentVisit['customer_id'] === null

                        ? null
                        : (int)
                            $currentVisit['customer_id']
                );


        validateStore(
            $pdo,
            $storeId
        );

        validateStartedAt(
            $startedAt
        );

        if ($courseMinutes <= 0) {
            throw new RuntimeException(
                'course_minutes must be a positive integer.'
            );
        }

        validateCustomerStatus(
            $customerStatus
        );

        validateCustomer(
            $pdo,
            $customerId
        );


        $statement =
            $pdo->prepare(
                "
                UPDATE visits

                SET
                    store_id = ?,
                    customer_id = ?,
                    started_at = ?,
                    course_minutes = ?,
                    customer_status = ?,
                    updated_at =
                        strftime(
                            '%Y-%m-%d %H:%M',
                            'now',
                            'localtime'
                        )

                WHERE id = ?
                "
            );

        $statement->execute([
            $storeId,
            $customerId,
            $startedAt,
            $courseMinutes,
            $customerStatus,
            $visitId,
        ]);


        echo json_encode(
            [
                'success' => true,
                'visit' =>
                    fetchVisit(
                        $pdo,
                        $visitId
                    ),
                'error' => null,
            ],
            JSON_UNESCAPED_UNICODE |
            JSON_PRETTY_PRINT
        );

        exit;
    }


    /* ======================================================
       DELETE
       予約削除
    ====================================================== */

    if ($method === 'DELETE') {

        $payload =
            readJsonBody();

        $visitId =
            (int) (
                $payload['id']
                ?? 0
            );

        if ($visitId <= 0) {
            throw new RuntimeException(
                'id is required.'
            );
        }


        fetchVisit(
            $pdo,
            $visitId
        );


        $statement =
            $pdo->prepare(
                'DELETE FROM visits
                 WHERE id = ?'
            );

        $statement->execute([
            $visitId
        ]);


        echo json_encode(
            [
                'success' => true,
                'deleted_id' => $visitId,
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
            'error' =>
                'Method not allowed.',
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    );


} catch (Throwable $e) {

    http_response_code(400);

    echo json_encode(
        [
            'success' => false,
            'error' =>
                $e->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    );
}
