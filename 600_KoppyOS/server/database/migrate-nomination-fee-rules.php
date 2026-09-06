<?php

declare(strict_types=1);


if ($argc < 2) {

    fwrite(
        STDERR,
        "Usage: php migrate-nomination-fee-rules.php <database-path>\n"
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
     * 店舗 × 顧客区分ごとの指名料ルール。
     *
     * effective_from = 2000-01-01 は
     * 現在ルールのbaselineとして使用する。
     * 将来料金が変わった場合は
     * 新しいeffective_fromの行を追加する。
     */
    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS
            store_nomination_fee_rules (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            store_id INTEGER NOT NULL,

            customer_status TEXT NOT NULL
                CHECK (
                    customer_status IN (
                        'new',
                        'repeat',
                        'other_store_repeat',
                        'repeat_unknown_id'
                    )
                ),

            fee_amount INTEGER NOT NULL
                CHECK (
                    fee_amount >= 0
                ),

            effective_from TEXT NOT NULL,

            effective_to TEXT,

            active INTEGER NOT NULL DEFAULT 1
                CHECK (
                    active IN (0, 1)
                ),

            created_at TEXT NOT NULL DEFAULT (
                strftime(
                    '%Y-%m-%d %H:%M',
                    'now',
                    'localtime'
                )
            ),

            updated_at TEXT NOT NULL DEFAULT (
                strftime(
                    '%Y-%m-%d %H:%M',
                    'now',
                    'localtime'
                )
            ),

            UNIQUE (
                store_id,
                customer_status,
                effective_from
            ),

            FOREIGN KEY (store_id)
                REFERENCES stores(id)
                ON DELETE CASCADE
        )
        "
    );


    /*
     * 店舗を名前から解決する。
     * IDをハードコードしない。
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


    $sapporoStoreId =
        $storeStatement->fetchColumn();


    $storeStatement->execute([
        '千葉',
    ]);


    $chibaStoreId =
        $storeStatement->fetchColumn();


    if ($sapporoStoreId === false) {

        throw new RuntimeException(
            'Sapporo store was not found.'
        );
    }


    if ($chibaStoreId === false) {

        throw new RuntimeException(
            'Chiba store was not found.'
        );
    }


    $sapporoStoreId =
        (int) $sapporoStoreId;


    $chibaStoreId =
        (int) $chibaStoreId;


    /*
     * 現在の指名料ルール。
     *
     * 札幌:
     * 全顧客区分 2000円
     *
     * 千葉:
     * new                0円
     * repeat          2000円
     * other_store_repeat 0円
     * repeat_unknown_id 2000円
     */
    $rules = [
        [
            $sapporoStoreId,
            'new',
            2000,
        ],
        [
            $sapporoStoreId,
            'repeat',
            2000,
        ],
        [
            $sapporoStoreId,
            'other_store_repeat',
            2000,
        ],
        [
            $sapporoStoreId,
            'repeat_unknown_id',
            2000,
        ],

        [
            $chibaStoreId,
            'new',
            0,
        ],
        [
            $chibaStoreId,
            'repeat',
            2000,
        ],
        [
            $chibaStoreId,
            'other_store_repeat',
            0,
        ],
        [
            $chibaStoreId,
            'repeat_unknown_id',
            2000,
        ],
    ];


    $ruleStatement =
        $pdo->prepare(
            "
            INSERT INTO
                store_nomination_fee_rules (
                    store_id,
                    customer_status,
                    fee_amount,
                    effective_from,
                    effective_to,
                    active
                )

            VALUES (
                ?,
                ?,
                ?,
                '2000-01-01',
                NULL,
                1
            )

            ON CONFLICT (
                store_id,
                customer_status,
                effective_from
            )

            DO UPDATE SET
                fee_amount =
                    excluded.fee_amount,

                effective_to =
                    NULL,

                active =
                    1,

                updated_at =
                    strftime(
                        '%Y-%m-%d %H:%M',
                        'now',
                        'localtime'
                    )
            "
        );


    foreach ($rules as $rule) {

        $ruleStatement->execute(
            $rule
        );
    }


    /*
     * 既存の未確定予約を
     * 現在のルールへ補正する。
     *
     * 確定済み売上は変更しない。
     */

    /*
     * 札幌は全区分2000円。
     */
    $sapporoUpdate =
        $pdo->prepare(
            "
            UPDATE visits

            SET
                nomination_fee_amount = 2000

            WHERE
                store_id = ?

                AND NOT EXISTS (
                    SELECT 1

                    FROM visit_sales_v2 AS vs

                    WHERE
                        vs.visit_id = visits.id

                        AND vs.confirmed_at
                            IS NOT NULL
                )
            "
        );


    $sapporoUpdate->execute([
        $sapporoStoreId,
    ]);


    /*
     * 千葉は店舗内リピートだけ2000円。
     *
     * new / other_store_repeat は0円。
     * repeat / repeat_unknown_id は2000円。
     */
    $chibaUpdate =
        $pdo->prepare(
            "
            UPDATE visits

            SET
                nomination_fee_amount =
                    CASE
                        WHEN customer_status IN (
                            'repeat',
                            'repeat_unknown_id'
                        )
                        THEN 2000

                        ELSE 0
                    END

            WHERE
                store_id = ?

                AND NOT EXISTS (
                    SELECT 1

                    FROM visit_sales_v2 AS vs

                    WHERE
                        vs.visit_id = visits.id

                        AND vs.confirmed_at
                            IS NOT NULL
                )
            "
        );


    $chibaUpdate->execute([
        $chibaStoreId,
    ]);


    $pdo->commit();


    fwrite(
        STDOUT,
        "nomination fee rules migration completed.\n"
    );


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