<?php

declare(strict_types=1);


if ($argc < 2) {

    fwrite(
        STDERR,
        "Usage: php migrate-chiba-rates-v2.php <database-path>\n"
    );

    exit(1);
}


$databasePath =
    $argv[1];


if (!is_file($databasePath)) {

    fwrite(
        STDERR,
        "Database not found: {$databasePath}\n"
    );

    exit(1);
}


$pdo =
    new PDO(
        'sqlite:' . $databasePath,
        null,
        null,
        [
            PDO::ATTR_ERRMODE =>
                PDO::ERRMODE_EXCEPTION,

            PDO::ATTR_DEFAULT_FETCH_MODE =>
                PDO::FETCH_ASSOC,
        ]
    );


$pdo->exec(
    'PRAGMA foreign_keys = ON'
);


$pdo->beginTransaction();


try {

    /*
     * 現時点で確認できている
     * 千葉料金の基準日。
     *
     * 2026年中の既存予約も
     * 現料金で計算できるようにする。
     *
     * 将来料金改定日が判明した場合は
     * effective_to / effective_fromで
     * 履歴化する。
     */
    $effectiveFrom =
        '2026-01-01';


    /*
     * 千葉店舗ID
     */
    $storeStatement =
        $pdo->prepare(
            "
            SELECT id

            FROM stores

            WHERE name = ?

            LIMIT 1
            "
        );


    $storeStatement->execute([
        '千葉',
    ]);


    $storeId =
        (int)
        $storeStatement->fetchColumn();


    if ($storeId <= 0) {

        throw new RuntimeException(
            '千葉 store was not found.'
        );
    }


    /*
     * 千葉 基本コース
     *
     * 40分:
     *   客基本料金は未確認。
     *
     * 30分延長:
     *   客料金10000円は判明済みだが、
     *   手取り未確認のため
     *   今回はまだ登録しない。
     */
    $courses = [

        [
            'code' =>
                'regular_040',

            'name' =>
                '40分',

            'minutes' =>
                40,

            'base_price' =>
                null,

            'take_home' =>
                9000,

            'sort_order' =>
                10,
        ],

        [
            'code' =>
                'regular_060',

            'name' =>
                '60分',

            'minutes' =>
                60,

            'base_price' =>
                18000,

            'take_home' =>
                10000,

            'sort_order' =>
                20,
        ],

        [
            'code' =>
                'regular_075',

            'name' =>
                '75分',

            'minutes' =>
                75,

            'base_price' =>
                20000,

            'take_home' =>
                11000,

            'sort_order' =>
                30,
        ],

        [
            'code' =>
                'regular_090',

            'name' =>
                '90分',

            'minutes' =>
                90,

            'base_price' =>
                22000,

            'take_home' =>
                12000,

            'sort_order' =>
                40,
        ],

        [
            'code' =>
                'regular_120',

            'name' =>
                '120分',

            'minutes' =>
                120,

            'base_price' =>
                27000,

            'take_home' =>
                15000,

            'sort_order' =>
                50,
        ],

        [
            'code' =>
                'regular_150',

            'name' =>
                '150分',

            'minutes' =>
                150,

            'base_price' =>
                32000,

            'take_home' =>
                18000,

            'sort_order' =>
                60,
        ],

        [
            'code' =>
                'regular_180',

            'name' =>
                '180分',

            'minutes' =>
                180,

            'base_price' =>
                35000,

            'take_home' =>
                20000,

            'sort_order' =>
                70,
        ],
    ];


    $courseInsertStatement =
        $pdo->prepare(
            "
            INSERT OR IGNORE INTO store_courses
            (
                store_id,
                course_code,
                course_name,
                course_minutes,
                active,
                sort_order,
                course_type,
                pricing_category
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                1,
                ?,
                'regular',
                'standard'
            )
            "
        );


    $courseFindStatement =
        $pdo->prepare(
            "
            SELECT id

            FROM store_courses

            WHERE
                store_id = ?
                AND course_code = ?

            LIMIT 1
            "
        );


    $courseRateInsertStatement =
        $pdo->prepare(
            "
            INSERT OR IGNORE INTO store_course_rates_v2
            (
                store_course_id,
                base_price,
                take_home,
                effective_from,
                effective_to,
                active
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                NULL,
                1
            )
            "
        );


    $courseIdsByMinutes =
        [];


    foreach ($courses as $course) {

        $courseInsertStatement->execute([
            $storeId,
            $course['code'],
            $course['name'],
            $course['minutes'],
            $course['sort_order'],
        ]);


        $courseFindStatement->execute([
            $storeId,
            $course['code'],
        ]);


        $storeCourseId =
            (int)
            $courseFindStatement->fetchColumn();


        if ($storeCourseId <= 0) {

            throw new RuntimeException(
                'store_course was not found: '
                . $course['code']
            );
        }


        $courseRateInsertStatement->execute([
            $storeCourseId,
            $course['base_price'],
            $course['take_home'],
            $effectiveFrom,
        ]);


        $courseIdsByMinutes[
            (int) $course['minutes']
        ] =
            $storeCourseId;
    }


    /*
     * 千葉 180分超の合成コース。
     *
     * 店舗料金ルール上、
     * 180分を超える予約は
     *
     * 180分 + 基本コース
     *
     * として計算する。
     *
     * 指名料は予約単位で別計算するため、
     * ここには含めない。
     */
    $coursesByMinutes =
        [];


    foreach ($courses as $course) {

        $coursesByMinutes[
            (int) $course['minutes']
        ] =
            $course;
    }


    $compositeCourseParts = [

        240 => [180, 60],

        255 => [180, 75],

        270 => [180, 90],

        300 => [180, 120],

        330 => [180, 150],

        360 => [180, 180],
    ];


    foreach (
        $compositeCourseParts
        as $totalMinutes => $parts
    ) {

        $basePrice =
            0;


        $takeHome =
            0;


        $basePriceKnown =
            true;


        foreach ($parts as $partMinutes) {

            if (
                !isset(
                    $coursesByMinutes[
                        $partMinutes
                    ]
                )
            ) {

                throw new RuntimeException(
                    'Composite course source was not found: '
                    . $partMinutes
                );
            }


            $part =
                $coursesByMinutes[
                    $partMinutes
                ];


            if (
                $part['base_price']
                === null
            ) {

                $basePriceKnown =
                    false;

            } else {

                $basePrice +=
                    (int)
                    $part['base_price'];
            }


            $takeHome +=
                (int)
                $part['take_home'];
        }


        $courseCode =
            'regular_'
            . str_pad(
                (string) $totalMinutes,
                3,
                '0',
                STR_PAD_LEFT
            );


        $courseName =
            $totalMinutes
            . '分';


        $courseInsertStatement->execute([
            $storeId,
            $courseCode,
            $courseName,
            $totalMinutes,
            100 + $totalMinutes,
        ]);


        $courseFindStatement->execute([
            $storeId,
            $courseCode,
        ]);


        $storeCourseId =
            (int)
            $courseFindStatement->fetchColumn();


        if ($storeCourseId <= 0) {

            throw new RuntimeException(
                'Composite store_course was not found: '
                . $courseCode
            );
        }


        $courseRateInsertStatement->execute([
            $storeCourseId,
            $basePriceKnown
                ? $basePrice
                : null,
            $takeHome,
            $effectiveFrom,
        ]);


        $courseIdsByMinutes[
            $totalMinutes
        ] =
            $storeCourseId;
    }


    /*
     * 既存の千葉予約で
     * store_course_idが未設定の場合、
     * 既知の基本コース時間と
     * 合成コース時間を補完する。
     */
    $visitCourseBackfillStatement =
        $pdo->prepare(
            "
            UPDATE visits

            SET
                store_course_id = ?,
                updated_at = strftime(
                    '%Y-%m-%d %H:%M',
                    'now',
                    'localtime'
                )

            WHERE
                store_id = ?

                AND store_course_id IS NULL

                AND course_minutes = ?
            "
        );


    foreach (
        $courseIdsByMinutes
        as $minutes => $storeCourseId
    ) {

        $visitCourseBackfillStatement->execute([
            $storeCourseId,
            $storeId,
            $minutes,
        ]);
    }


    /*
     * 千葉OP
     *
     * 全額フルバック。
     *
     * 将来用5000円OP欄は
     * 現在実体が存在しないため
     * 登録しない。
     */
    $optionRates = [

        '逆AF' =>
            3000,

        '射精' =>
            3000,

        '聖水' =>
            2000,

        'コスプレ' =>
            1000,

        'パンスト' =>
            1000,
    ];


    $optionFindStatement =
        $pdo->prepare(
            "
            SELECT id

            FROM options

            WHERE name = ?

            LIMIT 1
            "
        );


    $optionRateInsertStatement =
        $pdo->prepare(
            "
            INSERT OR IGNORE INTO store_option_rates_v2
            (
                store_id,
                option_id,
                price,
                take_home,
                effective_from,
                effective_to,
                active
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                NULL,
                1
            )
            "
        );


    foreach (
        $optionRates
        as $optionName => $amount
    ) {

        $optionFindStatement->execute([
            $optionName,
        ]);


        $optionId =
            (int)
            $optionFindStatement->fetchColumn();


        if ($optionId <= 0) {

            throw new RuntimeException(
                'Option was not found: '
                . $optionName
            );
        }


        $optionRateInsertStatement->execute([
            $storeId,
            $optionId,
            $amount,
            $amount,
            $effectiveFrom,
        ]);
    }


    /*
     * 千葉 日次手数料
     *
     * 1件以上の確定済み来店があれば
     * 1営業日につき2000円。
     */
    $dailyFeeStatement =
        $pdo->prepare(
            "
            INSERT OR IGNORE INTO store_daily_fee_rules
            (
                store_id,
                min_visit_count,
                fee_amount,
                effective_from,
                effective_to,
                active
            )
            VALUES
            (
                ?,
                1,
                2000,
                ?,
                NULL,
                1
            )
            "
        );


    $dailyFeeStatement->execute([
        $storeId,
        $effectiveFrom,
    ]);


    $pdo->commit();


    echo
        "Chiba sales rates ready.\n";


} catch (Throwable $error) {

    if ($pdo->inTransaction()) {

        $pdo->rollBack();
    }


    fwrite(
        STDERR,
        $error->getMessage()
        . "\n"
    );


    exit(1);
}