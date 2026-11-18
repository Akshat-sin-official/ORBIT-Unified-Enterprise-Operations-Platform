# ORBIT Enterprise Platform: Technical Architecture & System Diagrams
**Document Version:** 2.0.0  
**Classification:** Technical Architecture Specification  
**Status:** Architecture Blueprint

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Clients["Presentation & Engagement Layer"]
        DispatchUI["Visual Dispatch Console (React/Vite)"]
        TrackPortal["Public Customer Tracking Portal (Responsive)"]
        SettingsUI["ASP & Contract Management Portal"]
        WhatsAppUser["Customer / Tech (WhatsApp Client)"]
    end

    subgraph Gateway["API & Communication Gateway"]
        NestGateway["NestJS Modular Enterprise Core (Port 5000)"]
        NotifDispatch["Multi-Channel Notification Dispatcher"]
        WhatsFlow["WhatsFlow Go Engine (REST/WebSocket)"]
        SMTPRelay["Verified SMTP Mail Gateway"]
    end

    subgraph CoreServices["Domain Orchestration Engine"]
        FSMService["Field Service & Dispatch Scheduler"]
        RMAService["Serialized Defective RMA & Part Audit Engine"]
        AMCService["Maintenance Contract & PPM Cron Scheduler"]
        ASPService["Franchisee Settlement & Claims Ledger"]
        ProofService["Watermark Media & Digital Signature Engine"]
    end

    subgraph DataPersistence["Enterprise Persistence & Cache Layer"]
        PGSQL[("PostgreSQL 16 (Multi-Tenant Relational Master)")]
        RedisCache[("Redis 7 (Live GPS, Session Tokens, Cache)")]
        S3Storage[("Secure Object Store (Watermarked Media & Signatures)")]
    end

    DispatchUI --> NestGateway
    TrackPortal --> NestGateway
    SettingsUI --> NestGateway
    WhatsAppUser <--> WhatsFlow

    NestGateway --> CoreServices
    CoreServices --> NotifDispatch
    NotifDispatch --> WhatsFlow
    NotifDispatch --> SMTPRelay

    CoreServices --> PGSQL
    CoreServices --> RedisCache
    ProofService --> S3Storage
```

---

## 2. Extended Database Entity-Relationship (ER) Schema

The following schema extensions model the new enterprise pillars in PostgreSQL via Prisma:

```mermaid
erDiagram
    ORGANIZATION ||--o{ CONTRACTOR_PARTNER : registers
    ORGANIZATION ||--o{ MAINTENANCE_CONTRACT : issues
    ORGANIZATION ||--o{ ASP_RATE_CARD : defines
    WORK_ORDER ||--o{ PROOF_OF_WORK_MEDIA : captures
    WORK_ORDER ||--o{ SERIALIZED_PART_SWAP : records
    WORK_ORDER ||--o| CUSTOMER_TRACKING_SESSION : spawns
    MAINTENANCE_CONTRACT ||--o{ MAINTENANCE_SCHEDULE : generates
    MAINTENANCE_SCHEDULE ||--o| WORK_ORDER : triggers
    CONTRACTOR_PARTNER ||--o{ ASP_SETTLEMENT : generates

    CONTRACTOR_PARTNER {
        uuid id PK
        uuid organization_id FK
        string partner_code
        string company_name
        string partner_tier
        string contact_email
        string contact_phone
        string settlement_frequency
        boolean is_active
    }

    ASP_RATE_CARD {
        uuid id PK
        uuid organization_id FK
        uuid contractor_id FK
        string product_category
        decimal standard_labour_fee
        decimal tat_bonus_amount
        decimal repeat_call_penalty
        decimal travel_allowance_per_km
    }

    ASP_SETTLEMENT {
        uuid id PK
        uuid organization_id FK
        uuid contractor_id FK
        string settlement_number
        string billing_period
        decimal total_labour_earned
        decimal bonus_earned
        decimal penalties_deducted
        decimal net_settlement_payable
        string status
    }

    MAINTENANCE_CONTRACT {
        uuid id PK
        uuid organization_id FK
        uuid customer_id FK
        uuid product_id FK
        string contract_number
        string contract_type
        date start_date
        date end_date
        int visit_interval_days
        decimal contract_amount
        string status
    }

    MAINTENANCE_SCHEDULE {
        uuid id PK
        uuid contract_id FK
        int visit_sequence
        date due_date
        string status
        uuid generated_work_order_id FK
    }

    SERIALIZED_PART_SWAP {
        uuid id PK
        uuid work_order_id FK
        uuid part_id FK
        string defective_serial_number
        string replacement_serial_number
        string rma_barcode
        string rma_status
        datetime received_at_hub
        string audit_result
    }

    PROOF_OF_WORK_MEDIA {
        uuid id PK
        uuid work_order_id FK
        string media_type
        string image_url
        string storage_key
        decimal latitude
        decimal longitude
        datetime captured_at
        string watermarked_signature
    }

    CUSTOMER_TRACKING_SESSION {
        uuid id PK
        uuid work_order_id FK
        string secure_access_token
        decimal technician_last_lat
        decimal technician_last_lng
        int estimated_eta_minutes
        datetime expires_at
        boolean is_active
    }
```

---

## 3. Pillar 1: Visual Dispatch & Proximity Route Allocation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Dispatcher as Operations Dispatcher
    participant Console as Dispatch Gantt & Map UI
    participant API as Field Service Dispatch API
    participant Engine as Proximity & Skill Engine
    participant DB as PostgreSQL Master
    participant WA as WhatsFlow Gateway
    actor Tech as Field Technician
    actor Cust as Customer

    Dispatcher->>Console: Open Visual Dispatch Board (Filter Zone: Metro North)
    Console->>API: GET /v1/field-service/dispatch/timeline?zone=Metro-North
    API->>DB: Query active technicians, open work orders, van trunk stock
    DB-->>API: Return schedule matrix & GPS coordinates
    API-->>Console: Render Gantt timeline + Map pins

    Dispatcher->>Console: Drag Unassigned Work Order #WO-4081 to Tech "Rahul Sharma" (14:00 Slot)
    Console->>API: POST /v1/field-service/dispatch/assign
    API->>Engine: Validate Constraints (Skill certified? Van stock present? Shift open?)
    
    alt Constraints Passed
        Engine-->>API: Validation OK (100% Match)
        API->>DB: Update WorkOrder (Status: ASSIGNED, timeSlot: 14:00-16:00)
        API->>WA: Send Tech assignment WhatsApp
        API->>WA: Send Customer confirmation WhatsApp
        WA-->>Tech: 📲 New Job Card #WO-4081 (Customer Address & Parts Required)
        WA-->>Cust: 📲 Engineer Rahul Sharma allocated (ETA: 14:00)
        API-->>Console: 200 OK (Schedule Updated with Blue Pin)
    else Missing Van Stock
        Engine-->>API: Warning: Required Part "BLDC Motor" not in Van Trunk
        API-->>Console: 409 Conflict: Alert dispatcher to allocate from Regional Hub
    end
```

---

## 4. Pillar 2: Serialized Defective RMA Exchange State Machine

```mermaid
stateDiagram-v2
    [*] --> WITH_TECHNICIAN: Defective part pulled on-site (Defective Serial Out scanned)
    WITH_TECHNICIAN --> DROPPED_AT_LOCAL_HUB: Tech hands over component at end-of-day
    DROPPED_AT_LOCAL_HUB --> IN_TRANSIT_TO_RMA: Consolidated in logistics dispatch batch
    IN_TRANSIT_TO_RMA --> RECEIVED_AT_CENTRAL_DEPOT: Central Depot scans RMA barcode
    
    state AuditBranch <<choice>>
    RECEIVED_AT_CENTRAL_DEPOT --> AuditBranch: Technical bench inspection
    
    AuditBranch --> ACCEPTED_FOR_REFURBISHMENT: Genuine failure confirmed (Claim Approved)
    AuditBranch --> SCRAPPED_RECYCLED: Beyond repair (Claim Approved)
    AuditBranch --> REJECTED_WARRANTY_DENIED: Counterfeit / Physical abuse detected
    
    ACCEPTED_FOR_REFURBISHMENT --> [*]
    SCRAPPED_RECYCLED --> [*]
    REJECTED_WARRANTY_DENIED --> [*]: Warranty chargeback applied to Partner
```

---

## 5. Pillar 3: AMC & Preventive Maintenance (PPM) Cron Engine

```mermaid
flowchart TD
    CronTrigger["Daily Midnight Cron Trigger (00:00 UTC)"] --> QueryContracts["Query Active MaintenanceContracts (AMC/CMC)"]
    QueryContracts --> CheckSchedules["Scan MaintenanceSchedule rows where due_date <= NOW + 14 Days"]
    
    CheckSchedules --> IsGenerated{"Work Order Already Generated?"}
    IsGenerated -- Yes --> Skip["Skip (Already Scheduled)"]
    IsGenerated -- No --> GenWO["Generate WorkOrder (type: PREVENTIVE_MAINTENANCE)"]
    
    GenWO --> LinkWO["Link WorkOrder ID to MaintenanceSchedule (Status: QUEUED)"]
    LinkWO --> AttachChecklist["Attach Model Service Checklist (e.g. Filters, Calibration, Lubrication)"]
    AttachChecklist --> NotifyCust["Dispatch WhatsApp: Your Annual Service Visit is due in 14 days"]
    NotifyCust --> Done["Awaiting Dispatch Allocation"]
```

---

## 6. Pillar 5: Customer Live Tracking & Interactive Rescheduling Flow

```mermaid
sequenceDiagram
    autonumber
    actor Tech as Field Technician
    participant Mobile as Tech Mobile Web / App
    participant API as Orbit Operations Core
    participant WA as WhatsFlow Engine
    actor Cust as End Customer
    participant TrackingPage as Live Tracking Portal

    Tech->>Mobile: Tap "Start Traveling to Customer"
    Mobile->>API: PATCH /v1/field-service/work-orders/:id/status (TRAVELING)
    API->>API: Generate secure one-time tracking token (e.g. tk_9921e4a)
    API->>WA: Dispatch WhatsApp with Tracking URL
    WA-->>Cust: 📲 "Engineer Rahul is en route! Track arrival here: https://track.orbit.io/live/tk_9921e4a"

    Cust->>TrackingPage: Click secure tracking link
    TrackingPage->>API: GET /v1/public/track/tk_9921e4a
    API-->>TrackingPage: Return Tech Photo, Rating, Vehicle No, Destination & Live ETA (22 mins)
    TrackingPage-->>Cust: Interactive Map renders technician pin and live countdown

    alt Customer Needs Reschedule
        Cust->>TrackingPage: Tap "Reschedule Visit"
        TrackingPage->>API: POST /v1/public/track/tk_9921e4a/reschedule (Slot: Tomorrow 10:00)
        API->>API: Shift WorkOrder to Tomorrow 10:00 & Unassign Tech
        API->>WA: Notify Tech of Rescheduled Job
        API->>WA: Confirm New Slot to Customer
    end
```
