<?php

declare(strict_types=1);

if ($argc < 2) {
    fwrite(
        STDERR,
        "Usage: php migrate-sales-v2.php <database-path>\n"
    );
    exit(1);
}

$databasePath = $argv[1];

if (!is_file($databasePath)) {
    fwrite(
        STDERR,
        "Database not found: {$databasePath}\n"
    );
    exit(1);
}

$pdo = new PDO(
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
     * 店舗ごとのコースそのもの。
     * 同じ60分でも通常60分・イベント60分などを分離できる。
     */
    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS store_courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            store_id INTEGER NOT NULL,

            course_code TEXT NOT NULL,

            course_name TEXT NOT NULL,

            course_minutes INTEGER NOT NULL
                CHECK (course_minutes > 0),

            active INTEGER NOT NULL DEFAULT 1
                CHECK (active IN (0, 1)),

            sort_order INTEGER NOT NULL DEFAULT 10,

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
                course_code
            ),

            FOREIGN KEY (store_id)
                REFERENCES stores(id)
                ON DELETE CASCADE
        )
        "
    );


    /*
     * visitsへ予約コース紐付けを追加。
     *
     * course_minutesだけでは、
     * 通常90分 / 外国人90分などを区別できないため、
     * store_coursesそのものを保持する。
     */
    $visitColumns =
        $pdo
            ->query(
                "PRAGMA table_info('visits')"
            )
            ->fetchAll();


    $visitColumnNames =
        array_column(
            $visitColumns,
            'name'
        );


    if (
        !in_array(
            'store_course_id',
            $visitColumnNames,
            true
        )
    ) {

        $pdo->exec(
            "
            ALTER TABLE visits
            ADD COLUMN store_course_id INTEGER
            "
        );
    }


    /*
     * store_courses v2補強。
     *
     * course_type:
     *   regular   通常コース
     *   extension 延長
     *
     * pricing_category:
     *   standard 通常料金
     *   foreign  外国人料金
     *   event    イベント料金
     */
    $storeCourseColumns =
        $pdo
            ->query(
                "PRAGMA table_info('store_courses')"
            )
            ->fetchAll();


    $storeCourseColumnNames =
        array_column(
            $storeCourseColumns,
            'name'
        );


    if (
        !in_array(
            'course_type',
            $storeCourseColumnNames,
            true
        )
    ) {

        $pdo->exec(
            "
            ALTER TABLE store_courses
            ADD COLUMN course_type TEXT
                NOT NULL
                DEFAULT 'regular'
            "
        );
    }


    if (
        !in_array(
            'pricing_category',
            $storeCourseColumnNames,
            true
        )
    ) {

        $pdo->exec(
            "
            ALTER TABLE store_courses
            ADD COLUMN pricing_category TEXT
                NOT NULL
                DEFAULT 'standard'
            "
        );
    }


    /*
     * 初期版では base_price が NOT NULL だったが、
     * 未確認料金をダミー値で保存しないため NULL を許可する。
     *
     * 現段階のv2料金・売上テーブルが空の場合だけ安全に再構築する。
     */
    $rateColumns =
        $pdo
            ->query(
                "PRAGMA table_info('store_course_rates_v2')"
            )
            ->fetchAll();


    $basePriceColumn =
        null;


    foreach ($rateColumns as $column) {

        if (
            $column['name']
            === 'base_price'
        ) {

            $basePriceColumn =
                $column;

            break;
        }
    }


    if (
        $basePriceColumn !== null
        && (int) $basePriceColumn['notnull'] === 1
    ) {

        $rateCount =
            (int)
            $pdo
                ->query(
                    'SELECT COUNT(*)
                     FROM store_course_rates_v2'
                )
                ->fetchColumn();


        $salesCount =
            (int)
            $pdo
                ->query(
                    'SELECT COUNT(*)
                     FROM visit_sales_v2'
                )
                ->fetchColumn();


        $historyCount =
            (int)
            $pdo
                ->query(
                    'SELECT COUNT(*)
                     FROM visit_sales_history'
                )
                ->fetchColumn();


        if (
            $rateCount !== 0
            || $salesCount !== 0
            || $historyCount !== 0
        ) {

            throw new RuntimeException(
                'Cannot rebuild sales v2 tables because data already exists.'
            );
        }


        $pdo->exec(
            'DROP TABLE visit_sales_history'
        );

        $pdo->exec(
            'DROP TABLE visit_sales_v2'
        );

        $pdo->exec(
            'DROP TABLE store_course_rates_v2'
        );
    }


    /*
     * 予約ごとの延長コース。
     *
     * 例：
     * 120分 + 延長30分
     * と
     * 150分コース
     * を別構造として保持する。
     */
    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS visit_extensions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            visit_id INTEGER NOT NULL,

            store_course_id INTEGER NOT NULL,

            quantity INTEGER NOT NULL DEFAULT 1
                CHECK (quantity >= 1),

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
                visit_id,
                store_course_id
            ),

            FOREIGN KEY (visit_id)
                REFERENCES visits(id)
                ON DELETE CASCADE,

            FOREIGN KEY (store_course_id)
                REFERENCES store_courses(id)
                ON DELETE RESTRICT
        )
        "
    );


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
            idx_visit_extensions_visit
        ON visit_extensions (
            visit_id
        )
        "
    );


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
            idx_visit_extensions_course
        ON visit_extensions (
            store_course_id
        )
        "
    );


    /*
     * コース料金履歴。
     * 過去料金を消さず、有効期間で管理する。
     */
    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS store_course_rates_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            store_course_id INTEGER NOT NULL,

            base_price INTEGER
                CHECK (
                    base_price IS NULL
                    OR base_price >= 0
                ),

            take_home INTEGER NOT NULL
                CHECK (take_home >= 0),

            effective_from TEXT NOT NULL,

            effective_to TEXT,

            active INTEGER NOT NULL DEFAULT 1
                CHECK (active IN (0, 1)),

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
                store_course_id,
                effective_from
            ),

            FOREIGN KEY (store_course_id)
                REFERENCES store_courses(id)
                ON DELETE CASCADE
        )
        "
    );


    /*
     * 店舗別OP料金履歴。
     * 現状は販売額＝手取りだが、将来差が出ても対応可能。
     */
    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS store_option_rates_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            store_id INTEGER NOT NULL,

            option_id INTEGER NOT NULL,

            price INTEGER NOT NULL
                CHECK (price >= 0),

            take_home INTEGER NOT NULL
                CHECK (take_home >= 0),

            effective_from TEXT NOT NULL,

            effective_to TEXT,

            active INTEGER NOT NULL DEFAULT 1
                CHECK (active IN (0, 1)),

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
                option_id,
                effective_from
            ),

            FOREIGN KEY (store_id)
                REFERENCES stores(id)
                ON DELETE CASCADE,

            FOREIGN KEY (option_id)
                REFERENCES options(id)
                ON DELETE CASCADE
        )
        "
    );


    /*
     * 店舗ごとの日次手数料ルール。
     * 例：
     * 札幌 2件以上 → 2000円
     * 千葉 1件以上 → 2000円
     */
    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS store_daily_fee_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            store_id INTEGER NOT NULL,

            min_visit_count INTEGER NOT NULL
                CHECK (min_visit_count >= 1),

            fee_amount INTEGER NOT NULL
                CHECK (fee_amount >= 0),

            effective_from TEXT NOT NULL,

            effective_to TEXT,

            active INTEGER NOT NULL DEFAULT 1
                CHECK (active IN (0, 1)),

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
                min_visit_count,
                effective_from
            ),

            FOREIGN KEY (store_id)
                REFERENCES stores(id)
                ON DELETE CASCADE
        )
        "
    );


    /*
     * 売上v2。
     * 確定時点の料金をスナップショット保存する。
     */
    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS visit_sales_v2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            visit_id INTEGER NOT NULL UNIQUE,

            store_course_rate_id INTEGER,

            base_price_snapshot INTEGER
                CHECK (
                    base_price_snapshot IS NULL
                    OR base_price_snapshot >= 0
                ),

            course_take_home_snapshot INTEGER NOT NULL DEFAULT 0,

            option_price_total_snapshot INTEGER NOT NULL DEFAULT 0,

            option_take_home_total_snapshot INTEGER NOT NULL DEFAULT 0,

            tip_amount INTEGER NOT NULL DEFAULT 0,

            discount_amount INTEGER NOT NULL DEFAULT 0,

            discount_reason_type TEXT CHECK (
                discount_reason_type IS NULL
                OR discount_reason_type IN (
                    'coupon',
                    'early',
                    'store',
                    'campaign',
                    'other'
                )
            ),

            discount_reason_note TEXT,

            adjustment_amount INTEGER NOT NULL DEFAULT 0,

            customer_payment_total INTEGER
                CHECK (
                    customer_payment_total IS NULL
                    OR customer_payment_total >= 0
                ),

            take_home_total INTEGER NOT NULL DEFAULT 0,

            confirmed_at TEXT,

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

            FOREIGN KEY (visit_id)
                REFERENCES visits(id)
                ON DELETE CASCADE,

            FOREIGN KEY (store_course_rate_id)
                REFERENCES store_course_rates_v2(id)
                ON DELETE SET NULL
        )
        "
    );


    /*
     * 売上修正履歴。
     * before_data / after_data はJSON文字列。
     */
    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS visit_sales_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            visit_sales_id INTEGER NOT NULL,

            before_data TEXT NOT NULL,

            after_data TEXT NOT NULL,

            change_reason TEXT,

            changed_at TEXT NOT NULL DEFAULT (
                strftime(
                    '%Y-%m-%d %H:%M',
                    'now',
                    'localtime'
                )
            ),

            FOREIGN KEY (visit_sales_id)
                REFERENCES visit_sales_v2(id)
                ON DELETE CASCADE
        )
        "
    );


    /*
     * 新しく確認できたOPを共通OPマスタへ追加。
     */
    $newOptions = [
        '顔射',
        '動画撮影（顔なし）',
        '動画撮影（顔あり）',
    ];


    $optionExistsStatement =
        $pdo->prepare(
            "
            SELECT id

            FROM options

            WHERE name = ?

            LIMIT 1
            "
        );


    $optionInsertStatement =
        $pdo->prepare(
            "
            INSERT INTO options
            (
                name,
                active,
                sort_order
            )
            VALUES
            (
                ?,
                1,
                ?
            )
            "
        );


    $nextSortOrder =
        120;


    foreach ($newOptions as $optionName) {

        $optionExistsStatement->execute([
            $optionName,
        ]);


        if (
            !$optionExistsStatement->fetch()
        ) {

            $optionInsertStatement->execute([
                $optionName,
                $nextSortOrder,
            ]);
        }


        $nextSortOrder += 10;
    }


    /*
     * 旧「動画撮影」は顔あり / 顔なしへ分割したため、
     * 過去データ互換のため残しつつ新規選択対象から外す。
     */
    $legacyVideoStatement =
        $pdo->prepare(
            "
            UPDATE options

            SET
                active = 0,
                updated_at = strftime(
                    '%Y-%m-%d %H:%M',
                    'now',
                    'localtime'
                )

            WHERE name = ?
            "
        );


    $legacyVideoStatement->execute([
        '動画撮影',
    ]);


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
            idx_store_courses_store

        ON store_courses(
            store_id,
            active,
            sort_order
        )
        "
    );


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
            idx_store_course_rates_v2_lookup

        ON store_course_rates_v2(
            store_course_id,
            effective_from,
            effective_to,
            active
        )
        "
    );


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
            idx_store_option_rates_v2_lookup

        ON store_option_rates_v2(
            store_id,
            option_id,
            effective_from,
            effective_to,
            active
        )
        "
    );


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
            idx_store_daily_fee_rules_lookup

        ON store_daily_fee_rules(
            store_id,
            min_visit_count,
            effective_from,
            effective_to,
            active
        )
        "
    );


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
            idx_visit_sales_history_sales

        ON visit_sales_history(
            visit_sales_id,
            changed_at
        )
        "
    );


    $pdo->commit();

    echo "sales v2 schema ready.\n";

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