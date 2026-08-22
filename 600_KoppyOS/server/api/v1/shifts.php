<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/lib/database.php';


function shiftJsonResponse(
    array $data,
    int $statusCode = 200
): never {

    http_response_code(
        $statusCode
    );

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    );

    exit;
}


function shiftReadJsonBody(): array
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


function shiftValidateDate(
    string $date
): void {

    $dateObject =
        DateTimeImmutable::createFromFormat(
            '!Y-m-d',
            $date
        );


    if (
        $dateObject === false
        ||
        $dateObject->format(
            'Y-m-d'
        ) !== $date
    ) {
        throw new RuntimeException(
            'Date must use YYYY-MM-DD.'
        );
    }
}


function shiftNormalizeTime(
    string $date,
    string $time
): string {

    if (
        !preg_match(
            '/^(\d{1,2}):([0-5]\d)$/',
            $time,
            $matches
        )
    ) {
        throw new RuntimeException(
            "Invalid time: {$time}"
        );
    }


    $hour =
        (int)
        $matches[1];


    $minute =
        (int)
        $matches[2];


    if (
        $hour < 0
        ||
        $hour > 47
    ) {
        throw new RuntimeException(
            "Invalid hour: {$time}"
        );
    }


    $base =
        new DateTimeImmutable(
            $date . ' 00:00:00'
        );


    $dayOffset =
        intdiv(
            $hour,
            24
        );


    $normalizedHour =
        $hour % 24;


    $result =
        $base
            ->modify(
                "+{$dayOffset} day"
            )
            ->setTime(
                $normalizedHour,
                $minute
            );


    return $result->format(
        'Y-m-d H:i'
    );
}


function shiftAssertWorkerExists(
    PDO $pdo,
    int $workerId
): void {

    $statement =
        $pdo->prepare(
            "
            SELECT COUNT(*)
            FROM workers
            WHERE
                id = ?
                AND active = 1
            "
        );


    $statement->execute([
        $workerId
    ]);


    if (
        (int)
        $statement->fetchColumn()
        === 0
    ) {
        throw new RuntimeException(
            'Worker not found.'
        );
    }
}


function shiftAssertStoreExists(
    PDO $pdo,
    int $storeId
): void {

    $statement =
        $pdo->prepare(
            "
            SELECT COUNT(*)
            FROM stores
            WHERE
                id = ?
                AND active = 1
            "
        );


    $statement->execute([
        $storeId
    ]);


    if (
        (int)
        $statement->fetchColumn()
        === 0
    ) {
        throw new RuntimeException(
            'Store not found.'
        );
    }
}


$pdo = null;


try {

    $method =
        strtoupper(
            $_SERVER['REQUEST_METHOD']
            ?? 'GET'
        );


    $pdo =
        koppyDatabase();


    /* =====================================================
       GET
       シフト一覧
    ===================================================== */

    if ($method === 'GET') {

        $workerId =
            isset($_GET['worker_id'])
                ? (int)
                    $_GET['worker_id']
                : 0;


        $dateFrom =
            isset($_GET['date_from'])
                ? trim(
                    (string)
                    $_GET['date_from']
                )
                : '';


        $dateTo =
            isset($_GET['date_to'])
                ? trim(
                    (string)
                    $_GET['date_to']
                )
                : '';


        $conditions = [];
        $parameters = [];


        if ($workerId > 0) {

            $conditions[] =
                'ws.worker_id = ?';

            $parameters[] =
                $workerId;
        }


        if ($dateFrom !== '') {

            shiftValidateDate(
                $dateFrom
            );

            $conditions[] =
                'ws.shift_date >= ?';

            $parameters[] =
                $dateFrom;
        }


        if ($dateTo !== '') {

            shiftValidateDate(
                $dateTo
            );

            $conditions[] =
                'ws.shift_date <= ?';

            $parameters[] =
                $dateTo;
        }


        $whereSql =
            $conditions === []
                ? ''
                : 'WHERE '
                    . implode(
                        ' AND ',
                        $conditions
                    );


        $statement =
            $pdo->prepare(
                "
                SELECT
                    ws.id,
                    ws.worker_id,

                    w.worker_code,
                    w.display_name,
                    w.is_reservation_owner,

                    ws.store_id,
                    s.name
                        AS store_name,

                    ws.shift_date,
                    ws.start_at,
                    ws.end_at,
                    ws.status,
                    ws.note,

                    ws.created_at,
                    ws.updated_at

                FROM work_shifts ws

                JOIN workers w
                    ON w.id = ws.worker_id

                LEFT JOIN stores s
                    ON s.id = ws.store_id

                {$whereSql}

                ORDER BY
                    ws.shift_date ASC,
                    ws.start_at ASC,
                    ws.id ASC
                "
            );


        $statement->execute(
            $parameters
        );


        shiftJsonResponse(
            [
                'success' => true,

                'shifts' =>
                    $statement
                        ->fetchAll(),

                'error' =>
                    null,
            ]
        );
    }


    /* =====================================================
       POST
       複数日まとめて登録
       または前週コピー
    ===================================================== */

    if ($method === 'POST') {

        $body =
            shiftReadJsonBody();


        $action =
            isset($body['action'])
                ? trim(
                    (string)
                    $body['action']
                )
                : 'create';


        /* -------------------------------------------------
           日別シフト一括登録
        ------------------------------------------------- */

        if ($action === 'create_batch') {

            $workerId =
                isset($body['worker_id'])
                    ? (int)
                        $body['worker_id']
                    : 0;


            $rows =
                isset($body['rows'])
                &&
                is_array(
                    $body['rows']
                )
                    ? $body['rows']
                    : [];


            if ($workerId <= 0) {
                throw new RuntimeException(
                    'worker_id is required.'
                );
            }


            shiftAssertWorkerExists(
                $pdo,
                $workerId
            );


            if ($rows === []) {
                throw new RuntimeException(
                    'rows is required.'
                );
            }


            if (
                count($rows)
                > 31
            ) {
                throw new RuntimeException(
                    'Too many shift rows.'
                );
            }


            $insertStatement =
                $pdo->prepare(
                    "
                    INSERT INTO work_shifts
                    (
                        worker_id,
                        store_id,
                        shift_date,
                        start_at,
                        end_at,
                        status,
                        note
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?
                    )
                    "
                );


            $createdIds = [];


            $pdo->beginTransaction();


            try {

                foreach (
                    $rows as $row
                ) {

                    if (!is_array($row)) {
                        throw new RuntimeException(
                            'Invalid shift row.'
                        );
                    }


                    $date =
                        isset($row['shift_date'])
                            ? trim(
                                (string)
                                $row['shift_date']
                            )
                            : '';


                    shiftValidateDate(
                        $date
                    );


                    $status =
                        isset($row['status'])
                            ? trim(
                                (string)
                                $row['status']
                            )
                            : 'draft';


                    if (
                        !in_array(
                            $status,
                            [
                                'draft',
                                'confirmed',
                                'off',
                            ],
                            true
                        )
                    ) {
                        throw new RuntimeException(
                            "Invalid shift status: {$date}"
                        );
                    }


                    $note =
                        isset($row['note'])
                            ? trim(
                                (string)
                                $row['note']
                            )
                            : null;


                    $storeId = null;
                    $startAt = null;
                    $endAt = null;


                    if ($status !== 'off') {

                        $storeId =
                            isset($row['store_id'])
                                ? (int)
                                    $row['store_id']
                                : 0;


                        if ($storeId <= 0) {
                            throw new RuntimeException(
                                "store_id is required: {$date}"
                            );
                        }


                        shiftAssertStoreExists(
                            $pdo,
                            $storeId
                        );


                        $startTime =
                            isset($row['start_time'])
                                ? trim(
                                    (string)
                                    $row['start_time']
                                )
                                : '';


                        $endTime =
                            isset($row['end_time'])
                                ? trim(
                                    (string)
                                    $row['end_time']
                                )
                                : '';


                        if (
                            $startTime === ''
                            ||
                            $endTime === ''
                        ) {
                            throw new RuntimeException(
                                "start_time and end_time are required: {$date}"
                            );
                        }


                        $startAt =
                            shiftNormalizeTime(
                                $date,
                                $startTime
                            );


                        $endAt =
                            shiftNormalizeTime(
                                $date,
                                $endTime
                            );


                        if (
                            $endAt <= $startAt
                        ) {
                            throw new RuntimeException(
                                "End time must be after start time: {$date}"
                            );
                        }
                    }


                    $insertStatement->execute([
                        $workerId,
                        $storeId,
                        $date,
                        $startAt,
                        $endAt,
                        $status,
                        $note,
                    ]);


                    $createdIds[] =
                        (int)
                        $pdo
                            ->lastInsertId();
                }


                $pdo->commit();


            } catch (Throwable $error) {

                if (
                    $pdo->inTransaction()
                ) {
                    $pdo->rollBack();
                }


                throw $error;
            }


            shiftJsonResponse(
                [
                    'success' => true,

                    'action' =>
                        'create_batch',

                    'created_count' =>
                        count(
                            $createdIds
                        ),

                    'created_ids' =>
                        $createdIds,

                    'error' =>
                        null,
                ],
                201
            );
        }


        /* -------------------------------------------------
           前週コピー
        ------------------------------------------------- */

        if ($action === 'copy_previous_week') {

            $workerId =
                isset($body['worker_id'])
                    ? (int)
                        $body['worker_id']
                    : 0;


            $targetWeekStart =
                isset($body['target_week_start'])
                    ? trim(
                        (string)
                        $body['target_week_start']
                    )
                    : '';


            if ($workerId <= 0) {
                throw new RuntimeException(
                    'worker_id is required.'
                );
            }


            shiftAssertWorkerExists(
                $pdo,
                $workerId
            );


            shiftValidateDate(
                $targetWeekStart
            );


            $targetStart =
                new DateTimeImmutable(
                    $targetWeekStart
                );


            $sourceStart =
                $targetStart
                    ->modify(
                        '-7 days'
                    );


            $sourceEnd =
                $sourceStart
                    ->modify(
                        '+6 days'
                    );


            $sourceStatement =
                $pdo->prepare(
                    "
                    SELECT
                        store_id,
                        shift_date,
                        start_at,
                        end_at,
                        status,
                        note

                    FROM work_shifts

                    WHERE
                        worker_id = ?
                        AND shift_date
                            BETWEEN ? AND ?

                    ORDER BY
                        shift_date ASC,
                        id ASC
                    "
                );


            $sourceStatement->execute([
                $workerId,
                $sourceStart->format(
                    'Y-m-d'
                ),
                $sourceEnd->format(
                    'Y-m-d'
                ),
            ]);


            $sourceRows =
                $sourceStatement
                    ->fetchAll();


            $insertStatement =
                $pdo->prepare(
                    "
                    INSERT INTO work_shifts
                    (
                        worker_id,
                        store_id,
                        shift_date,
                        start_at,
                        end_at,
                        status,
                        note
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?
                    )
                    "
                );


            $created = [];


            $pdo->beginTransaction();


            try {

                foreach (
                    $sourceRows as $row
                ) {

                    $sourceDate =
                        new DateTimeImmutable(
                            (string)
                            $row['shift_date']
                        );


                    $targetDate =
                        $sourceDate
                            ->modify(
                                '+7 days'
                            );


                    $targetDateString =
                        $targetDate
                            ->format(
                                'Y-m-d'
                            );


                    $startAt = null;
                    $endAt = null;


                    if (
                        $row['status']
                        !== 'off'
                    ) {

                        $sourceStartAt =
                            new DateTimeImmutable(
                                (string)
                                $row['start_at']
                            );


                        $sourceEndAt =
                            new DateTimeImmutable(
                                (string)
                                $row['end_at']
                            );


                        $dayDifference =
                            (int)
                            $sourceStartAt
                                ->diff(
                                    $sourceEndAt
                                )
                                ->format(
                                    '%a'
                                );


                        $startAt =
                            $targetDate
                                ->setTime(
                                    (int)
                                    $sourceStartAt
                                        ->format(
                                            'H'
                                        ),
                                    (int)
                                    $sourceStartAt
                                        ->format(
                                            'i'
                                        )
                                )
                                ->format(
                                    'Y-m-d H:i'
                                );


                        $endDate =
                            $targetDate;


                        if ($dayDifference > 0) {

                            $endDate =
                                $endDate
                                    ->modify(
                                        "+{$dayDifference} day"
                                    );
                        }


                        $endAt =
                            $endDate
                                ->setTime(
                                    (int)
                                    $sourceEndAt
                                        ->format(
                                            'H'
                                        ),
                                    (int)
                                    $sourceEndAt
                                        ->format(
                                            'i'
                                        )
                                )
                                ->format(
                                    'Y-m-d H:i'
                                );
                    }


                    $insertStatement->execute([
                        $workerId,
                        $row['store_id'],
                        $targetDateString,
                        $startAt,
                        $endAt,

                        /*
                         * コピー先は必ずdraft。
                         */
                        'draft',

                        $row['note'],
                    ]);


                    $created[] =
                        (int)
                        $pdo
                            ->lastInsertId();
                }


                $pdo->commit();


            } catch (Throwable $error) {

                if (
                    $pdo->inTransaction()
                ) {
                    $pdo->rollBack();
                }


                throw $error;
            }


            shiftJsonResponse(
                [
                    'success' => true,

                    'action' =>
                        'copy_previous_week',

                    'created_count' =>
                        count(
                            $created
                        ),

                    'created_ids' =>
                        $created,

                    'error' =>
                        null,
                ],
                201
            );
        }


        /* -------------------------------------------------
           通常一括登録
        ------------------------------------------------- */

        $workerId =
            isset($body['worker_id'])
                ? (int)
                    $body['worker_id']
                : 0;


        $storeId =
            isset($body['store_id'])
                ? (int)
                    $body['store_id']
                : 0;


        $dates =
            isset($body['dates'])
            &&
            is_array(
                $body['dates']
            )
                ? $body['dates']
                : [];


        $startTime =
            isset($body['start_time'])
                ? trim(
                    (string)
                    $body['start_time']
                )
                : '';


        $endTime =
            isset($body['end_time'])
                ? trim(
                    (string)
                    $body['end_time']
                )
                : '';


        $status =
            isset($body['status'])
                ? trim(
                    (string)
                    $body['status']
                )
                : 'draft';


        $note =
            isset($body['note'])
                ? trim(
                    (string)
                    $body['note']
                )
                : null;


        if ($workerId <= 0) {
            throw new RuntimeException(
                'worker_id is required.'
            );
        }


        shiftAssertWorkerExists(
            $pdo,
            $workerId
        );


        if (
            !in_array(
                $status,
                [
                    'draft',
                    'confirmed',
                    'off',
                ],
                true
            )
        ) {
            throw new RuntimeException(
                'Invalid shift status.'
            );
        }


        if ($dates === []) {
            throw new RuntimeException(
                'dates is required.'
            );
        }


        if (
            count($dates)
            > 31
        ) {
            throw new RuntimeException(
                'Too many shift dates.'
            );
        }


        if ($status !== 'off') {

            if ($storeId <= 0) {
                throw new RuntimeException(
                    'store_id is required.'
                );
            }


            shiftAssertStoreExists(
                $pdo,
                $storeId
            );


            if (
                $startTime === ''
                ||
                $endTime === ''
            ) {
                throw new RuntimeException(
                    'start_time and end_time are required.'
                );
            }
        }


        $insertStatement =
            $pdo->prepare(
                "
                INSERT INTO work_shifts
                (
                    worker_id,
                    store_id,
                    shift_date,
                    start_at,
                    end_at,
                    status,
                    note
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
                "
            );


        $createdIds = [];


        $pdo->beginTransaction();


        try {

            foreach (
                $dates as $dateValue
            ) {

                $date =
                    trim(
                        (string)
                        $dateValue
                    );


                shiftValidateDate(
                    $date
                );


                $startAt = null;
                $endAt = null;


                if ($status !== 'off') {

                    $startAt =
                        shiftNormalizeTime(
                            $date,
                            $startTime
                        );


                    $endAt =
                        shiftNormalizeTime(
                            $date,
                            $endTime
                        );


                    if (
                        $endAt <= $startAt
                    ) {
                        throw new RuntimeException(
                            "End time must be after start time: {$date}"
                        );
                    }
                }


                $insertStatement->execute([
                    $workerId,

                    $status === 'off'
                        ? null
                        : $storeId,

                    $date,
                    $startAt,
                    $endAt,
                    $status,
                    $note,
                ]);


                $createdIds[] =
                    (int)
                    $pdo
                        ->lastInsertId();
            }


            $pdo->commit();


        } catch (Throwable $error) {

            if (
                $pdo->inTransaction()
            ) {
                $pdo->rollBack();
            }


            throw $error;
        }


        shiftJsonResponse(
            [
                'success' => true,

                'action' =>
                    'create',

                'created_count' =>
                    count(
                        $createdIds
                    ),

                'created_ids' =>
                    $createdIds,

                'error' =>
                    null,
            ],
            201
        );
    }


    /* =====================================================
       PATCH
       個別シフト編集
    ===================================================== */

    if ($method === 'PATCH') {

        $body =
            shiftReadJsonBody();


        $shiftId =
            isset($body['id'])
                ? (int)
                    $body['id']
                : 0;


        if ($shiftId <= 0) {
            throw new RuntimeException(
                'id is required.'
            );
        }


        $currentStatement =
            $pdo->prepare(
                "
                SELECT *
                FROM work_shifts
                WHERE id = ?
                LIMIT 1
                "
            );


        $currentStatement->execute([
            $shiftId
        ]);


        $current =
            $currentStatement
                ->fetch();


        if (!$current) {
            throw new RuntimeException(
                'Shift not found.'
            );
        }


        $shiftDate =
            isset($body['shift_date'])
                ? trim(
                    (string)
                    $body['shift_date']
                )
                : (string)
                    $current['shift_date'];


        shiftValidateDate(
            $shiftDate
        );


        $status =
            isset($body['status'])
                ? trim(
                    (string)
                    $body['status']
                )
                : (string)
                    $current['status'];


        if (
            !in_array(
                $status,
                [
                    'draft',
                    'confirmed',
                    'off',
                ],
                true
            )
        ) {
            throw new RuntimeException(
                'Invalid shift status.'
            );
        }


        $storeId =
            isset($body['store_id'])
                ? (int)
                    $body['store_id']
                : (
                    $current['store_id']
                    !== null
                        ? (int)
                            $current['store_id']
                        : 0
                );


        $note =
            array_key_exists(
                'note',
                $body
            )
                ? trim(
                    (string)
                    $body['note']
                )
                : $current['note'];


        $startAt = null;
        $endAt = null;


        if ($status !== 'off') {

            if ($storeId <= 0) {
                throw new RuntimeException(
                    'store_id is required.'
                );
            }


            shiftAssertStoreExists(
                $pdo,
                $storeId
            );


            $startTime =
                isset($body['start_time'])
                    ? trim(
                        (string)
                        $body['start_time']
                    )
                    : substr(
                        (string)
                        $current['start_at'],
                        11,
                        5
                    );


            $endCurrent =
                new DateTimeImmutable(
                    (string)
                    $current['end_at']
                );


            $startCurrent =
                new DateTimeImmutable(
                    (string)
                    $current['start_at']
                );


            $endHour =
                (int)
                $endCurrent->format(
                    'H'
                );


            if (
                $endCurrent->format(
                    'Y-m-d'
                )
                >
                $startCurrent->format(
                    'Y-m-d'
                )
            ) {

                $endHour +=
                    24;
            }


            $defaultEndTime =
                sprintf(
                    '%02d:%s',
                    $endHour,
                    $endCurrent->format(
                        'i'
                    )
                );


            $endTime =
                isset($body['end_time'])
                    ? trim(
                        (string)
                        $body['end_time']
                    )
                    : $defaultEndTime;


            $startAt =
                shiftNormalizeTime(
                    $shiftDate,
                    $startTime
                );


            $endAt =
                shiftNormalizeTime(
                    $shiftDate,
                    $endTime
                );


            if ($endAt <= $startAt) {
                throw new RuntimeException(
                    'End time must be after start time.'
                );
            }

        } else {

            $storeId = 0;
        }


        $updateStatement =
            $pdo->prepare(
                "
                UPDATE work_shifts

                SET
                    store_id = ?,
                    shift_date = ?,
                    start_at = ?,
                    end_at = ?,
                    status = ?,
                    note = ?,

                    updated_at = (
                        strftime(
                            '%Y-%m-%d %H:%M',
                            'now',
                            'localtime'
                        )
                    )

                WHERE id = ?
                "
            );


        $updateStatement->execute([
            $status === 'off'
                ? null
                : $storeId,

            $shiftDate,
            $startAt,
            $endAt,
            $status,
            $note,
            $shiftId,
        ]);


        shiftJsonResponse(
            [
                'success' => true,

                'updated_id' =>
                    $shiftId,

                'error' =>
                    null,
            ]
        );
    }


    /* =====================================================
       DELETE
    ===================================================== */

    if ($method === 'DELETE') {

        $body =
            shiftReadJsonBody();


        $shiftId =
            isset($body['id'])
                ? (int)
                    $body['id']
                : 0;


        if ($shiftId <= 0) {
            throw new RuntimeException(
                'id is required.'
            );
        }


        $deleteStatement =
            $pdo->prepare(
                "
                DELETE FROM work_shifts
                WHERE id = ?
                "
            );


        $deleteStatement->execute([
            $shiftId
        ]);


        if (
            $deleteStatement->rowCount()
            === 0
        ) {
            throw new RuntimeException(
                'Shift not found.'
            );
        }


        shiftJsonResponse(
            [
                'success' => true,

                'deleted_id' =>
                    $shiftId,

                'error' =>
                    null,
            ]
        );
    }


    shiftJsonResponse(
        [
            'success' => false,

            'error' =>
                'Method not allowed.',
        ],
        405
    );


} catch (Throwable $error) {

    if (
        $pdo instanceof PDO
        &&
        $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }


    shiftJsonResponse(
        [
            'success' => false,

            'error' =>
                $error->getMessage(),
        ],
        400
    );
}