<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/../../../auth/auth.php';
koppyRequireApiAuth();
require_once __DIR__ . '/../../v1/lib/database.php';

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method !== 'GET') {
        http_response_code(405);
        throw new RuntimeException('GET only.');
    }

    $visitId = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($visitId <= 0) {
        throw new RuntimeException('id is required.');
    }

    $pdo = koppyDatabase();

    $visitStatement = $pdo->prepare("
        SELECT
            v.id,
            v.source_id,
            v.store_id,
            v.customer_id,
            v.started_at,
            v.booked_at,
            v.course_minutes,
            v.store_course_id,
            v.customer_status,
            v.service_place,
            v.customer_features,
            v.conversation_notes,
            v.visit_notes,
            v.nomination_fee_amount,
            v.is_dummy,
            v.status,
            v.cancelled_at,
            v.cancel_reason,
            v.cancelled_by,
            v.created_at,
            v.updated_at,
            s.name AS store_name,
            sc.course_code,
            sc.course_name,
            sc.course_type,
            sc.pricing_category,
            c.customer_code
        FROM visits v
        JOIN stores s
          ON s.id = v.store_id
        LEFT JOIN store_courses sc
          ON sc.id = v.store_course_id
        LEFT JOIN customers c
          ON c.id = v.customer_id
        WHERE v.id = ?
        LIMIT 1
    ");
    $visitStatement->execute([$visitId]);
    $visit = $visitStatement->fetch();

    if (!$visit) {
        http_response_code(404);
        throw new RuntimeException('Visit was not found.');
    }

    $customerNames = [];
    if ($visit['customer_id'] !== null) {
        $statement = $pdo->prepare("
            SELECT
                name_type,
                name,
                is_primary
            FROM customer_names
            WHERE customer_id = ?
            ORDER BY
                is_primary DESC,
                id ASC
        ");
        $statement->execute([(int) $visit['customer_id']]);
        $customerNames = $statement->fetchAll();
    }

    $visit['customer_names'] = $customerNames;
    $visit['customer_linked'] =
        $visit['customer_id'] !== null ? 1 : 0;

    $statement = $pdo->prepare("
        SELECT
            vo.option_id,
            o.name,
            vo.custom_name,
            vo.income_amount,
            vo.created_at,
            vo.updated_at
        FROM visit_options vo
        LEFT JOIN options o
          ON o.id = vo.option_id
        WHERE vo.visit_id = ?
        ORDER BY
            o.sort_order ASC,
            vo.id ASC
    ");
    $statement->execute([$visitId]);
    $visit['options'] = $statement->fetchAll();

    $statement = $pdo->prepare("
        SELECT
            ve.store_course_id,
            ve.quantity,
            sc.course_code,
            sc.course_name,
            sc.course_minutes,
            sc.course_type,
            sc.pricing_category,
            ve.created_at,
            ve.updated_at
        FROM visit_extensions ve
        JOIN store_courses sc
          ON sc.id = ve.store_course_id
        WHERE ve.visit_id = ?
        ORDER BY
            sc.sort_order ASC,
            ve.id ASC
    ");
    $statement->execute([$visitId]);
    $visit['extensions'] = $statement->fetchAll();

    $statement = $pdo->prepare("
        SELECT
            id,
            visit_id,
            store_course_rate_id,
            base_price_snapshot,
            course_take_home_snapshot,
            option_price_total_snapshot,
            option_take_home_total_snapshot,
            tip_amount,
            discount_amount,
            discount_reason_type,
            discount_reason_note,
            adjustment_amount,
            customer_payment_total,
            take_home_total,
            confirmed_at,
            created_at,
            updated_at
        FROM visit_sales_v2
        WHERE visit_id = ?
        LIMIT 1
    ");
    $statement->execute([$visitId]);
    $sales = $statement->fetch();
    if (!$sales) {
        $sales = null;
    }

    $visit['tip_amount'] = (int) ($sales['tip_amount'] ?? 0);
    $visit['adjustment_amount'] = (int) ($sales['adjustment_amount'] ?? 0);
    $visit['sales_confirmed_at'] = $sales['confirmed_at'] ?? null;
    $visit['sales_entered'] =
        $visit['sales_confirmed_at'] !== null ? 1 : 0;

    $statement = $pdo->prepare("
        SELECT
            id,
            body,
            created_at,
            updated_at
        FROM visit_diary_notes
        WHERE visit_id = ?
        LIMIT 1
    ");
    $statement->execute([$visitId]);
    $diaryNote = $statement->fetch();
    if (!$diaryNote) {
        $diaryNote = null;
    }

    $statement = $pdo->prepare("
        SELECT
            d.id,
            d.platform,
            d.diary_type,
            d.title,
            d.body,
            d.scheduled_at,
            d.posted_at,
            d.status,
            d.created_at,
            d.updated_at,
            dv.sort_order
        FROM diary_visits dv
        JOIN diaries d
          ON d.id = dv.diary_id
        WHERE dv.visit_id = ?
        ORDER BY
            dv.sort_order ASC,
            d.id ASC
    ");
    $statement->execute([$visitId]);
    $diaries = $statement->fetchAll();

    $statement = $pdo->prepare("
        SELECT
            id,
            visit_id,
            customer_id,
            body,
            source,
            platform,
            created_at,
            updated_at
        FROM heaven_diaries
        WHERE visit_id = ?
        LIMIT 1
    ");
    $statement->execute([$visitId]);
    $heavenDiary = $statement->fetch();
    if (!$heavenDiary) {
        $heavenDiary = null;
    }

    $statement = $pdo->prepare("
        SELECT 1
        FROM heaven_diary_drafts
        WHERE visit_id = ?
          AND trim(body) <> ''
        LIMIT 1
    ");
    $statement->execute([$visitId]);
    $heavenDiaryDraftExists =
        $statement->fetchColumn() !== false;

    $visit['diary_linked'] =
        (
            $diaryNote !== null
            || count($diaries) > 0
            || $heavenDiary !== null
            || $heavenDiaryDraftExists
        )
            ? 1
            : 0;

    echo json_encode(
        [
            'success' => true,
            'visit' => $visit,
            'sales' => $sales,
            'diary' => [
                'note' => $diaryNote,
                'diaries' => $diaries,
                'heaven' => $heavenDiary,
            ],
            'error' => null,
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

} catch (Throwable $error) {
    if (http_response_code() < 400) {
        http_response_code(400);
    }

    echo json_encode(
        [
            'success' => false,
            'visit' => null,
            'sales' => null,
            'diary' => null,
            'error' => $error->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );
}
