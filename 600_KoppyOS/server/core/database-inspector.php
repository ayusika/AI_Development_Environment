<?php

declare(strict_types=1);


/**
 * Quote a trusted SQLite identifier after validating its shape.
 */
function koppyDatabaseInspectorQuoteIdentifier(
    string $identifier
): string {
    if (
        !preg_match(
            '/^[A-Za-z_][A-Za-z0-9_]*$/',
            $identifier
        )
    ) {
        throw new RuntimeException(
            'Invalid database identifier.'
        );
    }

    return
        '"'
        . $identifier
        . '"';
}


/**
 * Check whether a table exists.
 */
function koppyDatabaseInspectorTableExists(
    PDO $pdo,
    string $tableName
): bool {
    $statement =
        $pdo->prepare(
            "
            SELECT COUNT(*)

            FROM sqlite_master

            WHERE
                type = 'table'
                AND name = ?
            "
        );

    $statement->execute([
        $tableName,
    ]);

    return
        (int) $statement->fetchColumn()
        > 0;
}


/**
 * Read SQLite column metadata.
 */
function koppyDatabaseInspectorColumns(
    PDO $pdo,
    string $tableName
): array {
    $quotedTable =
        koppyDatabaseInspectorQuoteIdentifier(
            $tableName
        );

    $statement =
        $pdo->query(
            'PRAGMA table_info('
            . $quotedTable
            . ')'
        );

    $rawColumns =
        $statement->fetchAll();

    return
        array_map(
            static function (
                array $column
            ): array {
                return [
                    'name' =>
                        (string) $column['name'],

                    'type' =>
                        (string) $column['type'],

                    'not_null' =>
                        (bool) $column['notnull'],

                    'primary_key' =>
                        (bool) $column['pk'],
                ];
            },
            $rawColumns
        );
}


/**
 * Describe one table without modifying it.
 */
function koppyDatabaseInspectorDescribeTable(
    PDO $pdo,
    string $tableName
): array {
    if (
        !koppyDatabaseInspectorTableExists(
            $pdo,
            $tableName
        )
    ) {
        return [
            'name' =>
                $tableName,

            'exists' =>
                false,

            'row_count' =>
                null,

            'columns' =>
                [],
        ];
    }

    $quotedTable =
        koppyDatabaseInspectorQuoteIdentifier(
            $tableName
        );

    $countStatement =
        $pdo->query(
            'SELECT COUNT(*) FROM '
            . $quotedTable
        );

    return [
        'name' =>
            $tableName,

        'exists' =>
            true,

        'row_count' =>
            (int) $countStatement->fetchColumn(),

        'columns' =>
            koppyDatabaseInspectorColumns(
                $pdo,
                $tableName
            ),
    ];
}


/**
 * Describe an ordered allow-list of tables.
 */
function koppyDatabaseInspectorDescribeTables(
    PDO $pdo,
    array $tableNames
): array {
    $tables = [];

    foreach (
        $tableNames
        as $tableName
    ) {
        $tables[] =
            koppyDatabaseInspectorDescribeTable(
                $pdo,
                (string) $tableName
            );
    }

    return $tables;
}


/**
 * Read recent records from one allowed table.
 */
function koppyDatabaseInspectorReadRecords(
    PDO $pdo,
    string $tableName,
    string $orderByColumn = 'id',
    int $limit = 50
): array {
    if (
        !koppyDatabaseInspectorTableExists(
            $pdo,
            $tableName
        )
    ) {
        throw new RuntimeException(
            'Table does not exist.'
        );
    }

    $columns =
        koppyDatabaseInspectorColumns(
            $pdo,
            $tableName
        );

    $columnNames =
        array_map(
            static fn (array $column): string =>
                (string) $column['name'],
            $columns
        );

    if (
        !in_array(
            $orderByColumn,
            $columnNames,
            true
        )
    ) {
        throw new RuntimeException(
            'Order column does not exist.'
        );
    }

    $quotedTable =
        koppyDatabaseInspectorQuoteIdentifier(
            $tableName
        );

    $quotedOrderColumn =
        koppyDatabaseInspectorQuoteIdentifier(
            $orderByColumn
        );

    $limit =
        max(
            1,
            min(
                200,
                $limit
            )
        );

    $statement =
        $pdo->query(
            'SELECT * FROM '
            . $quotedTable
            . ' ORDER BY '
            . $quotedOrderColumn
            . ' DESC LIMIT '
            . $limit
        );

    return
        $statement->fetchAll();
}
