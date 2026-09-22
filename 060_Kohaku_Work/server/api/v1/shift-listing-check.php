<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

header(
    'Cache-Control: no-store'
);

require_once __DIR__
    . '/../../../../600_KoppyOS/server/auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__
    . '/../../core/database.php';

date_default_timezone_set(
    'Asia/Tokyo'
);


const SHIFT_LISTING_SOURCE_CACHE_TTL_SECONDS =
    10 * 60;


function shiftListingResponse(
    array $data,
    int $statusCode = 200
): never {
    http_response_code(
        $statusCode
    );

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_PRETTY_PRINT
    );

    exit;
}


function shiftListingNormalizeText(
    string $value
): string {
    return trim(
        (string) preg_replace(
            '/\s+/u',
            ' ',
            html_entity_decode(
                $value,
                ENT_QUOTES
                | ENT_HTML5,
                'UTF-8'
            )
        )
    );
}


function shiftListingFetchHtml(
    string $url
): string {
    $cachePath =
        rtrim(
            sys_get_temp_dir(),
            DIRECTORY_SEPARATOR
        )
        . DIRECTORY_SEPARATOR
        . 'koppy-shift-listing-'
        . hash(
            'sha256',
            $url
        )
        . '.json';

    $cachedRaw =
        @file_get_contents(
            $cachePath
        );

    if (
        $cachedRaw !== false
        && trim($cachedRaw) !== ''
    ) {
        $cached =
            json_decode(
                $cachedRaw,
                true
            );

        if (is_array($cached)) {
            $cachedUrl =
                (string)
                ($cached['url'] ?? '');

            $fetchedAt =
                (int)
                ($cached['fetched_at'] ?? 0);

            $cachedHtml =
                (string)
                ($cached['html'] ?? '');

            $age =
                time()
                - $fetchedAt;

            if (
                $cachedUrl === $url
                && $fetchedAt > 0
                && $age >= 0
                && $age
                    <=
                    SHIFT_LISTING_SOURCE_CACHE_TTL_SECONDS
                && trim($cachedHtml) !== ''
            ) {
                return
                    $cachedHtml;
            }
        }
    }

    if (!function_exists('curl_init')) {
        throw new RuntimeException(
            'PHP cURL extension is unavailable.'
        );
    }

    $curl =
        curl_init(
            $url
        );

    if ($curl === false) {
        throw new RuntimeException(
            'Could not initialize CityHeaven request.'
        );
    }

    curl_setopt_array(
        $curl,
        [
            CURLOPT_RETURNTRANSFER =>
                true,

            CURLOPT_FOLLOWLOCATION =>
                true,

            CURLOPT_MAXREDIRS =>
                5,

            CURLOPT_CONNECTTIMEOUT =>
                5,

            CURLOPT_TIMEOUT =>
                15,

            CURLOPT_ENCODING =>
                '',

            CURLOPT_USERAGENT =>
                'Mozilla/5.0 '
                . '(Macintosh; Intel Mac OS X 10_15_7) '
                . 'AppleWebKit/605.1.15 '
                . '(KHTML, like Gecko) '
                . 'Version/26.6 Safari/605.1.15',

            CURLOPT_HTTPHEADER => [
                'Accept: text/html',
                'Accept-Language: ja,en;q=0.8',
            ],

            CURLOPT_SSL_VERIFYPEER =>
                true,

            CURLOPT_SSL_VERIFYHOST =>
                2,

            CURLOPT_PROTOCOLS =>
                CURLPROTO_HTTPS,

            CURLOPT_REDIR_PROTOCOLS =>
                CURLPROTO_HTTPS,
        ]
    );

    $html =
        curl_exec(
            $curl
        );

    $statusCode =
        (int) curl_getinfo(
            $curl,
            CURLINFO_HTTP_CODE
        );

    $error =
        curl_error(
            $curl
        );

    curl_close(
        $curl
    );

    if ($html === false) {
        throw new RuntimeException(
            'CityHeaven request failed: '
            . $error
        );
    }

    if ($statusCode !== 200) {
        throw new RuntimeException(
            'CityHeaven returned HTTP '
            . $statusCode
            . '.'
        );
    }

    if (trim((string) $html) === '') {
        throw new RuntimeException(
            'CityHeaven returned an empty page.'
        );
    }

    $cachePayload =
        json_encode(
            [
                'url' =>
                    $url,

                'fetched_at' =>
                    time(),

                'html' =>
                    (string) $html,
            ],
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
        );

    if (is_string($cachePayload)) {
        $previousUmask =
            umask(
                0077
            );

        try {
            @file_put_contents(
                $cachePath,
                $cachePayload,
                LOCK_EX
            );
        } finally {
            umask(
                $previousUmask
            );
        }

        @chmod(
            $cachePath,
            0600
        );
    }

    return
        (string) $html;
}


function shiftListingResolveDate(
    int $month,
    int $day,
    DateTimeImmutable $reference
): string {
    $candidates = [];

    $referenceYear =
        (int) $reference->format(
            'Y'
        );

    for (
        $year = $referenceYear - 1;
        $year <= $referenceYear + 1;
        $year += 1
    ) {
        if (
            !checkdate(
                $month,
                $day,
                $year
            )
        ) {
            continue;
        }

        $candidate =
            $reference
                ->setDate(
                    $year,
                    $month,
                    $day
                )
                ->setTime(
                    0,
                    0,
                    0
                );

        $candidates[] = [
            'date' =>
                $candidate,

            'distance' =>
                abs(
                    $candidate->getTimestamp()
                    - $reference->getTimestamp()
                ),
        ];
    }

    if ($candidates === []) {
        throw new RuntimeException(
            'Could not resolve listing date.'
        );
    }

    usort(
        $candidates,
        static function (
            array $left,
            array $right
        ): int {
            return
                $left['distance']
                <=>
                $right['distance'];
        }
    );

    return
        $candidates[0]['date']
            ->format(
                'Y-m-d'
            );
}


function shiftListingBuildDateTime(
    string $date,
    int $hour,
    int $minute
): DateTimeImmutable {
    if (
        $hour < 0
        || $hour > 23
        || $minute < 0
        || $minute > 59
    ) {
        throw new RuntimeException(
            'Invalid listing time.'
        );
    }

    return
        new DateTimeImmutable(
            sprintf(
                '%s %02d:%02d:00',
                $date,
                $hour,
                $minute
            ),
            new DateTimeZone(
                'Asia/Tokyo'
            )
        );
}


function shiftListingParseSchedule(
    string $html,
    string $expectedName
): array {
    libxml_use_internal_errors(
        true
    );

    $dom =
        new DOMDocument();

    $loaded =
        $dom->loadHTML(
            $html,
            LIBXML_NONET
            | LIBXML_NOERROR
            | LIBXML_NOWARNING
        );

    libxml_clear_errors();

    if (!$loaded) {
        throw new RuntimeException(
            'Could not parse CityHeaven HTML.'
        );
    }

    $xpath =
        new DOMXPath(
            $dom
        );

    $nameNodes =
        $xpath->query(
            '//*[@id="girlprofile_content"]'
            . '//meta[@itemprop="name"]/@content'
        );

    $actualName =
        (
            $nameNodes !== false
            && $nameNodes->length > 0
        )
            ? shiftListingNormalizeText(
                (string)
                $nameNodes->item(0)
                    ?->nodeValue
            )
            : '';

    if ($actualName === '') {
        throw new RuntimeException(
            'Could not identify CityHeaven profile.'
        );
    }

    if ($actualName !== $expectedName) {
        throw new RuntimeException(
            'CityHeaven profile identity mismatch.'
        );
    }

    $rows =
        $xpath->query(
            '//*[@id="girl_sukkin"]/li'
        );

    if (
        $rows === false
        || $rows->length === 0
    ) {
        throw new RuntimeException(
            'CityHeaven shift block was not found.'
        );
    }

    $reference =
        new DateTimeImmutable(
            'now',
            new DateTimeZone(
                'Asia/Tokyo'
            )
        );

    $schedule = [];

    foreach ($rows as $row) {

        $dateNode =
            $xpath
                ->query(
                    './/dt',
                    $row
                )
                ?->item(0);

        if ($dateNode === null) {
            throw new RuntimeException(
                'CityHeaven shift row date is missing.'
            );
        }

        $dateText =
            shiftListingNormalizeText(
                $dateNode->textContent
            );

        if (
            !preg_match(
                '/(\d{1,2})\/(\d{1,2})/u',
                $dateText,
                $dateMatch
            )
        ) {
            throw new RuntimeException(
                'CityHeaven shift row date is invalid.'
            );
        }

        $shiftDate =
            shiftListingResolveDate(
                (int) $dateMatch[1],
                (int) $dateMatch[2],
                $reference
            );

        $holidayNode =
            $xpath
                ->query(
                    './/*[contains('
                    . 'concat(" ", normalize-space(@class), " "),'
                    . ' " holiday2 "'
                    . ')]',
                    $row
                )
                ?->item(0);

        if ($holidayNode !== null) {

            $schedule[] = [
                'shift_date' =>
                    $shiftDate,

                'status' =>
                    'off',

                'start_at' =>
                    null,

                'end_at' =>
                    null,
            ];

            continue;
        }

        $timeNode =
            $xpath
                ->query(
                    './/*[contains('
                    . 'concat(" ", normalize-space(@class), " "),'
                    . ' " go2 "'
                    . ')]',
                    $row
                )
                ?->item(0);

        if ($timeNode === null) {
            throw new RuntimeException(
                'CityHeaven shift row time is missing.'
            );
        }

        $timeText =
            shiftListingNormalizeText(
                $timeNode->textContent
            );

        if (
            !preg_match(
                '/(\d{1,2}):([0-5]\d)'
                . '\s*-\s*'
                . '(\d{1,2}):([0-5]\d)/u',
                $timeText,
                $timeMatch
            )
        ) {
            throw new RuntimeException(
                'CityHeaven shift row time is invalid.'
            );
        }

        $start =
            shiftListingBuildDateTime(
                $shiftDate,
                (int) $timeMatch[1],
                (int) $timeMatch[2]
            );

        $end =
            shiftListingBuildDateTime(
                $shiftDate,
                (int) $timeMatch[3],
                (int) $timeMatch[4]
            );

        if ($end <= $start) {
            $end =
                $end->modify(
                    '+1 day'
                );
        }

        $schedule[] = [
            'shift_date' =>
                $shiftDate,

            'status' =>
                'confirmed',

            'start_at' =>
                $start->format(
                    'Y-m-d H:i'
                ),

            'end_at' =>
                $end->format(
                    'Y-m-d H:i'
                ),
        ];
    }

    if ($schedule === []) {
        throw new RuntimeException(
            'CityHeaven shift rows could not be parsed.'
        );
    }

    usort(
        $schedule,
        static function (
            array $left,
            array $right
        ): int {
            return
                $left['shift_date']
                <=>
                $right['shift_date'];
        }
    );

    return [
        'profile_name' =>
            $actualName,

        'schedule' =>
            $schedule,
    ];
}


function shiftListingLoadCalendarRows(
    PDO $pdo,
    string $workerCode,
    string $dateFrom,
    string $dateTo
): array {
    $statement =
        $pdo->prepare(
            '
            SELECT
                ws.id,
                ws.shift_date,
                ws.status,
                ws.start_at,
                ws.end_at,
                s.name AS store_name
            FROM work_shifts ws
            JOIN workers w
                ON w.id = ws.worker_id
            LEFT JOIN stores s
                ON s.id = ws.store_id
            WHERE
                w.worker_code = ?
                AND ws.shift_date >= ?
                AND ws.shift_date <= ?
            ORDER BY
                ws.shift_date ASC,
                ws.start_at ASC,
                ws.id ASC
            '
        );

    $statement->execute([
        $workerCode,
        $dateFrom,
        $dateTo,
    ]);

    $grouped = [];

    foreach (
        $statement->fetchAll()
        as $row
    ) {
        $date =
            (string)
            ($row['shift_date'] ?? '');

        if ($date === '') {
            continue;
        }

        if (!isset($grouped[$date])) {
            $grouped[$date] = [];
        }

        $grouped[$date][] = [
            'id' =>
                (int) $row['id'],

            'status' =>
                (string) $row['status'],

            'start_at' =>
                $row['start_at'] !== null
                    ? (string) $row['start_at']
                    : null,

            'end_at' =>
                $row['end_at'] !== null
                    ? (string) $row['end_at']
                    : null,

            'store_name' =>
                $row['store_name'] !== null
                    ? (string) $row['store_name']
                    : null,
        ];
    }

    return $grouped;
}


function shiftListingCompareDay(
    array $listing,
    array $calendarRows,
    string $expectedStoreName
): array {
    if ($calendarRows === []) {
        return [
            'comparison' =>
                'calendar_missing',

            'is_match' =>
                false,

            'calendar' =>
                null,
        ];
    }

    if (count($calendarRows) !== 1) {
        return [
            'comparison' =>
                'calendar_multiple',

            'is_match' =>
                false,

            'calendar' =>
                $calendarRows,
        ];
    }

    $calendar =
        $calendarRows[0];

    $calendarStatus =
        (string)
        ($calendar['status'] ?? '');

    if (
        !in_array(
            $calendarStatus,
            [
                'confirmed',
                'off',
            ],
            true
        )
    ) {
        return [
            'comparison' =>
                'calendar_unconfirmed',

            'is_match' =>
                false,

            'calendar' =>
                $calendar,
        ];
    }

    if ($listing['status'] === 'off') {

        if ($calendarStatus === 'off') {
            return [
                'comparison' =>
                    'match',

                'is_match' =>
                    true,

                'calendar' =>
                    $calendar,
            ];
        }

        return [
            'comparison' =>
                'calendar_only',

            'is_match' =>
                false,

            'calendar' =>
                $calendar,
        ];
    }

    if ($calendarStatus === 'off') {
        return [
            'comparison' =>
                'listing_only',

            'is_match' =>
                false,

            'calendar' =>
                $calendar,
        ];
    }

    $calendarStoreName =
        (string)
        ($calendar['store_name'] ?? '');

    if (
        $expectedStoreName !== ''
        && $calendarStoreName
            !== $expectedStoreName
    ) {
        return [
            'comparison' =>
                'store_mismatch',

            'is_match' =>
                false,

            'calendar' =>
                $calendar,
        ];
    }

    $sameStart =
        (string) $listing['start_at']
        ===
        (string) ($calendar['start_at'] ?? '');

    $sameEnd =
        (string) $listing['end_at']
        ===
        (string) ($calendar['end_at'] ?? '');

    return [
        'comparison' =>
            (
                $sameStart
                && $sameEnd
            )
                ? 'match'
                : 'time_mismatch',

        'is_match' =>
            (
                $sameStart
                && $sameEnd
            ),

        'calendar' =>
            $calendar,
    ];
}


function shiftListingWorkerId(
    PDO $pdo,
    string $workerCode
): int {
    $statement =
        $pdo->prepare(
            '
            SELECT id

            FROM workers

            WHERE worker_code = ?

            LIMIT 1
            '
        );

    $statement->execute([
        $workerCode,
    ]);

    $workerId =
        $statement->fetchColumn();

    if ($workerId === false) {
        throw new RuntimeException(
            'Shift listing worker was not found.'
        );
    }

    return
        (int) $workerId;
}


function shiftListingPersistResults(
    PDO $pdo,
    array $source,
    array $results
): void {
    $workerId =
        shiftListingWorkerId(
            $pdo,
            (string)
            $source['worker_code']
        );

    $statement =
        $pdo->prepare(
            '
            INSERT INTO shift_listing_checks
            (
                worker_id,
                provider,
                listing_name,
                expected_store_name,
                shift_date,
                comparison,
                is_match,
                listing_json,
                calendar_json,
                checked_at
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )

            ON CONFLICT(
                worker_id,
                provider,
                shift_date
            )

            DO UPDATE SET
                listing_name =
                    excluded.listing_name,

                expected_store_name =
                    excluded.expected_store_name,

                comparison =
                    excluded.comparison,

                is_match =
                    excluded.is_match,

                listing_json =
                    excluded.listing_json,

                calendar_json =
                    excluded.calendar_json,

                checked_at =
                    excluded.checked_at,

                updated_at =
                    strftime(
                        \'%Y-%m-%d %H:%M\',
                        \'now\',
                        \'localtime\'
                    )
            '
        );

    $checkedAt =
        (
            new DateTimeImmutable(
                'now',
                new DateTimeZone(
                    'Asia/Tokyo'
                )
            )
        )->format(
            'Y-m-d H:i'
        );


    $pdo->beginTransaction();

    try {

        foreach ($results as $result) {

            $listingJson =
                json_encode(
                    $result['listing'],
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                    | JSON_THROW_ON_ERROR
                );

            $calendarJson =
                json_encode(
                    $result['calendar'],
                    JSON_UNESCAPED_UNICODE
                    | JSON_UNESCAPED_SLASHES
                    | JSON_THROW_ON_ERROR
                );


            $statement->execute([
                $workerId,
                (string)
                $source['provider'],
                (string)
                $source['listing_name'],
                (string)
                $source['store_name'],
                (string)
                $result['shift_date'],
                (string)
                $result['comparison'],
                $result['is_match']
                    ? 1
                    : 0,
                $listingJson,
                $calendarJson,
                $checkedAt,
            ]);
        }


        $pdo->commit();


    } catch (Throwable $error) {

        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $error;
    }
}


function shiftListingLoadPersistedResults(
    PDO $pdo,
    string $workerCode,
    string $provider
): array {
    $statement =
        $pdo->prepare(
            '
            SELECT
                checks.shift_date,
                checks.comparison,
                checks.is_match,
                checks.listing_json,
                checks.calendar_json,
                checks.checked_at

            FROM shift_listing_checks checks

            JOIN workers
                ON workers.id =
                    checks.worker_id

            WHERE
                workers.worker_code = ?
                AND checks.provider = ?

            ORDER BY
                checks.shift_date ASC
            '
        );

    $statement->execute([
        $workerCode,
        $provider,
    ]);


    $results = [];


    foreach (
        $statement->fetchAll()
        as $row
    ) {

        $results[] = [
            'shift_date' =>
                (string)
                $row['shift_date'],

            'comparison' =>
                (string)
                $row['comparison'],

            'is_match' =>
                (int)
                $row['is_match']
                === 1,

            'listing' =>
                json_decode(
                    (string)
                    $row['listing_json'],
                    true,
                    512,
                    JSON_THROW_ON_ERROR
                ),

            'calendar' =>
                json_decode(
                    (string)
                    $row['calendar_json'],
                    true,
                    512,
                    JSON_THROW_ON_ERROR
                ),

            'checked_at' =>
                (string)
                $row['checked_at'],
        ];
    }


    return
        $results;
}


$method =
    strtoupper(
        $_SERVER['REQUEST_METHOD']
        ?? 'GET'
    );

if ($method !== 'GET') {
    shiftListingResponse(
        [
            'success' =>
                false,

            'error' =>
                'Method not allowed.',
        ],
        405
    );
}


$sources = [
    [
        'worker_code' =>
            'shii',

        'listing_name' =>
            'こはく',

        'store_name' =>
            '札幌',

        'provider' =>
            'cityheaven',

        'url' =>
            'https://www.cityheaven.net/'
            . 'hokkaido/A0101/A010103/jmix/'
            . 'girlid-49782139/?mypage_flg=1',
    ],

    [
        'worker_code' =>
            'ui',

        'listing_name' =>
            'ねこ',

        'store_name' =>
            '札幌',

        'provider' =>
            'cityheaven',

        'url' =>
            'https://www.cityheaven.net/'
            . 'hokkaido/A0101/A010103/jmix/'
            . 'girlid-54935024/',
    ],
];


$pdo =
    koppyDatabase();

$workers = [];

$summary = [
    'workers' =>
        count($sources),

    'matches' =>
        0,

    'differences' =>
        0,

    'source_errors' =>
        0,
];


foreach ($sources as $source) {

    try {

        $html =
            shiftListingFetchHtml(
                $source['url']
            );

        $parsed =
            shiftListingParseSchedule(
                $html,
                $source['listing_name']
            );

        $schedule =
            $parsed['schedule'];

        $dateFrom =
            (string)
            $schedule[0]['shift_date'];

        $dateTo =
            (string)
            $schedule[
                count($schedule) - 1
            ]['shift_date'];

        $calendarRows =
            shiftListingLoadCalendarRows(
                $pdo,
                $source['worker_code'],
                $dateFrom,
                $dateTo
            );

        $results = [];

        foreach ($schedule as $listing) {

            $date =
                (string)
                $listing['shift_date'];

            $comparison =
                shiftListingCompareDay(
                    $listing,
                    $calendarRows[$date]
                    ?? [],
                    $source['store_name']
                );

            if ($comparison['is_match']) {
                $summary['matches'] += 1;
            } else {
                $summary['differences'] += 1;
            }

            $results[] = [
                'shift_date' =>
                    $date,

                'comparison' =>
                    $comparison['comparison'],

                'is_match' =>
                    $comparison['is_match'],

                'listing' =>
                    [
                        'status' =>
                            $listing['status'],

                        'start_at' =>
                            $listing['start_at'],

                        'end_at' =>
                            $listing['end_at'],
                    ],

                'calendar' =>
                    $comparison['calendar'],
            ];
        }


        shiftListingPersistResults(
            $pdo,
            $source,
            $results
        );


        $historyResults =
            shiftListingLoadPersistedResults(
                $pdo,
                (string)
                $source['worker_code'],
                (string)
                $source['provider']
            );


        $workers[] = [
            'worker_code' =>
                $source['worker_code'],

            'listing_name' =>
                $parsed['profile_name'],

            'store_name' =>
                $source['store_name'],

            'provider' =>
                $source['provider'],

            'source_url' =>
                $source['url'],

            'source_status' =>
                'ok',

            'date_from' =>
                $dateFrom,

            'date_to' =>
                $dateTo,

            'results' =>
                $historyResults,

            'error' =>
                null,
        ];

    } catch (Throwable $error) {

        $summary['source_errors'] += 1;


        $historyResults =
            shiftListingLoadPersistedResults(
                $pdo,
                (string)
                $source['worker_code'],
                (string)
                $source['provider']
            );


        $workers[] = [
            'worker_code' =>
                $source['worker_code'],

            'listing_name' =>
                $source['listing_name'],

            'provider' =>
                $source['provider'],

            'source_url' =>
                $source['url'],

            'source_status' =>
                'unavailable',

            'date_from' =>
                null,

            'date_to' =>
                null,

            'results' =>
                $historyResults,

            'error' =>
                $error->getMessage(),
        ];
    }
}


shiftListingResponse(
    [
        'success' =>
            true,

        'checked_at' =>
            (
                new DateTimeImmutable(
                    'now',
                    new DateTimeZone(
                        'Asia/Tokyo'
                    )
                )
            )->format(
                DATE_ATOM
            ),

        'source_cache_ttl_seconds' =>
            SHIFT_LISTING_SOURCE_CACHE_TTL_SECONDS,

        'summary' =>
            $summary,

        'workers' =>
            $workers,

        'error' =>
            null,
    ]
);
