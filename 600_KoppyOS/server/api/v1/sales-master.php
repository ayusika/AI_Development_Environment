<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/lib/database.php';


$pdo = null;


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
            JSON_UNESCAPED_UNICODE |
            JSON_PRETTY_PRINT
        );

        exit;
    }


    $storeId =
        isset($_GET['store_id'])
            ? (int) $_GET['store_id']
            : 0;


    if ($storeId <= 0) {

        http_response_code(400);

        echo json_encode(
            [
                'success' => false,
                'error' =>
                    'store_id is required.',
            ],
            JSON_UNESCAPED_UNICODE |
            JSON_PRETTY_PRINT
        );

        exit;
    }


    $at =
        isset($_GET['at'])
            ? trim(
                (string) $_GET['at']
            )
            : '';


    if ($at === '') {

        $at =
            date(
                'Y-m-d H:i:s'
            );
    }


    $dateTime =
        DateTimeImmutable::createFromFormat(
            'Y-m-d H:i:s',
            $at
        );


    if (
        $dateTime === false
        || $dateTime->format(
            'Y-m-d H:i:s'
        ) !== $at
    ) {

        http_response_code(400);

        echo json_encode(
            [
                'success' => false,
                'error' =>
                    'at must use YYYY-MM-DD HH:MM:SS.',
            ],
            JSON_UNESCAPED_UNICODE |
            JSON_PRETTY_PRINT
        );

        exit;
    }


    $effectiveDate =
        $dateTime->format(
            'Y-m-d'
        );


    $pdo =
        koppyDatabase();


    /*
     * Store
     */
    $storeStatement =
        $pdo->prepare(
            "
            SELECT
                id,
                name

            FROM stores

            WHERE id = ?

            LIMIT 1
            "
        );


    $storeStatement->execute([
        $storeId,
    ]);


    $store =
        $storeStatement->fetch();


    if (!$store) {

        http_response_code(404);

        echo json_encode(
            [
                'success' => false,
                'error' =>
                    'Store not found.',
            ],
            JSON_UNESCAPED_UNICODE |
            JSON_PRETTY_PRINT
        );

        exit;
    }


    /*
     * Courses
     *
     * 同一コースに複数の料金履歴が存在する場合は、
     * 指定日時時点で最も新しい effective_from を採用する。
     */
    $courseStatement =
        $pdo->prepare(
            "
            SELECT
                sc.id
                    AS store_course_id,

                scr.id
                    AS store_course_rate_id,

                sc.course_code,
                sc.course_name,
                sc.course_minutes,
                sc.course_type,
                sc.pricing_category,

                scr.base_price,
                scr.take_home,

                sc.sort_order

            FROM store_courses AS sc

            INNER JOIN
                store_course_rates_v2 AS scr

                ON scr.store_course_id =
                    sc.id

            WHERE
                sc.store_id = :store_id

                AND sc.active = 1

                AND scr.active = 1

                AND scr.effective_from
                    <= :effective_date

                AND (
                    scr.effective_to IS NULL
                    OR scr.effective_to
                        >= :effective_date
                )

                AND scr.id = (
                    SELECT
                        scr2.id

                    FROM
                        store_course_rates_v2
                        AS scr2

                    WHERE
                        scr2.store_course_id =
                            sc.id

                        AND scr2.active = 1

                        AND scr2.effective_from
                            <= :effective_date_sub

                        AND (
                            scr2.effective_to
                                IS NULL

                            OR scr2.effective_to
                                >= :effective_date_sub
                        )

                    ORDER BY
                        scr2.effective_from DESC,
                        scr2.id DESC

                    LIMIT 1
                )

            ORDER BY
                sc.sort_order ASC,
                sc.id ASC
            "
        );


    $courseStatement->execute([
        ':store_id' =>
            $storeId,

        ':effective_date' =>
            $effectiveDate,

        ':effective_date_sub' =>
            $effectiveDate,
    ]);


    $courses =
        $courseStatement->fetchAll();


    /*
     * Store options
     *
     * 店舗料金が登録されていないOPは返さない。
     */
    $optionStatement =
        $pdo->prepare(
            "
            SELECT
                o.id
                    AS option_id,

                o.name,

                sor.id
                    AS store_option_rate_id,

                sor.price,
                sor.take_home,

                o.sort_order

            FROM options AS o

            INNER JOIN
                store_option_rates_v2 AS sor

                ON sor.option_id =
                    o.id

            WHERE
                sor.store_id = :store_id

                AND o.active = 1

                AND sor.active = 1

                AND sor.effective_from
                    <= :effective_date

                AND (
                    sor.effective_to IS NULL
                    OR sor.effective_to
                        >= :effective_date
                )

                AND sor.id = (
                    SELECT
                        sor2.id

                    FROM
                        store_option_rates_v2
                        AS sor2

                    WHERE
                        sor2.store_id =
                            sor.store_id

                        AND sor2.option_id =
                            o.id

                        AND sor2.active = 1

                        AND sor2.effective_from
                            <= :effective_date_sub

                        AND (
                            sor2.effective_to
                                IS NULL

                            OR sor2.effective_to
                                >= :effective_date_sub
                        )

                    ORDER BY
                        sor2.effective_from DESC,
                        sor2.id DESC

                    LIMIT 1
                )

            ORDER BY
                o.sort_order ASC,
                o.id ASC
            "
        );


    $optionStatement->execute([
        ':store_id' =>
            $storeId,

        ':effective_date' =>
            $effectiveDate,

        ':effective_date_sub' =>
            $effectiveDate,
    ]);


    $options =
        $optionStatement->fetchAll();


    /*
     * Daily fee rule
     */
    $dailyFeeStatement =
        $pdo->prepare(
            "
            SELECT
                id,
                min_visit_count,
                fee_amount,
                effective_from,
                effective_to

            FROM store_daily_fee_rules

            WHERE
                store_id = ?

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


    $dailyFeeStatement->execute([
        $storeId,
        $effectiveDate,
        $effectiveDate,
    ]);


    $dailyFeeRule =
        $dailyFeeStatement->fetch();


    if (!$dailyFeeRule) {

        $dailyFeeRule =
            null;
    }


    echo json_encode(
        [
            'success' => true,

            'read_only' => true,

            'at' =>
                $at,

            'store' =>
                $store,

            'courses' =>
                $courses,

            'options' =>
                $options,

            'daily_fee_rule' =>
                $dailyFeeRule,

            'error' =>
                null,
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    );


} catch (Throwable $e) {

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