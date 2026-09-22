<?php

declare(strict_types=1);


if (PHP_SAPI !== 'cli') {
    http_response_code(403);

    echo "This migration can only run from CLI.\n";

    exit(1);
}


$databasePath =
    $argv[1]
    ?? '';


if ($databasePath === '') {
    fwrite(
        STDERR,
        "Database path is required.\n"
    );

    exit(1);
}


if (!is_file($databasePath)) {
    fwrite(
        STDERR,
        "Database was not found: {$databasePath}\n"
    );

    exit(1);
}


$backupPath =
    $databasePath
    . '.backup-ui-shift-default-'
    . date('Ymd-His');


if (!copy(
    $databasePath,
    $backupPath
)) {
    fwrite(
        STDERR,
        "Database backup failed.\n"
    );

    exit(1);
}


echo "Backup created:\n";
echo $backupPath . "\n\n";


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


try {

    $workerId =
        $pdo
            ->query(
                "
                SELECT id

                FROM workers

                WHERE worker_code = 'ui'

                LIMIT 1
                "
            )
            ->fetchColumn();


    if ($workerId === false) {
        throw new RuntimeException(
            'ui worker was not found.'
        );
    }


    $ruleStatement =
        $pdo->prepare(
            "
            SELECT
                day_type,
                start_time,
                end_time

            FROM shift_default_rules

            WHERE
                worker_id = ?
                AND day_type IN (
                    'weekday_eve',
                    'holiday_eve'
                )

            ORDER BY day_type
            "
        );


    $ruleStatement->execute([
        (int) $workerId,
    ]);


    $rules =
        $ruleStatement
            ->fetchAll();


    if (count($rules) !== 2) {
        throw new RuntimeException(
            'Expected exactly 2 ui shift default rules.'
        );
    }


    foreach ($rules as $rule) {

        if (
            $rule['start_time'] !== '16:00'
            || $rule['end_time'] !== '25:00'
        ) {
            throw new RuntimeException(
                'Unexpected existing ui shift default: '
                . $rule['day_type']
                . ' '
                . $rule['start_time']
                . '-'
                . $rule['end_time']
            );
        }
    }


    echo "Before:\n";

    foreach ($rules as $rule) {
        echo
            $rule['day_type']
            . ' '
            . $rule['start_time']
            . '-'
            . $rule['end_time']
            . "\n";
    }


    $pdo->beginTransaction();


    $updateStatement =
        $pdo->prepare(
            "
            UPDATE shift_default_rules

            SET
                start_time = '15:00',
                updated_at = strftime(
                    '%Y-%m-%d %H:%M',
                    'now',
                    'localtime'
                )

            WHERE
                worker_id = ?
                AND day_type IN (
                    'weekday_eve',
                    'holiday_eve'
                )
            "
        );


    $updateStatement->execute([
        (int) $workerId,
    ]);


    $verifyStatement =
        $pdo->prepare(
            "
            SELECT COUNT(*)

            FROM shift_default_rules

            WHERE
                worker_id = ?
                AND day_type IN (
                    'weekday_eve',
                    'holiday_eve'
                )
                AND start_time = '15:00'
            "
        );


    $verifyStatement->execute([
        (int) $workerId,
    ]);


    $verifiedCount =
        (int)
        $verifyStatement
            ->fetchColumn();


    if ($verifiedCount !== 2) {
        throw new RuntimeException(
            'ui shift default verification failed.'
        );
    }


    $pdo->commit();


    echo "\nAfter:\n";
    echo "weekday_eve 15:00-25:00\n";
    echo "holiday_eve 15:00-25:00\n";

    echo
        "\nMigration completed successfully.\n";


} catch (Throwable $error) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }


    fwrite(
        STDERR,
        "Migration failed:\n"
        . $error->getMessage()
        . "\n"
    );

    exit(1);
}
