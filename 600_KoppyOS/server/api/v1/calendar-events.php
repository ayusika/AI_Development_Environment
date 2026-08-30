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


function calendarEventReadRepeatFields(
    array $body
): array {
    $repeatType =
        isset($body['repeat_type'])
            ? trim(
                (string)
                $body['repeat_type']
            )
            : 'none';


    $allowedRepeatTypes = [
        'none',
        'daily',
        'weekly',
        'monthly_day',
        'monthly_weekday',
        'yearly',
    ];


    if (
        !in_array(
            $repeatType,
            $allowedRepeatTypes,
            true
        )
    ) {
        throw new RuntimeException(
            'Invalid repeat_type.'
        );
    }


    $repeatInterval =
        isset($body['repeat_interval'])
            ? (int)
                $body['repeat_interval']
            : 1;


    if (
        $repeatInterval < 1
        ||
        $repeatInterval > 365
    ) {
        throw new RuntimeException(
            'Invalid repeat_interval.'
        );
    }


    if ($repeatType === 'none') {
        return [
            'repeat_type' =>
                'none',
            'repeat_interval' =>
                1,
            'repeat_weekdays' =>
                null,
            'repeat_day_of_month' =>
                null,
            'repeat_week_of_month' =>
                null,
            'repeat_weekday' =>
                null,
            'repeat_month' =>
                null,
            'repeat_end_type' =>
                'none',
            'repeat_end_date' =>
                null,
            'repeat_count' =>
                null,
        ];
    }


    $repeatWeekdays = null;
    $repeatDayOfMonth = null;
    $repeatWeekOfMonth = null;
    $repeatWeekday = null;
    $repeatMonth = null;


    if ($repeatType === 'weekly') {
        $rawWeekdays =
            $body['repeat_weekdays']
            ?? [];


        if (is_string($rawWeekdays)) {
            $rawWeekdays =
                trim($rawWeekdays) === ''
                    ? []
                    : preg_split(
                        '/\s*,\s*/',
                        trim($rawWeekdays)
                    );
        }


        if (!is_array($rawWeekdays)) {
            throw new RuntimeException(
                'Invalid repeat_weekdays.'
            );
        }


        $weekdays = [];


        foreach (
            $rawWeekdays
            as $weekday
        ) {
            if (
                $weekday === ''
                ||
                $weekday === null
            ) {
                continue;
            }


            $weekday =
                (int)
                $weekday;


            if (
                $weekday < 0
                ||
                $weekday > 6
            ) {
                throw new RuntimeException(
                    'Invalid repeat weekday.'
                );
            }


            $weekdays[$weekday] =
                $weekday;
        }


        if ($weekdays === []) {
            throw new RuntimeException(
                'repeat_weekdays is required.'
            );
        }


        sort($weekdays);


        $repeatWeekdays =
            implode(
                ',',
                $weekdays
            );
    }


    if (
        $repeatType === 'monthly_day'
        ||
        $repeatType === 'yearly'
    ) {
        $repeatDayOfMonth =
            isset(
                $body[
                    'repeat_day_of_month'
                ]
            )
                ? (int)
                    $body[
                        'repeat_day_of_month'
                    ]
                : 0;


        if (
            $repeatDayOfMonth < 1
            ||
            $repeatDayOfMonth > 31
        ) {
            throw new RuntimeException(
                'Invalid repeat_day_of_month.'
            );
        }
    }


    if (
        $repeatType
        === 'monthly_weekday'
    ) {
        $repeatWeekOfMonth =
            isset(
                $body[
                    'repeat_week_of_month'
                ]
            )
                ? (int)
                    $body[
                        'repeat_week_of_month'
                    ]
                : 0;


        if (
            !in_array(
                $repeatWeekOfMonth,
                [
                    -1,
                    1,
                    2,
                    3,
                    4,
                    5,
                ],
                true
            )
        ) {
            throw new RuntimeException(
                'Invalid repeat_week_of_month.'
            );
        }


        $repeatWeekday =
            isset(
                $body[
                    'repeat_weekday'
                ]
            )
                ? (int)
                    $body[
                        'repeat_weekday'
                    ]
                : -1;


        if (
            $repeatWeekday < 0
            ||
            $repeatWeekday > 6
        ) {
            throw new RuntimeException(
                'Invalid repeat_weekday.'
            );
        }
    }


    if ($repeatType === 'yearly') {
        $repeatMonth =
            isset($body['repeat_month'])
                ? (int)
                    $body['repeat_month']
                : 0;


        if (
            $repeatMonth < 1
            ||
            $repeatMonth > 12
            ||
            !checkdate(
                $repeatMonth,
                $repeatDayOfMonth,
                2000
            )
        ) {
            throw new RuntimeException(
                'Invalid yearly repeat date.'
            );
        }
    }


    $repeatEndType =
        isset($body['repeat_end_type'])
            ? trim(
                (string)
                $body['repeat_end_type']
            )
            : 'none';


    if (
        !in_array(
            $repeatEndType,
            [
                'none',
                'date',
                'count',
            ],
            true
        )
    ) {
        throw new RuntimeException(
            'Invalid repeat_end_type.'
        );
    }


    $repeatEndDate = null;
    $repeatCount = null;


    if ($repeatEndType === 'date') {
        $repeatEndDate =
            isset(
                $body['repeat_end_date']
            )
                ? trim(
                    (string)
                    $body[
                        'repeat_end_date'
                    ]
                )
                : '';


        calendarEventValidateDate(
            $repeatEndDate
        );


        $eventDate =
            isset($body['event_date'])
                ? trim(
                    (string)
                    $body['event_date']
                )
                : '';


        if (
            $eventDate !== ''
            &&
            $repeatEndDate < $eventDate
        ) {
            throw new RuntimeException(
                'repeat_end_date must not be before event_date.'
            );
        }
    }


    if ($repeatEndType === 'count') {
        $repeatCount =
            isset($body['repeat_count'])
                ? (int)
                    $body['repeat_count']
                : 0;


        if (
            $repeatCount < 1
            ||
            $repeatCount > 1000
        ) {
            throw new RuntimeException(
                'Invalid repeat_count.'
            );
        }
    }


    return [
        'repeat_type' =>
            $repeatType,
        'repeat_interval' =>
            $repeatInterval,
        'repeat_weekdays' =>
            $repeatWeekdays,
        'repeat_day_of_month' =>
            $repeatDayOfMonth,
        'repeat_week_of_month' =>
            $repeatWeekOfMonth,
        'repeat_weekday' =>
            $repeatWeekday,
        'repeat_month' =>
            $repeatMonth,
        'repeat_end_type' =>
            $repeatEndType,
        'repeat_end_date' =>
            $repeatEndDate,
        'repeat_count' =>
            $repeatCount,
    ];
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


    $repeatFields =
        calendarEventReadRepeatFields(
            $body
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
        ...$repeatFields,
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
                repeat_type,
                repeat_interval,
                repeat_weekdays,
                repeat_day_of_month,
                repeat_week_of_month,
                repeat_weekday,
                repeat_month,
                repeat_end_type,
                repeat_end_date,
                repeat_count,
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
             * 単発予定は終了日時が検索開始日以降なら取得する。
             *
             * 繰り返し予定は元予定の開始・終了日時が古くても、
             * 検索範囲内に発生する可能性があるため取得候補に残す。
             * 実際の発生日はフロント側の繰り返し展開で判定する。
             */
            $conditions[] =
                "(
                    COALESCE(end_at, start_at) >= ?
                    OR repeat_type <> 'none'
                )";

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
                    repeat_type,
                    repeat_interval,
                    repeat_weekdays,
                    repeat_day_of_month,
                    repeat_week_of_month,
                    repeat_weekday,
                    repeat_month,
                    repeat_end_type,
                    repeat_end_date,
                    repeat_count,
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
                    repeat_type,
                    repeat_interval,
                    repeat_weekdays,
                    repeat_day_of_month,
                    repeat_week_of_month,
                    repeat_weekday,
                    repeat_month,
                    repeat_end_type,
                    repeat_end_date,
                    repeat_count,
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
                    ?,
                    ?,
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
            $fields['repeat_type'],
            $fields['repeat_interval'],
            $fields['repeat_weekdays'],
            $fields['repeat_day_of_month'],
            $fields['repeat_week_of_month'],
            $fields['repeat_weekday'],
            $fields['repeat_month'],
            $fields['repeat_end_type'],
            $fields['repeat_end_date'],
            $fields['repeat_count'],
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
                    repeat_type = ?,
                    repeat_interval = ?,
                    repeat_weekdays = ?,
                    repeat_day_of_month = ?,
                    repeat_week_of_month = ?,
                    repeat_weekday = ?,
                    repeat_month = ?,
                    repeat_end_type = ?,
                    repeat_end_date = ?,
                    repeat_count = ?,
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
            $fields['repeat_type'],
            $fields['repeat_interval'],
            $fields['repeat_weekdays'],
            $fields['repeat_day_of_month'],
            $fields['repeat_week_of_month'],
            $fields['repeat_weekday'],
            $fields['repeat_month'],
            $fields['repeat_end_type'],
            $fields['repeat_end_date'],
            $fields['repeat_count'],
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