<?php

declare(strict_types=1);


header(
    'Content-Type: application/json; charset=utf-8'
);


require_once
    __DIR__
    . '/lib/database.php';


$pdo = null;


/* =========================================================
   HELPERS
========================================================= */

function readVisitIdentityJsonBody(): array
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


function validateVisitIdentityFeatureType(
    string $featureType
): void {

    $allowedTypes = [
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


    if (
        !in_array(
            $featureType,
            $allowedTypes,
            true
        )
    ) {
        throw new RuntimeException(
            'Invalid feature_type.'
        );
    }
}


function validateVisitExists(
    PDO $pdo,
    int $visitId
): void {

    if ($visitId <= 0) {
        throw new RuntimeException(
            'visit_id must be a positive integer.'
        );
    }


    $statement =
        $pdo->prepare(
            '
            SELECT id

            FROM visits

            WHERE id = ?

            LIMIT 1
            '
        );


    $statement->execute([
        $visitId,
    ]);


    if (
        $statement->fetchColumn()
        === false
    ) {
        throw new RuntimeException(
            'Visit was not found.'
        );
    }
}


function fetchVisitIdentityFeatures(
    PDO $pdo,
    int $visitId
): array {

    $statement =
        $pdo->prepare(
            '
            SELECT
                id,
                visit_id,
                feature_type,
                feature_value,
                note,
                created_at,
                updated_at

            FROM visit_identity_features

            WHERE visit_id = ?

            ORDER BY
                id ASC
            '
        );


    $statement->execute([
        $visitId,
    ]);


    return
        $statement->fetchAll();
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

        $visitId =
            isset(
                $_GET['visit_id']
            )
                ? (int)
                    $_GET['visit_id']
                : 0;


        validateVisitExists(
            $pdo,
            $visitId
        );


        echo json_encode(
            [
                'success' => true,

                'data' => [
                    'visit_id' =>
                        $visitId,

                    'features' =>
                        fetchVisitIdentityFeatures(
                            $pdo,
                            $visitId
                        ),
                ],
            ],
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
        );

        exit;
    }


    if ($method === 'POST') {

        $payload =
            readVisitIdentityJsonBody();


        $visitId =
            isset(
                $payload['visit_id']
            )
                ? (int)
                    $payload['visit_id']
                : 0;


        $featureType =
            trim(
                (string)
                (
                    $payload['feature_type']
                    ?? ''
                )
            );


        $featureValue =
            trim(
                (string)
                (
                    $payload['feature_value']
                    ?? ''
                )
            );


        $note =
            trim(
                (string)
                (
                    $payload['note']
                    ?? ''
                )
            );


        validateVisitExists(
            $pdo,
            $visitId
        );


        validateVisitIdentityFeatureType(
            $featureType
        );


        if ($featureValue === '') {
            throw new RuntimeException(
                'feature_value is required.'
            );
        }


        $statement =
            $pdo->prepare(
                '
                INSERT INTO visit_identity_features (
                    visit_id,
                    feature_type,
                    feature_value,
                    note
                )
                VALUES (?, ?, ?, ?)
                '
            );


        $statement->execute([
            $visitId,
            $featureType,
            $featureValue,
            $note === ''
                ? null
                : $note,
        ]);


        $featureId =
            (int)
            $pdo->lastInsertId();


        $featureStatement =
            $pdo->prepare(
                '
                SELECT
                    id,
                    visit_id,
                    feature_type,
                    feature_value,
                    note,
                    created_at,
                    updated_at

                FROM visit_identity_features

                WHERE id = ?

                LIMIT 1
                '
            );


        $featureStatement->execute([
            $featureId,
        ]);


        echo json_encode(
            [
                'success' => true,

                'data' => [
                    'feature' =>
                        $featureStatement->fetch(),
                ],
            ],
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
        );

        exit;
    }


    http_response_code(405);


    echo json_encode(
        [
            'success' => false,
            'error' =>
                'Method not allowed.',
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );


} catch (Throwable $error) {

    http_response_code(400);


    echo json_encode(
        [
            'success' => false,
            'error' =>
                $error->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );
}