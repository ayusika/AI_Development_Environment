<?php

declare(strict_types=1);

/*
 * Compatibility bridge.
 *
 * Kohaku Work owns this API implementation now.
 * Keep the legacy /api/v1 route available until runtime
 * routing is switched during the Pro cutover.
 */

require_once __DIR__
    . '/../../../../060_Kohaku_Work/server/api/v1/sales-day-confirm.php';
