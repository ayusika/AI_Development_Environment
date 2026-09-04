<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/../../auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/lib/database.php';


function fetchVisitSalesCourseRate(
    PDO $pdo,
    int $storeCourseId,
    string $effectiveDate
): ?array {

    $statement =
        $pdo->prepare(
            "
            SELECT
                id,
                base_price,
                take_home

            FROM store_course_rates_v2

            WHERE
                store_course_id = ?

                AND active = 1

                AND effective_from <= ?

                AND (
                    effective_to IS NULL
                    OR effective_to >= ?
                )

            ORDER BY
                effective_from DESC,
                id DESC

            LIMIT 1
            "
        );


    $statement->execute([
        $storeCourseId,
        $effectiveDate,
        $effectiveDate,
    ]);


    $rate =
        $statement->fetch();


    return
        $rate ?: null;
}


function fetchVisitSalesOptionRate(
    PDO $pdo,
    int $storeId,
    int $optionId,
    string $effectiveDate
): ?array {

    $statement =
        $pdo->prepare(
            "
            SELECT
                id,
                price,
                take_home

            FROM store_option_rates_v2

            WHERE
                store_id = ?

                AND option_id = ?

                AND active = 1

                AND effective_from <= ?

                AND (
                    effective_to IS NULL
                    OR effective_to >= ?
                )

            ORDER BY
                effective_from DESC,
                id DESC

            LIMIT 1
            "
        );


    $statement->execute([
        $storeId,
        $optionId,
        $effectiveDate,
        $effectiveDate,
    ]);


    $rate =
        $statement->fetch();


    return
        $rate ?: null;
}


try {

    $method =
        strtoupper(
            $_SERVER['REQUEST_METHOD']
            ?? 'GET'
        );


    if (
        $method !== 'GET'
        && $method !== 'POST'
    ) {

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


    $payload =
        [];


    if ($method === 'POST') {

        $rawBody =
            file_get_contents(
                'php://input'
            );


        if (
            $rawBody !== false
            && trim($rawBody) !== ''
        ) {

            $decodedBody =
                json_decode(
                    $rawBody,
                    true
                );


            if (!is_array($decodedBody)) {

                http_response_code(400);

                echo json_encode(
                    [
                        'success' => false,
                        'error' =>
                            'Invalid JSON body.',
                    ],
                    JSON_UNESCAPED_UNICODE
                    | JSON_PRETTY_PRINT
                );

                exit;
            }


            $payload =
                $decodedBody;
        }
    }


    $visitId =
        $method === 'POST'
            ? (int) (
                $payload['visit_id']
                ?? 0
            )
            : (
                isset($_GET['visit_id'])
                    ? (int) $_GET['visit_id']
                    : 0
            );


    if ($visitId <= 0) {

        http_response_code(400);

        echo json_encode(
            [
                'success' => false,
                'error' =>
                    'visit_id is required.',
            ],
            JSON_UNESCAPED_UNICODE
            | JSON_PRETTY_PRINT
        );

        exit;
    }


    $pdo =
        koppyDatabase();


    /*
     * Visit
     */
    $visitStatement =
        $pdo->prepare(
            "
            SELECT
                v.id,
                v.store_id,
                v.customer_id,
                v.started_at,
                v.course_minutes,
                v.store_course_id,
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
                    AS customer_name

            FROM visits AS v

            INNER JOIN stores AS s
                ON s.id = v.store_id

            LEFT JOIN store_courses AS sc
                ON sc.id =
                    v.store_course_id

            WHERE v.id = ?

            LIMIT 1
            "
        );


    $visitStatement->execute([
        $visitId,
    ]);


    $visit =
        $visitStatement->fetch();


    if (!$visit) {

        http_response_code(404);

        echo json_encode(
            [
                'success' => false,
                'error' =>
                    'Visit not found.',
            ],
            JSON_UNESCAPED_UNICODE
            | JSON_PRETTY_PRINT
        );

        exit;
    }


    $storeId =
        (int) $visit['store_id'];


    $startedAt =
        (string) $visit['started_at'];


    $effectiveDate =
        substr(
            $startedAt,
            0,
            10
        );


    /*
     * Existing sales draft / confirmed sales
     */
    $salesStatement =
        $pdo->prepare(
            "
            SELECT
                id,
                store_course_rate_id,
                base_price_snapshot,
                course_take_home_snapshot,
                option_price_total_snapshot,
                option_take_home_total_snapshot,
                tip_amount,
                discount_amount,
                discount_reason_type,
                discount_reason_note,
                adjustment_amount,
                customer_payment_total,
                take_home_total,
                confirmed_at

            FROM visit_sales_v2

            WHERE visit_id = ?

            LIMIT 1
            "
        );


    $salesStatement->execute([
        $visitId,
    ]);


    $existingSales =
        $salesStatement->fetch();


    if (!$existingSales) {

        $existingSales = [
            'id' =>
                null,

            'store_course_rate_id' =>
                null,

            'base_price_snapshot' =>
                null,

            'course_take_home_snapshot' =>
                0,

            'option_price_total_snapshot' =>
                0,

            'option_take_home_total_snapshot' =>
                0,

            'tip_amount' =>
                0,

            'discount_amount' =>
                0,

            'discount_reason_type' =>
                null,

            'discount_reason_note' =>
                null,

            'adjustment_amount' =>
                0,

            'customer_payment_total' =>
                null,

            'take_home_total' =>
                0,

            'confirmed_at' =>
                null,
        ];
    }


    $tipAmount =
        (int) (
            $existingSales['tip_amount']
            ?? 0
        );


    $discountAmount =
        (int) (
            $existingSales['discount_amount']
            ?? 0
        );


    $adjustmentAmount =
        (int) (
            $existingSales['adjustment_amount']
            ?? 0
        );


    $discountReasonType =
        $existingSales[
            'discount_reason_type'
        ] ?? null;


    $discountReasonNote =
        $existingSales[
            'discount_reason_note'
        ] ?? null;


    if ($method === 'POST') {

        $readIntegerPayload =
            static function (
                array $payload,
                string $key,
                int $fallback
            ): int {

                if (
                    !array_key_exists(
                        $key,
                        $payload
                    )
                ) {
                    return $fallback;
                }


                $value =
                    $payload[$key];


                if (
                    is_int($value)
                ) {
                    return $value;
                }


                if (
                    is_string($value)
                    && preg_match(
                        '/^-?\d+$/',
                        $value
                    )
                ) {
                    return (int) $value;
                }


                throw new RuntimeException(
                    $key
                    . ' must be an integer.'
                );
            };


        $tipAmount =
            $readIntegerPayload(
                $payload,
                'tip_amount',
                $tipAmount
            );


        $discountAmount =
            $readIntegerPayload(
                $payload,
                'discount_amount',
                $discountAmount
            );


        $adjustmentAmount =
            $readIntegerPayload(
                $payload,
                'adjustment_amount',
                $adjustmentAmount
            );


        if ($tipAmount < 0) {

            throw new RuntimeException(
                'tip_amount must be 0 or greater.'
            );
        }


        if ($discountAmount < 0) {

            throw new RuntimeException(
                'discount_amount must be 0 or greater.'
            );
        }


        $allowedDiscountReasons = [
            'coupon',
            'early',
            'store',
            'campaign',
            'other',
        ];


        $requestedDiscountReason =
            isset(
                $payload[
                    'discount_reason_type'
                ]
            )
                ? trim(
                    (string)
                    $payload[
                        'discount_reason_type'
                    ]
                )
                : '';


        if (
            $requestedDiscountReason !== ''
            && !in_array(
                $requestedDiscountReason,
                $allowedDiscountReasons,
                true
            )
        ) {

            throw new RuntimeException(
                'Invalid discount_reason_type.'
            );
        }


        $requestedDiscountNote =
            isset(
                $payload[
                    'discount_reason_note'
                ]
            )
                ? trim(
                    (string)
                    $payload[
                        'discount_reason_note'
                    ]
                )
                : '';


        if (
            mb_strlen(
                $requestedDiscountNote
            ) > 300
        ) {

            throw new RuntimeException(
                'discount_reason_note is too long.'
            );
        }


        if ($discountAmount > 0) {

            $discountReasonType =
                $requestedDiscountReason !== ''
                    ? $requestedDiscountReason
                    : null;


            $discountReasonNote =
                $requestedDiscountNote !== ''
                    ? $requestedDiscountNote
                    : null;

        } else {

            $discountReasonType =
                null;


            $discountReasonNote =
                null;
        }


        $existingSales[
            'discount_reason_type'
        ] =
            $discountReasonType;


        $existingSales[
            'discount_reason_note'
        ] =
            $discountReasonNote;
    }


    /*
     * Main course
     */
    $course =
        null;


    $coursePriceTotal =
        0;


    $courseTakeHomeTotal =
        0;


    $coursePriceKnown =
        true;


    $courseTakeHomeKnown =
        true;


    $storeCourseId =
        isset($visit['store_course_id'])
            && $visit['store_course_id'] !== null
            ? (int) $visit['store_course_id']
            : 0;


    if ($storeCourseId > 0) {

        $courseRate =
            fetchVisitSalesCourseRate(
                $pdo,
                $storeCourseId,
                $effectiveDate
            );


        if ($courseRate) {

            $course = [
                'store_course_id' =>
                    $storeCourseId,

                'store_course_rate_id' =>
                    (int) $courseRate['id'],

                'course_name' =>
                    (string) (
                        $visit['course_name']
                        ?? ''
                    ),

                'course_minutes' =>
                    (int) $visit['course_minutes'],

                'base_price' =>
                    $courseRate['base_price']
                        !== null
                        ? (int)
                            $courseRate['base_price']
                        : null,

                'take_home' =>
                    (int)
                    $courseRate['take_home'],
            ];


            if (
                $courseRate['base_price']
                === null
            ) {

                $coursePriceKnown =
                    false;

            } else {

                $coursePriceTotal +=
                    (int)
                    $courseRate['base_price'];
            }


            $courseTakeHomeTotal +=
                (int)
                $courseRate['take_home'];

        } else {

            $coursePriceKnown =
                false;

            $courseTakeHomeKnown =
                false;
        }

    } else {

        $coursePriceKnown =
            false;

        $courseTakeHomeKnown =
            false;
    }


    /*
     * Extensions
     */
    $extensionStatement =
        $pdo->prepare(
            "
            SELECT
                ve.store_course_id,
                ve.quantity,

                sc.course_name,
                sc.course_minutes

            FROM visit_extensions AS ve

            INNER JOIN store_courses AS sc
                ON sc.id =
                    ve.store_course_id

            WHERE ve.visit_id = ?

            ORDER BY
                sc.sort_order ASC,
                ve.id ASC
            "
        );


    $extensionStatement->execute([
        $visitId,
    ]);


    $extensions =
        [];


    foreach (
        $extensionStatement->fetchAll()
        as $extensionRecord
    ) {

        $extensionCourseId =
            (int)
            $extensionRecord[
                'store_course_id'
            ];


        $quantity =
            max(
                1,
                (int)
                $extensionRecord[
                    'quantity'
                ]
            );


        $extensionRate =
            fetchVisitSalesCourseRate(
                $pdo,
                $extensionCourseId,
                $effectiveDate
            );


        if (!$extensionRate) {

            $coursePriceKnown =
                false;

            $courseTakeHomeKnown =
                false;


            $extensions[] = [
                'store_course_id' =>
                    $extensionCourseId,

                'store_course_rate_id' =>
                    null,

                'course_name' =>
                    (string)
                    $extensionRecord[
                        'course_name'
                    ],

                'course_minutes' =>
                    (int)
                    $extensionRecord[
                        'course_minutes'
                    ],

                'quantity' =>
                    $quantity,

                'base_price' =>
                    null,

                'take_home' =>
                    null,
            ];


            continue;
        }


        $extensionBasePrice =
            $extensionRate['base_price']
                !== null
                ? (int)
                    $extensionRate[
                        'base_price'
                    ]
                : null;


        $extensionTakeHome =
            (int)
            $extensionRate[
                'take_home'
            ];


        if ($extensionBasePrice === null) {

            $coursePriceKnown =
                false;

        } else {

            $coursePriceTotal +=
                $extensionBasePrice
                * $quantity;
        }


        $courseTakeHomeTotal +=
            $extensionTakeHome
            * $quantity;


        $extensions[] = [
            'store_course_id' =>
                $extensionCourseId,

            'store_course_rate_id' =>
                (int)
                $extensionRate['id'],

            'course_name' =>
                (string)
                $extensionRecord[
                    'course_name'
                ],

            'course_minutes' =>
                (int)
                $extensionRecord[
                    'course_minutes'
                ],

            'quantity' =>
                $quantity,

            'base_price' =>
                $extensionBasePrice,

            'take_home' =>
                $extensionTakeHome,
        ];
    }


    /*
     * Options
     */
    $optionStatement =
        $pdo->prepare(
            "
            SELECT
                vo.option_id,
                vo.custom_name,
                vo.income_amount,

                o.name

            FROM visit_options AS vo

            LEFT JOIN options AS o
                ON o.id =
                    vo.option_id

            WHERE vo.visit_id = ?

            ORDER BY
                o.sort_order ASC,
                vo.id ASC
            "
        );


    $optionStatement->execute([
        $visitId,
    ]);


    $options =
        [];


    $optionPriceTotal =
        0;


    $optionTakeHomeTotal =
        0;


    $optionPriceKnown =
        true;


    $optionTakeHomeKnown =
        true;


    foreach (
        $optionStatement->fetchAll()
        as $optionRecord
    ) {

        $optionId =
            $optionRecord['option_id']
                !== null
                ? (int)
                    $optionRecord[
                        'option_id'
                    ]
                : 0;


        if ($optionId > 0) {

            $optionRate =
                fetchVisitSalesOptionRate(
                    $pdo,
                    $storeId,
                    $optionId,
                    $effectiveDate
                );


            if (!$optionRate) {

                $optionPriceKnown =
                    false;

                $optionTakeHomeKnown =
                    false;


                $options[] = [
                    'option_id' =>
                        $optionId,

                    'name' =>
                        (string) (
                            $optionRecord['name']
                            ?? ''
                        ),

                    'price' =>
                        null,

                    'take_home' =>
                        null,

                    'custom' =>
                        false,
                ];


                continue;
            }


            $optionPrice =
                (int)
                $optionRate['price'];


            $optionTakeHome =
                (int)
                $optionRate['take_home'];


            $optionPriceTotal +=
                $optionPrice;


            $optionTakeHomeTotal +=
                $optionTakeHome;


            $options[] = [
                'option_id' =>
                    $optionId,

                'name' =>
                    (string) (
                        $optionRecord['name']
                        ?? ''
                    ),

                'price' =>
                    $optionPrice,

                'take_home' =>
                    $optionTakeHome,

                'custom' =>
                    false,
            ];


            continue;
        }


        $customIncome =
            $optionRecord[
                'income_amount'
            ] !== null
                ? (int)
                    $optionRecord[
                        'income_amount'
                    ]
                : null;


        if ($customIncome === null) {

            $optionPriceKnown =
                false;

            $optionTakeHomeKnown =
                false;

        } else {

            /*
             * OPはフルバック運用なので、
             * その他OPも入力済み手取り額を
             * 販売額・手取り額の両方として扱う。
             */
            $optionPriceTotal +=
                $customIncome;


            $optionTakeHomeTotal +=
                $customIncome;
        }


        $options[] = [
            'option_id' =>
                null,

            'name' =>
                (string) (
                    $optionRecord[
                        'custom_name'
                    ]
                    ?? 'その他'
                ),

            'price' =>
                $customIncome,

            'take_home' =>
                $customIncome,

            'custom' =>
                true,
        ];
    }


    /*
     * Totals
     *
     * 割引は店取り側のみ減額するため、
     * take_home_totalからは引かない。
     *
     * チップは満額手取り。
     */
    $customerPaymentTotal =
        null;


    if (
        $coursePriceKnown
        && $optionPriceKnown
    ) {

        $customerPaymentTotal =
            max(
                0,
                $coursePriceTotal
                + $optionPriceTotal
                + $tipAmount
                - $discountAmount
            );
    }


    $takeHomeTotal =
        null;


    if (
        $courseTakeHomeKnown
        && $optionTakeHomeKnown
    ) {

        $takeHomeTotal =
            $courseTakeHomeTotal
            + $optionTakeHomeTotal
            + $tipAmount
            + $adjustmentAmount;
    }


    if ($method === 'POST') {

        if (
            $existingSales[
                'confirmed_at'
            ] !== null
        ) {

            throw new RuntimeException(
                'Sales are already confirmed.'
            );
        }


        if ($takeHomeTotal === null) {

            throw new RuntimeException(
                'Sales cannot be confirmed because take-home pricing is incomplete.'
            );
        }


        $storeCourseRateId =
            $course[
                'store_course_rate_id'
            ] ?? null;


        $basePriceSnapshot =
            $coursePriceKnown
                ? $coursePriceTotal
                : null;


        $existingSalesId =
            $existingSales['id']
                !== null
                ? (int)
                    $existingSales['id']
                : null;


        if ($existingSalesId !== null) {

            $saveStatement =
                $pdo->prepare(
                    "
                    UPDATE visit_sales_v2

                    SET
                        store_course_rate_id = ?,
                        base_price_snapshot = ?,
                        course_take_home_snapshot = ?,
                        option_price_total_snapshot = ?,
                        option_take_home_total_snapshot = ?,
                        tip_amount = ?,
                        discount_amount = ?,
                        discount_reason_type = ?,
                        discount_reason_note = ?,
                        adjustment_amount = ?,
                        customer_payment_total = ?,
                        take_home_total = ?,
                        confirmed_at =
                            strftime(
                                '%Y-%m-%d %H:%M',
                                'now',
                                'localtime'
                            ),
                        updated_at =
                            strftime(
                                '%Y-%m-%d %H:%M',
                                'now',
                                'localtime'
                            )

                    WHERE
                        id = ?
                        AND confirmed_at IS NULL
                    "
                );


            $saveStatement->execute([
                $storeCourseRateId,
                $basePriceSnapshot,
                $courseTakeHomeTotal,
                $optionPriceKnown
                    ? $optionPriceTotal
                    : 0,
                $optionTakeHomeTotal,
                $tipAmount,
                $discountAmount,
                $discountReasonType,
                $discountReasonNote,
                $adjustmentAmount,
                $customerPaymentTotal,
                $takeHomeTotal,
                $existingSalesId,
            ]);


            if (
                $saveStatement->rowCount()
                !== 1
            ) {

                throw new RuntimeException(
                    'Sales confirmation failed.'
                );
            }

        } else {

            $saveStatement =
                $pdo->prepare(
                    "
                    INSERT INTO visit_sales_v2 (
                        visit_id,
                        store_course_rate_id,
                        base_price_snapshot,
                        course_take_home_snapshot,
                        option_price_total_snapshot,
                        option_take_home_total_snapshot,
                        tip_amount,
                        discount_amount,
                        discount_reason_type,
                        discount_reason_note,
                        adjustment_amount,
                        customer_payment_total,
                        take_home_total,
                        confirmed_at
                    )
                    VALUES (
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
                        strftime(
                            '%Y-%m-%d %H:%M',
                            'now',
                            'localtime'
                        )
                    )
                    "
                );


            $saveStatement->execute([
                $visitId,
                $storeCourseRateId,
                $basePriceSnapshot,
                $courseTakeHomeTotal,
                $optionPriceKnown
                    ? $optionPriceTotal
                    : 0,
                $optionTakeHomeTotal,
                $tipAmount,
                $discountAmount,
                $discountReasonType,
                $discountReasonNote,
                $adjustmentAmount,
                $customerPaymentTotal,
                $takeHomeTotal,
            ]);


            $existingSalesId =
                (int) $pdo->lastInsertId();
        }


        $confirmedStatement =
            $pdo->prepare(
                "
                SELECT
                    id,
                    confirmed_at

                FROM visit_sales_v2

                WHERE visit_id = ?

                LIMIT 1
                "
            );


        $confirmedStatement->execute([
            $visitId,
        ]);


        $confirmedSales =
            $confirmedStatement->fetch();


        if (!$confirmedSales) {

            throw new RuntimeException(
                'Confirmed sales could not be reloaded.'
            );
        }


        $existingSales['id'] =
            (int) $confirmedSales['id'];


        $existingSales[
            'confirmed_at'
        ] =
            $confirmedSales[
                'confirmed_at'
            ];
    }


    echo json_encode(
        [
            'success' =>
                true,

            'read_only' =>
                $method !== 'POST',

            'visit' => [
                'id' =>
                    (int) $visit['id'],

                'store_id' =>
                    $storeId,

                'store_name' =>
                    (string)
                    $visit['store_name'],

                'customer_id' =>
                    $visit['customer_id']
                        !== null
                        ? (int)
                            $visit[
                                'customer_id'
                            ]
                        : null,

                'customer_name' =>
                    $visit['customer_name']
                        !== null
                        ? (string)
                            $visit[
                                'customer_name'
                            ]
                        : null,

                'started_at' =>
                    $startedAt,

                'course_minutes' =>
                    (int)
                    $visit['course_minutes'],

                'customer_status' =>
                    (string)
                    $visit['customer_status'],

                'status' =>
                    (string)
                    $visit['status'],
            ],

            'course' =>
                $course,

            'extensions' =>
                $extensions,

            'options' =>
                $options,

            'sales' => [
                'id' =>
                    $existingSales['id']
                        !== null
                        ? (int)
                            $existingSales['id']
                        : null,

                'confirmed_at' =>
                    $existingSales[
                        'confirmed_at'
                    ],

                'discount_reason_type' =>
                    $existingSales[
                        'discount_reason_type'
                    ],

                'discount_reason_note' =>
                    $existingSales[
                        'discount_reason_note'
                    ],
            ],

            'preview' => [
                'course_price_total' =>
                    $coursePriceKnown
                        ? $coursePriceTotal
                        : null,

                'course_take_home_total' =>
                    $courseTakeHomeKnown
                        ? $courseTakeHomeTotal
                        : null,

                'option_price_total' =>
                    $optionPriceKnown
                        ? $optionPriceTotal
                        : null,

                'option_take_home_total' =>
                    $optionTakeHomeKnown
                        ? $optionTakeHomeTotal
                        : null,

                'tip_amount' =>
                    $tipAmount,

                'discount_amount' =>
                    $discountAmount,

                'adjustment_amount' =>
                    $adjustmentAmount,

                'customer_payment_total' =>
                    $customerPaymentTotal,

                'take_home_total' =>
                    $takeHomeTotal,
            ],

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