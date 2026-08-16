PRAGMA foreign_keys = ON;


/* =========================================================
   Kohaku Work Database
   Production Beta Schema v1.0

   日時:
   YYYY-MM-DD HH:MM

   方針:
   - visits を仕事データの中心にする
   - 不明値は NULL
   - 集計可能な結果は重複保存しない
   - 金額は円単位の INTEGER
========================================================= */


/* =========================================================
   1. STORES
========================================================= */

CREATE TABLE stores (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL UNIQUE,

    active INTEGER NOT NULL DEFAULT 1
        CHECK (active IN (0, 1)),

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    )
);


/* =========================================================
   2. WORK_SHIFTS
========================================================= */

CREATE TABLE work_shifts (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    store_id INTEGER NOT NULL,

    start_at TEXT NOT NULL,

    end_at TEXT NOT NULL,

    note TEXT,

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE RESTRICT
);


/* =========================================================
   3. CUSTOMERS
========================================================= */

CREATE TABLE customers (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_code TEXT NOT NULL UNIQUE,

    general_notes TEXT,

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    )
);


/* =========================================================
   4. CUSTOMER_NAMES
========================================================= */

CREATE TABLE customer_names (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    customer_id INTEGER NOT NULL,

    name_type TEXT NOT NULL CHECK (
        name_type IN (
            'nickname',
            'okini_talk',
            'line',
            'x',
            'instagram',
            'store',
            'other'
        )
    ),

    name TEXT NOT NULL,

    store_id INTEGER,

    is_primary INTEGER NOT NULL DEFAULT 0
        CHECK (is_primary IN (0, 1)),

    note TEXT,

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    updated_at TEXT NOT NULL DEFAULT (
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
   5. VISITS
   Kohaku Work の中心
========================================================= */

CREATE TABLE visits (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    source_id TEXT UNIQUE,

    store_id INTEGER NOT NULL,

    customer_id INTEGER,

    started_at TEXT NOT NULL,

    booked_at TEXT,

    course_minutes INTEGER CHECK (
        course_minutes IS NULL
        OR course_minutes > 0
    ),

    customer_status TEXT CHECK (
        customer_status IS NULL
        OR customer_status IN (
            'new',
            'repeat',
            'other_store_repeat',
            'repeat_unknown_id'
        )
    ),

    customer_features TEXT,

    conversation_notes TEXT,

    visit_notes TEXT,

    is_dummy INTEGER NOT NULL DEFAULT 0
        CHECK (is_dummy IN (0, 1)),

    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (
            status IN (
                'scheduled',
                'completed',
                'cancelled',
                'no_show'
            )
        ),

    cancelled_at TEXT,

    cancel_reason TEXT,

    cancelled_by TEXT CHECK (
        cancelled_by IS NULL
        OR cancelled_by IN (
            'customer',
            'self',
            'store',
            'other'
        )
    ),

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE RESTRICT,

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE SET NULL
);


/* =========================================================
   5A. VISIT_CHANGE_HISTORY
   顧客から申し出があった予約変更のみ保存
========================================================= */

CREATE TABLE visit_change_history (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    visit_id INTEGER NOT NULL,

    requested_at TEXT NOT NULL,

    change_type TEXT NOT NULL DEFAULT 'other'
        CHECK (
            change_type IN (
                'datetime',
                'course',
                'store',
                'option',
                'status',
                'multiple',
                'other'
            )
        ),

    before_data TEXT NOT NULL,

    after_data TEXT NOT NULL,

    note TEXT,

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    FOREIGN KEY (visit_id)
        REFERENCES visits(id)
        ON DELETE CASCADE
);


/* =========================================================
   6. OPTIONS
========================================================= */

CREATE TABLE options (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL UNIQUE,

    active INTEGER NOT NULL DEFAULT 1
        CHECK (active IN (0, 1)),

    sort_order INTEGER NOT NULL DEFAULT 10,

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    )
);


/* =========================================================
   7. VISIT_OPTIONS
========================================================= */

CREATE TABLE visit_options (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    visit_id INTEGER NOT NULL,

    option_id INTEGER,

    custom_name TEXT,

    income_amount INTEGER,

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    CHECK (
        option_id IS NOT NULL
        OR (
            custom_name IS NOT NULL
            AND trim(custom_name) <> ''
        )
    ),

    FOREIGN KEY (visit_id)
        REFERENCES visits(id)
        ON DELETE CASCADE,

    FOREIGN KEY (option_id)
        REFERENCES options(id)
        ON DELETE SET NULL
);


/* =========================================================
   8. VISIT_DIARY_NOTES
   顧客単位の日記素材
========================================================= */

CREATE TABLE visit_diary_notes (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    visit_id INTEGER NOT NULL UNIQUE,

    body TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    FOREIGN KEY (visit_id)
        REFERENCES visits(id)
        ON DELETE CASCADE
);


/* =========================================================
   9. DIARIES
   実際の投稿単位
========================================================= */

CREATE TABLE diaries (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    source_id TEXT UNIQUE,

    store_id INTEGER NOT NULL,

    platform TEXT NOT NULL,

    diary_type TEXT NOT NULL,

    title TEXT,

    body TEXT NOT NULL DEFAULT '',

    scheduled_at TEXT,

    posted_at TEXT,

    is_dummy INTEGER NOT NULL DEFAULT 0
        CHECK (is_dummy IN (0, 1)),

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (
            status IN (
                'draft',
                'scheduled',
                'posted',
                'cancelled'
            )
        ),

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE RESTRICT
);


/* =========================================================
   10. DIARY_VISITS
========================================================= */

CREATE TABLE diary_visits (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    diary_id INTEGER NOT NULL,

    visit_id INTEGER NOT NULL,

    sort_order INTEGER NOT NULL DEFAULT 10,

    UNIQUE (
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
   11. VISIT_SALES
   接客ごとの確定実績
========================================================= */

CREATE TABLE visit_sales (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    visit_id INTEGER NOT NULL UNIQUE,

    base_price INTEGER,

    base_income INTEGER,

    option_income INTEGER,

    tip_income INTEGER,

    adjustment_income INTEGER,

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    FOREIGN KEY (visit_id)
        REFERENCES visits(id)
        ON DELETE CASCADE
);


/* =========================================================
   12. STORE_COURSE_RATES
   店舗別コース料金マスタ
========================================================= */

CREATE TABLE store_course_rates (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    store_id INTEGER NOT NULL,

    course_minutes INTEGER NOT NULL CHECK (
        course_minutes > 0
    ),

    base_price INTEGER NOT NULL,

    base_income INTEGER NOT NULL,

    effective_from TEXT NOT NULL,

    effective_to TEXT,

    active INTEGER NOT NULL DEFAULT 1
        CHECK (active IN (0, 1)),

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    UNIQUE (
        store_id,
        course_minutes,
        effective_from
    ),

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE CASCADE
);


/* =========================================================
   13. STORE_OPTION_RATES
   店舗別OP料金マスタ
========================================================= */

CREATE TABLE store_option_rates (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    store_id INTEGER NOT NULL,

    option_id INTEGER NOT NULL,

    income_amount INTEGER NOT NULL,

    effective_from TEXT NOT NULL,

    effective_to TEXT,

    active INTEGER NOT NULL DEFAULT 1
        CHECK (active IN (0, 1)),

    created_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    updated_at TEXT NOT NULL DEFAULT (
        strftime('%Y-%m-%d %H:%M', 'now', 'localtime')
    ),

    UNIQUE (
        store_id,
        option_id,
        effective_from
    ),

    FOREIGN KEY (store_id)
        REFERENCES stores(id)
        ON DELETE CASCADE,

    FOREIGN KEY (option_id)
        REFERENCES options(id)
        ON DELETE CASCADE
);


/* =========================================================
   INDEXES
========================================================= */

CREATE INDEX idx_work_shifts_store_start
ON work_shifts(store_id, start_at);

CREATE INDEX idx_customer_names_customer
ON customer_names(customer_id);

CREATE INDEX idx_customer_names_name
ON customer_names(name);

CREATE INDEX idx_visits_store_started
ON visits(store_id, started_at);

CREATE INDEX idx_visits_customer
ON visits(customer_id);

CREATE INDEX idx_visits_status
ON visits(status);

CREATE INDEX idx_visit_options_visit
ON visit_options(visit_id);

CREATE INDEX idx_diaries_store
ON diaries(store_id);

CREATE INDEX idx_diaries_scheduled
ON diaries(scheduled_at);

CREATE INDEX idx_diaries_posted
ON diaries(posted_at);

CREATE INDEX idx_diary_visits_diary
ON diary_visits(diary_id);

CREATE INDEX idx_diary_visits_visit
ON diary_visits(visit_id);

CREATE INDEX idx_store_course_rates_lookup
ON store_course_rates(
    store_id,
    course_minutes,
    effective_from
);

CREATE INDEX idx_store_option_rates_lookup
ON store_option_rates(
    store_id,
    option_id,
    effective_from
);


/* =========================================================
   INITIAL STORES
========================================================= */

INSERT INTO stores (name)
VALUES
    ('札幌'),
    ('千葉'),
    ('東京'),
    ('名古屋');


/* =========================================================
   INITIAL OPTIONS
========================================================= */

INSERT INTO options (
    name,
    sort_order
)
VALUES
    ('聖水', 10),
    ('射精', 20),
    ('逆AF', 30),
    ('コスプレ', 40),
    ('ハイヒール', 50),
    ('前立腺マッサージ', 60),
    ('咀嚼', 70),
    ('ごっくん', 80),
    ('動画撮影', 90),
    ('パンツお持ち帰り', 100),
    ('パンスト', 110);