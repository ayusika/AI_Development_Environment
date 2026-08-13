<?php

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/lib/database.php';

$result = [
    'success' => false,
    'test_data' => null,
    'error' => null,
];

$pdo = null;

try {
    $pdo = koppyDatabase();

    $pdo->beginTransaction();

    /*
     * 店舗
     */
    $storeStatement = $pdo->prepare(
        'SELECT id FROM stores WHERE name = ?'
    );

    $storeStatement->execute([
        '千葉'
    ]);

    $storeId =
        $storeStatement->fetchColumn();

    if (!$storeId) {
        throw new RuntimeException(
            'Test store was not found.'
        );
    }

    /*
     * 架空顧客
     */
    $pdo->exec(
        "INSERT INTO customers (note)
         VALUES ('DB往復テスト用の架空顧客')"
    );

    $customerId =
        (int) $pdo->lastInsertId();

    /*
     * 顧客名
     */
    $nameStatement = $pdo->prepare(
        'INSERT INTO customer_names
        (
            customer_id,
            name_type,
            name,
            is_primary
        )
        VALUES (?, ?, ?, ?)'
    );

    $nameStatement->execute([
        $customerId,
        'line',
        'DBテストちゃん',
        1,
    ]);

    /*
     * 接客
     */
    $visitStatement = $pdo->prepare(
        'INSERT INTO visits
        (
            customer_id,
            store_id,
            started_at,
            course_minutes,
            customer_type,
            options,
            is_dummy,
            note
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $visitStatement->execute([
        $customerId,
        $storeId,
        '2026-08-14 15:00',
        90,
        'repeat',
        json_encode(
            [
                'コスプレ',
                'ハイヒール',
            ],
            JSON_UNESCAPED_UNICODE
        ),
        0,
        'DB往復テスト',
    ]);

    $visitId =
        (int) $pdo->lastInsertId();

    /*
     * 日記
     */
    $diaryStatement = $pdo->prepare(
        'INSERT INTO diaries
        (
            store_id,
            posted_at,
            platform,
            diary_type,
            title,
            body
        )
        VALUES (?, ?, ?, ?, ?, ?)'
    );

    $diaryStatement->execute([
        $storeId,
        '2026-08-14 18:00',
        'nukinavi',
        'thanks',
        'DBテスト日記',
        'これはDB往復確認用の架空日記です。',
    ]);

    $diaryId =
        (int) $pdo->lastInsertId();

    /*
     * 接客と日記を接続
     */
    $linkStatement = $pdo->prepare(
        'INSERT INTO diary_visits
        (
            diary_id,
            visit_id,
            sort_order
        )
        VALUES (?, ?, ?)'
    );

    $linkStatement->execute([
        $diaryId,
        $visitId,
        10,
    ]);

    /*
     * 保存したものをJOINして読み戻す
     */
    $readStatement = $pdo->prepare(
        "
        SELECT
            d.id AS diary_id,
            d.title,
            d.body,
            d.platform,
            s.name AS store,
            v.id AS visit_id,
            v.started_at,
            v.course_minutes,
            v.customer_type,
            v.options,
            cn.name AS customer_name
        FROM diaries d
        JOIN stores s
            ON s.id = d.store_id
        JOIN diary_visits dv
            ON dv.diary_id = d.id
        JOIN visits v
            ON v.id = dv.visit_id
        LEFT JOIN customer_names cn
            ON cn.customer_id = v.customer_id
           AND cn.is_primary = 1
        WHERE d.id = ?
        "
    );

    $readStatement->execute([
        $diaryId
    ]);

    $testData =
        $readStatement->fetch();

    if (!$testData) {
        throw new RuntimeException(
            'Inserted test data could not be read.'
        );
    }

    /*
     * 今回はテストなので保存せず全撤回。
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