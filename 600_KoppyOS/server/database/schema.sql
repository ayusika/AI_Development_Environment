PRAGMA foreign_keys = ON;


/* =========================================================
   Kohaku Work DB Lite
   SQLite schema v1

   日時形式:
   YYYY-MM-DD HH:MM
   例: 2026-08-14 15:00

   秒は保存しない。
========================================================= */


/* =========================================================
   1. STORES
   対応店舗
========================================================= */

CREATE TABLE IF NOT EXISTS stores (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL UNIQUE,

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    )

);


/* =========================================================
   2. CUSTOMERS
   顧客本体

   名前はcustomer_namesで管理する。
   customers自体は「同一人物」を表すIDの箱。
========================================================= */

CREATE TABLE IF NOT EXISTS customers (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    note TEXT,

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    )

);


/* =========================================================
   3. CUSTOMER_NAMES
   顧客が持つ複数の名前

   name_type例:
   line
   x
   instagram
   store
   other
========================================================= */

CREATE TABLE IF NOT EXISTS customer_names (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    name_type TEXT NOT NULL CHECK (
        name_type IN (
            'line',
            'x',
            'instagram',
            'store',
            'other'
        )
    ),

    name TEXT NOT NULL,

    store_id INTEGER,

    is_primary INTEGER NOT NULL DEFAULT 0 CHECK (
        is_primary IN (0, 1)
    ),

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE CASCADE,

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE SET NULL

);


/* =========================================================
   4. VISITS
   接客情報

   ダミー日記用の架空接客もここへ入れられる。
   ダミーの場合 customer_id は NULL。
========================================================= */

CREATE TABLE IF NOT EXISTS visits (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER,

    store_id INTEGER NOT NULL,

    started_at TEXT NOT NULL,

    course_minutes INTEGER NOT NULL CHECK (
        course_minutes IN (
            60,
            75,
            90,
            120,
            150,
            180
        )
    ),

    customer_type TEXT NOT NULL CHECK (
        customer_type IN (
            'new',
            'repeat'
        )
    ),

    options TEXT NOT NULL DEFAULT '[]',

    is_dummy INTEGER NOT NULL DEFAULT 0 CHECK (
        is_dummy IN (0, 1)
    ),

    note TEXT,

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE SET NULL,

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE RESTRICT

);


/* =========================================================
   5. DIARIES
   写メ日記本体
========================================================= */

CREATE TABLE IF NOT EXISTS diaries (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    store_id INTEGER NOT NULL,

    posted_at TEXT,

    platform TEXT NOT NULL CHECK (
        platform IN (
            'nukinavi',
            'heaven',
            'other'
        )
    ),

    diary_type TEXT NOT NULL,

    title TEXT,

    body TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE RESTRICT

);


/* =========================================================
   6. DIARY_VISITS
   日記と接客をつなぐ中間テーブル

   1つの日記に複数接客を入れられる。
   同じ接客から複数媒体の日記も作れる。

   sort_order:
   日記内の並び順。
   10,20,30... と振ることで、
   後から15などを間に入れやすくする。
========================================================= */

CREATE TABLE IF NOT EXISTS diary_visits (

    diary_id INTEGER NOT NULL,

    visit_id INTEGER NOT NULL,

    sort_order INTEGER NOT NULL DEFAULT 10,

    PRIMARY KEY (
        diary_id,
        visit_id
    ),

    FOREIGN KEY (diary_id)
        REFERENCES diaries(id)
        ON DELETE CASCADE,

    FOREIGN KEY (visit_id)
        REFERENCES visits(id)
        ON DELETE CASCADE

);


/* =========================================================
   INDEXES
   後から検索が重くならないための最低限INDEX
========================================================= */

CREATE INDEX IF NOT EXISTS idx_customer_names_customer_id
ON customer_names(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_names_name
ON customer_names(name);

CREATE INDEX IF NOT EXISTS idx_visits_customer_id
ON visits(customer_id);

CREATE INDEX IF NOT EXISTS idx_visits_store_id
ON visits(store_id);

CREATE INDEX IF NOT EXISTS idx_visits_started_at
ON visits(started_at);

CREATE INDEX IF NOT EXISTS idx_diaries_store_id
ON diaries(store_id);

CREATE INDEX IF NOT EXISTS idx_diaries_posted_at
ON diaries(posted_at);

CREATE INDEX IF NOT EXISTS idx_diary_visits_visit_id
ON diary_visits(visit_id);


/* =========================================================
   INITIAL STORES
========================================================= */

INSERT OR IGNORE INTO stores (name)
VALUES
    ('千葉'),
    ('札幌'),
    ('東京'),
    ('名古屋');