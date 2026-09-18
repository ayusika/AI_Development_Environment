<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/response.php';
// OPTIONS is only CORS negotiation; all application operations are GET-only.
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if (!in_array($method, ['GET', 'OPTIONS'], true)) {
    header('Allow: GET, OPTIONS');
    respondError('Method not allowed.', 405);
}
require __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/database.php';
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Cache-Control: no-store');
try {
    $pdo = koppyDatabase();
    $pdo->beginTransaction();
    $rooms = $pdo->query('SELECT id, code, name, sort_order FROM home_rooms ORDER BY sort_order, id')->fetchAll();
    $devices = $pdo->query('SELECT id, room_id, code, name, category, manufacturer, model, status, role, portable, notes, weight_kg, weight_is_estimate, load_capacity_kg, sort_order FROM home_devices ORDER BY sort_order, id')->fetchAll();
    $connections = $pdo->query('SELECT id, source_device_id, target_device_id, connection_type, source_port, target_port, label, notes, sort_order FROM home_connections ORDER BY sort_order, id')->fetchAll();

    $devicesById = [];

    foreach ($devices as $device) {
        $devicesById[(int) $device['id']] = $device;
    }

    /*
     * supported_by direction:
     *
     * source_device_id = load-producing item
     * target_device_id = supporting item
     *
     * Example:
     * MacBook Air -> Aoviho stand -> Claiks desk
     */
    $supportedByTarget = [];
    $supportTargetBySource = [];

    foreach ($connections as $connection) {
        if (($connection['connection_type'] ?? null) !== 'supported_by') {
            continue;
        }

        $sourceId = (int) $connection['source_device_id'];
        $targetId = (int) $connection['target_device_id'];

        if ($sourceId === $targetId) {
            throw new RuntimeException(
                'Invalid self-supported home relation.'
            );
        }

        if (
            isset($supportTargetBySource[$sourceId])
            && $supportTargetBySource[$sourceId] !== $targetId
        ) {
            throw new RuntimeException(
                'Ambiguous supported_by relation detected.'
            );
        }

        $supportTargetBySource[$sourceId] = $targetId;
        $supportedByTarget[$targetId][] = $sourceId;
    }

    $loadSummaries = [];

    foreach ($devices as $targetDevice) {
        if (
            $targetDevice['load_capacity_kg'] === null
            || $targetDevice['load_capacity_kg'] === ''
        ) {
            continue;
        }

        $targetId = (int) $targetDevice['id'];
        $capacityKg = (float) $targetDevice['load_capacity_kg'];

        $visited = [];
        $path = [];

        $registeredLoadKg = 0.0;
        $registeredDeviceCount = 0;
        $weightedDeviceCount = 0;
        $unknownWeightCount = 0;
        $estimatedWeightCount = 0;

        $walk = function (
            int $supportId
        ) use (
            &$walk,
            &$supportedByTarget,
            &$devicesById,
            &$visited,
            &$path,
            &$registeredLoadKg,
            &$registeredDeviceCount,
            &$weightedDeviceCount,
            &$unknownWeightCount,
            &$estimatedWeightCount
        ): void {
            if (isset($path[$supportId])) {
                throw new RuntimeException(
                    'Cycle detected in supported_by relations.'
                );
            }

            $path[$supportId] = true;

            foreach (
                $supportedByTarget[$supportId] ?? []
                as $sourceId
            ) {
                if (isset($path[$sourceId])) {
                    throw new RuntimeException(
                        'Cycle detected in supported_by relations.'
                    );
                }

                if (isset($visited[$sourceId])) {
                    continue;
                }

                $visited[$sourceId] = true;
                $registeredDeviceCount++;

                if (!isset($devicesById[$sourceId])) {
                    throw new RuntimeException(
                        'supported_by relation references an unknown device.'
                    );
                }

                $sourceDevice = $devicesById[$sourceId];
                $weight = $sourceDevice['weight_kg'];

                if ($weight === null || $weight === '') {
                    $unknownWeightCount++;
                } else {
                    $registeredLoadKg += (float) $weight;
                    $weightedDeviceCount++;

                    if (
                        (int) $sourceDevice['weight_is_estimate'] === 1
                    ) {
                        $estimatedWeightCount++;
                    }
                }

                $walk($sourceId);
            }

            unset($path[$supportId]);
        };

        $walk($targetId);

        $loadSummaries[] = [
            'target_device_id' => $targetId,
            'target_device_code' => $targetDevice['code'],
            'registered_load_kg' => round(
                $registeredLoadKg,
                3
            ),
            'load_capacity_kg' => $capacityKg,
            'remaining_capacity_kg' => round(
                $capacityKg - $registeredLoadKg,
                3
            ),
            'registered_device_count' =>
                $registeredDeviceCount,
            'weighted_device_count' =>
                $weightedDeviceCount,
            'unknown_weight_count' =>
                $unknownWeightCount,
            'estimated_weight_count' =>
                $estimatedWeightCount,
        ];
    }

    $pdo->commit();
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    respondError('自宅データを取得できませんでした。管理者に初期設定の確認を依頼してください。', 500);
}
respondSuccess([
    'rooms' => $rooms,
    'devices' => $devices,
    'connections' => $connections,
    'load_summaries' => $loadSummaries,
]);
