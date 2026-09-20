<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../../../600_KoppyOS/server/auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/../../core/database.php';

try {
    $method = strtoupper(
        $_SERVER['REQUEST_METHOD']
        ?? 'GET'
    );

    if ($method !== 'GET') {
        http_response_code(405);

        throw new RuntimeException(
            'GET only.'
        );
    }

    $rawCustomerIds = trim(
        (string)
        (
            $_GET['customer_ids']
            ?? ''
        )
    );

    if ($rawCustomerIds === '') {
        throw new RuntimeException(
            'customer_ids is required.'
        );
    }

    $customerIds = [];

    foreach (
        explode(',', $rawCustomerIds)
        as $rawId
    ) {
        $customerId = (int) trim($rawId);

        if ($customerId <= 0) {
            throw new RuntimeException(
                'customer_ids must contain positive integers.'
            );
        }

        $customerIds[] = $customerId;
    }

    $customerIds = array_values(
        array_unique(
            $customerIds
        )
    );

    if (count($customerIds) > 30) {
        throw new RuntimeException(
            'Too many customer_ids.'
        );
    }

    $pdo = koppyDatabase();

    $placeholders = implode(
        ',',
        array_fill(
            0,
            count($customerIds),
            '?'
        )
    );

    $visitStatement = $pdo->prepare(
        "
        SELECT
            v.id,
            v.customer_id,
            v.store_id,
            s.name AS store_name,
            v.started_at,
            v.course_minutes,
            v.customer_status,
            v.status,
            v.cancelled_at,
            sc.pricing_category,

            COALESCE(
                vs.tip_amount,
                0
            ) AS tip_amount

        FROM visits v

        LEFT JOIN stores s
            ON s.id = v.store_id

        LEFT JOIN store_courses sc
            ON sc.id = v.store_course_id

        LEFT JOIN visit_sales_v2 vs
            ON vs.visit_id = v.id

        WHERE
            v.customer_id
            IN ({$placeholders})

        ORDER BY
            v.customer_id ASC,
            v.started_at DESC,
            v.id DESC
        "
    );

    $visitStatement->execute(
        $customerIds
    );

    $visits = $visitStatement->fetchAll();

    $visitIds = array_map(
        static fn (
            array $visit
        ): int =>
            (int) $visit['id'],
        $visits
    );

    $optionsByVisit = [];

    if ($visitIds !== []) {
        $visitPlaceholders = implode(
            ',',
            array_fill(
                0,
                count($visitIds),
                '?'
            )
        );

        $optionStatement = $pdo->prepare(
            "
            SELECT
                vo.visit_id,
                COALESCE(
                    o.name,
                    vo.custom_name
                ) AS option_name

            FROM visit_options vo

            LEFT JOIN options o
                ON o.id = vo.option_id

            WHERE
                vo.visit_id
                IN ({$visitPlaceholders})

            ORDER BY
                vo.visit_id ASC,
                o.sort_order ASC,
                vo.id ASC
            "
        );

        $optionStatement->execute(
            $visitIds
        );

        foreach (
            $optionStatement->fetchAll()
            as $option
        ) {
            $visitId =
                (int) $option['visit_id'];

            $name = trim(
                (string)
                (
                    $option['option_name']
                    ?? ''
                )
            );

            if ($name === '') {
                continue;
            }

            if (
                !isset(
                    $optionsByVisit[
                        $visitId
                    ]
                )
            ) {
                $optionsByVisit[
                    $visitId
                ] = [];
            }

            $optionsByVisit[
                $visitId
            ][] = $name;
        }
    }

    $histories = [];

    foreach ($visits as $visit) {
        $visitId =
            (int) $visit['id'];

        $customerId =
            (int) $visit['customer_id'];

        $visit['options'] =
            $optionsByVisit[
                $visitId
            ]
            ?? [];

        $visit['tip_amount'] =
            (int)
            (
                $visit['tip_amount']
                ?? 0
            );

        $visit['course_minutes'] =
            (int)
            (
                $visit['course_minutes']
                ?? 0
            );

        if (
            !isset(
                $histories[
                    $customerId
                ]
            )
        ) {
            $histories[
                $customerId
            ] = [];
        }

        $histories[
            $customerId
        ][] = $visit;
    }

    echo json_encode(
        [
            'success' => true,
            'histories' => $histories,
            'error' => null,
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );

} catch (Throwable $error) {
    if (http_response_code() < 400) {
        http_response_code(400);
    }

    echo json_encode(
        [
            'success' => false,
            'histories' => null,
            'error' =>
                $error->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
    );
}
