The schema below is designed to handle the parent-child dependencies and the "subset" logic where a Target Practice can be a specific selection of tasks from a wider Current Practice.

### 1. `templates`

This table stores the reusable "Standard Operating Procedures" (e.g., "Standard UCITS Fund").

| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID / INTEGER | Primary Key. |
| `name` | TEXT | e.g., "Standard UCITS Fund". |
| `description` | TEXT | General context for the FA. |
| `created_at` | DATETIME | Timestamp. |

---

### 2. `master_tasks`

The central registry for all tasks. If an FA adds an ad-hoc task during a presentation, it gets saved here for future reuse.

| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID / INTEGER | Primary Key. |
| `template_id` | INTEGER | Foreign Key to `templates`. |
| `name` | TEXT | e.g., "NAV Strike" or "Netting". |
| `type` | TEXT | 'CUTOFF' or 'PROCESS'. |
| `default_duration` | INTEGER | Duration in minutes for "Manual" vs. "Automated" scenarios. |
| `is_target_eligible` | BOOLEAN | If this task is part of the "Target" (T+1) subset. |

---

### 3. `task_dependencies`

This table defines the logic that drives your Gantt "Push" engine. It ensures that a task cannot start before its parents are finished.

| Column | Type | Description |
| --- | --- | --- |
| `id` | INTEGER | Primary Key. |
| `task_id` | INTEGER | The child task (e.g., Netting). |
| `depends_on_id` | INTEGER | The parent (e.g., Subscription Cut-off). |

---

### 4. `fund_profiles`

Stores the specific fund meta-data for a client presentation.

| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID / INTEGER | Primary Key. |
| `name` | TEXT | e.g., "Global Equity Fund A". |
| `isin` | TEXT | International Securities Identification Number. |
| `office_start` | TEXT | e.g., "09:00". |
| `office_end` | TEXT | e.g., "18:00". |
| `timezone` | TEXT | e.g., "CET" or "SGT". |

---

### 5. `simulations`

This table saves the final output of your "Stress-Test" simulator, allowing you to generate the "See Differences" report.

| Column | Type | Description |
| --- | --- | --- |
| `id` | UUID / INTEGER | Primary Key. |
| `fund_id` | INTEGER | Foreign Key to `fund_profiles`. |
| `practice_type` | TEXT | 'CURRENT' or 'TARGET'. |
| `workflow_data` | JSON | The final state of the Gantt chart (task positions, cut-off times). |
| `idle_time_total` | INTEGER | Calculated sum of "Grey Ghost Blocks" in minutes. |
| `netting_confirmed_at` | TEXT | The exact time Netting was struck for ROI calculation. |

---

### Technical Implementation Tip

Since you are using **Next.js**, you can use the `workflow_data` column to store a JSON string of your React state. This makes it incredibly easy to "re-hydrate" the Gantt chart exactly as you left it when moving between the **Simulator** and the **Comparison Page**.

**Would you like me to write the SQL initialization script for these tables so you can drop it into your SQLite database?**