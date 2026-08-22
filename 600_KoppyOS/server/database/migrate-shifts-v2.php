<?php

declare(strict_types=1);


if ($argc < 2) {
    fwrite(
        STDERR,
        "Usage: php migrate-shifts-v2.php <database-path>\n"
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

    /* =====================================================
       WORKERS
       しい / うい など、シフトを持つ人
    ===================================================== */

    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS workers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            worker_code TEXT NOT NULL UNIQUE,

            display_name TEXT NOT NULL,

            active INTEGER NOT NULL DEFAULT 1
                CHECK (active IN (0, 1)),

            is_reservation_owner INTEGER NOT NULL DEFAULT 0
                CHECK (
                    is_reservation_owner IN (0, 1)
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
            )
        )
        "
    );


    $pdo->exec(
        "
        CREATE UNIQUE INDEX IF NOT EXISTS
            idx_workers_reservation_owner
        ON workers (
            is_reservation_owner
        )
        WHERE is_reservation_owner = 1
        "
    );


    $workerInsertStatement =
        $pdo->prepare(
            "
            INSERT OR IGNORE INTO workers
            (
                worker_code,
                display_name,
                active,
                is_reservation_owner
            )
            VALUES (?, ?, 1, ?)
            "
        );


    $workerInsertStatement->execute([
        'shii',
        'しい',
        1,
    ]);


    $workerInsertStatement->execute([
        'ui',
        'うい',
        0,
    ]);


    $shiiWorkerId =
        (int)
        $pdo
            ->query(
                "
                SELECT id
                FROM workers
                WHERE worker_code = 'shii'
                "
            )
            ->fetchColumn();


    /* =====================================================
       WORK_SHIFTS v2
    ===================================================== */

    $workShiftColumns =
        $pdo
            ->query(
                "PRAGMA table_info('work_shifts')"
            )
            ->fetchAll();


    $workShiftColumnNames =
        array_column(
            $workShiftColumns,
            'name'
        );


    $workShiftsAlreadyV2 =
        in_array(
            'worker_id',
            $workShiftColumnNames,
            true
        )
        &&
        in_array(
            'shift_date',
            $workShiftColumnNames,
            true
        )
        &&
        in_array(
            'status',
            $workShiftColumnNames,
            true
        );


    if (!$workShiftsAlreadyV2) {

        $pdo->exec(
            "
            CREATE TABLE work_shifts_v2 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                worker_id INTEGER NOT NULL,

                store_id INTEGER,

                shift_date TEXT NOT NULL,

                start_at TEXT,

                end_at TEXT,

                status TEXT NOT NULL DEFAULT 'draft'
                    CHECK (
                        status IN (
                            'draft',
                            'confirmed',
                            'off'
                        )
                    ),

                note TEXT,

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

                CHECK (
                    (
                        status = 'off'
                        AND store_id IS NULL
                        AND start_at IS NULL
                        AND end_at IS NULL
                    )
                    OR
                    (
                        status IN (
                            'draft',
                            'confirmed'
                        )
                        AND store_id IS NOT NULL
                        AND start_at IS NOT NULL
                        AND end_at IS NOT NULL
                        AND end_at > start_at
                    )
                ),

                FOREIGN KEY (worker_id)
                    REFERENCES workers(id)
                    ON DELETE RESTRICT,

                FOREIGN KEY (store_id)
                    REFERENCES stores(id)
                    ON DELETE RESTRICT
            )
            "
        );


        /*
         * 旧work_shiftsにデータがあった場合は、
         * 既存データを「しい・確定」として引き継ぐ。
         */
        if (
            in_array(
                'store_id',
                $workShiftColumnNames,
                true
            )
            &&
            in_array(
                'start_at',
                $workShiftColumnNames,
                true
            )
            &&
            in_array(
                'end_at',
                $workShiftColumnNames,
                true
            )
        ) {

            $copyStatement =
                $pdo->prepare(
                    "
                    INSERT INTO work_shifts_v2
                    (
                        id,
                        worker_id,
                        store_id,
                        shift_date,
                        start_at,
                        end_at,
                        status,
                        note,
                        created_at,
                        updated_at
                    )

                    SELECT
                        id,
                        ?,
                        store_id,
                        substr(
                            start_at,
                            1,
                            10
                        ),
                        start_at,
                        end_at,
                        'confirmed',
                        note,
                        created_at,
                        updated_at

                    FROM work_shifts
                    "
                );


            $copyStatement->execute([
                $shiiWorkerId
            ]);
        }


        $pdo->exec(
            'DROP TABLE work_shifts'
        );


        $pdo->exec(
            "
            ALTER TABLE work_shifts_v2
            RENAME TO work_shifts
            "
        );
    }


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
            idx_work_shifts_worker_date
        ON work_shifts (
            worker_id,
            shift_date
        )
        "
    );


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
            idx_work_shifts_store_start
        ON work_shifts (
            store_id,
            start_at
        )
        "
    );


    /*
     * 同一人物・同一開始日時の
     * 二重シフト登録防止。
     * 将来、同じ日に複数店舗勤務すること自体は許容。
     */
    $pdo->exec(
        "
        CREATE UNIQUE INDEX IF NOT EXISTS
            idx_work_shifts_worker_start
        ON work_shifts (
            worker_id,
            start_at
        )
        WHERE status <> 'off'
        "
    );


    /*
     * 休みは1人につき1日1レコード。
     */
    $pdo->exec(
        "
        CREATE UNIQUE INDEX IF NOT EXISTS
            idx_work_shifts_worker_off
        ON work_shifts (
            worker_id,
            shift_date
        )
        WHERE status = 'off'
        "
    );


    /* =====================================================
       SHIFT DEFAULT RULES
       シフト自動入力用デフォルト
    ===================================================== */

    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS
            shift_default_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                worker_id INTEGER NOT NULL,

                day_type TEXT NOT NULL
                    CHECK (
                        day_type IN (
                            'weekday_eve',
                            'holiday_eve'
                        )
                    ),

                start_time TEXT NOT NULL,

                end_time TEXT NOT NULL,

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
                    worker_id,
                    day_type
                ),

                FOREIGN KEY (worker_id)
                    REFERENCES workers(id)
                    ON DELETE CASCADE
            )
        "
    );


    $ruleInsertStatement =
        $pdo->prepare(
            "
            INSERT OR IGNORE INTO
                shift_default_rules
            (
                worker_id,
                day_type,
                start_time,
                end_time,
                active
            )
            VALUES (
                ?,
                ?,
                ?,
                ?,
                1
            )
            "
        );


    $uiWorkerId =
        (int)
        $pdo
            ->query(
                "
                SELECT id
                FROM workers
                WHERE worker_code = 'ui'
                "
            )
            ->fetchColumn();


    /*
     * しい
     * 平日前 14:00〜24:00
     * 休日前 14:00〜25:00
     */
    $ruleInsertStatement->execute([
        $shiiWorkerId,
        'weekday_eve',
        '14:00',
        '24:00',
    ]);


    $ruleInsertStatement->execute([
        $shiiWorkerId,
        'holiday_eve',
        '14:00',
        '25:00',
    ]);


    /*
     * うい
     * 平日前 16:00〜25:00
     * 休日前 16:00〜25:00
     */
    $ruleInsertStatement->execute([
        $uiWorkerId,
        'weekday_eve',
        '16:00',
        '25:00',
    ]);


    $ruleInsertStatement->execute([
        $uiWorkerId,
        'holiday_eve',
        '16:00',
        '25:00',
    ]);


    /* =====================================================
       HOLIDAYS
       日本の祝日インポート先
    ===================================================== */

    $pdo->exec(
        "
        CREATE TABLE IF NOT EXISTS holidays (
            holiday_date TEXT PRIMARY KEY,

            name TEXT NOT NULL,

            source TEXT NOT NULL DEFAULT
                'jp_public_holiday',

            imported_at TEXT NOT NULL DEFAULT (
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
            )
        )
        "
    );


    $pdo->exec(
        "
        CREATE INDEX IF NOT EXISTS
            idx_holidays_date
        ON holidays (
            holiday_date
        )
        "
    );


    $pdo->commit();


    /* =====================================================
       RESULT
    ===================================================== */

    $workerCount =
        (int)
        $pdo
            ->query(
                'SELECT COUNT(*) FROM workers'
            )
            ->fetchColumn();


    $shiftCount =
        (int)
        $pdo
            ->query(
                'SELECT COUNT(*) FROM work_shifts'
            )
            ->fetchColumn();


    $ruleCount =
        (int)
        $pdo
            ->query(
                'SELECT COUNT(*) FROM shift_default_rules'
            )
            ->fetchColumn();


    $holidayCount =
        (int)
        $pdo
            ->query(
                'SELECT COUNT(*) FROM holidays'
            )
            ->fetchColumn();


    echo "shift v2 schema ready.\n";
    echo "workers: {$workerCount}\n";
    echo "work_shifts: {$shiftCount}\n";
    echo "shift_default_rules: {$ruleCount}\n";
    echo "holidays: {$holidayCount}\n";


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