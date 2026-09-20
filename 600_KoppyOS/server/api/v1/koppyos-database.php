<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__
    . '/../../auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__
    . '/../../core/koppyos-database.php';

require_once __DIR__
    . '/../../core/database-inspector.php';


function koppyOsDatabaseDiagnosticRespond(
    array $data,
    int $statusCode = 200
): never {
    http_response_code(
        $statusCode
    );

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE
        | JSON_PRETTY_PRINT
    );

    exit;
}


$allowedTables = [
    'calendar_color_palette',
    'calendar_events',
    'home_connections',
    'home_devices',
    'home_rooms',
];


try {

    $method =
        $_SERVER['REQUEST_METHOD']
        ?? 'GET';

    if ($method !== 'GET') {

        koppyOsDatabaseDiagnosticRespond(
            [
                'success' =>
                    false,

                'error' =>
                    'Method not allowed.',
            ],
            405
        );
    }


    $pdo =
        koppyOsDatabase();


    $requestedTable =
        isset(
            $_GET['table']
        )
            ? trim(
                (string) $_GET['table']
            )
            : '';


    if ($requestedTable !== '') {

        if (
            !in_array(
                $requestedTable,
                $allowedTables,
                true
            )
        ) {
            throw new RuntimeException(
                'Table is not allowed.'
            );
        }


        koppyOsDatabaseDiagnosticRespond([
            'success' =>
                true,

            'read_only' =>
                true,

            'database' =>
                'koppyos',

            'table' =>
                $requestedTable,

            'records' =>
                koppyDatabaseInspectorReadRecords(
                    $pdo,
                    $requestedTable,
                    'id',
                    50
                ),

            'customer_names' =>
                [],

            'error' =>
                null,
        ]);
    }


    koppyOsDatabaseDiagnosticRespond([
        'success' =>
            true,

        'read_only' =>
            true,

        'database' =>
            'koppyos',

        'tables' =>
            koppyDatabaseInspectorDescribeTables(
                $pdo,
                $allowedTables
            ),

        'error' =>
            null,
    ]);


} catch (Throwable $error) {

    koppyOsDatabaseDiagnosticRespond(
        [
            'success' =>
                false,

            'error' =>
                $error->getMessage(),
        ],
        400
    );
}
