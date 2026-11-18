# ORBIT Enterprise Platform: Implementation Task List & Engineering Roadmap
**Document Version:** 2.0.0  
**Classification:** Engineering Task Breakdown  
**Status:** Ready for Phased Execution

---

## Roadmap Overview & Priority Sequence

```
Phase 1: Visual Dispatch Board & Intelligent Scheduling       [HIGH PRIORITY]
Phase 2: Serialized Defective RMA Exchange & Part Auditing   [HIGH PRIORITY]
Phase 3: AMC / CMC & Preventive Maintenance (PPM) Engine     [MEDIUM-HIGH PRIORITY]
Phase 4: Proof of Work (Photo Watermark & Signature Pad)      [MEDIUM PRIORITY]
Phase 5: Customer Live Tracking & WhatsApp Self-Service      [MEDIUM PRIORITY]
Phase 6: Franchisee & ASP Partner Settlement Ledger          [MEDIUM PRIORITY]
Phase 7: Frontline Mobile PWA & Offline Sync Engine          [FINAL PHASE - LAST PRIORITY]
```

---

## Phase 1: Visual Dispatch Board & Intelligent Route Scheduling

### Goal
Provide dispatchers with an interactive visual Gantt timeline board and territory map to eliminate manual dropdown assignment, reduce travel idle time, and match jobs against technician skills and van inventory.

### Backend Tasks
- [ ] **1.1 Schema Expansion (`prisma/schema.prisma`):**
  - Add `latitude: Decimal?`, `longitude: Decimal?` to `CustomerAddress`.
  - Add `skills: String[]`, `servicePincodes: String[]`, `maxJobsPerDay: Int` to `Technician`.
  - Add `isVanWarehouse: Boolean` to `Warehouse` to identify technician trunk stock.
- [ ] **1.2 Dispatch Module API (`/api/v1/dispatch`):**
  - `GET /v1/dispatch/board`: Return timeline matrix of all technicians, shift hours, booked time slots, and unassigned work orders for a chosen date & zone.
  - `POST /v1/dispatch/validate-assignment`: Constraint check verifying (a) skill match, (b) shift time collision, and (c) required spare parts present in technician's van warehouse.
  - `POST /v1/dispatch/schedule-job`: Atomic assignment updating work order status, slot, and route sequence.
- [ ] **1.3 Proximity Calculation Service:**
  - Haversine distance algorithm calculating technician distance from customer pincode/coordinates to rank top 3 nearest engineers.

### Frontend Tasks
- [ ] **1.4 Visual Dispatch Console (`/operations/dispatch`):**
  - Dedicated page with dual layout:
    - **Top/Left Panel:** Interactive Gantt Timeline with hourly columns (08:00 - 20:00) and technician rows.
    - **Bottom/Right Panel:** MapLibre/Leaflet map rendering pins for unassigned tickets, active jobs, and technician depot locations.
  - Drag-and-drop work order card onto technician timeline slot with live collision warning.
  - Auto-suggest pill: "Recommend Closest Tech" showing estimated drive distance in kilometers.

### Acceptance Criteria
- Dispatcher can view all daily jobs across 50 technicians in a single timeline view.
- Dragging a job onto an already booked technician highlights the slot in red and blocks overlapping booking.
- System flags a warning if the assigned technician lacks the required skill certification.

---

## Phase 2: Serialized Defective RMA Exchange & Part Traceability

### Goal
Prevent manufacturer warranty fraud by enforcing dual-serial scanning (defective part serial out vs fresh part serial in) and tracking physical reverse-logistics bag/tag returns before warranty payouts occur.

### Backend Tasks
- [ ] **2.1 Schema Expansion (`prisma/schema.prisma`):**
  - Create model `SerializedPartSwap`:
    - `id`, `organizationId`, `workOrderId`, `partId`
    - `defectiveSerialNumber`, `replacementSerialNumber`
    - `rmaBarcode`, `rmaStatus` (WITH_TECH, IN_TRANSIT, RECEIVED_AT_DEPOT, AUDIT_PASSED, AUDIT_FAILED)
    - `auditNotes`, `receivedAtHub`
- [ ] **2.2 RMA Controller & Service (`/api/v1/rma`):**
  - `POST /v1/field-service/work-orders/:id/parts-swap`: Record dual-serial swap; generate unique alphanumeric RMA Barcode (`RMA-2026-XXXX`).
  - `GET /v1/rma/batches`: List pending defective part return shipments.
  - `PATCH /v1/rma/scan-receive`: Scan incoming RMA barcode at central depot; transition status to `RECEIVED_AT_DEPOT`.
  - `POST /v1/rma/technical-audit`: Bench inspection approval or warranty rejection (charges back part cost to technician/partner if counterfeit).

### Frontend Tasks
- [ ] **2.3 Dual-Serial Part Swap Modal (`WorkOrderDetailPage.tsx`):**
  - Replace basic part input with "Serialized Warranty Part Exchange" dialog.
  - Mandatory inputs:
    - Defective Serial Out (with barcode scanner icon)
    - Replacement Serial In (validated against organization stock)
- [ ] **2.4 Reverse Logistics & RMA Console (`/management/rma`):**
  - Table of pending defective returns grouped by technician / regional depot.
  - Barcode quick-scanner interface for warehouse receiving staff.
  - Technical audit checklist and approval buttons.

### Acceptance Criteria
- Technicians cannot close warranty repair without scanning/entering the defective part's serial number.
- Finance invoice remains in `PENDING_RMA_AUDIT` until the physical part is scanned at the central hub.

---

## Phase 3: AMC / CMC & Preventive Maintenance (PPM) Engine

### Goal
Monetize post-warranty customer equipment through Annual Maintenance Contracts (AMC/CMC) and automate recurring preventive maintenance visits.

### Backend Tasks
- [ ] **3.1 Schema Expansion (`prisma/schema.prisma`):**
  - Create model `MaintenanceContract`:
    - `id`, `organizationId`, `customerId`, `productId`, `serialNumber`
    - `contractNumber`, `contractType` (BASIC_AMC, COMPREHENSIVE_CMC, PREVENTIVE_PPM)
    - `startDate`, `endDate`, `visitsIncluded`, `visitsCompleted`
    - `visitIntervalDays` (e.g. 90 for quarterly), `amountPaid`, `status` (ACTIVE, EXPIRED, CANCELLED)
  - Create model `MaintenanceSchedule`:
    - `id`, `contractId`, `visitSequence`, `dueDate`, `workOrderId`, `status` (SCHEDULED, GENERATED, COMPLETED)
- [ ] **3.2 Automated PPM Scheduler (NestJS Cron Worker):**
  - Daily cron task checking schedules due within 14 days.
  - Automatically instantiates `WorkOrder` with type `PREVENTIVE_MAINTENANCE` and links to the schedule.
  - Auto-dispatches WhatsApp reminder to customer for appointment confirmation.
- [ ] **3.3 AMC Renewal Automation:**
  - Generates renewal quote and payment link 30 days prior to contract expiry.

### Frontend Tasks
- [ ] **3.4 Service Contracts Dashboard (`/operations/contracts`):**
  - List of active AMCs, upcoming preventive maintenance schedules, and expiring contracts.
  - "New AMC Contract" modal allowing selection of registered customer product, contract tier, and billing details.
- [ ] **3.5 Preventive Checklist on Work Order Detail:**
  - Displays standard inspection tasks (e.g., deep clean, electrical calibration, component health check).

### Acceptance Criteria
- Selling an AMC automatically populates all 4 quarterly preventive maintenance visits in the schedule.
- When a visit milestone arrives, the system creates the work order without any manual human intervention.

---

## Phase 4: Proof of Work & Fraud Prevention

### Goal
Eliminate fake customer claims and unverified job sign-offs through mandatory geo-tagged camera capture and digital on-screen signature.

### Backend Tasks
- [ ] **4.1 Schema Expansion (`prisma/schema.prisma`):**
  - Create model `ProofOfWorkMedia`:
    - `id`, `workOrderId`, `mediaType` (BEFORE_REPAIR, DEFECTIVE_PART, AFTER_REPAIR, SIGNATURE)
    - `fileUrl`, `latitude`, `longitude`, `capturedAt`, `watermarkText`
- [ ] **4.2 Media Upload & Watermarking API:**
  - `POST /v1/field-service/work-orders/:id/proof-media`: Accepts multipart image upload, extracts browser geolocation, and embeds visual watermark banner (Timestamp + Lat/Lng + WO Number).
  - `POST /v1/field-service/work-orders/:id/customer-signature`: Accepts base64 canvas drawing of customer signature.

### Frontend Tasks
- [ ] **4.3 Media Upload & Camera Widget (`WorkOrderDetailPage.tsx`):**
  - Mobile/tablet friendly file and camera upload inputs for:
    - Before Repair (Photo of serial plate and problem)
    - Defective Part (Burnt or cracked part)
    - After Repair (Functioning appliance)
  - Thumbnail gallery with zoom and timestamp preview.
- [ ] **4.4 On-Screen Signature Pad:**
  - HTML5 Canvas signature pad allowing capacitive stylus or finger signature on screen.
  - Integrated into the OTP verification completion dialog.

### Acceptance Criteria
- Technicians cannot complete a work order without uploading at least 1 Before photo, 1 After photo, and capturing customer signature.
- Generated completion PDF displays the watermarked photos and customer signature alongside the OTP audit trail.

---

## Phase 5: Customer Live Tracking & WhatsApp Self-Service

### Goal
Give customers an "Uber-like" live tracking web link when the technician is traveling, with one-tap WhatsApp self-rescheduling.

### Backend Tasks
- [ ] **5.1 Schema Expansion (`prisma/schema.prisma`):**
  - Create model `CustomerTrackingSession`:
    - `id`, `workOrderId`, `secureToken` (UUID/nanoid)
    - `technicianLat`, `technicianLng`, `etaMinutes`, `expiresAt`, `isActive`
- [ ] **5.2 Public Tracking & Rescheduling API (`/api/v1/public/track`):**
  - `GET /v1/public/track/:token`: Public unauthenticated endpoint returning technician photo, name, rating, vehicle number, appliance info, and estimated ETA.
  - `POST /v1/public/track/:token/reschedule`: Allows customer to pick a new date/time slot (shifts work order status to `RESCHEDULED`).
- [ ] **5.3 WhatsApp Hook:**
  - Automatically includes tracking URL in `notifyCustomerTechnicianDispatched` message.

### Frontend Tasks
- [ ] **5.4 Standalone Responsive Tracking Page (`/track/:token`):**
  - Clean, mobile-optimized public page.
  - Map showing customer pin and moving technician marker.
  - Driver profile card: Photo, Star Rating, Completed Jobs count.
  - Interactive "Need to reschedule?" button opening available date/slot selector.

### Acceptance Criteria
- Clicking the WhatsApp tracking link opens the mobile page without requiring customer login.
- Rescheduling via the tracking page updates the work order in real-time and alerts the dispatcher.

---

## Phase 6: Franchisee & ASP (Authorized Service Partner) Settlements

### Goal
Support third-party authorized service network operations with automated labour rate cards, turnaround-time incentives, repeat call penalties, and monthly billing settlements.

### Backend Tasks
- [ ] **6.1 Schema Expansion (`prisma/schema.prisma`):**
  - Create model `ContractorPartner` (Franchisee / ASP profile).
  - Create model `AspRateCard` (Category-wise labour allowances, TAT bonus %, RCR penalty %).
  - Create model `AspSettlement` (Monthly statement with approved labour, deductions, net payable).
- [ ] **6.2 Settlement Calculator Service:**
  - Compute labour payout on every completed work order.
  - Check Repeat Call Rate: If serial number had a ticket within 30 days, flag `REPEAT_FAILURE` and deduct penalty.
  - `GET /v1/asp/settlements`: List monthly statements.
  - `POST /v1/asp/settlements/generate`: Monthly batch settlement invoice generator.

### Frontend Tasks
- [ ] **6.3 Franchisee Management & Settlements Portal (`/management/partners`):**
  - Partner directory with tier badges (Platinum / Gold / Silver).
  - Rate card configuration editor per product category.
  - Monthly settlement view with itemized breakdown of labour earned, bonus awarded, and RCR penalties deducted.
  - Export to PDF / CSV for accounting sign-off.

### Acceptance Criteria
- Repeat failures within 30 days are automatically detected and penalized on the contractor's monthly settlement.
- Service managers can approve monthly partner payouts with a single click.

---

## Phase 7: Frontline Mobile PWA & Offline Sync Engine (Final Phase Priority)

### Goal
Provide a lightweight Progressive Web App (PWA) with offline-first local storage and sync queue when technicians operate in remote or network-dead zones.

### Tasks
- [ ] **7.1 PWA Manifest & Service Worker Setup:**
  - Cache static assets, UI icons, and application shell.
- [ ] **7.2 Local Storage & Offline Database (IndexedDB):**
  - Cache today's assigned work orders, customer addresses, and local spare parts catalog.
- [ ] **7.3 Deferred Request Queue:**
  - Background sync mechanism: If network is offline, actions (mark arrived, record parts, capture OTP) are saved to local IndexedDB queue.
  - Automatically replays queued mutations to the backend when internet connection resumes.

### Acceptance Criteria
- Technicians can open assigned jobs and record repair details even with airplane mode active.
- Reconnecting to Wi-Fi/4G automatically syncs all updates to the cloud without duplicate submissions.
