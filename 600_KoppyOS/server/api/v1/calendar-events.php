<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/../../auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/lib/database.php';


function calendarEventJsonResponse(
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


function calendarEventReadJsonBody(): array
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


function calendarEventValidateDate(
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


function calendarEventNormalizeTime(
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

    return $base
        ->modify(
            "+{$dayOffset} day"
        )
        ->setTime(
            $normalizedHour,
            $minute
        )
        ->format(
            'Y-m-d H:i'
        );
}


function calendarEventValidateOwnerCode(
    string $ownerCode
): void {

    if (
        !in_array(
            $ownerCode,
            [
                'ui',
                'shii',
                'shared',
            ],
            true
        )
    ) {
        throw new RuntimeException(
            'Invalid owner_code.'
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
       予定一覧
    ===================================================== */

    if ($method === 'GET') {

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

        $ownerCode =
            isset($_GET['owner_code'])
                ? trim(
                    (string)
                    $_GET['owner_code']
                )
                : '';


        $conditions = [];
        $parameters = [];


        if ($dateFrom !== '') {

            calendarEventValidateDate(
                $dateFrom
            );

            $conditions[] =
                'start_at >= ?';

            $parameters[] =
                $dateFrom . ' 00:00';
        }


        if ($dateTo !== '') {

            calendarEventValidateDate(
                $dateTo
            );

            $dateToExclusive =
                (
                    new DateTimeImmutable(
                        $dateTo
                    )
                )
                ->modify(
                    '+1 day'
                )
                ->format(
                    'Y-m-d'
                );

            $conditions[] =
                'start_at < ?';

            $parameters[] =
                $dateToExclusive
                . ' 00:00';
        }


        if ($ownerCode !== '') {

            calendarEventValidateOwnerCode(
                $ownerCode
            );

            $conditions[] =
                'owner_code = ?';

            $parameters[] =
                $ownerCode;
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
                    id,
                    owner_code,
                    title,
                    start_at,
                    end_at,
                    all_day,
                    category,
                    memo,
                    text_color,
                    source,
                    external_id,
                    created_at,
                    updated_at

                FROM calendar_events

                {$whereSql}

                ORDER BY
                    start_at ASC,
                    id ASC
                "
            );


        $statement->execute(
            $parameters
        );


        calendarEventJsonResponse(
            [
                'success' =>
                    true,

                'events' =>
                    $statement
                        ->fetchAll(),

                'error' =>
                    null,
            ]
        );
    }


    /* =====================================================
       POST
       予定登録
    ===================================================== */

    if ($method === 'POST') {

        $body =
            calendarEventReadJsonBody();


        $ownerCode =
            isset($body['owner_code'])
                ? trim(
                    (string)
                    $body['owner_code']
                )
                : '';

        calendarEventValidateOwnerCode(
            $ownerCode
        );


        $title =
            isset($body['title'])
                ? trim(
                    (string)
                    $body['title']
                )
                : '';

        if ($title === '') {
            throw new RuntimeException(
                'title is required.'
            );
        }


        if (
            mb_strlen(
                $title
            ) > 120
        ) {
            throw new RuntimeException(
                'title is too long.'
            );
        }


        $eventDate =
            isset($body['event_date'])
                ? trim(
                    (string)
                    $body['event_date']
                )
                : '';

        calendarEventValidateDate(
            $eventDate
        );


        $endDate =
            isset($body['end_date'])
                ? trim(
                    (string)
                    $body['end_date']
                )
                : $eventDate;


        if ($endDate === '') {
            $endDate =
                $eventDate;
        }


        calendarEventValidateDate(
            $endDate
        );


        if ($endDate < $eventDate) {
            throw new RuntimeException(
                'end_date must not be before event_date.'
            );
        }


        $allDay =
            !empty(
                $body['all_day']
            );


        if ($allDay) {

            $startAt =
                $eventDate
                . ' 00:00';

            $endAt =
                $eventDate
                . ' 23:59';

        } else {

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


            if ($startTime === '') {

                if ($endTime !== '') {
                    throw new RuntimeException(
                        'start_time is required when end_time is set.'
                    );
                }


                $startAt =
                    $eventDate
                    . ' 00:00';

                $endAt =
                    null;

            } else {

                $startAt =
                    calendarEventNormalizeTime(
                        $eventDate,
                        $startTime
                    );


                $endAt =
                    $endTime === ''
                        ? null
                        : calendarEventNormalizeTime(
                            $eventDate,
                            $endTime
                        );


                if (
                    $endAt !== null
                    &&
                    $endAt < $startAt
                ) {
                    throw new RuntimeException(
                        'end_time must not be before start_time.'
                    );
                }
            }
        }


        $category =
            isset($body['category'])
                ? trim(
                    (string)
                    $body['category']
                )
                : '';

        $memo =
            isset($body['memo'])
                ? trim(
                    (string)
                    $body['memo']
                )
                : '';


        $statement =
            $pdo->prepare(
                "
                INSERT INTO calendar_events
                (
                    owner_code,
                    title,
                    start_at,
                    end_at,
                    all_day,
                    category,
                    memo,
                    source
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'manual'
                )
                "
            );


        $statement->execute([
            $ownerCode,
            $title,
            $startAt,
            $endAt,
            $allDay ? 1 : 0,
            $category !== ''
                ? $category
                : null,
            $memo !== ''
                ? $memo
                : null,
        ]);


        $eventId =
            (int)
            $pdo->lastInsertId();


        $recordStatement =
            $pdo->prepare(
                "
                SELECT
                    id,
                    owner_code,
                    title,
                    start_at,
                    end_at,
                    all_day,
                    category,
                    memo,
                    text_color,
                    source,
                    external_id,
                    created_at,
                    updated_at

                FROM calendar_events

                WHERE id = ?
                "
            );


        $recordStatement->execute([
            $eventId
        ]);


        calendarEventJsonResponse(
            [
                'success' =>
                    true,

                'event' =>
                    $recordStatement
                        ->fetch(),

                'error' =>
                    null,
            ],
            201
        );
    }


    /* =====================================================
       PATCH
       予定編集
    ===================================================== */

    if ($method === 'PATCH') {

        $body =
            calendarEventReadJsonBody();


        $eventId =
            isset($body['id'])
                ? (int)
                    $body['id']
                : 0;


        if ($eventId <= 0) {
            throw new RuntimeException(
                'id is required.'
            );
        }


        $existsStatement =
            $pdo->prepare(
                "
                SELECT COUNT(*)
                FROM calendar_events
                WHERE id = ?
                "
            );


        $existsStatement->execute([
            $eventId
        ]);


        if (
            (int)
            $existsStatement->fetchColumn()
            === 0
        ) {
            throw new RuntimeException(
                'Calendar event not found.'
            );
        }


        $ownerCode =
            isset($body['owner_code'])
                ? trim(
                    (string)
                    $body['owner_code']
                )
                : '';


        calendarEventValidateOwnerCode(
            $ownerCode
        );


        $title =
            isset($body['title'])
                ? trim(
                    (string)
                    $body['title']
                )
                : '';


        if ($title === '') {
            throw new RuntimeException(
                'title is required.'
            );
        }


        if (
            mb_strlen(
                $title
            ) > 120
        ) {
            throw new RuntimeException(
                'title is too long.'
            );
        }


        $eventDate =
            isset($body['event_date'])
                ? trim(
                    (string)
                    $body['event_date']
                )
                : '';


        calendarEventValidateDate(
            $eventDate
        );


        $allDay =
            !empty(
                $body['all_day']
            );


        if ($allDay) {

            $startAt =
                $eventDate
                . ' 00:00';

            $endAt =
                $eventDate
                . ' 23:59';

        } else {

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


            if ($startTime === '') {

                if ($endTime !== '') {
                    throw new RuntimeException(
                        'start_time is required when end_time is set.'
                    );
                }


                $startAt =
                    $eventDate
                    . ' 00:00';

                $endAt =
                    null;

            } else {

                $startAt =
                    calendarEventNormalizeTime(
                        $eventDate,
                        $startTime
                    );


                $endAt =
                    $endTime === ''
                        ? null
                        : calendarEventNormalizeTime(
                            $eventDate,
                            $endTime
                        );


                if (
                    $endAt !== null
                    &&
                    $endAt < $startAt
                ) {
                    throw new RuntimeException(
                        'end_time must not be before start_time.'
                    );
                }
            }
        }


        $category =
            isset($body['category'])
                ? trim(
                    (string)
                    $body['category']
                )
                : '';

        $memo =
            isset($body['memo'])
                ? trim(
                    (string)
                    $body['memo']
                )
                : '';


        $statement =
            $pdo->prepare(
                "
                UPDATE calendar_events

                SET
                    owner_code = ?,
                    title = ?,
                    start_at = ?,
                    end_at = ?,
                    all_day = ?,
                    category = ?,
                    memo = ?,
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = ?
                "
            );


        $statement->execute([
            $ownerCode,
            $title,
            $startAt,
            $endAt,
            $allDay ? 1 : 0,
            $category !== ''
                ? $category
                : null,
            $memo !== ''
                ? $memo
                : null,
            $eventId,
        ]);


        $recordStatement =
            $pdo->prepare(
                "
                SELECT
                    id,
                    owner_code,
                    title,
                    start_at,
                    end_at,
                    all_day,
                    category,
                    memo,
                    text_color,
                    source,
                    external_id,
                    created_at,
                    updated_at

                FROM calendar_events

                WHERE id = ?
                "
            );


        $recordStatement->execute([
            $eventId
        ]);


        calendarEventJsonResponse(
            [
                'success' =>
                    true,

                'event' =>
                    $recordStatement
                        ->fetch(),

                'error' =>
                    null,
            ]
        );
    }


    /* =====================================================
       DELETE
       予定削除
    ===================================================== */

    if ($method === 'DELETE') {

        $body =
            calendarEventReadJsonBody();


        $eventId =
            isset($body['id'])
                ? (int)
                    $body['id']
                : 0;


        if ($eventId <= 0) {
            throw new RuntimeException(
                'id is required.'
            );
        }


        $statement =
            $pdo->prepare(
                "
                DELETE FROM calendar_events
                WHERE id = ?
                "
            );


        $statement->execute([
            $eventId
        ]);


        if (
            $statement->rowCount()
            === 0
        ) {
            throw new RuntimeException(
                'Calendar event not found.'
            );
        }


        calendarEventJsonResponse(
            [
                'success' =>
                    true,

                'deleted_id' =>
                    $eventId,

                'error' =>
                    null,
            ]
        );
    }


    calendarEventJsonResponse(
        [
            'success' => false,
            'error' =>
                'Method not allowed.',
        ],
        405
    );


} catch (Throwable $e) {

    calendarEventJsonResponse(
        [
            'success' => false,
            'error' =>
                $e->getMessage(),
        ],
        400
    );
}