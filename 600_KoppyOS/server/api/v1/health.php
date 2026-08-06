<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

respondSuccess([
    'service' => 'Koppy API',
    'version' => 'v1',
    'status' => 'alive',
    'message' => 'Koppy API is alive!',
    'time' => date('Y-m-d H:i:s'),
]);