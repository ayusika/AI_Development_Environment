<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/../../auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/lib/database.php';


try {

    $method =
        strtoupper(
            $_SERVER['REQUEST_METHOD']
            ?? 'GET'
        );


    if ($method !== 'GET') {

        http_response_code(405);

        echo json_encode(
            [
                'success' => false,
                'error' =>
                    'Method not allowed.',
            ],
            JSON_UNESCAPED_UNICODE
            | JSON_PRETTY_PRINT
        );

        exit;
    }


    $pdo =
        koppyDatabase();


    /*
     * DBと同じlocaltime基準で
     * 現在日時を取得する。
     */
    $clock =
        $pdo
            ->query(
                "
                SELECT
                    strftime(
                        '%Y-%m-%d',
                        'now',
                        'localtime'
                    ) AS today,

                    strftime(
                        '%Y-%m-%d %H:%M',
                        'now',
                        'localtime'
                    ) AS now_at
                "
            )
            ->fetch();


    if (!$clock) {

        throw new RuntimeException(
            'Current database time could not be read.'
        );
    }


    $today =
        (string) $clock['today'];


    $nowAt =
        (string) $clock['now_at'];


    $period =
        isset($_GET['period'])
            ? trim(
                (string) $_GET['period']
            )
            : 'month';


    $allowedPeriods = [
        'today',
        'month',
        'day',
    ];


    if (
        !in_array(
            $period,
            $allowedPeriods,
            true
        )
    ) {

        throw new RuntimeException(
            'Invalid sales period.'
        );
    }


    $requestedDate =
        isset($_GET['date'])
            ? trim(
                (string) $_GET['date']
            )
            : '';


    if ($period === 'today') {

        $anchorDate =
            $today;

    } else {

        $anchorDate =
            $requestedDate !== ''
                ? $requestedDate
                : $today;
    }


    if (
        !preg_match(
            '/^\d{4}-\d{2}-\d{2}$/',
            $anchorDate
        )
    ) {

        throw new RuntimeException(
            'date must be YYYY-MM-DD.'
        );
    }


    [
        $year,
        $month,
        $day,
    ] =
        array_map(
            'intval',
            explode(
                '-',
                $anchorDate
            )
        );


    if (
        !checkdate(
            $month,
            $day,
            $year
        )
    ) {

        throw new RuntimeException(
            'Invalid date.'
        );
    }


    $anchor =
        new DateTimeImmutable(
            $anchorDate,
            new DateTimeZone(
                'Asia/Tokyo'
            )
        );


    if (
        $period === 'today'
        || $period === 'day'
    ) {

        $startAt =
            $anchor
                ->setTime(
                    0,
                    0
                )
                ->format(
                    'Y-m-d H:i'
                );


        $endAt =
            $anchor
                ->modify(
                    '+1 day'
                )
                ->setTime(
                    0,
                    0
                )
                ->format(
                    'Y-m-d H:i'
                );

    } else {

        $monthStart =
            $anchor
                ->modify(
                    'first day of this month'
                )
                ->setTime(
                    0,
                    0
                );


        $startAt =
            $monthStart
                ->format(
                    'Y-m-d H:i'
                );


        $endAt =
            $monthStart
                ->modify(
                    '+1 month'
                )
                ->format(
                    'Y-m-d H:i'
                );
    }


    $storeId =
        isset($_GET['store_id'])
            ? (int) $_GET['store_id']
            : 0;


    if ($storeId < 0) {

        throw new RuntimeException(
            'Invalid store_id.'
        );
    }


    /*
     * 店舗フィルター候補。
     */
    $stores =
        $pdo
            ->query(
                "
                SELECT
                    id,
                    name

                FROM stores

                ORDER BY
                    id ASC
                "
            )
            ->fetchAll();


    $storeList =
        array_map(
            static function (
                array $store
            ): array {

                return [
                    'id' =>
                        (int) $store['id'],

                    'name' =>
                        (string) $store['name'],
                ];
            },
            $stores
        );


    /*
     * 売上対象の接客。
     *
     * completedへの明示更新を
     * 現在の運用では必須にしていないため、
     *
     * ・開始時刻が現在以前
     * ・cancelledではない
     * ・no_showではない
     *
     * を「接客対象」とする。
     */
    $sql =
        "
        SELECT
            v.id,
            v.store_id,
            v.customer_id,
            v.started_at,
            v.course_minutes,
            v.customer_status,
            v.status,

            s.name
                AS store_name,

            sc.course_name,

            (
                SELECT
                    cn.name

                FROM customer_names AS cn

                WHERE
                    cn.customer_id =
                        v.customer_id

                ORDER BY
                    cn.is_primary DESC,
                    cn.id ASC

                LIMIT 1
            )
                AS customer_name,

            vs.id
                AS visit_sales_id,

            vs.tip_amount,
            vs.discount_amount,
            vs.adjustment_amount,
            vs.customer_payment_total,
            vs.take_home_total,
            vs.confirmed_at

        FROM visits AS v

        INNER JOIN stores AS s
            ON s.id =
                v.store_id

        LEFT JOIN store_courses AS sc
            ON sc.id =
                v.store_course_id

        LEFT JOIN visit_sales_v2 AS vs
            ON vs.visit_id =
                v.id

        WHERE
            v.started_at >= :start_at

            AND v.started_at < :end_at

            AND v.started_at <= :now_at

            AND v.status NOT IN (
                'cancelled',
                'no_show'
            )
        ";


    $parameters = [
        ':start_at' =>
            $startAt,

        ':end_at' =>
            $endAt,

        ':now_at' =>
            $nowAt,
    ];


    if ($storeId > 0) {

        $sql .=
            "
            AND v.store_id = :store_id
            ";


        $parameters[
            ':store_id'
        ] =
            $storeId;
    }


    $sql .=
        "
        ORDER BY
            v.started_at DESC,
            v.id DESC
        ";


    $statement =
        $pdo->prepare(
            $sql
        );


    $statement->execute(
        $parameters
    );


    $records =
        $statement->fetchAll();


    $visits =
        [];


    $takeHomeTotal =
        0;


    $visitCount =
        0;


    $confirmedCount =
        0;


    $unenteredCount =
        0;


    foreach (
        $records
        as $record
    ) {

        $visitCount +=
            1;


        $confirmed =
            $record['confirmed_at']
            !== null;


        if ($confirmed) {

            $confirmedCount +=
                1;


            $takeHomeTotal +=
                (int) (
                    $record[
                        'take_home_total'
                    ]
                    ?? 0
                );

        } else {

            $unenteredCount +=
                1;
        }


        $visits[] = [
            'id' =>
                (int) $record['id'],

            'store_id' =>
                (int) $record['store_id'],

            'store_name' =>
                (string)
                $record['store_name'],

            'customer_id' =>
                $record['customer_id']
                    !== null
                    ? (int)
                        $record[
                            'customer_id'
                        ]
                    : null,

            'customer_name' =>
                $record['customer_name']
                    !== null
                    ? (string)
                        $record[
                            'customer_name'
                        ]
                    : null,

            'started_at' =>
                (string)
                $record['started_at'],

            'course_minutes' =>
                $record['course_minutes']
                    !== null
                    ? (int)
                        $record[
                            'course_minutes'
                        ]
                    : null,

            'course_name' =>
                $record['course_name']
                    !== null
                    ? (string)
                        $record[
                            'course_name'
                        ]
                    : null,

            'customer_status' =>
                $record[
                    'customer_status'
                ] !== null
                    ? (string)
                        $record[
                            'customer_status'
                        ]
                    : null,

            'status' =>
                (string)
                $record['status'],

            'sales_state' =>
                $confirmed
                    ? 'confirmed'
                    : 'unentered',

            'sales' => [
                'id' =>
                    $record[
                        'visit_sales_id'
                    ] !== null
                        ? (int)
                            $record[
                                'visit_sales_id'
                            ]
                        : null,

                'tip_amount' =>
                    (int) (
                        $record[
                            'tip_amount'
                        ]
                        ?? 0
                    ),

                'discount_amount' =>
                    (int) (
                        $record[
                            'discount_amount'
                        ]
                        ?? 0
                    ),

                'adjustment_amount' =>
                    (int) (
                        $record[
                            'adjustment_amount'
                        ]
                        ?? 0
                    ),

                'customer_payment_total' =>
                    $record[
                        'customer_payment_total'
                    ] !== null
                        ? (int)
                            $record[
                                'customer_payment_total'
                            ]
                        : null,

                'take_home_total' =>
                    $confirmed
                        ? (int) (
                            $record[
                                'take_home_total'
                            ]
                            ?? 0
                        )
                        : null,

                'confirmed_at' =>
                    $record[
                        'confirmed_at'
                    ] !== null
                        ? (string)
                            $record[
                                'confirmed_at'
                            ]
                        : null,
            ],
        ];
    }


    echo json_encode(
        [
            'success' =>
                true,

            'period' => [
                'type' =>
                    $period,

                'anchor_date' =>
                    $anchorDate,

                'start_at' =>
                    $startAt,

                'end_at' =>
                    $endAt,

                'now_at' =>
                    $nowAt,
            ],

            'filter' => [
                'store_id' =>
                    $storeId > 0
                        ? $storeId
                        : null,
            ],

            'summary' => [
                'take_home_total' =>
                    $takeHomeTotal,

                'visit_count' =>
                    $visitCount,

                'confirmed_count' =>
                    $confirmedCount,

                'unentered_count' =>
                    $unenteredCount,
            ],

            'stores' =>
                $storeList,

            'visits' =>
                $visits,

            'error' =>
                null,
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_PRETTY_PRINT
    );


} catch (Throwable $error) {

    http_response_code(400);

    echo json_encode(
        [
            'success' =>
                false,

            'error' =>
                $error->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_PRETTY_PRINT
    );
}