<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/../../auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/lib/database.php';

require_once __DIR__ . '/lib/visit-sales-calculator.php';


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


    $startAt =
        $dateObject->format(
            'Y-m-d 00:00'
        );


    $endAt =
        $dateObject
            ->modify('+1 day')
            ->format(
                'Y-m-d 00:00'
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