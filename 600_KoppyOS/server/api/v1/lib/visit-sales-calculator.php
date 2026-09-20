<?php

declare(strict_types=1);

/*
 * Compatibility bridge.
 *
 * Kohaku Work owns the visit sales calculator now.
 * Existing API endpoints may continue requiring this legacy
 * path until their repository move is completed.
 */

require_once __DIR__
    . '/../../../../../060_Kohaku_Work/server/lib/visit-sales-calculator.php';
