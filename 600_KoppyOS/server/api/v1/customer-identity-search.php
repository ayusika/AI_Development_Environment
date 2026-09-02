<?php

declare(strict_types=1);


header(
    'Content-Type: application/json; charset=utf-8'
);


require_once
    __DIR__
    . '/../../auth/auth.php';

koppyRequireApiAuth();


require_once
    __DIR__
    . '/lib/database.php';


$pdo = null;


/* =========================================================
   HELPERS
========================================================= */

function validateIdentitySearchCustomerStatus(
    string $customerStatus
): void {

    if ($customerStatus === '') {
        return;
    }


    $allowedStatuses = [
        'new',
        'repeat',
        'other_store_repeat',
        'repeat_unknown_id',
    ];


    if (
        !in_array(
            $customerStatus,
            $allowedStatuses,
            true
        )
    ) {
        throw new RuntimeException(
            'Invalid customer_status.'
        );
    }
}


function fetchIdentityFeaturesByVisitIds(
    PDO $pdo,
    array $visitIds
): array {

    if ($visitIds === []) {
        return [];
    }


    $placeholders =
        implode(
            ',',
            array_fill(
                0,
                count($visitIds),
                '?'
            )
        );


    $statement =
        $pdo->prepare(
            "
            SELECT
                id,
                visit_id,
                feature_type,
                feature_value,
                note,
                created_at,
                updated_at

            FROM visit_identity_features

            WHERE visit_id IN ({$placeholders})

            ORDER BY
                visit_id DESC,
                id ASC
            "
        );


    $statement->execute(
        $visitIds
    );


    $featuresByVisit =
        [];


    foreach (
        $statement->fetchAll()
        as $feature
    ) {

        $visitId =
            (int)
            $feature['visit_id'];


        if (
            !isset(
                $featuresByVisit[
                    $visitId
                ]
            )
        ) {
            $featuresByVisit[
                $visitId
            ] = [];
        }


        $featuresByVisit[
            $visitId
        ][] =
            $feature;
    }


    return
        $featuresByVisit;
}


function fetchIdentityFeaturesByCustomerIds(
    PDO $pdo,
    array $customerIds
): array {

    if ($customerIds === []) {
        return [];
    }


    $placeholders =
        implode(
            ',',
            array_fill(
                0,
                count($customerIds),
                '?'
            )
        );


    $statement =
        $pdo->prepare(
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

            WHERE customer_id IN ({$placeholders})

            ORDER BY
                customer_id DESC,
                id ASC
            "
        );


    $statement->execute(
        $customerIds
    );


    $featuresByCustomer =
        [];


    foreach (
        $statement->fetchAll()
        as $feature
    ) {

        $customerId =
            (int)
            $feature['customer_id'];


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
            $feature;
    }


    return
        $featuresByCustomer;
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


    if ($method !== 'GET') {

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

        exit;
    }


    $keyword =
        trim(
            (string)
            (
                $_GET['keyword']
                ?? ''
            )
        );


    $kashikoiName =
        trim(
            (string)
            (
                $_GET['kashikoi_name']
                ?? ''
            )
        );


    $visitDate =
        trim(
            (string)
            (
                $_GET['visit_date']
                ?? ''
            )
        );


    $customerStatus =
        trim(
            (string)
            (
                $_GET['customer_status']
                ?? ''
            )
        );


    $storeId =
        isset(
            $_GET['store_id']
        )
            && $_GET['store_id'] !== ''
                ? (int)
                    $_GET['store_id']
                : null;


    validateIdentitySearchCustomerStatus(
        $customerStatus
    );


    if (
        $visitDate !== ''
        && !preg_match(
            '/^\d{4}-\d{2}-\d{2}$/',
            $visitDate
        )
    ) {
        throw new RuntimeException(
            'visit_date must be YYYY-MM-DD.'
        );
    }


    if (
        $storeId !== null
        && $storeId <= 0
    ) {
        throw new RuntimeException(
            'store_id must be a positive integer.'
        );
    }


    $whereConditions =
        [];


    $parameters =
        [];


    if ($customerStatus !== '') {

        $whereConditions[] =
            'v.customer_status = ?';

        $parameters[] =
            $customerStatus;
    }


    if ($storeId !== null) {

        $whereConditions[] =
            'v.store_id = ?';

        $parameters[] =
            $storeId;
    }


    if ($kashikoiName !== '') {

        $whereConditions[] =
            "
            EXISTS (
                SELECT 1

                FROM customer_names cn_kashikoi

                WHERE
                    cn_kashikoi.customer_id = v.customer_id
                    AND cn_kashikoi.name_type = 'kashikoi'
                    AND cn_kashikoi.name LIKE ?
            )
            ";

        $parameters[] =
            '%' . $kashikoiName . '%';
    }


    if ($visitDate !== '') {

        $whereConditions[] =
            'v.started_at LIKE ?';

        $parameters[] =
            $visitDate . '%';
    }


    if ($keyword !== '') {

        $keywordParts =
            preg_split(
                '/[\s　,，、]+/u',
                $keyword,
                -1,
                PREG_SPLIT_NO_EMPTY
            );


        if ($keywordParts === false) {
            throw new RuntimeException(
                'Failed to parse keyword.'
            );
        }


        foreach (
            array_unique($keywordParts)
            as $keywordPart
        ) {

            $whereConditions[] =
                "
                (
                    v.customer_features LIKE ?
                    OR v.started_at LIKE ?
                    OR s.name LIKE ?

                    OR EXISTS (
                        SELECT 1

                        FROM visit_identity_features vif_search

                        WHERE
                            vif_search.visit_id = v.id

                            AND (
                                vif_search.feature_value LIKE ?
                                OR vif_search.note LIKE ?
                            )
                    )

                    OR EXISTS (
                        SELECT 1

                        FROM customer_identity_features cif_search

                        WHERE
                            cif_search.customer_id = v.customer_id

                            AND (
                                cif_search.feature_value LIKE ?
                                OR cif_search.note LIKE ?
                            )
                    )

                    OR EXISTS (
                        SELECT 1

                        FROM customer_names cn_search

                        WHERE
                            cn_search.customer_id = v.customer_id
                            AND cn_search.name LIKE ?
                    )
                )
                ";


            $likeKeyword =
                '%' . $keywordPart . '%';


            $parameters[] =
                $likeKeyword;

            $parameters[] =
                $likeKeyword;

            $parameters[] =
                $likeKeyword;

            $parameters[] =
                $likeKeyword;

            $parameters[] =
                $likeKeyword;

            $parameters[] =
                $likeKeyword;

            $parameters[] =
                $likeKeyword;

            $parameters[] =
                $likeKeyword;
        }
    }


    $whereSql =
        $whereConditions === []
            ? '1 = 1'
            : implode(
                "\nAND ",
                $whereConditions
            );


    $statement =
        $pdo->prepare(
            "
            SELECT
                v.id,
                v.store_id,
                s.name AS store_name,
                v.customer_id,

                (
                    SELECT cn.name

                    FROM customer_names cn

                    WHERE
                        cn.customer_id = v.customer_id

                    ORDER BY
                        cn.is_primary DESC,
                        cn.id ASC

                    LIMIT 1
                ) AS customer_name,

                v.started_at,
                v.booked_at,
                v.course_minutes,
                v.customer_status,
                v.customer_features,
                v.status,
                v.cancelled_at,
                v.cancel_reason,
                v.cancelled_by

            FROM visits v

            LEFT JOIN stores s
                ON s.id = v.store_id

            WHERE
                {$whereSql}

            ORDER BY
                v.started_at DESC,
                v.id DESC

            LIMIT 100
            "
        );


    $statement->execute(
        $parameters
    );


    $visits =
        $statement->fetchAll();


    $visitIds =
        array_map(
            static fn (
                array $visit
            ): int =>
                (int)
                $visit['id'],
            $visits
        );


    $featuresByVisit =
        fetchIdentityFeaturesByVisitIds(
            $pdo,
            $visitIds
        );


    $customerIds =
        [];


    foreach (
        $visits
        as $visit
    ) {

        $customerId =
            (int)
            (
                $visit['customer_id']
                ?? 0
            );


        if ($customerId > 0) {

            $customerIds[] =
                $customerId;
        }
    }


    $customerIds =
        array_values(
            array_unique(
                $customerIds
            )
        );


    $featuresByCustomer =
        fetchIdentityFeaturesByCustomerIds(
            $pdo,
            $customerIds
        );


    foreach (
        $visits
        as &$visit
    ) {

        $visitId =
            (int)
            $visit['id'];

        $customerId =
            (int)
            (
                $visit['customer_id']
                ?? 0
            );


        $visit['identity_features'] =
            $featuresByVisit[
                $visitId
            ]
            ?? [];


        $visit['customer_identity_features'] =
            $customerId > 0
                ? (
                    $featuresByCustomer[
                        $customerId
                    ]
                    ?? []
                )
                : [];
    }

    unset($visit);


    echo json_encode(
        [
            'success' => true,

            'data' => [
                'filters' => [
                    'keyword' =>
                        $keyword,

                    'customer_status' =>
                        $customerStatus,

                    'store_id' =>
                        $storeId,
                ],

                'count' =>
                    count(
                        $visits
                    ),

                'visits' =>
                    $visits,
            ],
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