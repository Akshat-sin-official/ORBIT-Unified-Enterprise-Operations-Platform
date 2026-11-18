# ORBIT Enterprise Platform Specification: Phase 2 Feature Expansion
**Document Version:** 2.0.0  
**Classification:** Enterprise Resource & Field Operations Management (FSM/ERP)  
**Status:** Approved for Implementation  
**Target:** ORBIT Enterprise Platform

---

## 1. Executive Summary & Scope

To achieve full operational parity with global industry benchmarks (**Salesforce Field Service**, **PTC ServiceMax**, **ServiceNow FSM**, and OEM aftermarket service suites like **Samsung GSPN** and **ServicePower**), ORBIT is expanding its core operational capabilities across six primary enterprise pillars, with the dedicated offline native mobile application staged as the final phase.

### Implementation Priority Hierarchy
1. **Pillar 1:** Visual Dispatch Board & Intelligent Route Scheduling (High Priority)
2. **Pillar 2:** Serialized Defective RMA Exchange & Component Traceability (High Priority)
3. **Pillar 3:** AMC / CMC & Preventive Maintenance (PPM) Engine (Medium-High Priority)
4. **Pillar 4:** Proof of Work & Fraud Prevention (Camera Watermarking & Signature) (Medium Priority)
5. **Pillar 5:** Customer Live Tracking & Self-Service Experience (Medium Priority)
6. **Pillar 6:** Franchisee & ASP (Authorized Service Partner) Settlements (Medium Priority)
7. **Pillar 7:** Frontline Technician Offline Mobile PWA (Final Phase Priority)

---

## 2. Pillar 1: Visual Dispatch Board & Intelligent Scheduling

### 2.1 Problem Statement
Currently, work orders are assigned via manual dropdown selection. Dispatchers managing 20–100 field technicians across expansive geographic territories cannot visualize workload distribution, travel times, or inventory availability, leading to SLA breaches, high technician idle time, and repeat travel costs.

### 2.2 Functional Requirements

#### FR-1.1: Interactive Gantt Timeline Dispatcher
- Visual calendar/timeline board rendering technicians on the Y-axis and hourly time slots (08:00 to 20:00) on the X-axis.
- Drag-and-drop work order allocation with visual collision detection (preventing overlapping bookings).
- Status color coding:
  - Grey: `DRAFT` / `UNASSIGNED`
  - Blue: `ASSIGNED`
  - Amber: `TRAVELING`
  - Purple: `ON_SITE`
  - Green: `COMPLETED`
  - Red: `SLA_BREACH_RISK`

#### FR-1.2: Geographic Territory & Map Layer
- Real-time Leaflet/MapLibre map view displaying unassigned work orders (red pins) and active technicians (blue vehicle pins).
- Territory clustering by Postal Pincode and Operational Zones (e.g., North Zone, Downtown Hub).
- Pincode proximity calculation: Automatically rank and suggest the top 3 closest available technicians when opening an unassigned job.

#### FR-1.3: Constraint-Based Auto-Assignment
The system must validate 3 hard constraints before allowing dispatch:
1. **Technician Skill Qualification:** Match required appliance skills (e.g., `HVAC_INVERTER`, `PCB_MICRO_SOLDERING`, `REFRIGERATION_GAS_R32`) against the technician's certified profile.
2. **Shift & Working Hours:** Validate that job duration does not exceed shift limits or daily maximum working hours.
3. **Van Trunk Stock Check:** Cross-reference estimated parts needed against the technician's mobile warehouse (`VAN_WAREHOUSE`) inventory balance.

---

## 3. Pillar 2: Serialized Defective RMA Exchange & Component Traceability

### 3.1 Problem Statement
When a technician replaces a high-value spare part (e.g., compressor, OLED panel, motherboard) under manufacturer warranty, warranty leakage occurs if:
- The broken component was not genuinely defective.
- A counterfeit or out-of-warranty component is substituted.
- The defective part is never physically returned to the central refurbishment hub.

### 3.2 Functional Requirements

#### FR-2.1: Dual-Serial Enforced Part Swap
- When recording a warranty-covered spare part on a repair job:
  - **Defective Serial Out (Mandatory):** Technician must scan or input the serial number of the defective part removed from the appliance.
  - **Fresh Serial In (Mandatory):** Technician must scan the serial number of the new replacement part issued from inventory.
- Real-time validation: Ensure the defective serial matches the manufacturer's known component generation or bill-of-materials (BOM) record.

#### FR-2.2: RMA Bag & Tag Reconciliation
- Generating an RMA tracking barcode immediately upon work order completion.
- Status lifecycle for exchanged defective parts:
  - `WITH_TECHNICIAN` (Defective part pulled on-site)
  - `DROPPED_AT_LOCAL_HUB` (Handed over by tech to regional depot)
  - `IN_TRANSIT_TO_RMA` (Forwarded in batch shipment to central plant)
  - `RECEIVED_AND_AUDITED` (Bench-tested and accepted into refurbishment/scrap)
  - `REJECTED_WARRANTY_DENIED` (Fraud detected; labour & part charge reversed to service partner)

#### FR-2.3: Warranty Claim Gatekeeper
- The finance system shall not mark warranty reimbursement as approved until the corresponding defective part is scanned as `RECEIVED_AND_AUDITED` at the central depot.

---

## 4. Pillar 3: AMC / CMC & Preventive Maintenance (PPM) Engine

### 4.1 Problem Statement
Enterprises make high-margin revenue on Annual Maintenance Contracts (AMC) and Comprehensive Maintenance Contracts (CMC). Today, ORBIT only responds to reactive breakdown tickets, missing recurring revenue workflows and automated preventive visits.

### 4.2 Functional Requirements

#### FR-3.1: Service Contract Definition & Sales Entitlements
- Configurable contract tiers:
  - **Basic AMC:** Labour & scheduled preventive maintenance covered; parts billed at catalog price.
  - **Comprehensive CMC:** Labour, periodic service, and 100% of spare parts fully covered.
  - **Preventive Only (PPM):** Fixed periodic cleaning and inspection audits.
- Contract tenure: 1 Year, 2 Year, or 3 Year terms with auto-calculated start and renewal dates.

#### FR-3.2: Automated Preventive Work Order Generation
- Contract rules specify servicing intervals (e.g., every 90 days or every 180 days).
- Background cron engine evaluates active contracts daily at midnight:
  - 14 days prior to due interval: Automatically generates a `PREVENTIVE_MAINTENANCE` Work Order.
  - Auto-populates standard checklist items (e.g., "Filter Cleansing", "Voltage Calibration", "Coolant Pressure Check").
  - Auto-schedules WhatsApp reminder to the customer with appointment confirmation options.

#### FR-3.3: Contract Renewal & Churn Automation
- 30 days and 7 days prior to AMC expiry: System triggers automated WhatsApp and Email renewal proposals with one-click payment links.
- Upon payment confirmation: Contract automatically renews and resets maintenance visit milestones.

---

## 5. Pillar 4: Proof of Work & Fraud Prevention

### 5.1 Problem Statement
Technicians claiming repair completion without visiting premises, or customers disputing pre-existing physical dents/scratches, cause significant brand friction and claim overhead.

### 5.2 Functional Requirements

#### FR-4.1: Geo-Tagged & Timestamped Media Capture
- Mandatory camera capture during on-site execution:
  - **Before Photo:** Capturing initial appliance state and serial plate.
  - **Defective Component Photo:** Showing damaged wire, cracked panel, or burnt PCB.
  - **After Photo:** Showing functioning device post-repair.
- Automatic backend watermarking: Stamp current GPS Coordinates (Latitude/Longitude), Date & Time, Work Order Number, and Technician Name onto image EXIF and visible lower banner.

#### FR-4.2: Digital Capacitive On-Glass Signature Pad
- Customer signature capture directly on tablet/desktop screen.
- Signature combined with the verified 6-digit OTP to create an immutable digital Job Completion Certificate (PDF).

#### FR-4.3: Mandatory Repair Checklist
- Step-by-step diagnostic verification questions (e.g., "Earth leakage test passed? [Yes/No]", "Operating temperature verified within range? [Yes/No]").
- Work order completion blocked until all mandatory checklist questions are answered affirmatively.

---

## 6. Pillar 5: Customer Live Tracking & Self-Service Experience

### 6.1 Problem Statement
Customer anxiety and repetitive call center inquiries ("Where is my technician?") drain support team bandwidth.

### 6.2 Functional Requirements

#### FR-5.1: Public Live Tracking Link ("Uber for Service")
- When technician updates status to `TRAVELING`:
  - Instant WhatsApp alert sent with a unique, secure, unguessable tracking link (`https://track.orbit.io/live/[secure-token]`).
- Live tracking page features:
  - Technician Name, Verified Photo, Rating (e.g., 4.9★), and contact button.
  - Live map rendering the customer destination and estimated time of arrival (ETA in minutes).
  - Vehicle number and appliance details.

#### FR-5.2: Self-Service Rescheduling via WhatsApp & Web
- Customers can reschedule appointments without calling customer care.
- Supported slots: Next Available, Morning (09:00 - 13:00), Afternoon (13:00 - 17:00), Evening (17:00 - 20:00).
- Selecting a new slot instantly updates the visual dispatch board and notifies the allocated engineer.

---

## 7. Pillar 6: Franchisee & ASP (Authorized Service Partner) Settlements

### 7.1 Problem Statement
70–80% of consumer electronics field operations are executed by third-party franchisees and authorized service partners (ASPs). Without automated settlement mechanisms, claim auditing is manual, prone to fraud, and delayed by weeks.

### 7.2 Functional Requirements

#### FR-6.1: Partner Tiering & Labour Rate Cards
- Maintain an ASP Directory with partner tiering: Platinum, Gold, Silver.
- Configurable Labour Rate Cards:
  - Tiered labour fees per product category (e.g., LED TV Repair: ₹450, Split AC Gas Charge: ₹750, Microwave Magnetron: ₹350).
  - Pincode multiplier (e.g., Rural/Difficult terrain: +20% travel allowance).

#### FR-6.2: Turnaround Time (TAT) Incentive & Repeat Call Penalties
- **TAT Bonus:** +10% labour incentive if work order is resolved within 24 hours of ticket booking.
- **Repeat Call Rate (RCR) Penalty:** If a new ticket is booked for the same serial number within 30 days of closure:
  - Flagged as `REPEAT_FAILURE`.
  - Automatic 50% labour deduction or penalty chargeback to the previous technician/ASP.

#### FR-6.3: Monthly Claim Reconciliation & Settlement Invoicing
- Automated monthly settlement generation:
  - Total Approved Labour Fees
  - Deductions (RCR penalties, unreturned defective parts)
  - GST / TDS tax deductions
  - Net Payable Statement issued to the ASP for one-click payment approval.

---

## 8. Pillar 7: Frontline Technician Mobility (Final Phase Priority)

### 8.1 Scope & Staging
To optimize speed to market, the native app is scheduled as the final implementation phase. The desktop web and mobile tablet web views will first host all capabilities above, followed by a streamlined PWA (Progressive Web App) containing:
- Local IndexedDB storage for work orders, customer addresses, and serial history.
- Background sync engine queuing completed jobs, photos, and signatures when connectivity is lost.
- Instant cloud reconciliation once cellular or Wi-Fi connectivity resumes.
