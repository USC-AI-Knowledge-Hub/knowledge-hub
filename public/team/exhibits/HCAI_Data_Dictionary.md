# HCAI Data Dictionary for AI Analysts

**Dataset:** California HCAI *Hospital Annual Financial Disclosure Report – Complete Data Set*, 2024–2025 file (`50hospitaldata.xlsx`, first tab "Financial and Utilization Data").

**Status:** every address below was checked against that file's headers. The medians in section 11 were computed from it, so use them to check your own results.

**Instructions to the AI:** read this whole document before planning. Use code for every number. State your hospital count, the fields you used, and any hospitals you dropped. If your result is far from the medians in section 11, find out why before reporting.

---

## 1. File layout and parsing
- Rows 1–4 are headers: **Page**, **Column**, **Line**, **Description**. Each later row is one **report**.
- A field is named by its address, written **(page, column, line)**. For example, (8, 1, 205) means Page 8, Column 1, Line 205.
- Pages are text labels such as "4.1" and "21.1", so match them as text, not as numbers.
- Numbers are often stored as text with commas, `$`, or non-breaking spaces, so clean them before converting. A blank means "not reported," which is different from zero.
- Many pages contain **subtotal and total lines**. Never add a total line to the lines it already sums. Section 9 lists the wage page totals.

## 2. Which rows to analyze
| Rule | Why |
|---|---|
| **Keep general acute hospitals:** Type_of_Care_Short-Term_General (1, 3, 5) is filled. This leaves 301 reports. | The file also includes psychiatric, children's, specialty and long-term hospitals. |
| **One row per hospital:** 444 reports cover 439 facilities. Check for duplicate facility numbers (0, 1, 2); 4 general acute hospitals filed twice after ownership changes. | Otherwise totals double-count. |
| **Check the report length:** days = (0, 1, 37) − (0, 1, 36) + 1. Ten general acute reports cover less than 330 days. Drop them, or scale dollar amounts and counts to 365 days. | Partial years distort totals and per-day figures. Ratios such as margins are less affected. |
| **Kaiser (34 hospitals):** drop Kaiser from any price, payer, markup or margin analysis. Keep it for wages and patient volumes. | Kaiser's revenue is an internal transfer from its own health plan. Kaiser files no cost data (page 10 is empty). |
| **Rehab and long-term hospitals** labeled general acute (for example Rancho Los Amigos and Kindred): check names in the top and bottom lists. Also, 49 general acute hospitals get more than 20% of their days from long-term-care units. | They have very different costs and stays. |
| **Report periods are mixed:** most end Jun 2024 or Dec 2024, but they range from Jul 2023 to May 2025. | Compare with outside data from about 2024. |

## 3. Page map
| Page | Contents |
|---|---|
| 0 | Name, ID, address, report period |
| 1 | Beds, type of care, ownership (type of control), HSA region, trauma level |
| 2 | Services offered |
| 3.1–3.4 | Related organizations, owners and board, physician arrangements, management firm |
| 4 | Utilization by service: beds, days, visits, surgeries, births |
| 4.1 | Patient days, discharges and outpatient visits **by payer** |
| 5, 5.1, 5.2 | Balance sheet, long-term debt, property and equipment |
| 6, 7 | Restricted funds, changes in equity |
| 8 | **Income statement.** Column 1 = this year, column 2 = prior year |
| 9 | Cash flow, including capital spending |
| 10 | Revenue and cost by revenue center |
| 12 | **Revenue by payer**, inpatient vs. outpatient, plus deductions |
| 14 | Other operating revenue detail |
| 15, 16 | Physician and student compensation |
| 17, 18 | **Expenses by cost center and type** (salaries, benefits, supplies, etc.) |
| 21, 22 | **Hourly wages and hours by job class** (21 = patient care, 22 = support/admin) |
| 21.1, 22.1 | **Registry (agency) nurses** and other contract labor |

Prior-year columns exist only on pages 5–9. There is no prior-year data for patients or wages, so use earlier files to study trends.

## 4. Hospital information
| Field | Address |
|---|---|
| Name / facility number | (0, 1, 1) / (0, 1, 2) |
| City / ZIP | (0, 1, 9) / (0, 1, 10) |
| Report period from / through | (0, 1, 36) / (0, 1, 37) |
| Licensed beds | (1, 1, 5) |
| Available beds (avg) / staffed beds (avg) | (1, 1, 10) / (1, 1, 15) |
| Trauma center level (1–4; blank = none) | (1, 1, 30) |
| Region: Health Service Area (HSA) | (1, 1, 20), see table below |
| Ownership | Page 1, Column 2. Exactly one line is filled per hospital. **Nonprofit:** lines 5, 10, 15. **For-profit:** 20, 25, 30. **Public:** 35 state, 40 county, 45 city/county, 50 city, 55 district. |

| HSA | Area | HSA | Area |
|---|---|---|---|
| 1 | Northern California | 8 | Mid-Coast (Monterey, SLO, Santa Cruz) |
| 2 | Sacramento area | 9 | Central Valley south (Fresno, Kern, Tulare) |
| 3 | North Bay (Sonoma, Solano, Napa) | 10 | Santa Barbara / Ventura |
| 4 | SF / San Mateo / Marin | 11 | Los Angeles |
| 5 | East Bay (Alameda, Contra Costa) | 12 | Inland Empire (San Bernardino, Riverside) |
| 6 | North San Joaquin (Stockton, Modesto, Merced) | 13 | Orange |
| 7 | Santa Clara | 14 | San Diego / Imperial |

## 5. Income statement (page 8, column 1; column 2 = prior year)
| Field | Line |
|---|---|
| Gross patient revenue: **billed charges** (list prices, not what is paid) | 30 |
| Deductions from revenue (total discounts off charges) | 105 |
| Capitation premium revenue | 107 (by payer: 430–445; total 450) |
| **Net patient revenue** (what is actually collected) | 110 |
| Other operating revenue (cafeteria, parking, grants, etc.) | 135 |
| **Total operating revenue** | 140 |
| **Total operating expenses** | 200 |
| **Net from operations** (operating profit) | 205 |
| Net non-operating revenue *minus* non-operating expense (investments, donations, district taxes) | 210 |
| Net income before taxes / **net income** | 215 / 245 |
| Bad debt | 300 |
| Contractual adjustments: Medicare traditional / managed care | 305 / 310 |
| Contractual adjustments: Medi-Cal traditional / managed care | 315 / 320 |
| **Disproportionate share (DSH) and supplemental payments for Medi-Cal**, entered as *negative* deductions | 325 |
| Contractual adjustments: county indigent / other third party | 330–335 / 340–345 |
| Charity care: Hill-Burton / other (**at billed charges**) | 350 / 355 |

## 6. Revenue by payer (page 12)
**Payer column pairs.** Odd columns are inpatient and even columns are outpatient.

| Payer | Columns |
|---|---|
| Medicare traditional | 1–2 |
| Medicare managed care | 3–4 |
| Medi-Cal traditional | 5–6 |
| Medi-Cal managed care | 7–8 |
| County indigent | 9–12 |
| **Commercial** ("Other Third Parties", traditional + managed care) | 13–16 |
| Other indigent | 17–18 |
| Other payers (self-pay, etc.) | 19–20 |
| **Totals** | 21 inpatient, 22 outpatient, 23 all |

| Field | Line |
|---|---|
| Gross (billed) revenue | 415 |
| Deductions by payer: bad debt / contractual / charity / other / total | 420 / 425 / 430 / 450 / 455 |
| DSH and supplemental payments | 426 |
| Capitation | 457 |
| **Net patient revenue** | 460 |

Line 460 does not use the even/odd pattern. Use these columns:

| Payer | Line 460 columns |
|---|---|
| Medicare traditional | 1 + 2 |
| Medicare managed care | 3 |
| Medi-Cal traditional | 5 |
| Medi-Cal managed care | 7 |
| County indigent | 9 + 10 + 11 |
| Commercial | 13 + 14 + 15 |
| Other indigent | 17 + 18 |
| Other payers | 19 + 20 |
| **All payers** | 23 |

Check: the payer pieces should sum to about column 23.

## 7. Patients (pages 4 and 4.1)
| Field | Address |
|---|---|
| **Patient days by payer** | Page 4.1, line 35, columns 1–10 in the payer order below. **Column 11 = all.** |
| **Discharges by payer** | Page 4.1, line 35, columns 12–21 in the same order. **Column 22 = all.** |
| Emergency department visits | (4, 1, 160). Reported by 288 of 301 hospitals. |
| Live births | (4, 1, 625). Reported by 202 of 301; blank = no maternity unit. |
| Licensed / available / staffed beds, total | (4, 1, 150) / (4, 2, 150) / (4, 3, 150) |

Payer order on page 4.1: Medicare traditional, Medicare managed care, Medi-Cal traditional, Medi-Cal managed care, county indigent traditional, county indigent managed care, commercial traditional, commercial managed care, other indigent, other payers.

## 8. Expenses by type (page 18, totals for pages 17+18)
**Expense type by column:**

| Column | Expense type |
|---|---|
| 1 | Salaries and wages |
| 2 | Employee benefits |
| 3 | Physician compensation |
| 4 | Professional fees |
| 5 | Supplies |
| 6 | **Purchased services** (includes agency staff) |
| 7 | Depreciation |
| 8 | Leases |
| 9 | Other (column 9, line 325 = licenses and taxes, likely including the hospital quality assurance fee) |
| 10 | **Total direct** |

**Line meanings:**

| Line | Meaning |
|---|---|
| 365 | Total operating costs |
| 375 | All costs |
| 200 | Fiscal services total |
| 300 | Administrative services total |

## 9. Wages (pages 21 and 22)

**Job-class columns:**

| Job class | Rate column | Productive-hours column |
|---|---|---|
| Management & Supervision | 1 | 2 |
| Technical & Specialist | 3 | 4 |
| Registered Nurses | 5 | 6 |
| Licensed Vocational Nurses | 7 | 8 |
| Aides & Orderlies | 9 | 10 |
| Clerical & Administrative | 11 | 12 |
| Environmental & Food Service | 13 | 14 |
| Physicians, salaried (only about 30 hospitals) | 15 | 16 |
| Non-Physician Practitioners (NPs, PAs) | 17 | 18 |
| Other | 19 | 20 |

**Summary columns 21–25 (not job classes):**

| Column | Meaning |
|---|---|
| 21 | Department average rate |
| 22 | Productive hours |
| 23 | Non-productive hours |
| 24 | Paid hours |
| 25 | Productive FTEs |

**Lines** are departments.
- Page 21 has clinical departments; page 22 has support departments (housekeeping, dietary, plant, admin). **Use both pages for a hospital-wide figure.**
- **Total lines to exclude:** page 21 lines 150, 225, 405; page 22 lines 10, 50, 150, 200, 300 and the non-operating line 370. Also skip any line whose description contains "Total".

**Hospital average rate for a job** = Σ(rate × productive hours) ÷ Σ(productive hours) across non-total lines on both pages.
- The rate is per **paid** hour (it includes paid time off), and productive hours are used only as weights.
- These are **department averages**. They cannot tell you how many individual workers earn under a given wage.

**Registry (agency) nurses: page 21.1**

| Column | Meaning |
|---|---|
| 1 | Hourly rate |
| 2 | Contract hours |
| 3 | Other contract staff rate |
| 4 | Other contract staff hours |
| 5 | Total contract hours |

Use the same total lines as page 21. **Agency share of RN hours** = registry hours ÷ (registry hours + employed RN hours, page 21 column 6).

## 10. Balance sheet and capital
| Field | Address |
|---|---|
| Cash | (5, 1, 5) |
| Total current assets | (5, 1, 55) |
| Total assets | (5, 1, 270) |
| Total current liabilities | (5, 3, 60) |
| Total liabilities | (5, 3, 135) |
| Total equity | (5, 3, 205) |
| Capital spending (purchases of property and equipment) | (9, 1, 135) |

Hospitals in large systems send cash to the parent company, so cash and days-cash measures are **unreliable**.

## 11. Standard measures with expected medians
The medians below are for **257 hospitals**: general acute, no Kaiser, full-year reports.

| Measure | Formula | Median |
|---|---|---|
| Operating margin | (8,1,205) ÷ (8,1,140) | 0.8% (47% negative) |
| Cost-to-charge ratio (CCR) | [(8,1,200) − (8,1,135)] ÷ (8,1,30) | ~0.24 |
| Markup: charges per $1 of cost | (8,1,30) ÷ (8,1,200) | 4.3× |
| Collected per $1 billed | (8,1,110) ÷ (8,1,30) | ~24¢ |
| **Payment-to-cost ratio, by payer** | net revenue (12, payer cols, 460) ÷ [gross revenue (12, payer cols, 415) × CCR] | Statewide totals: Medicare traditional 0.73, Medicare managed care 0.77, Medi-Cal managed care 0.92, Medi-Cal traditional 1.19*, **commercial 1.57** |
| Adjustment factor (counts outpatient work) | (12,23,415) ÷ (12,21,415) | — |
| Cost per adjusted discharge | (8,1,200) ÷ [(4.1,22,35) × adjustment factor] | ~$22,100 |
| Commercial payment per adjusted commercial discharge | (12,13+14+15,460) ÷ [(4.1,18+19,35) × adjustment factor] | ~$37,700 |
| Labor share of expenses | [(18,1,365) + (18,2,365)] ÷ (18,10,365) | 49% (purchased services 16%) |
| Admin + fiscal share of expenses | [(18,10,200) + (18,10,300)] ÷ (18,10,365) | 22% |
| Agency share of RN hours | see section 9 | 7.4% statewide |
| Uncompensated care at cost | [(8,1,300) + (8,1,350) + (8,1,355)] × CCR, ÷ (8,1,200) | 1.8% of expenses |
| Medi-Cal share of patient days | [(4.1,3,35) + (4.1,4,35)] ÷ (4.1,11,35) | ~29% |
| Occupancy | (4.1,11,35) ÷ [(1,1,5) × report days] | ~58% |

### Recreating UNC Sheps Center exhibits
Sheps uses the federal Medicare Cost Report. HCAI is a different report, so match the *idea* of each measure and note any differences. HCAI has **no rural/urban flag**, so use hospital size (licensed beds or net patient revenue) or HSA region in place of Sheps' rural/urban groups. Medians are for the same 257 hospitals.

| Sheps measure | HCAI version | CA median |
|---|---|---|
| Total margin (profitability briefs) | (8,1,245) ÷ [(8,1,140) + (8,1,210)] | 3.6% (nonprofit 4.5%, public 3.2%, for-profit 1.7%) |
| Medicare outpatient payment as % of cost | (12,2,460) ÷ [(12,2,415) × CCR] | 65% (all Medicare traditional, IP+OP: 76%) |
| Uncompensated care as % of operating expense | [(8,1,300) + (8,1,350) + (8,1,355)] × CCR ÷ (8,1,200) | 2.8% (<$100M net patient revenue), 2.0% ($100–300M), 1.5% (>$300M) |
| Outpatient share of patient revenue | (12,22,415) ÷ (12,23,415) | 45% (<100 beds 74%, 300+ beds 39%) |
| Acute care occupancy | acute days (4.1,11,5) ÷ [acute licensed beds × report days]. Acute licensed beds = page 4, column 1, lines 5, 10, 15, 20, 30, 35, 40, 45, 50, 65, 70, 90 (excludes psych, rehab, long-term). | 53% median, 61% weighted (<100 beds 37%, 300+ beds 62%). Sheps' CA row: urban 57%, rural 47%. |
| Average salary expense per FTE | (18,1,365) ÷ [paid hours ÷ 2,080]. Paid hours = page 21 column 24, lines 150 + 225 + 405, plus page 22 column 24, lines 10 + 50 + 150 + 200 + 300. | ~$105,000, all full-year general acute incl. Kaiser (HSA 12 Inland $93k to HSA 7 Santa Clara $158k) |

*Medi-Cal traditional looks above cost only because DSH and supplemental payments (line 325 / page 12 line 426, used by 128 hospitals) are counted in its revenue. Hospitals also pay a quality assurance fee that funds part of those payments, and it sits in expenses. **Do not conclude that "Medi-Cal overpays."**

## 12. Known traps
- **Charges are not prices.** Billed charges are list prices that hardly anyone pays. Convert charity care and bad debt to cost with the CCR.
- **Staffed beds make hospitals look about 95% full.** Use licensed beds for occupancy.
- **Per-day costs:** raw patient days include long-term-care days and ignore outpatient work. Use *adjusted* discharges or days.
- **No case mix:** trauma and academic centers treat sicker patients, so their higher cost per stay is not necessarily inefficiency. Compare like with like, for example by trauma level (1, 1, 30).
- **Averages:** use medians across hospitals, or weight properly. A few giant hospitals can dominate a simple average.
- **Small groups:** some HSAs have fewer than 10 hospitals, so report the count.
- **Growth and comparisons with the state target:** OHCA's 3.5% target covers per-person *total* health spending, not one hospital's expenses. Don't compare the two directly.
- **Causation:** this is one year of descriptive data, so write "associated with," never "causes."

## 13. What this file cannot answer
- Patient-level prices, procedures, or quality.
- Case mix or severity.
- Individual workers' wages.
- Insurance premiums or household costs.
- County: derive it from ZIP or use HSA.
- Teaching status.
- Health system membership.
- Trends over time: these need other years' files.
