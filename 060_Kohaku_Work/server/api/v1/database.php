<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__
    . '/../../../../600_KoppyOS/server/auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__
    . '/../../core/database.php';

require_once __DIR__
    . '/../../../../600_KoppyOS/server/core/database-inspector.php';


function kohakuDatabaseDiagnosticRespond(
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
    'stores',
    'workers',
    'work_shifts',
    'shift_default_rules',
    'holidays',
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


try {

    $method =
        $_SERVER['REQUEST_METHOD']
        ?? 'GET';

    if ($method !== 'GET') {

        kohakuDatabaseDiagnosticRespond(
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
        koppyDatabase();


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


        $orderByColumn =
            $requestedTable === 'holidays'
                ? 'holiday_date'
                : 'id';


        $records =
            koppyDatabaseInspectorReadRecords(
                $pdo,
                $requestedTable,
                $orderByColumn,
                50
            );


        $customerNames =
            [];


        if ($requestedTable === 'visits') {

            $nameStatement =
                $pdo->query(
                    "
                    SELECT
                        customer_id,
                        name

                    FROM customer_names

                    WHERE is_primary = 1

                    ORDER BY id ASC
                    "
                );


            foreach (
                $nameStatement->fetchAll()
                as $nameRecord
            ) {
                $customerId =
                    (int)
                    $nameRecord['customer_id'];

                if (
                    !isset(
                        $customerNames[
                            $customerId
                        ]
                    )
                ) {
                    $customerNames[
                        $customerId
                    ] =
                        (string)
                        $nameRecord['name'];
                }
            }
        }


        kohakuDatabaseDiagnosticRespond([
            'success' =>
                true,

            'read_only' =>
                true,

            'database' =>
                'kohaku-work',

            'table' =>
                $requestedTable,

            'records' =>
                $records,

            'customer_names' =>
                $customerNames,

            'error' =>
                null,
        ]);
    }


    kohakuDatabaseDiagnosticRespond([
        'success' =>
            true,

        'read_only' =>
            true,

        'database' =>
            'kohaku-work',

        'tables' =>
            koppyDatabaseInspectorDescribeTables(
                $pdo,
                $allowedTables
            ),

        'error' =>
            null,
    ]);


} catch (Throwable $error) {

    kohakuDatabaseDiagnosticRespond(
        [
            'success' =>
                false,

            'error' =>
                $error->getMessage(),
        ],
        400
    );
}
