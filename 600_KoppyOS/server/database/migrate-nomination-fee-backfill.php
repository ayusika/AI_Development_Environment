<?php

declare(strict_types=1);


if ($argc < 2) {
    fwrite(
        STDERR,
        "Usage: php migrate-nomination-fee-backfill.php <database-path>\n"
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
     * 確定済み売上を取得する。
     *
     * 営業日は12:00境界なので
     * started_at - 12 hours の日付で
     * 有効な指名料ルールを解決する。
     */
    $statement =
        $pdo->query(
            "
            SELECT
                vs.id,
                vs.visit_id,
                vs.store_course_rate_id,
                vs.base_price_snapshot,
                vs.course_take_home_snapshot,
                vs.nomination_fee_snapshot,
                vs.option_price_total_snapshot,
                vs.option_take_home_total_snapshot,
                vs.tip_amount,
                vs.discount_amount,
                vs.discount_reason_type,
                vs.discount_reason_note,
                vs.adjustment_amount,
                vs.customer_payment_total,
                vs.take_home_total,
                vs.confirmed_at,
                vs.created_at,
                vs.updated_at,

                v.store_id,
                v.customer_status,
                v.started_at,
                v.nomination_fee_amount,

                (
                    SELECT
                        rule.fee_amount

                    FROM
                        store_nomination_fee_rules
                            AS rule

                    WHERE
                        rule.store_id =
                            v.store_id

                        AND rule.customer_status =
                            v.customer_status

                        AND rule.active = 1

                        AND rule.effective_from <=
                            date(
                                v.started_at,
                                '-12 hours'
                            )

                        AND (
                            rule.effective_to IS NULL
                            OR rule.effective_to >=
                                date(
                                    v.started_at,
                                    '-12 hours'
                                )
                        )

                    ORDER BY
                        rule.effective_from DESC,
                        rule.id DESC

                    LIMIT 1
                ) AS desired_nomination_fee

            FROM
                visit_sales_v2 AS vs

            INNER JOIN visits AS v
                ON v.id = vs.visit_id

            WHERE
                vs.confirmed_at IS NOT NULL

            ORDER BY
                vs.id ASC
            "
        );


    $rows =
        $statement->fetchAll();


    $updateSales =
        $pdo->prepare(
            "
            UPDATE visit_sales_v2

            SET
                nomination_fee_snapshot = ?,
                customer_payment_total = ?,
                take_home_total = ?,
                updated_at = ?

            WHERE id = ?
            "
        );


    $updateVisit =
        $pdo->prepare(
            "
            UPDATE visits

            SET
                nomination_fee_amount = ?,
                updated_at = ?

            WHERE id = ?
            "
        );


    $insertHistory =
        $pdo->prepare(
            "
            INSERT INTO visit_sales_history (
                visit_sales_id,
                before_data,
                after_data,
                change_reason,
                changed_at
            )
            VALUES (
                ?,
                ?,
                ?,
                ?,
                ?
            )
            "
        );


    $changedCount = 0;


    foreach ($rows as $row) {

        if (
            $row['desired_nomination_fee']
            === null
        ) {
            throw new RuntimeException(
                'Nomination fee rule was not found for visit_id '
                . $row['visit_id']
                . '.'
            );
        }


        $desiredFee =
            max(
                0,
                (int)
                $row[
                    'desired_nomination_fee'
                ]
            );


        /*
         * 手取りはsnapshotから再計算する。
         *
         * コース手取り
         * + 指名料
         * + OP手取り
         * + チップ
         * + 調整
         */
        $newTakeHome =
            (int)
            $row[
                'course_take_home_snapshot'
            ]
            + $desiredFee
            + (int)
            $row[
                'option_take_home_total_snapshot'
            ]
            + (int)
            $row['tip_amount']
            + (int)
            $row['adjustment_amount'];


        /*
         * 客支払額は基本料金が
         * 分かる場合だけ再計算する。
         *
         * 調整額は客支払額には含めない。
         */
        $newCustomerPayment = null;


        if (
            $row['base_price_snapshot']
            !== null
        ) {
            $newCustomerPayment =
                max(
                    0,
                    (int)
                    $row[
                        'base_price_snapshot'
                    ]
                    + $desiredFee
                    + (int)
                    $row[
                        'option_price_total_snapshot'
                    ]
                    + (int)
                    $row['tip_amount']
                    - (int)
                    $row['discount_amount']
                );
        }


        $salesChanged =
            (int)
            $row['nomination_fee_snapshot']
                !== $desiredFee

            || (
                $row['customer_payment_total']
                === null
                    ? $newCustomerPayment !== null
                    : (int)
                        $row[
                            'customer_payment_total'
                        ]
                        !== $newCustomerPayment
            )

            || (int)
                $row['take_home_total']
                !== $newTakeHome;


        $visitChanged =
            (int)
            $row['nomination_fee_amount']
                !== $desiredFee;


        if (
            !$salesChanged
            && !$visitChanged
        ) {
            continue;
        }


        $changedAt =
            (string)
            $pdo
                ->query(
                    "
                    SELECT strftime(
                        '%Y-%m-%d %H:%M',
                        'now',
                        'localtime'
                    )
                    "
                )
                ->fetchColumn();


        if ($salesChanged) {

            $beforeData = [
                'nomination_fee_snapshot' =>
                    (int)
                    $row[
                        'nomination_fee_snapshot'
                    ],

                'customer_payment_total' =>
                    $row[
                        'customer_payment_total'
                    ] === null
                        ? null
                        : (int)
                            $row[
                                'customer_payment_total'
                            ],

                'take_home_total' =>
                    (int)
                    $row['take_home_total'],
            ];


            $afterData = [
                'nomination_fee_snapshot' =>
                    $desiredFee,

                'customer_payment_total' =>
                    $newCustomerPayment,

                'take_home_total' =>
                    $newTakeHome,
            ];


            $beforeJson =
                json_encode(
                    $beforeData,
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                    | JSON_THROW_ON_ERROR
                );


            $afterJson =
                json_encode(
                    $afterData,
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                    | JSON_THROW_ON_ERROR
                );


            $updateSales->execute([
                $desiredFee,
                $newCustomerPayment,
                $newTakeHome,
                $changedAt,
                (int) $row['id'],
            ]);


            $insertHistory->execute([
                (int) $row['id'],
                $beforeJson,
                $afterJson,
                'Nomination fee rules backfill',
                $changedAt,
            ]);
        }


        if ($visitChanged) {

            $updateVisit->execute([
                $desiredFee,
                $changedAt,
                (int) $row['visit_id'],
            ]);
        }


        $changedCount++;
    }


    $pdo->commit();


    fwrite(
        STDOUT,
        "nomination fee backfill completed. "
        . $changedCount
        . " confirmed sales/visits updated.\n"
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