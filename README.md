# Standard Chartered - ITDR 3-Layered Platform

An Enterprise **Identity Threat Detection and Response (ITDR)** platform built using a clean 3-Layered Architecture.

---

## 🏛️ Architecture Layers

### 1. Database Layer (Relational + Graph DB)
- **Relational Database**: Microsoft SQL Server (`DESKTOP-DULJ3LT\SS2025NM`, Database: `ITDR`) via `pyodbc`. Automatically initializes and manages 12 core tables:
  1. `threat_bulletins`
  2. `audit_results`
  3. `rss_feeds`
  4. `system_config`
  5. `identity_events`
  6. `identity_profiles`
  7. `identity_alerts`
  8. `response_actions`
  9. `identity_feeds`
  10. `identity_feed_entries`
  11. `posture_change_logs`
  12. `json_upload_logs`
- **Knowledge Graph Database**: Neo4j local instance (`bolt://localhost:7687`) for identity topology, asset access paths, blast radius calculations, and MITRE ATT&CK technique to D3FEND countermeasure mappings.

### 2. API & Service Layer (Python FastAPI)
- Service layer handling:
  - **Upload Service**: Processes JSON file uploads (events, bulletins, profiles, feeds, bank topology), ingests records into SQL Server DB and Neo4j Graph, and logs audit records in `json_upload_logs`.
  - **Identity Telemetry & UEBA Service**: Processes authentication event streams, risk scores (0-100%), and baseline profile anomalies.
  - **Alert Triage & Playbook Service**: Evaluates 8 detection rules, provides triage workflow, and logs automated Active Directory and Entra ID response playbooks.
  - **Graph Service**: Executes Cypher graph queries and blast radius calculations.
  - **CTI Service**: Manages 37 identity feed collectors and RSS threat bulletins.

### 3. Frontend Layer (Lit + TypeScript Web Components)
- Custom Web Components built with Google's **Lit** framework (`lit`) and **TypeScript**.
- SCB Navy/Teal dark theme styling (`var(--primary-teal)`, `var(--bg-dark)`).
- **Dedicated Screens**:
  - 📤 **Data Management & Upload Screen**: Initialize SQL Server tables, seed default JSON feeds, drag & drop custom JSON file uploader, real-time table record counters.
  - 📡 **Identity Telemetry Stream**: Multi-provider authentication event monitor with live search and risk filtering.
  - 👤 **UEBA Risk Profiles**: Identity risk scores, baseline vs current risk meters, and anomalous hours/locations tracking.
  - 🚨 **Alerts & Playbook Response**: Incident triage dashboard and automated containment action triggers.
  - 🕸️ **Knowledge Graph Visualizer**: Interactive topology, user access paths, blast radius analyzer.
  - 🌐 **External CTI Collectors**: 37 identity feed collectors and advisory feeds.
  - ⚡ **Attack Simulator**: Real-time attack scenario injector (Brute Force, Impossible Travel, Privilege Escalation, MFA Fatigue).

---

## 🚀 How to Run

1. Double-click `start.bat` in the project root directory.
2. The batch script will verify Python dependencies, start the FastAPI server on `http://localhost:8001`, and open your default browser.
