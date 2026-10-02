# Executive Briefing: Monthly Recurring Revenue (MRR) Calculation Methodology

**Prepared For:** Executive Leadership & Management  
**Application:** MailPlus ProspectPlus CRM & Revenue Analytics  
**Subject:** Multiplier Rationale for Weekly-to-Monthly Revenue Conversion (4.33 vs. 4.25)  
**Date:** October 2, 2026  

---

## 1. Executive Summary

In recurring service logistics (such as MailPlus), customer contracts and service schedules are frequently quoted and fulfilled on a **weekly or daily frequency**. To evaluate sales performance, customer lifetime value, and business health on standard monthly financial dashboards, this weekly billing frequency must be converted to **Monthly Recurring Revenue (MRR)**.

ProspectPlus standardizes on a **`4.33` multiplier** for weekly-to-monthly conversions. This document explains the mathematical, financial, and industry foundations behind this standard and compares it against alternative multipliers like `4.25`.

---

## 2. Mathematical Foundation

A standard calendar year consists of **365 days** (or 366 in leap years) across **12 calendar months**:

$$\text{Total Weeks in a Year} = \frac{365 \text{ days}}{7 \text{ days/week}} = 52.143 \text{ weeks} \approx \mathbf{52\text{ weeks}}$$

Dividing the 52 annual weeks evenly across the 12 calendar months:

$$\text{Average Weeks per Month} = \frac{52 \text{ weeks}}{12 \text{ months}} = \mathbf{4.3333... \text{ weeks/month}}$$

Rounding to two decimal places yields **`4.33`**.

---

## 3. Comparison: 4.33 vs. 4.25 Multipliers

The table below demonstrates the annualized revenue reconciliation for a customer paying **$100 / week**:

| Metric / Scenario | Multiplier: **4.33** (Current Standard) | Multiplier: **4.25** (Under-calculated) |
| :--- | :--- | :--- |
| **Weekly Service Revenue** | $100.00 / week | $100.00 / week |
| **Calculated MRR** | **$433.00 / month** ($100 \times 4.33$) | **$425.00 / month** ($100 \times 4.25$) |
| **Annualized Run-Rate (MRR $\times$ 12)** | **$5,196.00 / year** | **$5,100.00 / year** |
| **Actual Annual Billed (52 weeks)** | **$5,200.00 / year** ($100 \times 52$) | **$5,200.00 / year** ($100 \times 52$) |
| **Annual Variance / Discrepancy** | **-$4.00 (-0.08%)** *(Negligible rounding)* | **-$100.00 (-1.92%)** *(Misses ~1 full week)* |
| **Implied Weeks Accounted For** | **51.96 weeks / year** | **51.00 weeks / year** |

### Key Observations:
1. **Why `4.25` Underestimates Revenue:**  
   $4.25 \times 12\text{ months} = 51.0\text{ weeks}$. Using $4.25$ inadvertently omits **1 full week of revenue per customer per year**, understating annual pipeline and closed revenue by **~1.92%**.
2. **Why `4.33` Reconciles with Finance:**  
   $4.33 \times 12\text{ months} = 51.96\text{ weeks}$, which closely matches standard 52-week annual accounting cycles and general ledger reporting.

---

## 4. How MRR is Computed in ProspectPlus

The calculation engine (`src/lib/mrr.ts`) dynamically derives MRR directly from the specific service lines configured on each lead or customer:

$$\text{Total Lead MRR} = \sum (\text{Service Rate} \times \text{Weekly Days} \times 4.33)$$

### Frequency Breakdown Matrix

| Configured Frequency | Calculation Formula | Example ($20 Rate) | Resulting MRR |
| :--- | :--- | :--- | :--- |
| **5 Days / Week (Daily)** | $\text{Rate} \times 5 \times 4.33$ | $\$20 \times 5 \times 4.33$ | **$433.00 / mo** |
| **3 Days / Week (e.g., Mon/Wed/Fri)** | $\text{Rate} \times 3 \times 4.33$ | $\$20 \times 3 \times 4.33$ | **$259.80 / mo** |
| **1 Day / Week (Weekly)** | $\text{Rate} \times 1 \times 4.33$ | $\$20 \times 1 \times 4.33$ | **$86.60 / mo** |
| **Fortnightly (Bi-weekly)** | $\text{Rate} \times 0.5 \times 4.33$ | $\$20 \times 0.5 \times 4.33$ | **$43.30 / mo** |
| **Monthly Flat Fee** | $\text{Rate} \times 1.0$ | $\$20 \times 1.0$ | **$20.00 / mo** |
| **Ad-hoc / One-off** | $\text{Rate} \times 1.0$ | $\$20 \times 1.0$ | **$20.00 / mo** |

---

## 5. Industry Best Practice & Standards

* **Australian Payroll & Fair Work Standard:** Fair Work Australia and statutory accounting standards use **$4.3333$** weeks per month ($52 \div 12$) when converting weekly wages or service fees to monthly equivalents.
* **SaaS & Recurring Logistics Standard:** Standard recurring revenue metrics (MRR/ARR) define $\text{ARR} = \text{MRR} \times 12$. A $4.33$ weekly multiplier ensures that $\text{Weekly Revenue} \times 52 = \text{MRR} \times 12$ without structural leakage.

---

## 6. Conclusion & Recommendation

The **`4.33`** multiplier is mathematically and commercially accurate for MailPlus operations, ensuring executive dashboards accurately reflect true annualized contract values.

If company finance policy prefers an exact fractional formula ($52 / 12 \approx 4.33333$) or an alternative custom multiplier (such as $4.25$), the system logic in ProspectPlus can be adjusted centrally in `src/lib/mrr.ts`.
