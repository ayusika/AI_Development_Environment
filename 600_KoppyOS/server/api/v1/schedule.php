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


function validateBookedAt(
    ?string $value
): void {
    if ($value === null) {
        return;
    }

    if (
        !preg_match(
            '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/',
            $value
        )
    ) {
        throw new RuntimeException(
            'booked_at must be YYYY-MM-DD HH:MM.'
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


function fetchVisitOptions(
    PDO $pdo,
    int $visitId
): array {
    $statement =
        $pdo->prepare(
            "
            SELECT
                vo.option_id,
                o.name,
                vo.custom_name,
                vo.income_amount

            FROM visit_options vo

            LEFT JOIN options o
                ON o.id = vo.option_id

            WHERE vo.visit_id = ?

            ORDER BY
                o.sort_order ASC,
                vo.id ASC
            "
        );

    $statement->execute([
        $visitId
    ]);

    return
        $statement->fetchAll();
}


function saveVisitOptions(
    PDO $pdo,
    int $visitId,
    array $optionNames,
    ?string $customName
): void {
    $deleteStatement =
        $pdo->prepare(
            'DELETE FROM visit_options
             WHERE visit_id = ?'
        );

    $deleteStatement->execute([
        $visitId
    ]);


    $optionStatement =
        $pdo->prepare(
            'SELECT id
             FROM options
             WHERE name = ?
               AND active = 1'
        );

    $insertStatement =
        $pdo->prepare(
            'INSERT INTO visit_options
            (
                visit_id,
                option_id,
                custom_name
            )
            VALUES (?, ?, ?)'
        );


    foreach ($optionNames as $name) {

        $name =
            trim(
                (string) $name
            );

        if ($name === '') {
            continue;
        }

        $optionStatement->execute([
            $name
        ]);

        $optionId =
            $optionStatement->fetchColumn();

        if (!$optionId) {
            throw new RuntimeException(
                'Option was not found: '
                . $name
            );
        }

        $insertStatement->execute([
            $visitId,
            (int) $optionId,
            null,
        ]);
    }


    $customName =
        $customName !== null
            ? trim($customName)
            : '';

    if ($customName !== '') {

        $insertStatement->execute([
            $visitId,
            null,
            $customName,
        ]);
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
                v.booked_at,
                v.course_minutes,
                v.customer_status,
                v.status,
                v.cancelled_at,
                v.cancel_reason,
                v.cancelled_by,
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

    $visit['options'] =
        fetchVisitOptions(
            $pdo,
            $visitId
        );

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

        $historyVisitId =
            isset($_GET['visit_id'])
            && $_GET['visit_id'] !== ''

                ? (int) $_GET['visit_id']
                : null;


        if (
            $historyVisitId !== null
            && $historyVisitId > 0
        ) {

            fetchVisit(
                $pdo,
                $historyVisitId
            );


            $historyStatement =
                $pdo->prepare(
                    "
                    SELECT
                        id,
                        visit_id,
                        requested_at,
                        change_type,
                        before_data,
                        after_data,
                        note,
                        created_at

                    FROM visit_change_history

                    WHERE visit_id = ?

                    ORDER BY
                        requested_at DESC,
                        id DESC
                    "
                );

            $historyStatement->execute([
                $historyVisitId
            ]);


            $history =
                $historyStatement->fetchAll();


            foreach ($history as &$historyItem) {

                $historyItem['before_data'] =
                    json_decode(
                        $historyItem['before_data'],
                        true
                    );

                $historyItem['after_data'] =
                    json_decode(
                        $historyItem['after_data'],
                        true
                    );
            }

            unset($historyItem);


            echo json_encode(
                [
                    'success' => true,
                    'visit_id' =>
                        $historyVisitId,
                    'history' =>
                        $history,
                    'error' => null,
                ],
                JSON_UNESCAPED_UNICODE |
                JSON_PRETTY_PRINT
            );

            exit;
        }


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
                    v.booked_at,
                    v.course_minutes,
                    v.customer_status,
                    v.status,
                    v.cancelled_at,
                    v.cancel_reason,
                    v.cancelled_by,
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

                WHERE
                    (
                        substr(
                            v.started_at,
                            1,
                            10
                        ) BETWEEN ? AND ?
                    )
                    OR
                    (
                        substr(
                            v.started_at,
                            1,
                            10
                        ) = ?
                        AND substr(
                            v.started_at,
                            12,
                            5
                        ) < '03:00'
                    )

                ORDER BY
                    v.started_at ASC,
                    v.id ASC
                "
            );

        $queryDateTo =
            (new DateTimeImmutable(
                $dateTo
            ))
                ->modify('+1 day')
                ->format('Y-m-d');


        $statement->execute([
            $dateFrom,
            $dateTo,
            $queryDateTo,
        ]);

        $visits =
            $statement->fetchAll();

        foreach ($visits as &$visit) {

            $visit['options'] =
                fetchVisitOptions(
                    $pdo,
                    (int) $visit['id']
                );
        }

        unset($visit);


        echo json_encode(
            [
                'success' => true,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'visits' => $visits,
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


        $bookedAt =
            isset($payload['booked_at'])
            && $payload['booked_at'] !== ''

                ? trim(
                    (string)
                    $payload['booked_at']
                )
                : null;


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


        $optionNames =
            isset($payload['options'])
            && is_array($payload['options'])

                ? $payload['options']
                : [];


        $customOption =
            isset($payload['custom_option'])

                ? trim(
                    (string)
                    $payload['custom_option']
                )
                : null;


        validateStore(
            $pdo,
            $storeId
        );

        validateStartedAt(
            $startedAt
        );

        validateBookedAt(
            $bookedAt
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
                    booked_at,
                    course_minutes,
                    customer_status,
                    is_dummy,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
            );

        $statement->execute([
            $storeId,
            $customerId,
            $startedAt,
            $bookedAt,
            $courseMinutes,
            $customerStatus,
            'scheduled',
        ]);


        $visitId =
            (int) $pdo->lastInsertId();


        saveVisitOptions(
            $pdo,
            $visitId,
            $optionNames,
            $customOption
        );


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


        $bookedAt =
            array_key_exists(
                'booked_at',
                $payload
            )
                ? (
                    $payload['booked_at'] === null
                    || $payload['booked_at'] === ''

                        ? null
                        : trim(
                            (string)
                            $payload['booked_at']
                        )
                )
                : (
                    $currentVisit['booked_at'] === null

                        ? null
                        : (string)
                            $currentVisit['booked_at']
                );


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


        $customerRequestedChange =
            filter_var(
                $payload['customer_requested_change']
                ?? false,
                FILTER_VALIDATE_BOOLEAN
            );


        $status =
            array_key_exists(
                'status',
                $payload
            )
                ? trim(
                    (string)
                    $payload['status']
                )
                : (string)
                    $currentVisit['status'];


        $cancelledAt =
            array_key_exists(
                'cancelled_at',
                $payload
            )
                ? (
                    $payload['cancelled_at'] === null
                    || $payload['cancelled_at'] === ''

                        ? null
                        : trim(
                            (string)
                            $payload['cancelled_at']
                        )
                )
                : (
                    $currentVisit['cancelled_at'] === null

                        ? null
                        : (string)
                            $currentVisit['cancelled_at']
                );


        $cancelReason =
            array_key_exists(
                'cancel_reason',
                $payload
            )
                ? (
                    $payload['cancel_reason'] === null

                        ? null
                        : trim(
                            (string)
                            $payload['cancel_reason']
                        )
                )
                : (
                    $currentVisit['cancel_reason'] === null

                        ? null
                        : (string)
                            $currentVisit['cancel_reason']
                );


        $cancelledBy =
            array_key_exists(
                'cancelled_by',
                $payload
            )
                ? (
                    $payload['cancelled_by'] === null
                    || $payload['cancelled_by'] === ''

                        ? null
                        : trim(
                            (string)
                            $payload['cancelled_by']
                        )
                )
                : (
                    $currentVisit['cancelled_by'] === null

                        ? null
                        : (string)
                            $currentVisit['cancelled_by']
                );


        $hasOptions =
            array_key_exists(
                'options',
                $payload
            )
            || array_key_exists(
                'custom_option',
                $payload
            );

        $optionNames =
            isset($payload['options'])
            && is_array($payload['options'])

                ? $payload['options']
                : [];

        $customOption =
            isset($payload['custom_option'])

                ? trim(
                    (string)
                    $payload['custom_option']
                )
                : null;


        validateStore(
            $pdo,
            $storeId
        );

        validateStartedAt(
            $startedAt
        );

        validateBookedAt(
            $bookedAt
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


        $allowedStatuses = [
            'scheduled',
            'completed',
            'cancelled',
            'no_show',
        ];


        if (
            !in_array(
                $status,
                $allowedStatuses,
                true
            )
        ) {
            throw new RuntimeException(
                'Invalid status.'
            );
        }


        $allowedCancelledBy = [
            'customer',
            'self',
            'store',
            'other',
        ];


        if (
            $cancelledBy !== null
            && !in_array(
                $cancelledBy,
                $allowedCancelledBy,
                true
            )
        ) {
            throw new RuntimeException(
                'Invalid cancelled_by.'
            );
        }


        if (
            $cancelledBy === 'customer'
            && $customerId === null
        ) {
            throw new RuntimeException(
                'Customer cancellation requires a linked customer.'
            );
        }


        if (
            $status === 'cancelled'
            && $cancelledBy === 'customer'
        ) {

            if (
                $cancelReason === null
                || trim($cancelReason) === ''
            ) {
                throw new RuntimeException(
                    'Customer cancellation requires a cancel_reason.'
                );
            }


            $cancelledAt =
                (string)
                $pdo
                    ->query(
                        "
                        SELECT strftime(
                            '%Y-%m-%d %H:%M',
                            'now',
                            'localtime'
                        )
                        "
                    )
                    ->fetchColumn();
        }


        if ($status !== 'cancelled') {

            $cancelledAt = null;
            $cancelReason = null;
            $cancelledBy = null;
        }


        $pdo->beginTransaction();


        $beforeChangeData = [
            'store_id' =>
                (int) $currentVisit['store_id'],

            'started_at' =>
                $currentVisit['started_at'],

            'booked_at' =>
                $currentVisit['booked_at'],

            'course_minutes' =>
                (int) $currentVisit['course_minutes'],

            'customer_status' =>
                $currentVisit['customer_status'],

            'customer_id' =>
                $currentVisit['customer_id'] === null
                    ? null
                    : (int) $currentVisit['customer_id'],

            'options' =>
                $currentVisit['options'],
        ];


        $statement =
            $pdo->prepare(
                "
                UPDATE visits

                SET
                    store_id = ?,
                    customer_id = ?,
                    started_at = ?,
                    booked_at = ?,
                    course_minutes = ?,
                    customer_status = ?,
                    status = ?,
                    cancelled_at = ?,
                    cancel_reason = ?,
                    cancelled_by = ?,
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
            $bookedAt,
            $courseMinutes,
            $customerStatus,
            $status,
            $cancelledAt,
            $cancelReason,
            $cancelledBy,
            $visitId,
        ]);


        if ($hasOptions) {

            saveVisitOptions(
                $pdo,
                $visitId,
                $optionNames,
                $customOption
            );
        }


        $updatedVisit =
            fetchVisit(
                $pdo,
                $visitId
            );


        $afterChangeData = [
            'store_id' =>
                (int) $updatedVisit['store_id'],

            'started_at' =>
                $updatedVisit['started_at'],

            'booked_at' =>
                $updatedVisit['booked_at'],

            'course_minutes' =>
                (int) $updatedVisit['course_minutes'],

            'customer_status' =>
                $updatedVisit['customer_status'],

            'customer_id' =>
                $updatedVisit['customer_id'] === null
                    ? null
                    : (int) $updatedVisit['customer_id'],

            'options' =>
                $updatedVisit['options'],
        ];


        $changedTypes = [];


        if (
            $beforeChangeData['started_at']
            !== $afterChangeData['started_at']
        ) {
            $changedTypes[] = 'datetime';
        }


        if (
            $beforeChangeData['course_minutes']
            !== $afterChangeData['course_minutes']
        ) {
            $changedTypes[] = 'course';
        }


        if (
            $beforeChangeData['store_id']
            !== $afterChangeData['store_id']
        ) {
            $changedTypes[] = 'store';
        }


        if (
            json_encode(
                $beforeChangeData['options'],
                JSON_UNESCAPED_UNICODE
            )
            !==
            json_encode(
                $afterChangeData['options'],
                JSON_UNESCAPED_UNICODE
            )
        ) {
            $changedTypes[] = 'option';
        }


        if (
            $beforeChangeData['customer_status']
            !== $afterChangeData['customer_status']
        ) {
            $changedTypes[] = 'status';
        }


        $changeType = null;

        if (count($changedTypes) === 1) {

            $changeType =
                $changedTypes[0];

        } elseif (count($changedTypes) > 1) {

            $changeType = 'multiple';
        }


        if (
            $customerRequestedChange
            && $changeType !== null
        ) {

            $beforeJson =
                json_encode(
                    $beforeChangeData,
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                    | JSON_THROW_ON_ERROR
                );

            $afterJson =
                json_encode(
                    $afterChangeData,
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                    | JSON_THROW_ON_ERROR
                );


            $historyStatement =
                $pdo->prepare(
                    "
                    INSERT INTO visit_change_history
                    (
                        visit_id,
                        requested_at,
                        change_type,
                        before_data,
                        after_data,
                        note
                    )
                    VALUES (
                        ?,
                        strftime(
                            '%Y-%m-%d %H:%M',
                            'now',
                            'localtime'
                        ),
                        ?,
                        ?,
                        ?,
                        ?
                    )
                    "
                );


            $historyStatement->execute([
                $visitId,
                $changeType,
                $beforeJson,
                $afterJson,
                null,
            ]);
        }


        $pdo->commit();


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

    if (
        $pdo instanceof PDO
        && $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }

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
