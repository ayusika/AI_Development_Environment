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
                        DISTINCT CASE
                            WHEN v.status = 'completed'
                            THEN v.id
                        END
                    ) AS visit_count,

                    COUNT(
                        DISTINCT CASE
                            WHEN v.status = 'scheduled'
                            THEN v.id
                        END
                    ) AS scheduled_count,

                    COUNT(
                        DISTINCT CASE
                            WHEN v.status = 'cancelled'
                            THEN v.id
                        END
                    ) AS cancelled_count,

                    COUNT(
                        DISTINCT CASE
                            WHEN v.status = 'no_show'
                            THEN v.id
                        END
                    ) AS no_show_count

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


        $featureStatement =
            $pdo->query(
                "
                SELECT
                    id,
                    customer_id,
                    feature_type,
                    feature_value,
                    note,
                    created_at,
                    updated_at

                FROM customer_identity_features

                ORDER BY
                    customer_id ASC,
                    id ASC
                "
            );


        $featuresByCustomer =
            [];


        foreach (
            $featureStatement->fetchAll()
            as $featureRecord
        ) {

            $customerId =
                (int)
                $featureRecord['customer_id'];


            if (
                !isset(
                    $featuresByCustomer[
                        $customerId
                    ]
                )
            ) {
                $featuresByCustomer[
                    $customerId
                ] = [];
            }


            $featuresByCustomer[
                $customerId
            ][] =
                $featureRecord;
        }


        $acquisitionStatement =
            $pdo->query(
                "
                SELECT
                    id,
                    customer_id,
                    source_type,
                    source_detail,
                    note,
                    created_at,
                    updated_at

                FROM customer_acquisition_sources

                ORDER BY
                    customer_id ASC,
                    id ASC
                "
            );


        $acquisitionByCustomer =
            [];


        foreach (
            $acquisitionStatement->fetchAll()
            as $acquisitionRecord
        ) {

            $customerId =
                (int)
                $acquisitionRecord['customer_id'];


            $acquisitionByCustomer[
                $customerId
            ] =
                $acquisitionRecord;
        }


        $visitStatement =
            $pdo->query(
                "
                SELECT
                    id,
                    customer_id,
                    store_id,
                    started_at,
                    booked_at,
                    course_minutes,
                    customer_status,
                    customer_features,
                    conversation_notes,
                    visit_notes,
                    is_dummy,
                    status,
                    cancelled_at,
                    cancel_reason,
                    cancelled_by

                FROM visits

                WHERE customer_id IS NOT NULL

                ORDER BY
                    started_at DESC,
                    id DESC
                "
            );


        $visitsByCustomer =
            [];


        foreach (
            $visitStatement->fetchAll()
            as $visitRecord
        ) {

            $customerId =
                (int)
                $visitRecord['customer_id'];


            if (
                !isset(
                    $visitsByCustomer[
                        $customerId
                    ]
                )
            ) {
                $visitsByCustomer[
                    $customerId
                ] = [];
            }


            $visitsByCustomer[
                $customerId
            ][] =
                $visitRecord;
        }


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


            $customer['identity_features'] =
                $featuresByCustomer[
                    $customerId
                ]
                ?? [];


            $customer['acquisition_source'] =
                $acquisitionByCustomer[
                    $customerId
                ]
                ?? null;


            $customer['visits'] =
                $visitsByCustomer[
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


    if ($method === 'PATCH') {

        $payload =
            readJsonBody();


        $customerId =
            isset($payload['id'])
                ? (int)
                    $payload['id']
                : 0;


        if (
            isset(
                $payload['acquisition_source_type']
            )
        ) {

            $sourceType =
                trim(
                    (string)
                    $payload[
                        'acquisition_source_type'
                    ]
                );


            $sourceDetail =
                isset(
                    $payload[
                        'acquisition_source_detail'
                    ]
                )
                    ? trim(
                        (string)
                        $payload[
                            'acquisition_source_detail'
                        ]
                    )
                    : '';


            $allowedSourceTypes = [
                'heaven',
                'x',
                'instagram',
                'okini_talk',
                'store_site',
                'referral',
                'review',
                'store_route',
                'other',
                'unknown',
            ];


            if ($customerId <= 0) {
                throw new RuntimeException(
                    'id is required.'
                );
            }


            if (
                !in_array(
                    $sourceType,
                    $allowedSourceTypes,
                    true
                )
            ) {
                throw new RuntimeException(
                    'Invalid acquisition_source_type.'
                );
            }


            $customerStatement =
                $pdo->prepare(
                    "
                    SELECT id
                    FROM customers
                    WHERE id = ?
                    LIMIT 1
                    "
                );


            $customerStatement->execute([
                $customerId,
            ]);


            if (
                !$customerStatement->fetch()
            ) {
                throw new RuntimeException(
                    'Customer not found.'
                );
            }


            $existingStatement =
                $pdo->prepare(
                    "
                    SELECT id

                    FROM customer_acquisition_sources

                    WHERE customer_id = ?

                    LIMIT 1
                    "
                );


            $existingStatement->execute([
                $customerId,
            ]);


            $existing =
                $existingStatement->fetch();


            if ($existing) {

                $saveStatement =
                    $pdo->prepare(
                        "
                        UPDATE customer_acquisition_sources

                        SET
                            source_type = ?,
                            source_detail = ?,
                            updated_at =
                                strftime(
                                    '%Y-%m-%d %H:%M',
                                    'now',
                                    'localtime'
                                )

                        WHERE id = ?
                        "
                    );


                $saveStatement->execute([
                    $sourceType,
                    $sourceDetail !== ''
                        ? $sourceDetail
                        : null,
                    (int)
                    $existing['id'],
                ]);

            } else {

                $saveStatement =
                    $pdo->prepare(
                        "
                        INSERT INTO customer_acquisition_sources
                        (
                            customer_id,
                            source_type,
                            source_detail,
                            note,
                            created_at,
                            updated_at
                        )
                        VALUES
                        (
                            ?,
                            ?,
                            ?,
                            NULL,
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
                        "
                    );


                $saveStatement->execute([
                    $customerId,
                    $sourceType,
                    $sourceDetail !== ''
                        ? $sourceDetail
                        : null,
                ]);
            }


            echo json_encode(
                [
                    'success' =>
                        true,

                    'acquisition_source' => [
                        'customer_id' =>
                            $customerId,

                        'source_type' =>
                            $sourceType,

                        'source_detail' =>
                            $sourceDetail !== ''
                                ? $sourceDetail
                                : null,
                    ],

                    'error' =>
                        null,
                ],
                JSON_UNESCAPED_UNICODE
            );


            exit;
        }


        if (
            isset(
                $payload['feature_type']
            )
        ) {

            $featureType =
                trim(
                    (string)
                    $payload['feature_type']
                );


            $featureValue =
                isset(
                    $payload['feature_value']
                )
                    ? trim(
                        (string)
                        $payload['feature_value']
                    )
                    : '';


            $featureNote =
                isset(
                    $payload['feature_note']
                )
                    ? trim(
                        (string)
                        $payload['feature_note']
                    )
                    : '';


            $allowedFeatureTypes = [
                'age_range',
                'height',
                'body_type',
                'hair',
                'facial_hair',
                'glasses',
                'appearance',
                'lookalike',
                'occupation',
                'voice_speech',
                'area',
                'hobby_topic',
                'other',
            ];


            if ($customerId <= 0) {
                throw new RuntimeException(
                    'id is required.'
                );
            }


            if (
                !in_array(
                    $featureType,
                    $allowedFeatureTypes,
                    true
                )
            ) {
                throw new RuntimeException(
                    'Invalid feature_type.'
                );
            }


            $customerStatement =
                $pdo->prepare(
                    "
                    SELECT id

                    FROM customers

                    WHERE id = ?

                    LIMIT 1
                    "
                );


            $customerStatement->execute([
                $customerId,
            ]);


            if (
                !$customerStatement->fetch()
            ) {
                throw new RuntimeException(
                    'Customer not found.'
                );
            }


            $featureStatement =
                $pdo->prepare(
                    "
                    SELECT id

                    FROM customer_identity_features

                    WHERE
                        customer_id = ?
                        AND feature_type = ?

                    ORDER BY id ASC

                    LIMIT 1
                    "
                );


            $featureStatement->execute([
                $customerId,
                $featureType,
            ]);


            $existingFeature =
                $featureStatement->fetch();


            if ($featureValue === '') {

                if ($existingFeature) {

                    $deleteStatement =
                        $pdo->prepare(
                            "
                            DELETE FROM customer_identity_features

                            WHERE id = ?
                            "
                        );


                    $deleteStatement->execute([
                        (int)
                        $existingFeature['id'],
                    ]);
                }

            } elseif ($existingFeature) {

                $updateStatement =
                    $pdo->prepare(
                        "
                        UPDATE customer_identity_features

                        SET
                            feature_value = ?,
                            note = ?,
                            updated_at =
                                strftime(
                                    '%Y-%m-%d %H:%M',
                                    'now',
                                    'localtime'
                                )

                        WHERE id = ?
                        "
                    );


                $updateStatement->execute([
                    $featureValue,
                    $featureNote !== ''
                        ? $featureNote
                        : null,
                    (int)
                    $existingFeature['id'],
                ]);

            } else {

                $insertStatement =
                    $pdo->prepare(
                        "
                        INSERT INTO customer_identity_features
                        (
                            customer_id,
                            feature_type,
                            feature_value,
                            note
                        )
                        VALUES
                        (
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        "
                    );


                $insertStatement->execute([
                    $customerId,
                    $featureType,
                    $featureValue,
                    $featureNote !== ''
                        ? $featureNote
                        : null,
                ]);
            }


            $touchStatement =
                $pdo->prepare(
                    "
                    UPDATE customers

                    SET
                        updated_at =
                            strftime(
                                '%Y-%m-%d %H:%M',
                                'now',
                                'localtime'
                            )

                    WHERE id = ?
                    "
                );


            $touchStatement->execute([
                $customerId,
            ]);


            echo json_encode(
                [
                    'success' =>
                        true,

                    'identity_feature' => [
                        'customer_id' =>
                            $customerId,

                        'feature_type' =>
                            $featureType,

                        'feature_value' =>
                            $featureValue !== ''
                                ? $featureValue
                                : null,

                        'note' =>
                            $featureNote !== ''
                                ? $featureNote
                                : null,
                    ],

                    'error' =>
                        null,
                ],
                JSON_UNESCAPED_UNICODE
            );


            exit;
        }


        if (
            isset(
                $payload['name_type']
            )
        ) {

            $nameType =
                trim(
                    (string)
                    $payload['name_type']
                );


            $name =
                isset($payload['name'])
                    ? trim(
                        (string)
                        $payload['name']
                    )
                    : '';


            $allowedNameTypes = [
                'nickname',
                'okini_talk',
                'line',
                'x',
                'instagram',
            ];


            if ($customerId <= 0) {
                throw new RuntimeException(
                    'id is required.'
                );
            }


            if (
                !in_array(
                    $nameType,
                    $allowedNameTypes,
                    true
                )
            ) {
                throw new RuntimeException(
                    'Invalid name_type.'
                );
            }


            $customerStatement =
                $pdo->prepare(
                    "
                    SELECT id

                    FROM customers

                    WHERE id = ?

                    LIMIT 1
                    "
                );


            $customerStatement->execute([
                $customerId,
            ]);


            if (
                !$customerStatement->fetch()
            ) {
                throw new RuntimeException(
                    'Customer not found.'
                );
            }


            $nameStatement =
                $pdo->prepare(
                    "
                    SELECT id

                    FROM customer_names

                    WHERE
                        customer_id = ?
                        AND name_type = ?

                    ORDER BY
                        is_primary DESC,
                        id ASC

                    LIMIT 1
                    "
                );


            $nameStatement->execute([
                $customerId,
                $nameType,
            ]);


            $existingName =
                $nameStatement->fetch();


            if ($name === '') {

                if ($existingName) {

                    $deleteStatement =
                        $pdo->prepare(
                            "
                            DELETE FROM customer_names

                            WHERE id = ?
                            "
                        );


                    $deleteStatement->execute([
                        (int)
                        $existingName['id'],
                    ]);
                }

            } elseif ($existingName) {

                $updateStatement =
                    $pdo->prepare(
                        "
                        UPDATE customer_names

                        SET
                            name = ?,
                            updated_at =
                                strftime(
                                    '%Y-%m-%d %H:%M',
                                    'now',
                                    'localtime'
                                )

                        WHERE id = ?
                        "
                    );


                $updateStatement->execute([
                    $name,
                    (int)
                    $existingName['id'],
                ]);

            } else {

                $insertStatement =
                    $pdo->prepare(
                        "
                        INSERT INTO customer_names
                        (
                            customer_id,
                            name_type,
                            name,
                            is_primary
                        )
                        VALUES
                        (
                            ?,
                            ?,
                            ?,
                            ?
                        )
                        "
                    );


                $insertStatement->execute([
                    $customerId,
                    $nameType,
                    $name,
                    $nameType === 'nickname'
                        ? 1
                        : 0,
                ]);
            }


            $touchStatement =
                $pdo->prepare(
                    "
                    UPDATE customers

                    SET
                        updated_at =
                            strftime(
                                '%Y-%m-%d %H:%M',
                                'now',
                                'localtime'
                            )

                    WHERE id = ?
                    "
                );


            $touchStatement->execute([
                $customerId,
            ]);


            echo json_encode(
                [
                    'success' =>
                        true,

                    'customer_name' => [
                        'customer_id' =>
                            $customerId,

                        'name_type' =>
                            $nameType,

                        'name' =>
                            $name !== ''
                                ? $name
                                : null,
                    ],

                    'error' =>
                        null,
                ],
                JSON_UNESCAPED_UNICODE
            );


            exit;
        }


        $generalNotes =
            isset($payload['general_notes'])
                ? trim(
                    (string)
                    $payload['general_notes']
                )
                : '';


        if ($customerId <= 0) {
            throw new RuntimeException(
                'id is required.'
            );
        }


        $statement =
            $pdo->prepare(
                "
                UPDATE customers

                SET
                    general_notes = ?,
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
            $generalNotes !== ''
                ? $generalNotes
                : null,
            $customerId,
        ]);


        if (
            $statement->rowCount()
            !== 1
        ) {

            $existsStatement =
                $pdo->prepare(
                    "
                    SELECT id

                    FROM customers

                    WHERE id = ?

                    LIMIT 1
                    "
                );


            $existsStatement->execute([
                $customerId,
            ]);


            if (
                !$existsStatement->fetch()
            ) {
                throw new RuntimeException(
                    'Customer not found.'
                );
            }
        }


        echo json_encode(
            [
                'success' =>
                    true,

                'customer' => [
                    'id' =>
                        $customerId,

                    'general_notes' =>
                        $generalNotes !== ''
                            ? $generalNotes
                            : null,
                ],

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