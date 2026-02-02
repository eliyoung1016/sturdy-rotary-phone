CREATE TABLE master_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,                 -- 'CUTOFF' or 'PROCESS'
    duration INTEGER NOT NULL,
    color TEXT DEFAULT 'primary',
    is_cash_confirmed BOOLEAN DEFAULT 0
);

CREATE TABLE templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE template_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    task_id INTEGER,                   -- Optional for adhoc
    name TEXT NOT NULL,                -- Copied from Master or Adhoc name
    duration INTEGER NOT NULL,
    sequence_order INTEGER NOT NULL,
    day_offset INTEGER DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'PROCESS', -- 'CUTOFF' or 'PROCESS'
    color TEXT DEFAULT 'primary',
    is_cash_confirmed BOOLEAN DEFAULT 0,
    depends_on_id INTEGER,             -- Self-reference for dependency
    dependency_type TEXT DEFAULT 'IMMEDIATE', -- IMMEDIATE, TIME_LAG, NO_RELATION
    dependency_delay INTEGER DEFAULT 0,
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (task_id) REFERENCES master_tasks(id),
    FOREIGN KEY (depends_on_id) REFERENCES template_tasks(id)
);

CREATE TABLE fund_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    isin TEXT,
    office_start TEXT DEFAULT '09:00',
    office_end TEXT DEFAULT '18:00',
    timezone TEXT DEFAULT 'CET',
    current_template_id INTEGER, -- Points to the T+2/3 Template
    target_template_id INTEGER   -- Points to the T+1 Template
);

CREATE TABLE simulations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fund_id INTEGER NOT NULL,
    simulation_name TEXT,        -- e.g., "Q1 Stress Test"
    current_state_json TEXT,     -- Full JSON dump of the edited T+2 Gantt
    target_state_json TEXT,      -- Full JSON dump of the edited T+1 Gantt
    reinvestment_gain_hours REAL,
    idle_time_saved_minutes INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fund_id) REFERENCES fund_profiles(id)
);