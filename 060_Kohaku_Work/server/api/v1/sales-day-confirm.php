<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/../../../../600_KoppyOS/server/auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/../../core/database.php';

require_once __DIR__ . '/../../lib/visit-sales-calculator.php';


try {

    $method =
        strtoupper(
            $_SERVER['REQUEST_METHOD']
            ?? 'GET'
        );


    if ($method !== 'POST') {

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


    $rawBody =
        file_get_contents(
            'php://input'
        );


    $payload =
        [];


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

            throw new RuntimeException(
                'Invalid JSON body.'
            );
        }


        $payload =
            $decodedBody;
    }


    $date =
        trim(
            (string) (
                $payload['date']
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


    $timezone =
        new DateTimeZone(
            'Asia/Tokyo'
        );


    $dateObject =
        DateTimeImmutable::createFromFormat(
            '!Y-m-d',
            $date,
            $timezone
        );


    if (
        !$dateObject
        || $dateObject->format(
            'Y-m-d'
        ) !== $date
    ) {

        throw new RuntimeException(
            'Invalid date.'
        );
    }


    $storeId =
        null;


    if (
        array_key_exists(
            'store_id',
            $payload
        )
        && $payload['store_id'] !== null
        && $payload['store_id'] !== ''
    ) {

        $rawStoreId =
            $payload['store_id'];


        if (
            is_int($rawStoreId)
        ) {

            $storeId =
                $rawStoreId;

        } elseif (
            is_string($rawStoreId)
            && preg_match(
                '/^\d+$/',
                $rawStoreId
            )
        ) {

            $storeId =
                (int)
                $rawStoreId;

        } else {

            throw new RuntimeException(
                'store_id must be an integer.'
            );
        }


        if ($storeId <= 0) {

            throw new RuntimeException(
                'store_id must be greater than 0.'
            );
        }
    }


    /*
     * Optional confirmation fingerprint.
     *
     * New Kohaku Work sends:
     *
     * - expected_visit_ids
     * - expected_take_home_by_visit
     *
     * If the target set or any take-home amount changed
     * after preview, this request must fail before writes.
     *
     * These fields remain optional so legacy clients
     * keep working during migration.
     */
    $expectedVisitIds =
        null;


    if (
        array_key_exists(
            'expected_visit_ids',
            $payload
        )
    ) {

        if (
            !is_array(
                $payload[
                    'expected_visit_ids'
                ]
            )
        ) {

            throw new RuntimeException(
                'expected_visit_ids must be an array.'
            );
        }


        $normalizedExpectedVisitIds =
            [];


        foreach (
            $payload[
                'expected_visit_ids'
            ]
            as $rawExpectedVisitId
        ) {

            if (
                is_int(
                    $rawExpectedVisitId
                )
            ) {

                $expectedVisitId =
                    $rawExpectedVisitId;

            } elseif (
                is_string(
                    $rawExpectedVisitId
                )
                && preg_match(
                    '/^\d+$/',
                    $rawExpectedVisitId
                )
            ) {

                $expectedVisitId =
                    (int)
                    $rawExpectedVisitId;

            } else {

                throw new RuntimeException(
                    'expected_visit_ids contains an invalid value.'
                );
            }


            if (
                $expectedVisitId
                <= 0
            ) {

                throw new RuntimeException(
                    'expected_visit_ids must contain positive integers.'
                );
            }


            $normalizedExpectedVisitIds[] =
                $expectedVisitId;
        }


        $normalizedExpectedVisitIds =
            array_values(
                array_unique(
                    $normalizedExpectedVisitIds
                )
            );


        sort(
            $normalizedExpectedVisitIds,
            SORT_NUMERIC
        );


        if (
            count(
                $normalizedExpectedVisitIds
            ) === 0
        ) {

            throw new RuntimeException(
                'expected_visit_ids must not be empty.'
            );
        }


        $expectedVisitIds =
            $normalizedExpectedVisitIds;
    }


    $expectedTakeHomeByVisit =
        null;


    if (
        array_key_exists(
            'expected_take_home_by_visit',
            $payload
        )
    ) {

        if (
            !is_array(
                $payload[
                    'expected_take_home_by_visit'
                ]
            )
        ) {

            throw new RuntimeException(
                'expected_take_home_by_visit must be an object.'
            );
        }


        $normalizedExpectedTakeHome =
            [];


        foreach (
            $payload[
                'expected_take_home_by_visit'
            ]
            as $rawVisitId
            => $rawTakeHome
        ) {

            $visitId =
                is_int(
                    $rawVisitId
                )
                    ? $rawVisitId
                    : (
                        preg_match(
                            '/^\d+$/',
                            (string)
                            $rawVisitId
                        )
                            ? (int)
                                $rawVisitId
                            : 0
                    );


            if ($visitId <= 0) {

                throw new RuntimeException(
                    'expected_take_home_by_visit contains an invalid visit id.'
                );
            }


            if (
                is_int(
                    $rawTakeHome
                )
            ) {

                $takeHome =
                    $rawTakeHome;

            } elseif (
                is_string(
                    $rawTakeHome
                )
                && preg_match(
                    '/^-?\d+$/',
                    $rawTakeHome
                )
            ) {

                $takeHome =
                    (int)
                    $rawTakeHome;

            } else {

                throw new RuntimeException(
                    'expected_take_home_by_visit contains an invalid amount.'
                );
            }


            $normalizedExpectedTakeHome[
                $visitId
            ] =
                $takeHome;
        }


        if (
            count(
                $normalizedExpectedTakeHome
            ) === 0
        ) {

            throw new RuntimeException(
                'expected_take_home_by_visit must not be empty.'
            );
        }


        ksort(
            $normalizedExpectedTakeHome,
            SORT_NUMERIC
        );


        $expectedTakeHomeByVisit =
            $normalizedExpectedTakeHome;


        $amountVisitIds =
            array_map(
                'intval',
                array_keys(
                    $expectedTakeHomeByVisit
                )
            );


        sort(
            $amountVisitIds,
            SORT_NUMERIC
        );


        if (
            $expectedVisitIds
            === null
        ) {

            $expectedVisitIds =
                $amountVisitIds;

        } elseif (
            $expectedVisitIds
            !== $amountVisitIds
        ) {

            throw new RuntimeException(
                'Confirmation fingerprint visit ids do not match.'
            );
        }
    }


    $hasExpectedVisitIds =
        array_key_exists(
            'expected_visit_ids',
            $payload
        );


    $hasExpectedTakeHomeByVisit =
        array_key_exists(
            'expected_take_home_by_visit',
            $payload
        );


    if (
        $hasExpectedVisitIds
        !== $hasExpectedTakeHomeByVisit
    ) {

        throw new RuntimeException(
            'Confirmation fingerprint is incomplete. Reopen the confirmation screen.'
        );
    }


    $startAt =
        $dateObject
            ->setTime(
                12,
                0
            )
            ->format(
                'Y-m-d H:i'
            );


    $endAt =
        $dateObject
            ->modify('+1 day')
            ->setTime(
                12,
                0
            )
            ->format(
                'Y-m-d H:i'
            );


    $pdo =
        koppyDatabase();


    $pdo->beginTransaction();


    /*
     * 対象は、
     *
     * ・指定日
     * ・現在時刻以前
     * ・cancelled / no_show以外
     * ・未確定売上
     *
     * の接客だけ。
     */
    $sql =
        "
        SELECT
            v.id

        FROM visits AS v

        LEFT JOIN visit_sales_v2 AS vs
            ON vs.visit_id =
                v.id

        WHERE
            v.started_at >= :start_at

            AND v.started_at < :end_at

            AND datetime(
                v.started_at
            ) <= datetime(
                'now',
                'localtime'
            )

            AND v.status NOT IN (
                'cancelled',
                'no_show'
            )

            AND vs.confirmed_at IS NULL
        ";


    if ($storeId !== null) {

        $sql .=
            "
            AND v.store_id = :store_id
            ";
    }


    $sql .=
        "
        ORDER BY
            v.started_at ASC,
            v.id ASC
        ";


    $visitStatement =
        $pdo->prepare(
            $sql
        );


    $visitStatement->bindValue(
        ':start_at',
        $startAt,
        PDO::PARAM_STR
    );


    $visitStatement->bindValue(
        ':end_at',
        $endAt,
        PDO::PARAM_STR
    );


    if ($storeId !== null) {

        $visitStatement->bindValue(
            ':store_id',
            $storeId,
            PDO::PARAM_INT
        );
    }


    $visitStatement->execute();


    $visitIds =
        array_map(
            static fn (
                array $row
            ): int =>
                (int) $row['id'],
            $visitStatement->fetchAll()
        );


    if (
        $expectedVisitIds
        !== null
    ) {

        $actualVisitIds =
            $visitIds;


        sort(
            $actualVisitIds,
            SORT_NUMERIC
        );


        if (
            $actualVisitIds
            !== $expectedVisitIds
        ) {

            throw new RuntimeException(
                '売上確定対象が確認時から変更されました。確認画面を開き直してください。'
            );
        }
    }


    /*
     * まず全件を検証する。
     *
     * この段階ではまだ
     * visit_sales_v2へ確定保存しない。
     */
    $calculatedResults =
        [];


    $takeHomeTotal =
        0;


    foreach ($visitIds as $visitId) {

        $calculated =
            koppyCalculateVisitSales(
                $pdo,
                $visitId
            );


        if (
            $calculated[
                'sales'
            ][
                'confirmed_at'
            ] !== null
        ) {

            throw new RuntimeException(
                'A sale was confirmed while the daily confirmation was being prepared.'
            );
        }


        $takeHome =
            $calculated[
                'preview'
            ][
                'take_home_total'
            ];


        if ($takeHome === null) {

            $customerName =
                $calculated[
                    'visit'
                ][
                    'customer_name'
                ]
                ?? 'お客様';


            throw new RuntimeException(
                $customerName
                . ' の手取り料金が未設定のため、一括確定できません。'
            );
        }


        if (
            $expectedTakeHomeByVisit
            !== null
        ) {

            if (
                !array_key_exists(
                    $visitId,
                    $expectedTakeHomeByVisit
                )
            ) {

                throw new RuntimeException(
                    '売上確定対象の金額確認情報が不足しています。確認画面を開き直してください。'
                );
            }


            if (
                (int) $takeHome
                !== (int)
                    $expectedTakeHomeByVisit[
                        $visitId
                    ]
            ) {

                throw new RuntimeException(
                    '手取り金額が確認時から変更されました。確認画面を開き直してください。'
                );
            }
        }


        $takeHomeTotal +=
            (int)
            $takeHome;


        $calculatedResults[] =
            $calculated;
    }


    /*
     * 全件検証OK後に確定。
     *
     * 途中で1件でも失敗すれば
     * catch側でROLLBACKされる。
     */
    $confirmed =
        [];


    foreach (
        $calculatedResults
        as $calculated
    ) {

        $visitId =
            (int)
            $calculated[
                'visit'
            ][
                'id'
            ];


        $confirmedResult =
            koppyConfirmVisitSales(
                $pdo,
                $visitId
            );


        $confirmed[] = [
            'visit_id' =>
                $visitId,

            'customer_name' =>
                $confirmedResult[
                    'visit'
                ][
                    'customer_name'
                ],

            'store_id' =>
                $confirmedResult[
                    'visit'
                ][
                    'store_id'
                ],

            'store_name' =>
                $confirmedResult[
                    'visit'
                ][
                    'store_name'
                ],

            'started_at' =>
                $confirmedResult[
                    'visit'
                ][
                    'started_at'
                ],

            'take_home_total' =>
                $confirmedResult[
                    'preview'
                ][
                    'take_home_total'
                ],

            'confirmed_at' =>
                $confirmedResult[
                    'sales'
                ][
                    'confirmed_at'
                ],
        ];
    }


    $pdo->commit();


    echo json_encode(
        [
            'success' =>
                true,

            'date' =>
                $date,

            'store_id' =>
                $storeId,

            'confirmed_count' =>
                count(
                    $confirmed
                ),

            'take_home_total' =>
                $takeHomeTotal,

            'confirmed' =>
                $confirmed,

            'error' =>
                null,
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_PRETTY_PRINT
    );


} catch (Throwable $error) {

    if (
        isset($pdo)
        && $pdo instanceof PDO
        && $pdo->inTransaction()
    ) {

        $pdo->rollBack();
    }


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