<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/../../../auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/../../v1/lib/database.php';

function nextCustomerProfileReadJsonBody(): array
{
    $rawBody = file_get_contents('php://input');

    if (
        $rawBody === false
        || trim($rawBody) === ''
    ) {
        return [];
    }

    $payload = json_decode(
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

function nextCustomerProfileFetch(
    PDO $pdo,
    int $customerId
): array {
    $customerStatement =
        $pdo->prepare(
            "
            SELECT
                id,
                customer_code,
                general_notes,
                created_at,
                updated_at

            FROM customers

            WHERE id = ?

            LIMIT 1
            "
        );

    $customerStatement->execute([
        $customerId,
    ]);

    $customer =
        $customerStatement->fetch();

    if (!$customer) {
        throw new RuntimeException(
            'Customer was not found.'
        );
    }

    $nameStatement =
        $pdo->prepare(
            "
            SELECT
                id,
                name_type,
                name,
                store_id,
                is_primary,
                note

            FROM customer_names

            WHERE customer_id = ?

            ORDER BY
                is_primary DESC,
                id ASC
            "
        );

    $nameStatement->execute([
        $customerId,
    ]);

    $featureStatement =
        $pdo->prepare(
            "
            SELECT
                id,
                feature_type,
                feature_value,
                note,
                created_at,
                updated_at

            FROM customer_identity_features

            WHERE customer_id = ?

            ORDER BY
                id ASC
            "
        );

    $featureStatement->execute([
        $customerId,
    ]);

    $customer['names'] =
        $nameStatement->fetchAll();

    $customer['identity_features'] =
        $featureStatement->fetchAll();

    $visitStatement =
        $pdo->prepare(
            "
            SELECT
                v.id,
                v.store_id,
                s.name AS store_name,
                v.started_at,
                v.course_minutes,
                v.customer_status,
                v.service_place,
                v.status,
                v.customer_features,
                v.conversation_notes,
                v.visit_notes,

                (
                    SELECT
                        vdn.body

                    FROM visit_diary_notes vdn

                    WHERE
                        vdn.visit_id = v.id

                    LIMIT 1
                ) AS diary_note_body,

                (
                    SELECT
                        d.body

                    FROM diary_visits dv

                    JOIN diaries d
                        ON d.id = dv.diary_id

                    WHERE
                        dv.visit_id = v.id

                    ORDER BY
                        dv.sort_order ASC,
                        d.id ASC

                    LIMIT 1
                ) AS diary_body,

                (
                    SELECT
                        hd.body

                    FROM heaven_diaries hd

                    WHERE
                        hd.visit_id = v.id

                    LIMIT 1
                ) AS heaven_diary_body

            FROM visits v

            JOIN stores s
                ON s.id = v.store_id

            WHERE
                v.customer_id = ?

            ORDER BY
                v.started_at DESC,
                v.id DESC

            LIMIT 12
            "
        );

    $visitStatement->execute([
        $customerId,
    ]);

    $customer['visits'] =
        $visitStatement->fetchAll();

    return $customer;
}

try {
    $method =
        strtoupper(
            $_SERVER['REQUEST_METHOD']
            ?? 'GET'
        );

    $pdo =
        koppyDatabase();

    if ($method === 'GET') {
        $customerId =
            isset($_GET['id'])
                ? (int) $_GET['id']
                : 0;

        if ($customerId <= 0) {
            throw new RuntimeException(
                'id is required.'
            );
        }

        echo json_encode(
            [
                'success' => true,
                'customer' =>
                    nextCustomerProfileFetch(
                        $pdo,
                        $customerId
                    ),
                'error' => null,
            ],
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
            | JSON_PRETTY_PRINT
        );

        exit;
    }

    if ($method !== 'PATCH') {
        http_response_code(405);

        throw new RuntimeException(
            'GET or PATCH only.'
        );
    }

    $payload =
        nextCustomerProfileReadJsonBody();

    $customerId =
        isset($payload['id'])
            ? (int) $payload['id']
            : 0;

    if ($customerId <= 0) {
        throw new RuntimeException(
            'id is required.'
        );
    }

    nextCustomerProfileFetch(
        $pdo,
        $customerId
    );

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
        'days_off',
        'voice_speech',
        'area',
        'hobby_topic',
        'other',
    ];

    $hasGeneralNotes =
        array_key_exists(
            'general_notes',
            $payload
        );

    $hasFeatureAction =
        array_key_exists(
            'feature_type',
            $payload
        )
        || array_key_exists(
            'feature_id',
            $payload
        )
        || array_key_exists(
            'delete_feature',
            $payload
        );

    if (
        !$hasGeneralNotes
        && !$hasFeatureAction
    ) {
        throw new RuntimeException(
            'No writable field was supplied.'
        );
    }

    $pdo->beginTransaction();

    if ($hasGeneralNotes) {
        $generalNotes =
            trim(
                (string)
                ($payload['general_notes'] ?? '')
            );

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
            $generalNotes === ''
                ? null
                : $generalNotes,
            $customerId,
        ]);
    }

    if ($hasFeatureAction) {
        $featureId =
            isset($payload['feature_id'])
                ? (int) $payload['feature_id']
                : 0;

        $deleteFeature =
            filter_var(
                $payload['delete_feature']
                ?? false,
                FILTER_VALIDATE_BOOLEAN
            );

        if ($deleteFeature) {
            if ($featureId <= 0) {
                throw new RuntimeException(
                    'feature_id is required for delete.'
                );
            }

            $deleteStatement =
                $pdo->prepare(
                    "
                    DELETE FROM customer_identity_features

                    WHERE
                        id = ?
                        AND customer_id = ?
                    "
                );

            $deleteStatement->execute([
                $featureId,
                $customerId,
            ]);

            if (
                $deleteStatement->rowCount()
                !== 1
            ) {
                throw new RuntimeException(
                    'Identity feature was not found.'
                );
            }

        } else {
            $featureType =
                trim(
                    (string)
                    ($payload['feature_type'] ?? '')
                );

            $featureValue =
                trim(
                    (string)
                    ($payload['feature_value'] ?? '')
                );

            $featureNote =
                trim(
                    (string)
                    ($payload['feature_note'] ?? '')
                );

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

            if ($featureValue === '') {
                throw new RuntimeException(
                    'feature_value is required.'
                );
            }

            if ($featureId > 0) {
                $updateStatement =
                    $pdo->prepare(
                        "
                        UPDATE customer_identity_features

                        SET
                            feature_type = ?,
                            feature_value = ?,
                            note = ?,
                            updated_at =
                                strftime(
                                    '%Y-%m-%d %H:%M',
                                    'now',
                                    'localtime'
                                )

                        WHERE
                            id = ?
                            AND customer_id = ?
                        "
                    );

                $updateStatement->execute([
                    $featureType,
                    $featureValue,
                    $featureNote === ''
                        ? null
                        : $featureNote,
                    $featureId,
                    $customerId,
                ]);

                if (
                    $updateStatement->rowCount()
                    === 0
                ) {
                    $existsStatement =
                        $pdo->prepare(
                            "
                            SELECT id
                            FROM customer_identity_features
                            WHERE
                                id = ?
                                AND customer_id = ?
                            LIMIT 1
                            "
                        );

                    $existsStatement->execute([
                        $featureId,
                        $customerId,
                    ]);

                    if (
                        !$existsStatement->fetch()
                    ) {
                        throw new RuntimeException(
                            'Identity feature was not found.'
                        );
                    }
                }

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
                    $featureNote === ''
                        ? null
                        : $featureNote,
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
        }
    }

    $pdo->commit();

    echo json_encode(
        [
            'success' => true,
            'customer' =>
                nextCustomerProfileFetch(
                    $pdo,
                    $customerId
                ),
            'error' => null,
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

} catch (Throwable $error) {
    if (
        isset($pdo)
        && $pdo instanceof PDO
        && $pdo->inTransaction()
    ) {
        $pdo->rollBack();
    }

    if (http_response_code() < 400) {
        http_response_code(400);
    }

    echo json_encode(
        [
            'success' => false,
            'customer' => null,
            'error' =>
                $error->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );
}
