# 1. Global Configuration Page (The Template Engine)
This page defines the "Standard Operating Procedures" (SOPs) that apply to most funds.

- Master Process Registry: A library of standard tasks (e.g., NAV Strike, Custodian Cash Matching, FX Hedging).
- Dependency Mapping: Define default parent-child relationships (e.g., Netting cannot start until Subscription Cut-off is reached).
- The processes or cut-offs can be of two types/practices (current vs. target), where certain processes/cut-offs are only applicable to certain practices. (e.g. A fund can have both a current and target practice, and the target practice can be a subset of the current practice)
- Time Standards: Set default durations for each task under "Manual" vs. "Automated" scenarios.
- Reusability: Add a templating system (e.g., "Standard UCITS Fund") so the FA doesn't have to start from scratch for every client meeting.
- For sample data: maybe just add a few sample tasks and dependencies to get started. It can be cut-off 1, cut-off 2, process 1, process 2, etc. and each task can have a preset duration.
- To set up a template, the user needs to add processes, durations of each process, cut-offs, and dependencies.
- The user can also setup target template.

# 2. Fund Profile & Meta-Data Page
This is the "Setup" screen for a specific client presentation.

- Fund Identity: Input Name, ISIN, Currency, and Region.
- Operating Hours: Define the "In-Office" window (e.g., 09:00 - 18:00) and the specific Time Zone (CET, SGT, etc.).
- Baseline Selection: Choose a pre-configured "Current Practice" template from Page 1 to serve as the static comparison anchor, or create a new one ad-hoc by selecting the tasks and dependencies manually. The FA should be able to add a new task, set its duration, and set its dependencies manually. (and it will be saved in the master task list for future use)
- The user can also select a target template from Page 1 to serve as the target comparison anchor.

# 3. The Interactive Simulator
This is the core of the POC. It requires a heavy frontend state (e.g., Zustand or Redux, or just use React Context for POC) to handle the complex "Push" logic.

## The Gantt Component (showing current practice at start)
- Vertical Cut-off Lines: Draggable SVG lines. Moving a line updates the startTime of all children in the state tree.
- Process Bars: Horizontal blocks.
  - Position Logic: x = max(ParentEnd, CutoffTime).
  - Office Hour Guardrail: If a task's end_time > "In-Office" window, the system automatically inserts a "Non-Working" gap and pushes the remainder to 09:00 the next day.
- Idle Time Visualization: Non-editable, greyed-out "ghost blocks" that appear in the gaps. These represent "Dead Time" where capital is sitting stagnant.
- Since we have a target practice predefined, we can add a button to switch between the current practice and the target practice. When the user clicks the button, the Gantt chart should update to show the target practice.
- When saving, the user should be able to save the current practice and target practice to the database.

## The Live List (Sync Layer) Extra for ad-hoc changes
- Bidirectional Sync: Below the chart, an editable table allows users to type in a new duration (e.g., change "Netting" from 120m to 30m).
- The user can also add/edit/remove a process/cut-offs, set its duration, and set its dependencies manually, these changes will not be saved to the template but only to the current fund profile.
- Visual Feedback: The Gantt chart above should "snap" to the new values instantly.

## Proceed to Visualisation Page
- At the end, the user can save the current practice and target practice to the database, and the screen should redirect to next page to show the vertical comparison side by side.

# 4. The Vertical Comparison & Impact Summary
The "See Differences" button triggers a final view that locks the edited data and compare them side by side.

## Vertical Timeline Layout
- Left Column (Baseline): Static vertical line with task nodes showing the T+2/3 "Old Way."
- Right Column (T+1): The optimized workflow from the previous screen.
- The "Gap" Highlight: Visual connectors showing how much "higher" (earlier) the T+1 milestones are.

## The Impact Logic (The Bottom Block)
The system calculates the final ROI using the following logic:
- Reinvestment Lead Time: $\text{T}_{2} \text{ Netting Confirmed} - \text{T}_{1} \text{ Netting Confirmed}$.
- Idle Time Reduction: Sum of all "Grey Ghost Blocks" in the old practice vs. the new practice.
