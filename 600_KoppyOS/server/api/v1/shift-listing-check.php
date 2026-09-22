<?php

declare(strict_types=1);

/*
 * Compatibility bridge.
 *
 * Kohaku Work owns the shift listing comparison
 * implementation. Keep /api/v1 available through
 * the current Pro runtime routing.
 */

require_once __DIR__
    . '/../../../../060_Kohaku_Work/server/api/v1/shift-listing-check.php';
