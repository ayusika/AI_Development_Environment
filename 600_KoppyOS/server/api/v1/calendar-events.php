
昨日 23:50




すまん、予定が入り込むとバーがずれ込むのが無茶苦茶嫌
バーはずれないようにしたい

生成された画像：2026年8月の共有カレンダー


編集


今日 16:30
通っためちゃいい感じ！ただバーが途切れちゃった！

生成された画像：2026年8月の共有カレンダー UI


編集


でぷろいxやちょっとまえもxついてた


今日 19:17
5a6800db-fc55-4682-8ba9-8777cfe3b367.png
b032bc7d-ac0d-4d5d-89bc-f3522246ecfd.png
pushした

09fbd8fe-c60d-45b0-a24a-c4d5d0d42118.png

2a01f685-be59-40f0-8ed2-163286b0242f.png
ほなら一個だけ機能追加
予定入れ込み際は、終日の予定は、今みたいに枠で囲む、終日出ない予定は文字のみ。日を跨ぐ予定はーー旅行ーーみたいに一本の線でマス目を跨いで中央に文字
これできる？予定入れる時開始時間と終了時間しかないから終了日も入力することでできるかもね
スクショの予定１が終日出ない予定、予定２が終日の予定、予定３が日を跨ぐよてい

生成された画像：淡いピンクの日本語カレンダー画面


編集


a574164f-fc00-41ec-8ba1-466c5204a865.png
いままでこうやって出してくれてたからたのむ

4d5c3333-da56-4fbb-9d92-063ac64be121.png
６５えらー

b7989feb-59a0-4591-8940-73cb16489aa6.png
６６Aえらー

c74939dc-b451-429e-ac62-bd0f0ad074bf.png

2e694610-4cb7-4ce9-ab93-5f9699310f22.png



ツールが呼び出されました
♢ᴷ ほい、原因確定！😂
POSTとPATCHの中身がほぼ完全コピーなので、いくら下側を広げても複数一致する。 GitHub正本も確認した。

なので今回は、直前に追加したPOST固有の $endDate ブロックまで探す文字列へ含める。これなら1件だけになる。

Writer 67-A 再改訂版
変更ファイル
600_KoppyOS/server/api/v1/calendar-events.php
操作
🟨 部分置換
探す文字列
        if ($endDate < $eventDate) {
            throw new RuntimeException(
                'end_date must not be before event_date.'
            );
        }


        $allDay =
            !empty(
                $body['all_day']
            );


        if ($allDay) {

            $startAt =
                $eventDate
                . ' 00:00';

            $endAt =
                $eventDate
                . ' 23:59';

        } else {
置換後
        if ($endDate < $eventDate) {
            throw new RuntimeException(
                'end_date must not be before event_date.'
            );
        }


        $allDay =
            !empty(
                $body['all_day']
            );


        if ($allDay) {

            $startAt =
                $eventDate
                . ' 00:00';

            $endAt =
                $endDate
                . ' 23:59';

        } else {
ただし、ここ大事。

66-BもすでにPATCHへ同じ $endDate ブロックを追加してるから、これすら2件一致する可能性がある。

なので、もしこれも赤ならWriterで67をやるのはやめよう。
その場合はVS Codeで $endAt = $eventDate → $endAt = $endDate の2か所を直接変更した方が30秒で終わる。Writerとの鬼ごっこになってきたww

まずこれ1回だけGO！ 🔧


6f70630d-6596-4894-a049-3807b6561863.png

♢ᴷ やっぱり2件一致だったww
ここはもうWriterで粘るよりVS Codeで2か所だけ直す方が早い。

対象ファイルはこれ。

600_KoppyOS/server/api/v1/calendar-events.php
VS Codeでこの文字列を検索して、

$endAt =
    $eventDate
    . ' 23:59';
2か所ともこう変更。

$endAt =
    $endDate
    . ' 23:59';
POSTとPATCHに1か所ずつあるはず。

これだけ直したら次は68-A/Bへ進む。そこも同型で2件あるから、もしWriterがまた暴れるようなら、同じくVSで2か所まとめて直す指示に切り替えて進めるね。Writer鬼ごっこ、ここで終了じゃ😂🔧



貼り付けたコード（1）.php
ファイル
全部改修版だしてえ

♢ᴷ うむ！もうWriter鬼ごっこやめて、calendar-events.php を丸ごと完成版に置き換えよう😂
いま貼ってくれた現行ファイルをベースに、終了日 + 複数日予定 + 文字色 + GETで跨ぎ予定取得までまとめて入れた。元ファイルのAPI構造も維持してる。


しかもPHP構文チェック済みで、No syntax errors detected まで確認してある。

変更ファイル
600_KoppyOS/server/api/v1/calendar-events.php
操作
🔵 ファイル全置換
完成版はこちら👇

calendar-events.php 完整改修版

この版で入ってるのは、

end_date をPOST/PATCHで受付

終日予定は end_date 23:59 まで保存

時間あり予定も終了日に対応

時間なしでも複数日なら期間予定として保存

text_color の受取・バリデーション・保存・取得

GETで「前月から今月へ跨いでる予定」も取得

POST/PATCH共通処理を関数化して重複コード削減

text_color をGET/POST/PATCHレスポンスに含める

まで全部入り。

ただし1個だけ重要！
このPHPを反映する前に、DB側に text_color 列が必要。Writer 63/64で migrate-calendar-events.php を改修済みなら、次はそのmigrationを実行してDBへ列追加してからこのAPIを本番反映するのが安全。

これ置換できたら「置換した！」って言ってくれい。次はDB migration実行 → calendar.jsの表示を「文字だけ / 枠 / ━旅行━」の3種類にするところへ進もう🔥📅


calendar-events-revised.php
コード


ライブラリ
/
calendar-events-revised.php


<?php

declare(strict_types=1);

header(
    'Content-Type: application/json; charset=utf-8'
);

require_once __DIR__ . '/../../auth/auth.php';

koppyRequireApiAuth();

require_once __DIR__ . '/lib/database.php';


function calendarEventJsonResponse(
    array $data,
    int $statusCode = 200
): never {
    http_response_code(
        $statusCode
    );

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE |
        JSON_PRETTY_PRINT
    );

    exit;
}


function calendarEventReadJsonBody(): array
{
    $raw =
        file_get_contents(
            'php://input'
        );

    if (
        $raw === false
        ||
        trim($raw) === ''
    ) {
        return [];
    }

    $decoded =
        json_decode(
            $raw,
            true
        );

    if (!is_array($decoded)) {
        throw new RuntimeException(
            'Invalid JSON body.'
        );
    }

    return $decoded;
}


function calendarEventValidateDate(
    string $date
): void {
    $dateObject =
        DateTimeImmutable::createFromFormat(
            '!Y-m-d',
            $date
        );

    if (
        $dateObject === false
        ||
        $dateObject->format(
            'Y-m-d'
        ) !== $date
    ) {
        throw new RuntimeException(
            'Date must use YYYY-MM-DD.'
        );
    }
}


function calendarEventNormalizeTime(
    string $date,
    string $time
): string {
    if (
        !preg_match(
            '/^(\d{1,2}):([0-5]\d)$/',
            $time,
            $matches
        )
    ) {
        throw new RuntimeException(
            "Invalid time: {$time}"
        );
    }

    $hour =
        (int)
        $matches[1];

    $minute =
        (int)
        $matches[2];

    if (
        $hour < 0
        ||
        $hour > 47
    ) {
        throw new RuntimeException(
            "Invalid hour: {$time}"
        );
    }

    $base =
        new DateTimeImmutable(
            $date . ' 00:00:00'
        );

    $dayOffset =
        intdiv(
            $hour,
            24
        );

    $normalizedHour =
        $hour % 24;

    return $base
        ->modify(
            "+{$dayOffset} day"
        )
        ->setTime(
            $normalizedHour,
            $minute
        )
        ->format(
            'Y-m-d H:i'
        );
}


function calendarEventValidateOwnerCode(
    string $ownerCode
): void {
    if (
        !in_array(
            $ownerCode,
            [
                'ui',
                'shii',
                'shared',
            ],
            true
        )
    ) {
        throw new RuntimeException(
            'Invalid owner_code.'
        );
    }
}


function calendarEventNormalizeTextColor(
    mixed $value
): ?string {
    $textColor =
        trim(
            (string)
            ($value ?? '')
        );

    if ($textColor === '') {
        return null;
    }

    if (
        !preg_match(
            '/^#[0-9A-Fa-f]{6}$/',
            $textColor
        )
    ) {
        throw new RuntimeException(
            'Invalid text_color.'
        );
    }

    return strtolower(
        $textColor
    );
}


function calendarEventBuildTimes(
    array $body
): array {
    $eventDate =
        isset($body['event_date'])
            ? trim(
                (string)
                $body['event_date']
            )
            : '';

    calendarEventValidateDate(
        $eventDate
    );

    $endDate =
        isset($body['end_date'])
            ? trim(
                (string)
                $body['end_date']
            )
            : $eventDate;

    if ($endDate === '') {
        $endDate =
            $eventDate;
    }

    calendarEventValidateDate(
        $endDate
    );

    if ($endDate < $eventDate) {
        throw new RuntimeException(
            'end_date must not be before event_date.'
        );
    }

    $allDay =
        !empty(
            $body['all_day']
        );

    if ($allDay) {
        return [
            'event_date' =>
                $eventDate,
            'end_date' =>
                $endDate,
            'all_day' =>
                true,
            'start_at' =>
                $eventDate
                . ' 00:00',
            'end_at' =>
                $endDate
                . ' 23:59',
        ];
    }

    $startTime =
        isset($body['start_time'])
            ? trim(
                (string)
                $body['start_time']
            )
            : '';

    $endTime =
        isset($body['end_time'])
            ? trim(
                (string)
                $body['end_time']
            )
            : '';

    if ($startTime === '') {
        if ($endTime !== '') {
            throw new RuntimeException(
                'start_time is required when end_time is set.'
            );
        }

        $startAt =
            $eventDate
            . ' 00:00';

        $endAt =
            $endDate > $eventDate
                ? $endDate . ' 23:59'
                : null;

        return [
            'event_date' =>
                $eventDate,
            'end_date' =>
                $endDate,
            'all_day' =>
                false,
            'start_at' =>
                $startAt,
            'end_at' =>
                $endAt,
        ];
    }

    $startAt =
        calendarEventNormalizeTime(
            $eventDate,
            $startTime
        );

    if ($endTime !== '') {
        $endAt =
            calendarEventNormalizeTime(
                $endDate,
                $endTime
            );
    } elseif ($endDate > $eventDate) {
        $endAt =
            $endDate
            . ' 23:59';
    } else {
        $endAt =
            null;
    }

    if (
        $endAt !== null
        &&
        $endAt < $startAt
    ) {
        throw new RuntimeException(
            'end time must not be before start time.'
        );
    }

    return [
        'event_date' =>
            $eventDate,
        'end_date' =>
            $endDate,
        'all_day' =>
            false,
        'start_at' =>
            $startAt,
        'end_at' =>
            $endAt,
    ];
}


function calendarEventReadCommonFields(
    array $body
): array {
    $ownerCode =
        isset($body['owner_code'])
            ? trim(
                (string)
                $body['owner_code']
            )
            : '';

    calendarEventValidateOwnerCode(
        $ownerCode
    );

    $title =
        isset($body['title'])
            ? trim(
                (string)
                $body['title']
            )
            : '';

    if ($title === '') {
        throw new RuntimeException(
            'title is required.'
        );
    }

    if (
        mb_strlen(
            $title
        ) > 120
    ) {
        throw new RuntimeException(
            'title is too long.'
        );
    }

    $timeData =
        calendarEventBuildTimes(
            $body
        );

    $category =
        isset($body['category'])
            ? trim(
                (string)
                $body['category']
            )
            : '';

    $memo =
        isset($body['memo'])
            ? trim(
                (string)
                $body['memo']
            )
            : '';

    $textColor =
        calendarEventNormalizeTextColor(
            $body['text_color']
            ?? null
        );

    return [
        'owner_code' =>
            $ownerCode,
        'title' =>
            $title,
        'start_at' =>
            $timeData['start_at'],
        'end_at' =>
            $timeData['end_at'],
        'all_day' =>
            $timeData['all_day']
                ? 1
                : 0,
        'category' =>
            $category !== ''
                ? $category
                : null,
        'memo' =>
            $memo !== ''
                ? $memo
                : null,
        'text_color' =>
            $textColor,
    ];
}


function calendarEventSelectById(
    PDO $pdo,
    int $eventId
): array|false {
    $statement =
        $pdo->prepare(
            "
            SELECT
                id,
                owner_code,
                title,
                start_at,
                end_at,
                all_day,
                category,
                memo,
                text_color,
                source,
                external_id,
                created_at,
                updated_at

            FROM calendar_events

            WHERE id = ?
            "
        );

    $statement->execute([
        $eventId
    ]);

    return $statement->fetch();
}


$pdo = null;


try {
    $method =
        strtoupper(
            $_SERVER['REQUEST_METHOD']
            ?? 'GET'
        );

    $pdo =
        koppyDatabase();


    /* =====================================================
       GET
       予定一覧
    ===================================================== */

    if ($method === 'GET') {
        $dateFrom =
            isset($_GET['date_from'])
                ? trim(
                    (string)
                    $_GET['date_from']
                )
                : '';

        $dateTo =
            isset($_GET['date_to'])
                ? trim(
                    (string)
                    $_GET['date_to']
                )
                : '';

        $ownerCode =
            isset($_GET['owner_code'])
                ? trim(
                    (string)
                    $_GET['owner_code']
                )
                : '';

        $conditions = [];
        $parameters = [];

        if ($dateFrom !== '') {
            calendarEventValidateDate(
                $dateFrom
            );

            /*
             * 開始日が検索範囲より前でも、
             * 終了日が範囲内なら複数日予定として取得する。
             */
            $conditions[] =
                'COALESCE(end_at, start_at) >= ?';

            $parameters[] =
                $dateFrom
                . ' 00:00';
        }

        if ($dateTo !== '') {
            calendarEventValidateDate(
                $dateTo
            );

            $dateToExclusive =
                (
                    new DateTimeImmutable(
                        $dateTo
                    )
                )
                ->modify(
                    '+1 day'
                )
                ->format(
                    'Y-m-d'
                );

            $conditions[] =
                'start_at < ?';

            $parameters[] =
                $dateToExclusive
                . ' 00:00';
        }

        if ($ownerCode !== '') {
            calendarEventValidateOwnerCode(
                $ownerCode
            );

            $conditions[] =
                'owner_code = ?';

            $parameters[] =
                $ownerCode;
        }

        $whereSql =
            $conditions === []
                ? ''
                : 'WHERE '
                    . implode(
                        ' AND ',
                        $conditions
                    );

        $statement =
            $pdo->prepare(
                "
                SELECT
                    id,
                    owner_code,
                    title,
                    start_at,
                    end_at,
                    all_day,
                    category,
                    memo,
                    text_color,
                    source,
                    external_id,
                    created_at,
                    updated_at

                FROM calendar_events

                {$whereSql}

                ORDER BY
                    start_at ASC,
                    id ASC
                "
            );

        $statement->execute(
            $parameters
        );

        calendarEventJsonResponse(
            [
                'success' =>
                    true,
                'events' =>
                    $statement
                        ->fetchAll(),
                'error' =>
                    null,
            ]
        );
    }


    /* =====================================================
       POST
       予定登録
    ===================================================== */

    if ($method === 'POST') {
        $body =
            calendarEventReadJsonBody();

        $fields =
            calendarEventReadCommonFields(
                $body
            );

        $statement =
            $pdo->prepare(
                "
                INSERT INTO calendar_events
                (
                    owner_code,
                    title,
                    start_at,
                    end_at,
                    all_day,
                    category,
                    memo,
                    text_color,
                    source
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
                    'manual'
                )
                "
            );

        $statement->execute([
            $fields['owner_code'],
            $fields['title'],
            $fields['start_at'],
            $fields['end_at'],
            $fields['all_day'],
            $fields['category'],
            $fields['memo'],
            $fields['text_color'],
        ]);

        $eventId =
            (int)
            $pdo->lastInsertId();

        $event =
            calendarEventSelectById(
                $pdo,
                $eventId
            );

        calendarEventJsonResponse(
            [
                'success' =>
                    true,
                'event' =>
                    $event,
                'error' =>
                    null,
            ],
            201
        );
    }


    /* =====================================================
       PATCH
       予定編集
    ===================================================== */

    if ($method === 'PATCH') {
        $body =
            calendarEventReadJsonBody();

        $eventId =
            isset($body['id'])
                ? (int)
                    $body['id']
                : 0;

        if ($eventId <= 0) {
            throw new RuntimeException(
                'id is required.'
            );
        }

        $existsStatement =
            $pdo->prepare(
                "
                SELECT COUNT(*)
                FROM calendar_events
                WHERE id = ?
                "
            );

        $existsStatement->execute([
            $eventId
        ]);

        if (
            (int)
            $existsStatement->fetchColumn()
            === 0
        ) {
            throw new RuntimeException(
                'Calendar event not found.'
            );
        }

        $fields =
            calendarEventReadCommonFields(
                $body
            );

        $statement =
            $pdo->prepare(
                "
                UPDATE calendar_events

                SET
                    owner_code = ?,
                    title = ?,
                    start_at = ?,
                    end_at = ?,
                    all_day = ?,
                    category = ?,
                    memo = ?,
                    text_color = ?,
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = ?
                "
            );

        $statement->execute([
            $fields['owner_code'],
            $fields['title'],
            $fields['start_at'],
            $fields['end_at'],
            $fields['all_day'],
            $fields['category'],
            $fields['memo'],
            $fields['text_color'],
            $eventId,
        ]);

        $event =
            calendarEventSelectById(
                $pdo,
                $eventId
            );

        calendarEventJsonResponse(
            [
                'success' =>
                    true,
                'event' =>
                    $event,
                'error' =>
                    null,
            ]
        );
    }


    /* =====================================================
       DELETE
       予定削除
    ===================================================== */

    if ($method === 'DELETE') {
        $body =
            calendarEventReadJsonBody();

        $eventId =
            isset($body['id'])
                ? (int)
                    $body['id']
                : 0;

        if ($eventId <= 0) {
            throw new RuntimeException(
                'id is required.'
            );
        }

        $statement =
            $pdo->prepare(
                "
                DELETE FROM calendar_events
                WHERE id = ?
                "
            );

        $statement->execute([
            $eventId
        ]);

        if (
            $statement->rowCount()
            === 0
        ) {
            throw new RuntimeException(
                'Calendar event not found.'
            );
        }

        calendarEventJsonResponse(
            [
                'success' =>
                    true,
                'deleted_id' =>
                    $eventId,
                'error' =>
                    null,
            ]
        );
    }


    calendarEventJsonResponse(
        [
            'success' => false,
            'error' =>
                'Method not allowed.',
        ],
        405
    );


} catch (Throwable $e) {
    calendarEventJsonResponse(
        [
            'success' => false,
            'error' =>
                $e->getMessage(),
        ],
        400
    );
}
