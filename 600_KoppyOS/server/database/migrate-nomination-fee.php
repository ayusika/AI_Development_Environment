<?php

declare(strict_types=1);


if ($argc < 2) {

    fwrite(
        STDERR,
        "Usage: php migrate-nomination-fee.php <database-path>\n"
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
     * 予約ごとの指名料。
     *
     * 通常は全予約2000円。
     * 例外時だけ0円や別額へ変更できる。
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
            'nomination_fee_amount',
            $visitColumnNames,
            true
        )
    ) {

        $pdo->exec(
            "
            ALTER TABLE visits

            ADD COLUMN nomination_fee_amount INTEGER
                NOT NULL
                DEFAULT 2000

                CHECK (
                    nomination_fee_amount >= 0
                )
            "
        );
    }


    /*
     * 売上確定時の指名料スナップショット。
     *
     * 過去の確定売上が
     * 後日の予約編集で変わらないようにする。
     */
    $salesColumns =
        $pdo
            ->query(
                "PRAGMA table_info('visit_sales_v2')"
            )
            ->fetchAll();


    $salesColumnNames =
        array_column(
            $salesColumns,
            'name'
        );


    if (
        !in_array(
            'nomination_fee_snapshot',
            $salesColumnNames,
            true
        )
    ) {

        $pdo->exec(
            "
            ALTER TABLE visit_sales_v2

            ADD COLUMN nomination_fee_snapshot INTEGER
                NOT NULL
                DEFAULT 0

                CHECK (
                    nomination_fee_snapshot >= 0
                )
            "
        );
    }


    $pdo->commit();


    fwrite(
        STDOUT,
        "nomination fee migration completed.\n"
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