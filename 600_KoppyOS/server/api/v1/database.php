<?php

declare(strict_types=1);

/*
 * Legacy database diagnostic compatibility router.
 *
 * The original /api/v1/database.php endpoint historically exposed
 * both Kohaku Work tables and calendar_events from one SQLite file.
 *
 * The databases are now separately owned:
 *
 * Kohaku Work:
 *   060_Kohaku_Work/server/api/v1/database.php
 *
 * KoppyOS:
 *   600_KoppyOS/server/api/v1/koppyos-database.php
 *
 * Keep this route only while the legacy UI still depends on it.
 */

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__
    . '/../../auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__
    . '/../../core/database-inspector.php';

require_once __DIR__
    . '/../../core/koppyos-database.php';

require_once __DIR__
    . '/lib/database.php';


function legacyDatabaseDiagnosticRespond(
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


$legacyTableOrder = [
    'stores',
    'workers',
    'work_shifts',
    'shift_default_rules',
    'holidays',
    'calendar_events',
    'customers',
    'customer_names',
    'customer_identity_features',
    'customer_acquisition_sources',
    'visits',
    'visit_change_history',
    'customer_identity_history',
    'options',
    'store_courses',
    'store_course_rates_v2',
    'store_option_rates_v2',
    'store_daily_fee_rules',
    'visit_extensions',
    'visit_sales_v2',
    'visit_sales_history',
];


$kohakuTables =
    array_values(
        array_filter(
            $legacyTableOrder,
            static fn (string $tableName): bool =>
                $tableName
                !== 'calendar_events'
        )
    );


$koppyOsTables = [
    'calendar_events',
];


try {

    $method =
        $_SERVER['REQUEST_METHOD']
        ?? 'GET';

    if ($method !== 'GET') {

        legacyDatabaseDiagnosticRespond(
            [
                'success' =>
                    false,

                'error' =>
                    'Method not allowed.',
            ],
            405
        );
    }


    $requestedTable =
        isset(
            $_GET['table']
        )
            ? trim(
                (string) $_GET['table']
            )
            : '';


    /*
     * Table-specific legacy requests can delegate directly
     * to the new product-owned endpoints.
     */
    if ($requestedTable !== '') {

        if (
            in_array(
                $requestedTable,
                $kohakuTables,
                true
            )
        ) {
            require __DIR__
                . '/../../../../060_Kohaku_Work/server/api/v1/database.php';

            exit;
        }


        if (
            in_array(
                $requestedTable,
                $koppyOsTables,
                true
            )
        ) {
            require __DIR__
                . '/koppyos-database.php';

            exit;
        }


        throw new RuntimeException(
            'Table is not allowed.'
        );
    }


    /*
     * Preserve the original combined table-list response and order,
     * but read each table from its new owning database.
     */

    $kohakuPdo =
        koppyDatabase();

    $koppyOsPdo =
        koppyOsDatabase();

    $tables = [];


    foreach (
        $legacyTableOrder
        as $tableName
    ) {

        $pdo =
            in_array(
                $tableName,
                $koppyOsTables,
                true
            )
                ? $koppyOsPdo
                : $kohakuPdo;


        $tables[] =
            koppyDatabaseInspectorDescribeTable(
                $pdo,
                $tableName
            );
    }


    legacyDatabaseDiagnosticRespond([
        'success' =>
            true,

        'read_only' =>
            true,

        'tables' =>
            $tables,

        'error' =>
            null,
    ]);


} catch (Throwable $error) {

    legacyDatabaseDiagnosticRespond(
        [
            'success' =>
                false,

            'error' =>
                $error->getMessage(),
        ],
        400
    );
}
