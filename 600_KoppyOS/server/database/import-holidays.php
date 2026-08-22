<?php

declare(strict_types=1);


/*
 * Kohaku Work
 * Japanese Holiday Importer
 *
 * Usage:
 *
 * php import-holidays.php <database-path> <csv-path>
 *
 * CSV format:
 *
 * 2026-01-01,元日
 * 2026-01-12,成人の日
 */


if ($argc < 3) {
    fwrite(
        STDERR,
        "Usage: php import-holidays.php <database-path> <csv-path>\n"
    );

    exit(1);
}


$databasePath = $argv[1];
$csvPath = $argv[2];


if (!is_file($databasePath)) {
    fwrite(
        STDERR,
        "Database not found: {$databasePath}\n"
    );

    exit(1);
}


if (!is_file($csvPath)) {
    fwrite(
        STDERR,
        "Holiday CSV not found: {$csvPath}\n"
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


$tableExists =
    (int)
    $pdo
        ->query(
            "
            SELECT COUNT(*)

            FROM sqlite_master

            WHERE
                type = 'table'
                AND name = 'holidays'
            "
        )
        ->fetchColumn()
    > 0;


if (!$tableExists) {
    fwrite(
        STDERR,
        "holidays table does not exist.\n"
    );

    exit(1);
}


$handle =
    fopen(
        $csvPath,
        'rb'
    );


if ($handle === false) {
    fwrite(
        STDERR,
        "Could not open holiday CSV.\n"
    );

    exit(1);
}


$holidays = [];


while (
    ($row = fgetcsv($handle))
    !== false
) {

    if (count($row) < 2) {
        continue;
    }


    $date =
        trim(
            (string)
            $row[0]
        );


    $name =
        trim(
            (string)
            $row[1]
        );


    /*
     * UTF-8 BOM対策
     */
    $date =
        preg_replace(
            '/^\xEF\xBB\xBF/',
            '',
            $date
        );


    if (
        $date === ''
        ||
        $name === ''
    ) {
        continue;
    }


    /*
     * YYYY-MM-DD のみ許可
     */
    $dateObject =
        DateTimeImmutable::createFromFormat(
            '!Y-m-d',
            $date
        );


    $dateErrors =
        DateTimeImmutable::getLastErrors();


    $dateIsValid =
        $dateObject !== false
        &&
        (
            $dateErrors === false
            ||
            (
                $dateErrors['warning_count'] === 0
                &&
                $dateErrors['error_count'] === 0
            )
        )
        &&
        $dateObject->format('Y-m-d')
            === $date;


    if (!$dateIsValid) {
        throw new RuntimeException(
            "Invalid holiday date: {$date}"
        );
    }


    $holidays[$date] =
        $name;
}


fclose($handle);


if ($holidays === []) {
    fwrite(
        STDERR,
        "No holidays found in CSV.\n"
    );

    exit(1);
}


ksort($holidays);


$pdo->beginTransaction();


try {

    $statement =
        $pdo->prepare(
            "
            INSERT INTO holidays
            (
                holiday_date,
                name,
                source,
                imported_at,
                updated_at
            )

            VALUES
            (
                ?,
                ?,
                'jp_public_holiday',
                strftime(
                    '%Y-%m-%d %H:%M',
                    'now',
                    'localtime'
                ),
                strftime(
                    '%Y-%m-%d %H:%M',
                    'now',
                    'localtime'
                )
            )

            ON CONFLICT(holiday_date)
            DO UPDATE SET
                name =
                    excluded.name,

                source =
                    excluded.source,

                imported_at =
                    excluded.imported_at,

                updated_at =
                    excluded.updated_at
            "
        );


    $importedCount = 0;


    foreach (
        $holidays as $date => $name
    ) {

        $statement->execute([
            $date,
            $name,
        ]);


        $importedCount++;
    }


    $pdo->commit();


    echo "Holiday import complete.\n";
    echo "Imported: {$importedCount}\n";


    $firstDate =
        array_key_first(
            $holidays
        );


    $lastDate =
        array_key_last(
            $holidays
        );


    echo "First: {$firstDate}\n";
    echo "Last: {$lastDate}\n";


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