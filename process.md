In a standard European UCITS environment, the "T+2" timeline is a high-precision cycle. While the **cut-off** is the static point where you stop accepting orders, the subsequent tasks are highly time-sensitive because the Fund Manager needs to know the "Net" cash position as early as possible to trade in the market.

Here is the approximate time and duration for each process in a typical European **T+2** fund lifecycle.

---

### **Trade Date (T): The "Collection" Phase**

This day is about gathering investor intent and determining the value of the fund.

| Process / Task | Approx. Time | Duration | Responsible Party |
| --- | --- | --- | --- |
| **Order Validation & KYC** | 09:00 – 13:00 | **~4 hours** | Transfer Agent (TA) |
| **Aggregation of Orders** | 13:00 – 15:00 | **~2 hours** | Transfer Agent (TA) |
| **Portfolio Valuation** | 17:30 – 21:00 | **~3.5 hours** | Fund Administrator |
| **NAV Generation** | 21:00 – 23:00 | **~2 hours** | Fund Administrator |

> **Note:** The **Portfolio Valuation** begins once the European markets close (usually 17:30 CET). The administrator must pull thousands of prices, check for corporate actions, and calculate the fund's total value.

---

### **Trade Date + 1 (T+1): The "Decision" Phase**

This is the most critical window for the Fund Manager (FM). The FM now knows the "Positive Net" (or negative) and must act before the next market close.

| Process / Task | Approx. Time | Duration | Responsible Party |
| --- | --- | --- | --- |
| **Cash Forecasting / Reporting** | 08:30 – 09:30 | **~1 hour** | TA & Middle Office |
| **Reinvestment Execution** | 10:00 – 15:00 | **~5 hours** | **Fund Manager (FM)** |
| **Trade Matching/Affirmation** | 15:00 – 18:00 | **~3 hours** | Broker & Custodian |
| **Forex (FX) Execution** | 16:00 – 17:00 | **~1 hour** | FM / Treasury |

> **Why the FM trades on T+1:** By 09:30, the FM receives the final cash flow report. Since the fund's cash from subscribers will settle on **T+2**, the FM buys stocks on **T+1** so those stock trades settle on **T+3**. This "1-day lag" is common to ensure they don't buy stocks with money that hasn't arrived yet (avoiding overdrafts).

---

### **Trade Date + 2 (T+2): The "Settlement" Phase**

This is the physical exchange of cash for fund units.

| Process / Task | Approx. Time | Duration | Responsible Party |
| --- | --- | --- | --- |
| **Cash Settlement (Incoming)** | 08:00 – 11:00 | **~3 hours** | Custodian / Banks |
| **Redemption Payments (Outgoing)** | 11:00 – 14:00 | **~3 hours** | Custodian / TA |
| **Final Reconciliation** | 15:00 – 18:00 | **~3 hours** | Fund Accounting |

---

### Summary of Duration per Stakeholder

If we sum up the "active" work hours across the three days:

* **Transfer Agent (TA):** ~12 hours (Heaviest on T and T+2 for register updates and cash movement).
* **Fund Administrator:** ~6 hours (Concentrated on T evening/night for NAV calculation).
* **Fund Manager:** ~6 hours (Concentrated on T+1 for making investment decisions based on the flows).
* **Custodian:** ~8 hours (Heaviest on T+1 and T+2 for trade matching and moving money).

### Visualizing the Cycle

### Key Insight: The "Funding Gap"

Because the FM typically waits for **confirmed** cash flows on **T+1 morning**, they are effectively "out of the market" for 24 hours. If the market jumps 2% on T+1, the new subscribers miss that gain because their cash wasn't "put to work" until the FM traded on T+1. This is why some advanced funds use **pre-funding** or **overdraft facilities** to reinvest on T evening, though this is riskier.
