<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/../../auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/lib/database.php';


function jsonResponse(
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


function validateDate(
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


try {

    $method =
        strtoupper(
            $_SERVER['REQUEST_METHOD']
            ?? 'GET'
        );


    if ($method !== 'GET') {

        jsonResponse(
            [
                'success' => false,
                'error' =>
                    'Method not allowed.',
            ],
            405
        );
    }


    $pdo =
        koppyDatabase();


    /* =====================================================
       WORKERS
    ===================================================== */

    $workers =
        $pdo
            ->query(
                "
                SELECT
                    id,
                    worker_code,
                    display_name,
                    active,
                    is_reservation_owner

                FROM workers

                WHERE active = 1

                ORDER BY id ASC
                "
            )
            ->fetchAll();


    /* =====================================================
       STORES
    ===================================================== */

    $stores =
        $pdo
            ->query(
                "
                SELECT
                    id,
                    name,
                    active

                FROM stores

                WHERE active = 1

                ORDER BY id ASC
                "
            )
            ->fetchAll();


    /* =====================================================
       DEFAULT RULES
    ===================================================== */

    $rules =
        $pdo
            ->query(
                "
                SELECT
                    r.id,
                    r.worker_id,
                    w.worker_code,
                    w.display_name,
                    r.day_type,
                    r.start_time,
                    r.end_time,
                    r.active

                FROM shift_default_rules r

                JOIN workers w
                    ON w.id = r.worker_id

                WHERE
                    r.active = 1
                    AND w.active = 1

                ORDER BY
                    r.worker_id ASC,
                    r.day_type ASC
                "
            )
            ->fetchAll();


    /* =====================================================
       OPTIONAL DATE RANGE
    ===================================================== */

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


    $days = [];


    if (
        $dateFrom !== ''
        ||
        $dateTo !== ''
    ) {

        if (
            $dateFrom === ''
            ||
            $dateTo === ''
        ) {

            throw new RuntimeException(
                'date_from and date_to must both be supplied.'
            );
        }


        validateDate(
            $dateFrom
        );

        validateDate(
            $dateTo
        );


        if ($dateFrom > $dateTo) {

            throw new RuntimeException(
                'date_from must be before date_to.'
            );
        }


        $from =
            new DateTimeImmutable(
                $dateFrom
            );


        $to =
            new DateTimeImmutable(
                $dateTo
            );


        $maxTo =
            $from->modify(
                '+62 days'
            );


        if ($to > $maxTo) {

            throw new RuntimeException(
                'Date range must be 63 days or less.'
            );
        }


        $holidayStatement =
            $pdo->prepare(
                "
                SELECT
                    name

                FROM holidays

                WHERE holiday_date = ?

                LIMIT 1
                "
            );


        $cursor =
            $from;


        while ($cursor <= $to) {

            $date =
                $cursor->format(
                    'Y-m-d'
                );


            $nextDateObject =
                $cursor->modify(
                    '+1 day'
                );


            $nextDate =
                $nextDateObject->format(
                    'Y-m-d'
                );


            $holidayStatement->execute([
                $date
            ]);


            $holidayName =
                $holidayStatement
                    ->fetchColumn();


            $holidayStatement->execute([
                $nextDate
            ]);


            $nextHolidayName =
                $holidayStatement
                    ->fetchColumn();


            $weekday =
                (int)
                $cursor->format(
                    'N'
                );


            $nextWeekday =
                (int)
                $nextDateObject->format(
                    'N'
                );


            $isWeekend =
                $weekday >= 6;


            $nextIsWeekend =
                $nextWeekday >= 6;


            /*
             * 休日前:
             *
             * 翌日が
             * - 土曜日
             * - 日曜日
             * - 祝日
             *
             * のいずれか。
             */
            $isHolidayEve =
                $nextIsWeekend
                ||
                $nextHolidayName !== false;


            $days[] = [
                'date' =>
                    $date,

                'weekday' =>
                    $weekday,

                'is_weekend' =>
                    $isWeekend,

                'holiday_name' =>
                    $holidayName !== false
                        ? (string)
                            $holidayName
                        : null,

                'next_date' =>
                    $nextDate,

                'next_is_weekend' =>
                    $nextIsWeekend,

                'next_holiday_name' =>
                    $nextHolidayName !== false
                        ? (string)
                            $nextHolidayName
                        : null,

                'day_type' =>
                    $isHolidayEve
                        ? 'holiday_eve'
                        : 'weekday_eve',
            ];


            $cursor =
                $cursor->modify(
                    '+1 day'
                );
        }
    }


    jsonResponse(
        [
            'success' => true,

            'workers' =>
                $workers,

            'stores' =>
                $stores,

            'default_rules' =>
                $rules,

            'date_from' =>
                $dateFrom !== ''
                    ? $dateFrom
                    : null,

            'date_to' =>
                $dateTo !== ''
                    ? $dateTo
                    : null,

            'days' =>
                $days,

            'error' =>
                null,
        ]
    );


} catch (Throwable $error) {

    jsonResponse(
        [
            'success' => false,

            'error' =>
                $error->getMessage(),
        ],
        400
    );
}