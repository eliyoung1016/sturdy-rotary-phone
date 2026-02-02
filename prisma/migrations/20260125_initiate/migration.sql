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
    start_time TEXT,
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

-- Seed Data
INSERT INTO master_tasks (name, type, duration, color, is_cash_confirmed) VALUES
('Order Validation & KYC', 'PROCESS', 240, 'spot-blue-1', 0),
('Aggregation of Orders', 'PROCESS', 120, 'spot-blue-1', 0),
('Portfolio Valuation', 'PROCESS', 210, 'spot-mauve-1', 0),
('NAV Generation', 'PROCESS', 120, 'spot-mauve-1', 0),
('Cash Forecasting / Reporting', 'PROCESS', 60, 'spot-green-1', 1),
('Reinvestment Execution', 'PROCESS', 300, 'spot-orange-1', 0),
('Trade Matching/Affirmation', 'PROCESS', 180, 'spot-tuquoise-1', 0),
('Forex (FX) Execution', 'PROCESS', 60, 'spot-orange-1', 0),
('Cash Settlement (Incoming)', 'PROCESS', 180, 'spot-green-1', 0),
('Redemption Payments (Outgoing)', 'PROCESS', 180, 'spot-blue-2', 0),
('Final Reconciliation', 'PROCESS', 180, 'spot-mauve-2', 0);

INSERT INTO templates (name, description) VALUES ('Standard European UCITS T+2', 'Standard T+2 settlement cycle');

INSERT INTO template_tasks (template_id, task_id, name, duration, sequence_order, day_offset, type, color, is_cash_confirmed, start_time) VALUES
(1, 1,  'Order Validation & KYC',         240, 1,  0, 'PROCESS', 'spot-blue-1',   0, '09:00'),
(1, 2,  'Aggregation of Orders',          120, 2,  0, 'PROCESS', 'spot-blue-1',   0, '13:00'),
(1, 3,  'Portfolio Valuation',            210, 3,  0, 'PROCESS', 'spot-mauve-1', 0, '17:30'),
(1, 4,  'NAV Generation',                 120, 4,  0, 'PROCESS', 'spot-mauve-1', 0, '21:00'),
(1, 5,  'Cash Forecasting / Reporting',    60, 5,  1, 'PROCESS', 'spot-green-1',  1, '08:30'),
(1, 6,  'Reinvestment Execution',         300, 6,  1, 'PROCESS', 'spot-orange-1', 0, '10:00'),
(1, 7,  'Trade Matching/Affirmation',     180, 7,  1, 'PROCESS', 'spot-tuquoise-1', 0, '15:00'),
(1, 8,  'Forex (FX) Execution',            60, 8,  1, 'PROCESS', 'spot-orange-1', 0, '16:00'),
(1, 9,  'Cash Settlement (Incoming)',     180, 9,  2, 'PROCESS', 'spot-green-1',  0, '08:00'),
(1, 10, 'Redemption Payments (Outgoing)', 180, 10, 2, 'PROCESS', 'spot-blue-2',    0, '11:00'),
(1, 11, 'Final Reconciliation',           180, 11, 2, 'PROCESS', 'spot-mauve-2',   0, '15:00');
