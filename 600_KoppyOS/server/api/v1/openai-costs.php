<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    respondError('Method not allowed.', 405);
}

$adminKey = trim((string) ($config['openai_admin_api_key'] ?? ''));
$referenceUsd = $config['openai_credit_reference_usd'] ?? null;
$referenceAt = trim((string) ($config['openai_credit_reference_at'] ?? ''));

if ($adminKey === '') {
    respondSuccess([
        'status' => 'admin_key_unconfigured',
        'message' => '利用額取得未設定',
    ]);
}

if ($referenceUsd === null || $referenceUsd === '' || $referenceAt === '') {
    respondSuccess([
        'status' => 'reference_unconfigured',
        'message' => '残高基準未設定',
    ]);
}

if (!is_numeric($referenceUsd)) {
    respondSuccess([
        'status' => 'reference_unconfigured',
        'message' => '残高基準未設定',
    ]);
}

try {
    $referenceDate = new DateTimeImmutable($referenceAt, new DateTimeZone('UTC'));
} catch (Throwable) {
    respondSuccess([
        'status' => 'reference_unconfigured',
        'message' => '残高基準未設定',
    ]);
}

$startTime = $referenceDate->getTimestamp();
$endTime = time();
if ($startTime > $endTime) {
    respondSuccess([
        'status' => 'reference_unconfigured',
        'message' => '残高基準未設定',
    ]);
}

$usageUsd = 0.0;

for ($pageNumber = 0; $pageNumber < 100; $pageNumber++) {
    $query = [
        'start_time' => $startTime,
        'end_time' => $endTime,
        'bucket_width' => '1d',
        'limit' => 100,
    ];

    if (isset($nextPage) && $nextPage !== '') {
        $query['page'] = $nextPage;
    }

    $curl = curl_init(
        'https://api.openai.com/v1/organization/costs?'
        . http_build_query($query)
    );
    if ($curl === false) {
        respondSuccess([
            'status' => 'unavailable',
            'message' => '利用額を取得できません',
        ]);
    }

    curl_setopt_array($curl, [
        CURLOPT_HTTPGET => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $adminKey,
            'Content-Type: application/json',
        ],
    ]);

    $responseBody = curl_exec($curl);
    $statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if ($responseBody === false || $statusCode < 200 || $statusCode >= 300) {
        respondSuccess([
            'status' => 'unavailable',
            'message' => '利用額を取得できません',
        ]);
    }

    $responseData = json_decode($responseBody, true);
    if (!is_array($responseData) || !is_array($responseData['data'] ?? null)) {
        respondSuccess([
            'status' => 'unavailable',
            'message' => '利用額を取得できません',
        ]);
    }

    foreach ($responseData['data'] as $bucket) {
        $amount = $bucket['amount']['value'] ?? null;
        if (is_numeric($amount)) {
            $usageUsd += (float) $amount;
        }
    }

    $nextPage = trim((string) ($responseData['next_page'] ?? ''));
    if ($nextPage === '') {
        break;
    }
}

respondSuccess([
    'status' => 'ready',
    'usage_usd' => $usageUsd,
    'estimated_balance_usd' => (float) $referenceUsd - $usageUsd,
    'reference_at' => $referenceDate->format(DateTimeInterface::ATOM),
    'updated_at' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DateTimeInterface::ATOM),
]);
