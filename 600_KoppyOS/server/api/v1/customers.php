<?php

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/lib/database.php';

$pdo = null;


/* =========================================================
   HELPERS
========================================================= */

function readJsonBody(): array
{
    $rawBody =
        file_get_contents(
            'php://input'
        );

    if (
        $rawBody === false
        || trim($rawBody) === ''
    ) {
        return [];
    }

    $payload =
        json_decode(
            $rawBody,
            true
        );

    if (!is_array($payload)) {
        throw new RuntimeException(
            'Invalid JSON body.'
        );
    }

    return $payload;
}


/* =========================================================
   MAIN
========================================================= */

try {

    $pdo =
        koppyDatabase();


    $method =
        strtoupper(
            $_SERVER['REQUEST_METHOD']
            ?? 'GET'
        );


    if ($method === 'GET') {

        $statement =
            $pdo->query(
                "
                SELECT
                    c.id,
                    c.customer_code,
                    c.general_notes,
                    c.created_at,
                    c.updated_at,

                    COUNT(
                        DISTINCT v.id
                    ) AS visit_count

                FROM customers c

                LEFT JOIN visits v
                    ON v.customer_id = c.id

                GROUP BY c.id

                ORDER BY
                    c.updated_at DESC,
                    c.id DESC
                "
            );


        $customers =
            $statement->fetchAll();


        $nameStatement =
            $pdo->query(
                "
                SELECT
                    id,
                    customer_id,
                    name_type,
                    name,
                    store_id,
                    is_primary,
                    note

                FROM customer_names

                ORDER BY
                    customer_id ASC,
                    is_primary DESC,
                    id ASC
                "
            );


        $namesByCustomer =
            [];


        foreach (
            $nameStatement->fetchAll()
            as $nameRecord
        ) {

            $customerId =
                (int)
                $nameRecord['customer_id'];


            if (
                !isset(
                    $namesByCustomer[
                        $customerId
                    ]
                )
            ) {
                $namesByCustomer[
                    $customerId
                ] = [];
            }


            $namesByCustomer[
                $customerId
            ][] =
                $nameRecord;
        }


        foreach (
            $customers
            as &$customer
        ) {

            $customerId =
                (int)
                $customer['id'];


            $customer['names'] =
                $namesByCustomer[
                    $customerId
                ]
                ?? [];
        }

        unset($customer);


        echo json_encode(
            [
                'success' =>
                    true,

                'read_only' =>
                    true,

                'customers' =>
                    $customers,

                'error' =>
                    null,
            ],
            JSON_UNESCAPED_UNICODE
        );

        exit;
    }


    if ($method !== 'POST') {

        http_response_code(405);

        echo json_encode(
            [
                'success' => false,
                'error' =>
                    'Method not allowed.',
            ],
            JSON_UNESCAPED_UNICODE
        );

        exit;
    }


    $payload =
        readJsonBody();


    $visitId =
        isset($payload['visit_id'])
            ? (int)
                $payload['visit_id']
            : 0;


    $name =
        isset($payload['name'])
            ? trim(
                (string)
                $payload['name']
            )
            : '';


    if ($visitId <= 0) {
        throw new RuntimeException(
            'visit_id is required.'
        );
    }


    if ($name === '') {
        throw new RuntimeException(
            'name is required.'
        );
    }


    $statement =
        $pdo->prepare(
            "
            SELECT
                id,
                customer_id

            FROM visits

            WHERE id = ?

            LIMIT 1
            "
        );


    $statement->execute([
        $visitId,
    ]);


    $visit =
        $statement->fetch();


    if (!$visit) {
        throw new RuntimeException(
            'Visit not found.'
        );
    }


    if (
        $visit['customer_id']
        !== null
    ) {
        throw new RuntimeException(
            'Visit already has a customer.'
        );
    }


    $pdo->beginTransaction();


    $temporaryCode =
        'TMP-'
        . bin2hex(
            random_bytes(8)
        );


    $statement =
        $pdo->prepare(
            "
            INSERT INTO customers (
                customer_code
            )
            VALUES (
                ?
            )
            "
        );


    $statement->execute([
        $temporaryCode,
    ]);


    $customerId =
        (int)
        $pdo->lastInsertId();


    $customerCode =
        sprintf(
            'K%06d',
            $customerId
        );


    $statement =
        $pdo->prepare(
            "
            UPDATE customers

            SET
                customer_code = ?,
                updated_at =
                    strftime(
                        '%Y-%m-%d %H:%M',
                        'now',
                        'localtime'
                    )

            WHERE id = ?
            "
        );


    $statement->execute([
        $customerCode,
        $customerId,
    ]);


    $statement =
        $pdo->prepare(
            "
            INSERT INTO customer_names (
                customer_id,
                name_type,
                name,
                is_primary
            )
            VALUES (
                ?,
                'nickname',
                ?,
                1
            )
            "
        );


    $statement->execute([
        $customerId,
        $name,
    ]);


    $statement =
        $pdo->prepare(
            "
            UPDATE visits

            SET
                customer_id = ?,
                updated_at =
                    strftime(
                        '%Y-%m-%d %H:%M',
                        'now',
                        'localtime'
                    )

            WHERE
                id = ?
                AND customer_id IS NULL
            "
        );


    $statement->execute([
        $customerId,
        $visitId,
    ]);


    if (
        $statement->rowCount()
        !== 1
    ) {
        throw new RuntimeException(
            'Visit customer link failed.'
        );
    }


    $pdo->commit();


    echo json_encode(
        [
            'success' =>
                true,

            'customer' => [
                'id' =>
                    $customerId,

                'customer_code' =>
                    $customerCode,

                'name' =>
                    $name,
            ],

            'visit_id' =>
                $visitId,
        ],
        JSON_UNESCAPED_UNICODE
    );


} catch (Throwable $error) {

    if (
        $pdo instanceof PDO
        && $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }


    http_response_code(400);


    echo json_encode(
        [
            'success' =>
                false,

            'error' =>
                $error->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE
    );
}