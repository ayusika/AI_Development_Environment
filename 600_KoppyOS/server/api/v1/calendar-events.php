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


function calendarEventNormalizeTextColor(
    mixed $value
): ?string {
    $textColor =
        trim(
            (string)
            ($value ?? '')
        );

    if ($textColor === '') {
        return null;
    }

    if (
        !preg_match(
            '/^#[0-9A-Fa-f]{6}$/',
            $textColor
        )
    ) {
        throw new RuntimeException(
            'Invalid text_color.'
        );
    }

    return strtolower(
        $textColor
    );
}


function calendarEventBuildTimes(
    array $body
): array {
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
        return [
            'event_date' =>
                $eventDate,
            'end_date' =>
                $endDate,
            'all_day' =>
                true,
            'start_at' =>
                $eventDate
                . ' 00:00',
            'end_at' =>
                $endDate
                . ' 23:59',
        ];
    }

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
            $endDate > $eventDate
                ? $endDate . ' 23:59'
                : null;

        return [
            'event_date' =>
                $eventDate,
            'end_date' =>
                $endDate,
            'all_day' =>
                false,
            'start_at' =>
                $startAt,
            'end_at' =>
                $endAt,
        ];
    }

    $startAt =
        calendarEventNormalizeTime(
            $eventDate,
            $startTime
        );

    if ($endTime !== '') {
        $endAt =
            calendarEventNormalizeTime(
                $endDate,
                $endTime
            );
    } elseif ($endDate > $eventDate) {
        $endAt =
            $endDate
            . ' 23:59';
    } else {
        $endAt =
            null;
    }

    if (
        $endAt !== null
        &&
        $endAt < $startAt
    ) {
        throw new RuntimeException(
            'end time must not be before start time.'
        );
    }

    return [
        'event_date' =>
            $eventDate,
        'end_date' =>
            $endDate,
        'all_day' =>
            false,
        'start_at' =>
            $startAt,
        'end_at' =>
            $endAt,
    ];
}


function calendarEventReadCommonFields(
    array $body
): array {
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

    $timeData =
        calendarEventBuildTimes(
            $body
        );

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

    $textColor =
        calendarEventNormalizeTextColor(
            $body['text_color']
            ?? null
        );

    return [
        'owner_code' =>
            $ownerCode,
        'title' =>
            $title,
        'start_at' =>
            $timeData['start_at'],
        'end_at' =>
            $timeData['end_at'],
        'all_day' =>
            $timeData['all_day']
                ? 1
                : 0,
        'category' =>
            $category !== ''
                ? $category
                : null,
        'memo' =>
            $memo !== ''
                ? $memo
                : null,
        'text_color' =>
            $textColor,
    ];
}


function calendarEventSelectById(
    PDO $pdo,
    int $eventId
): array|false {
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

            WHERE id = ?
            "
        );

    $statement->execute([
        $eventId
    ]);

    return $statement->fetch();
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

            /*
             * 開始日が検索範囲より前でも、
             * 終了日が範囲内なら複数日予定として取得する。
             */
            $conditions[] =
                'COALESCE(end_at, start_at) >= ?';

            $parameters[] =
                $dateFrom
                . ' 00:00';
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

        $fields =
            calendarEventReadCommonFields(
                $body
            );

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
                    text_color,
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
                    ?,
                    'manual'
                )
                "
            );

        $statement->execute([
            $fields['owner_code'],
            $fields['title'],
            $fields['start_at'],
            $fields['end_at'],
            $fields['all_day'],
            $fields['category'],
            $fields['memo'],
            $fields['text_color'],
        ]);

        $eventId =
            (int)
            $pdo->lastInsertId();

        $event =
            calendarEventSelectById(
                $pdo,
                $eventId
            );

        calendarEventJsonResponse(
            [
                'success' =>
                    true,
                'event' =>
                    $event,
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

        $fields =
            calendarEventReadCommonFields(
                $body
            );

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
                    text_color = ?,
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = ?
                "
            );

        $statement->execute([
            $fields['owner_code'],
            $fields['title'],
            $fields['start_at'],
            $fields['end_at'],
            $fields['all_day'],
            $fields['category'],
            $fields['memo'],
            $fields['text_color'],
            $eventId,
        ]);

        $event =
            calendarEventSelectById(
                $pdo,
                $eventId
            );

        calendarEventJsonResponse(
            [
                'success' =>
                    true,
                'event' =>
                    $event,
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