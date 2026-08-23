<?php

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/../../auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/lib/database.php';

$result = [
    'success' => false,
    'checks' => [],
    'test_data' => null,
    'error' => null,
];

$pdo = null;

try {
    $pdo = koppyDatabase();

    $pdo->beginTransaction();

    /*
     * ------------------------------------------------------
     * 1. 店舗
     * ------------------------------------------------------
     */

    $storeStatement = $pdo->prepare(
        'SELECT id
         FROM stores
         WHERE name = ?'
    );

    $storeStatement->execute([
        '千葉'
    ]);

    $storeId =
        (int) $storeStatement->fetchColumn();

    if ($storeId <= 0) {
        throw new RuntimeException(
            'Test store was not found.'
        );
    }

    $result['checks']['store'] = true;

    /*
     * ------------------------------------------------------
     * 2. 出勤
     * ------------------------------------------------------
     */

    $shiftStatement = $pdo->prepare(
        'INSERT INTO work_shifts
        (
            store_id,
            start_at,
            end_at,
            note
        )
        VALUES (?, ?, ?, ?)'
    );

    $shiftStatement->execute([
        $storeId,
        '2026-08-14 12:00',
        '2026-08-14 23:00',
        '正式DB往復テスト',
    ]);

    $shiftId =
        (int) $pdo->lastInsertId();

    $result['checks']['work_shift'] = true;

    /*
     * ------------------------------------------------------
     * 3. 顧客
     * ------------------------------------------------------
     */

    $customerStatement = $pdo->prepare(
        'INSERT INTO customers
        (
            customer_code,
            general_notes
        )
        VALUES (?, ?)'
    );

    $customerStatement->execute([
        'KH-TEST-0001',
        'DB往復テスト用の架空顧客',
    ]);

    $customerId =
        (int) $pdo->lastInsertId();

    /*
     * 顧客名
     */

    $customerNameStatement = $pdo->prepare(
        'INSERT INTO customer_names
        (
            customer_id,
            name_type,
            name,
            store_id,
            is_primary
        )
        VALUES (?, ?, ?, ?, ?)'
    );

    $customerNameStatement->execute([
        $customerId,
        'line',
        'DBテストちゃん',
        null,
        1,
    ]);

    $result['checks']['customer'] = true;

    /*
     * ------------------------------------------------------
     * 4. 接客 / 予約
     * ------------------------------------------------------
     */

    $visitStatement = $pdo->prepare(
        'INSERT INTO visits
        (
            source_id,
            store_id,
            customer_id,
            started_at,
            course_minutes,
            customer_status,
            customer_features,
            conversation_notes,
            visit_notes,
            is_dummy,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $visitStatement->execute([
        'TEST-VISIT-0001',
        $storeId,
        $customerId,
        '2026-08-14 15:00',
        90,
        'repeat',
        'M男・テスト用特徴',
        '仕事と旅行の話をした',
        '正式DB往復テスト',
        0,
        'completed',
    ]);

    $visitId =
        (int) $pdo->lastInsertId();

    $result['checks']['visit'] = true;

    /*
     * ------------------------------------------------------
     * 5. OP
     * ------------------------------------------------------
     */

    $optionStatement = $pdo->prepare(
        'SELECT id
         FROM options
         WHERE name = ?'
    );

    $optionStatement->execute([
        '逆AF'
    ]);

    $optionId =
        (int) $optionStatement->fetchColumn();

    if ($optionId <= 0) {
        throw new RuntimeException(
            'Test option was not found.'
        );
    }

    $visitOptionStatement = $pdo->prepare(
        'INSERT INTO visit_options
        (
            visit_id,
            option_id,
            income_amount
        )
        VALUES (?, ?, ?)'
    );

    $visitOptionStatement->execute([
        $visitId,
        $optionId,
        3000,
    ]);

    $result['checks']['visit_option'] = true;

    /*
     * ------------------------------------------------------
     * 6. 顧客単位の日記素材
     * ------------------------------------------------------
     */

    $diaryNoteStatement = $pdo->prepare(
        'INSERT INTO visit_diary_notes
        (
            visit_id,
            body
        )
        VALUES (?, ?)'
    );

    $diaryNoteStatement->execute([
        $visitId,
        'いっぱい楽しんでくれてありがと♡',
    ]);

    $result['checks']['visit_diary_note'] = true;

    /*
     * ------------------------------------------------------
     * 7. 実際の日記
     * ------------------------------------------------------
     */

    $diaryStatement = $pdo->prepare(
        'INSERT INTO diaries
        (
            source_id,
            store_id,
            platform,
            diary_type,
            title,
            body,
            scheduled_at,
            posted_at,
            is_dummy,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $diaryStatement->execute([
        'TEST-DIARY-0001',
        $storeId,
        'nukinavi',
        'thanks_summary',
        'DBテスト日記',
        'これは正式DB往復確認用の架空日記です。',
        '2026-08-14 18:00',
        '2026-08-14 18:03',
        0,
        'posted',
    ]);

    $diaryId =
        (int) $pdo->lastInsertId();

    /*
     * 日記と接客の紐付け
     */

    $diaryVisitStatement = $pdo->prepare(
        'INSERT INTO diary_visits
        (
            diary_id,
            visit_id,
            sort_order
        )
        VALUES (?, ?, ?)'
    );

    $diaryVisitStatement->execute([
        $diaryId,
        $visitId,
        10,
    ]);

    $result['checks']['diary'] = true;
    $result['checks']['diary_visit'] = true;

    /*
     * ------------------------------------------------------
     * 8. 売上
     * ------------------------------------------------------
     */

    $salesStatement = $pdo->prepare(
        'INSERT INTO visit_sales
        (
            visit_id,
            base_price,
            base_income,
            option_income,
            tip_income,
            adjustment_income
        )
        VALUES (?, ?, ?, ?, ?, ?)'
    );

    $salesStatement->execute([
        $visitId,
        22000,
        12000,
        3000,
        1000,
        -1000,
    ]);

    $result['checks']['visit_sales'] = true;

    /*
     * ------------------------------------------------------
     * 9. 店舗別コース料金
     * ------------------------------------------------------
     */

    $courseRateStatement = $pdo->prepare(
        'INSERT INTO store_course_rates
        (
            store_id,
            course_minutes,
            base_price,
            base_income,
            effective_from,
            active
        )
        VALUES (?, ?, ?, ?, ?, ?)'
    );

    $courseRateStatement->execute([
        $storeId,
        90,
        22000,
        12000,
        '2026-08-01',
        1,
    ]);

    $result['checks']['store_course_rate'] = true;

    /*
     * ------------------------------------------------------
     * 10. 店舗別OP料金
     * ------------------------------------------------------
     */

    $optionRateStatement = $pdo->prepare(
        'INSERT INTO store_option_rates
        (
            store_id,
            option_id,
            income_amount,
            effective_from,
            active
        )
        VALUES (?, ?, ?, ?, ?)'
    );

    $optionRateStatement->execute([
        $storeId,
        $optionId,
        3000,
        '2026-08-01',
        1,
    ]);

    $result['checks']['store_option_rate'] = true;

    /*
     * ------------------------------------------------------
     * 11. JOINしてまとめて読み戻す
     * ------------------------------------------------------
     */

    $readStatement = $pdo->prepare(
        "
        SELECT
            v.id AS visit_id,
            v.started_at,
            v.course_minutes,
            v.customer_status,
            v.customer_features,
            v.conversation_notes,

            s.name AS store,

            c.customer_code,
            cn.name AS customer_name,

            o.name AS option_name,
            vo.income_amount AS option_income_detail,

            vdn.body AS diary_note,

            d.id AS diary_id,
            d.title AS diary_title,
            d.body AS diary_body,
            d.platform,
            d.diary_type,
            d.posted_at,

            vs.base_price,
            vs.base_income,
            vs.option_income,
            vs.tip_income,
            vs.adjustment_income

        FROM visits v

        JOIN stores s
            ON s.id = v.store_id

        LEFT JOIN customers c
            ON c.id = v.customer_id

        LEFT JOIN customer_names cn
            ON cn.customer_id = c.id
           AND cn.is_primary = 1

        LEFT JOIN visit_options vo
            ON vo.visit_id = v.id

        LEFT JOIN options o
            ON o.id = vo.option_id

        LEFT JOIN visit_diary_notes vdn
            ON vdn.visit_id = v.id

        LEFT JOIN diary_visits dv
            ON dv.visit_id = v.id

        LEFT JOIN diaries d
            ON d.id = dv.diary_id

        LEFT JOIN visit_sales vs
            ON vs.visit_id = v.id

        WHERE v.id = ?
        "
    );

    $readStatement->execute([
        $visitId
    ]);

    $testData =
        $readStatement->fetch();

    if (!$testData) {
        throw new RuntimeException(
            'Inserted test data could not be read.'
        );
    }

    /*
     * ------------------------------------------------------
     * 12. 集計テスト
     * ------------------------------------------------------
     */

    $expectedIncome =
        12000
        + 3000
        + 1000
        - 1000;

    $actualIncome =
        (int) $testData['base_income']
        + (int) $testData['option_income']
        + (int) $testData['tip_income']
        + (int) $testData['adjustment_income'];

    if ($actualIncome !== $expectedIncome) {
        throw new RuntimeException(
            'Income calculation test failed.'
        );
    }

    $result['checks']['income_calculation'] = true;

    /*
     * ------------------------------------------------------
     * テストなので全部撤回
     * ------------------------------------------------------
     */

    $pdo->rollBack();

    $result['success'] = true;
    $result['test_data'] = $testData;

} catch (Throwable $e) {

    if (
        $pdo instanceof PDO
        && $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }

    $result['error'] =
        $e->getMessage();
}

echo json_encode(
    $result,
    JSON_UNESCAPED_UNICODE |
    JSON_PRETTY_PRINT
);