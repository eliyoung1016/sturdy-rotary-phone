CREATE TABLE master_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,                 -- 'CUTOFF' or 'PROCESS'
    duration INTEGER NOT NULL,
    color TEXT DEFAULT 'primary',
    is_cash_confirmed BOOLEAN DEFAULT 0,
    requires_working_hours BOOLEAN DEFAULT 0,
    short_name TEXT,
    corresponding_task_id INTEGER UNIQUE,
    FOREIGN KEY (corresponding_task_id) REFERENCES master_tasks(id)
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
    requires_working_hours BOOLEAN DEFAULT 0,
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
INSERT INTO master_tasks (name, type, duration, color, is_cash_confirmed, requires_working_hours) VALUES
('Order Validation', 'PROCESS', 180, 'spot-blue-1', 0, 1),
('Aggregation of Orders', 'PROCESS', 120, 'spot-blue-1', 0, 1),
('Portfolio Valuation', 'PROCESS', 210, 'spot-mauve-1', 0, 0),
('NAV Generation', 'PROCESS', 120, 'spot-mauve-1', 0, 0),
('Cash Forecasting / Reporting', 'PROCESS', 60, 'spot-green-1', 0, 1),
('Reinvestment Execution', 'PROCESS', 300, 'spot-orange-1', 0, 1),
('Trade Matching/Affirmation', 'PROCESS', 180, 'spot-tuquoise-1', 0, 1),
('Forex (FX) Execution', 'PROCESS', 60, 'spot-orange-1', 0, 1),
('Cash Settlement (Incoming)', 'PROCESS', 180, 'spot-green-1', 0, 0),
('Redemption Payments (Outgoing)', 'PROCESS', 180, 'spot-blue-2', 0, 0),
('Final Reconciliation', 'PROCESS', 180, 'spot-mauve-2', 1, 1);

INSERT INTO templates (name, description) VALUES ('Standard T+2 settlement cycle', 'Standard European T+2 settlement cycle');

INSERT INTO template_tasks (id, template_id, task_id, name, duration, sequence_order, day_offset, type, color, is_cash_confirmed, start_time, depends_on_id, dependency_type, dependency_delay, requires_working_hours) VALUES
(1, 1, 1,  'Order Validation',               240, 1,  0, 'PROCESS', 'spot-blue-1',   0, '09:00', NULL, 'IMMEDIATE', 0, 1),
(2, 1, 2,  'Aggregation of Orders',          120, 2,  0, 'PROCESS', 'spot-blue-1',   0, '13:00', 1,    'IMMEDIATE', 0, 1),
(3, 1, 3,  'Portfolio Valuation',            210, 3,  0, 'PROCESS', 'spot-mauve-1', 0, '17:30', 2,    'TIME_LAG', 150, 0),
(4, 1, 4,  'NAV Generation',                 120, 4,  0, 'PROCESS', 'spot-mauve-1', 0, '21:00', 3,    'IMMEDIATE', 0, 0),
(5, 1, 5,  'Cash Forecasting / Reporting',    60, 5,  1, 'PROCESS', 'spot-green-1',  0, '08:30', 4,    'TIME_LAG', 570, 1),
(6, 1, 6,  'Reinvestment Execution',         300, 6,  1, 'PROCESS', 'spot-orange-1', 0, '10:00', 5,    'TIME_LAG', 30, 1),
(7, 1, 7,  'Trade Matching/Affirmation',     180, 7,  1, 'PROCESS', 'spot-tuquoise-1', 0, '15:00', 6,    'IMMEDIATE', 0, 1),
(8, 1, 8,  'Forex (FX) Execution',            60, 8,  1, 'PROCESS', 'spot-orange-1', 0, '16:00', 6,    'TIME_LAG', 60, 1),
(9, 1, 9,  'Cash Settlement (Incoming)',     180, 9,  2, 'PROCESS', 'spot-green-1',  0, '08:00', 7,    'TIME_LAG', 840, 0),
(10, 1, 10, 'Redemption Payments (Outgoing)', 180, 10, 2, 'PROCESS', 'spot-blue-2',    0, '11:00', 9,    'IMMEDIATE', 0, 0),
(11, 1, 11, 'Final Reconciliation',           180, 11, 2, 'PROCESS', 'spot-mauve-2', 1, '15:00', 10,   'TIME_LAG', 60, 1);

INSERT INTO master_tasks (name, type, duration, color, is_cash_confirmed, requires_working_hours) VALUES
('NAV Calculation', 'PROCESS', 180, 'spot-mauve-1', 0, 0),
('Trade Allocation & Affirmation', 'PROCESS', 180, 'spot-tuquoise-1', 0, 1),
('Final Cash Confirmation', 'PROCESS', 60, 'spot-green-1', 1, 1);

INSERT INTO templates (name, description) VALUES ('T+1 Settlement Cycle', 'Accelerated settlement cycle where trade matching and affirmation happen on T, and settlement/reinvestment on T+1.');

INSERT INTO template_tasks (id, template_id, task_id, name, duration, sequence_order, day_offset, type, color, is_cash_confirmed, start_time, depends_on_id, dependency_type, dependency_delay, requires_working_hours) VALUES
(12, 2, 1,  'Order Validation',               240, 1,  0, 'PROCESS', 'spot-blue-1',   0, '09:00', NULL, 'IMMEDIATE', 0, 1),
(13, 2, 2,  'Aggregation of Orders',          90,  2,  0, 'PROCESS', 'spot-blue-1',   0, '13:00', 12,   'IMMEDIATE', 0, 1),
(14, 2, 12, 'NAV Calculation',                180, 3,  0, 'PROCESS', 'spot-mauve-1',  0, '17:30', 13,   'TIME_LAG', 180, 0),
(15, 2, 13, 'Trade Allocation & Affirmation', 180, 4,  0, 'PROCESS', 'spot-tuquoise-1', 0, '18:00', 13,   'TIME_LAG', 210, 1),
(16, 2, 14, 'Final Cash Confirmation',        60,  5,  1, 'PROCESS', 'spot-green-1',  1, '07:00', 15,   'TIME_LAG', 600, 1),
(17, 2, 6,  'Reinvestment Execution',         120, 6,  1, 'PROCESS', 'spot-orange-1', 0, '08:00', 16,   'IMMEDIATE', 0, 1),
(18, 2, 9,  'Cash Settlement (Incoming)',     120, 7,  1, 'PROCESS', 'spot-green-1',  0, '09:00', 16,   'TIME_LAG', 60, 0),
(19, 2, 8,  'Forex (FX) Execution',           120, 8,  1, 'PROCESS', 'spot-orange-1', 0, '09:00', 16,   'TIME_LAG', 60, 1);

INSERT INTO fund_profiles (name, current_template_id, target_template_id) VALUES
('Global Equity Fund A', 1, 2);
