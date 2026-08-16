<?php

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/lib/database.php';


$pdo = null;


try {

    $method =
        $_SERVER['REQUEST_METHOD']
        ?? 'GET';


    if ($method !== 'GET') {

        http_response_code(405);

        echo json_encode(
            [
                'success' => false,
                'error' =>
                    'Method not allowed.',
            ],
            JSON_UNESCAPED_UNICODE |
            JSON_PRETTY_PRINT
        );

        exit;
    }


    $pdo =
        koppyDatabase();


    $allowedTables = [
        'stores',
        'work_shifts',
        'customers',
        'customer_names',
        'visits',
        'visit_change_history',
        'options',
    ];


    $tables = [];


    foreach (
        $allowedTables as $tableName
    ) {

        $existsStatement =
            $pdo->prepare(
                "
                SELECT
                    COUNT(*)

                FROM sqlite_master

                WHERE
                    type = 'table'
                    AND name = ?
                "
            );

        $existsStatement->execute([
            $tableName
        ]);


        $exists =
            (int)
            $existsStatement->fetchColumn()
            > 0;


        if (!$exists) {

            $tables[] = [
                'name' =>
                    $tableName,
                'exists' =>
                    false,
                'row_count' =>
                    null,
                'columns' =>
                    [],
            ];

            continue;
        }


        $countStatement =
            $pdo->query(
                'SELECT COUNT(*) FROM "'
                . $tableName
                . '"'
            );


        $rowCount =
            (int)
            $countStatement->fetchColumn();


        $columnStatement =
            $pdo->query(
                'PRAGMA table_info("'
                . $tableName
                . '")'
            );


        $rawColumns =
            $columnStatement->fetchAll();


        $columns =
            array_map(
                static function (
                    array $column
                ): array {

                    return [
                        'name' =>
                            (string)
                            $column['name'],

                        'type' =>
                            (string)
                            $column['type'],

                        'not_null' =>
                            (bool)
                            $column['notnull'],

                        'primary_key' =>
                            (bool)
                            $column['pk'],
                    ];
                },
                $rawColumns
            );


        $tables[] = [
            'name' =>
                $tableName,
            'exists' =>
                true,
            'row_count' =>
                $rowCount,
            'columns' =>
                $columns,
        ];
    }


    echo json_encode(
        [
            'success' => true,
            'read_only' => true,
            'tables' => $tables,
            'error' => null,
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    );


} catch (Throwable $e) {

    http_response_code(400);

    echo json_encode(
        [
            'success' => false,
            'error' =>
                $e->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    );
}