## 1. Executive Summary: The Tool’s Mission

This is a **Strategic Decision Tool**. Its purpose is to show that by aligning **Cut-off Times**, **Fund Accounting (Netting)**, and **Custody (Settlement)**, the client can "unlock" investment capital an average of 18–24 hours earlier than their current T+2 setup.


## 2. Core Feature Outline

### A. The "Time-Warp" Timeline (Interactive)

This is the main navigation of the app. It visualizes the entire lifecycle of a trade day.

* **What it does:** Users drag "Cut-off" sliders (Subscription/Redemption) across a 24-hour clock.
* **What to expect:** As you move a cut-off later into the afternoon, the "Netting Confidence" indicator changes. It shows that while a later cut-off attracts more investors, it puts more "Pressure" on the Custodian to verify assets before the T+1 clock runs out.

### B. The "Positive Net" Liquidity Visualizer

This feature focuses on the "Inflow vs. Outflow" math you discussed with stakeholders.

* **What it does:** A dynamic bar chart that recalculates the "Projected Net" based on the selected cut-off.
* **What to expect:** A glowing "Reinvestment Trigger" point. This tells the manager: *"At 4:30 PM, your Net is 98% certain. You are safe to start investing this cash now."*

### C. The "Custodian Pressure" Gauge

This bridges the gap between the "Math" (FA) and the "Vault" (Custody).

* **What it does:** A heat-map or gauge that measures **Operational Risk**.
* **What to expect:** If the "Time Gap" between the Cut-off and the Settlement Deadline is too small for manual work, the gauge turns Red. Clicking a **"CACEIS Automation"** button turns it back to Green, proving that tech (not just people) is the bridge to T+1.

### D. The "Shadow Cash" ROI Calculator

This is the "Sales" feature for the FA to show the client.

* **What it does:** Compares the cost of capital in a T+2 world vs. T+1.
* **What to expect:** A table or "Big Number" card showing the **Annualized Value of Early Reinvestment**. (e.g., *"By reinvesting 16 hours earlier, you generate an estimated $X in additional alpha per year."*)


## 3. What to Expect in the POC Interface

For UI/UX, we want a "Command Center" feel.

| Component | Aesthetic | User Action |
| --- | --- | --- |
| **Theme** | Dark Mode / "Glassmorphism" | High-tech, institutional feel. |
| **Primary Interaction** | Vertical Draggable Sliders | Adjusting Cut-off times. |
| **Feedback Loop** | Real-time chart updates | Seeing bars grow/shrink as time moves. |
| **The "Hero" Stat** | "Liquidity Readiness" % | A pulsing number showing how "ready" the cash is. |


## 4. Technical Architecture for the POC

Since we're building this in Next.js, we can structure it for maximum speed and "sleekness":

1. **State Management (Zustand/Context):** To handle the "Time" state. When the `cutOffTime` changes, every chart in the app must animate simultaneously.
2. **Animations (Framer Motion):** For that "Sleek" feel. Bars shouldn't just jump; they should slide and grow fluidly.
3. **Data Simulation:** We don't need a real backend yet. We can use a JSON-based "Simulation Engine" that mimics subscription/redemption data based on the time variables the user chooses.
