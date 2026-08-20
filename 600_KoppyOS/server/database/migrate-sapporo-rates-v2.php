<?php

declare(strict_types=1);

if ($argc < 2) {

    fwrite(
        STDERR,
        "Usage: php migrate-sapporo-rates-v2.php <database-path>\n"
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

    $effectiveFrom =
        '2026-08-20';


    /*
     * 札幌店舗ID取得
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
        '札幌',
    ]);


    $storeId =
        (int)
        $storeStatement->fetchColumn();


    if ($storeId <= 0) {

        throw new RuntimeException(
            '札幌 store was not found.'
        );
    }


    /*
     * 札幌コース
     *
     * base_price は現在未確認のため NULL。
     */
    $courses = [

        [
            'code' =>
                'regular_060',

            'name' =>
                '60分',

            'minutes' =>
                60,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'standard',

            'take_home' =>
                8000,

            'sort_order' =>
                10,
        ],

        [
            'code' =>
                'foreign_060',

            'name' =>
                '外国人60分',

            'minutes' =>
                60,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'foreign',

            'take_home' =>
                15000,

            'sort_order' =>
                20,
        ],

        [
            'code' =>
                'regular_090',

            'name' =>
                '90分',

            'minutes' =>
                90,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'standard',

            'take_home' =>
                12000,

            'sort_order' =>
                30,
        ],

        [
            'code' =>
                'foreign_090',

            'name' =>
                '外国人90分',

            'minutes' =>
                90,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'foreign',

            'take_home' =>
                23000,

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

            'course_type' =>
                'regular',

            'pricing_category' =>
                'standard',

            'take_home' =>
                16000,

            'sort_order' =>
                50,
        ],

        [
            'code' =>
                'foreign_120',

            'name' =>
                '外国人120分',

            'minutes' =>
                120,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'foreign',

            'take_home' =>
                30000,

            'sort_order' =>
                60,
        ],

        [
            'code' =>
                'regular_150',

            'name' =>
                '150分',

            'minutes' =>
                150,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'standard',

            'take_home' =>
                22000,

            'sort_order' =>
                70,
        ],

        [
            'code' =>
                'foreign_150',

            'name' =>
                '外国人150分',

            'minutes' =>
                150,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'foreign',

            'take_home' =>
                38000,

            'sort_order' =>
                80,
        ],

        [
            'code' =>
                'regular_180',

            'name' =>
                '180分',

            'minutes' =>
                180,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'standard',

            'take_home' =>
                26000,

            'sort_order' =>
                90,
        ],

        [
            'code' =>
                'foreign_180',

            'name' =>
                '外国人180分',

            'minutes' =>
                180,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'foreign',

            'take_home' =>
                45000,

            'sort_order' =>
                100,
        ],

        [
            'code' =>
                'regular_240',

            'name' =>
                '240分',

            'minutes' =>
                240,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'standard',

            'take_home' =>
                34000,

            'sort_order' =>
                110,
        ],

        [
            'code' =>
                'foreign_240',

            'name' =>
                '外国人240分',

            'minutes' =>
                240,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'foreign',

            'take_home' =>
                63000,

            'sort_order' =>
                120,
        ],

        [
            'code' =>
                'regular_300',

            'name' =>
                '300分',

            'minutes' =>
                300,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'standard',

            'take_home' =>
                42000,

            'sort_order' =>
                130,
        ],

        [
            'code' =>
                'foreign_300',

            'name' =>
                '外国人300分',

            'minutes' =>
                300,

            'course_type' =>
                'regular',

            'pricing_category' =>
                'foreign',

            'take_home' =>
                80000,

            'sort_order' =>
                140,
        ],

        [
            'code' =>
                'extension_030',

            'name' =>
                '延長30分',

            'minutes' =>
                30,

            'course_type' =>
                'extension',

            'pricing_category' =>
                'standard',

            'take_home' =>
                5000,

            'sort_order' =>
                150,
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
                ?,
                ?
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
                NULL,
                ?,
                ?,
                NULL,
                1
            )
            "
        );


    foreach ($courses as $course) {

        $courseInsertStatement->execute([
            $storeId,
            $course['code'],
            $course['name'],
            $course['minutes'],
            $course['sort_order'],
            $course['course_type'],
            $course['pricing_category'],
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
            $course['take_home'],
            $effectiveFrom,
        ]);
    }


    /*
     * 札幌OP料金
     *
     * OPは販売額＝手取り額。
     * 金額未確認のOPはここでは登録しない。
     */
    $optionRates = [

        '聖水' =>
            1000,

        '射精' =>
            5000,

        '逆AF' =>
            3000,

        '前立腺マッサージ' =>
            3000,

        'コスプレ' =>
            1000,

        'ハイヒール' =>
            1000,

        'ごっくん' =>
            3000,

        '顔射' =>
            3000,

        '動画撮影（顔なし）' =>
            8000,

        '動画撮影（顔あり）' =>
            15000,
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
     * 札幌日次手数料
     *
     * 売上確定済み来店が2件以上なら2000円。
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
                2,
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
        "Sapporo sales rates ready.\n";


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