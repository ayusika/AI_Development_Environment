CREATE TABLE visit_identity_features (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    visit_id INTEGER NOT NULL,

    feature_type TEXT NOT NULL CHECK (
        feature_type IN (
            'age_range',
            'height',
            'body_type',
            'hair',
            'facial_hair',
            'glasses',
            'appearance',
            'lookalike',
            'occupation',
            'voice_speech',
            'area',
            'hobby_topic',
            'other'
        )
    ),

    feature_value TEXT NOT NULL
        CHECK (
            trim(feature_value) <> ''
        ),

    note TEXT,

    created_at TEXT NOT NULL DEFAULT (
        strftime(
            '%Y-%m-%d %H:%M',
            'now',
            'localtime'
        )
    ),

    updated_at TEXT NOT NULL DEFAULT (
        strftime(
            '%Y-%m-%d %H:%M',
            'now',
            'localtime'
        )
    ),

    FOREIGN KEY (visit_id)
        REFERENCES visits(id)
        ON DELETE CASCADE
);