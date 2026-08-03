========================================================================
    ITDR SHIELD - IDENTITY THREAT DETECTION & RESPONSE PLATFORM
                    MVP1 SCOPE WALKTHROUGH & DESIGN
========================================================================

Welcome to the ITDR Shield Platform. This document outlines the design, 
capabilities, and data collection specifications for the MVP1 Scope.

------------------------------------------------------------------------
1. MVP1 SCOPE OVERVIEW
------------------------------------------------------------------------
The core goal of MVP1 is the ingestion of external threat intelligence 
and security bulletins, and auditing the environment's posture against
these threats using static configurations and logs collected from 
13 Scoped Systems. 

All live telemetry streaming, simulation triggers, and knowledge graphs
are relegated to MVP2 scope. A sliding switch ("MVP1 Scope Only") is
built into the UI top control bar to hide all MVP2-scoped tabs (alerts,
telemetry, ueba, graph, simulator) and focus the workspace exclusively
on MVP1 operations.

------------------------------------------------------------------------
2. THE 13 SCOPED DATA INPUTS (DATA COLLECTION)
------------------------------------------------------------------------
ITDR Shield consolidates event telemetry from 13 enterprise security 
platforms. Each platform maps to an explicit, individual relational 
table in SQL Server, seeded with sample JSON logs:

1. Active Directory (On-Prem) -> Table: [ad_events]
   - Records local domain security events, logon successes, and lockouts.
   - Core Fields: event_id, timestamp, event_type, identity_user, success.

2. Entra ID (Azure AD Cloud) -> Table: [entra_signin_logs]
   - Records cloud authentication, MFA status, and application access.
   - Core Fields: id, timestamp, user_principal_name, ip_address, mfa_used.

3. AWS Cloud -> Table: [aws_cloudtrail_logs]
   - Records AWS API calls, S3 access, and IAM privilege escalations.
   - Core Fields: event_id, event_time, event_name, user_identity, resource_arn.

4. HashiCorp Vault -> Table: [vault_audit_logs]
   - Tracks authentication token generation and secrets engine queries.
   - Core Fields: id, timestamp, request_path, entity_id, client_token_hash.

5. BeyondTrust (PAM) -> Table: [beyondtrust_session_logs]
   - Audits privileged access management (PAM) login session recordings.
   - Core Fields: session_id, login_time, duration_sec, command_run.

6. Data Lake (Databricks) -> Table: [databricks_audit_logs]
   - Tracks data query workspace sessions and database accesses.
   - Core Fields: session_id, timestamp, user_email, query_statement.

7. Elasticsearch -> Table: [elasticsearch_audit_logs]
   - Logs security integrations, API keys, and search policy modifications.
   - Core Fields: log_id, timestamp, api_key_name, index_modified.

8. AI Vector Database -> Table: [vector_search_logs]
   - Monitors neural search index updates and semantic model write blocks.
   - Core Fields: query_id, timestamp, user_role, cosine_similarity_score.

9. Defender for Identity (MDI) -> Table: [mdi_security_alerts]
   - Captures Active Directory lateral movement and credential abuses.
   - Core Fields: alert_id, timestamp, alert_type, compromised_entity.

10. Entra ID Protection -> Table: [entra_risk_detections]
    - Identifies cloud identity leaks, impossible travel, and spray risks.
    - Core Fields: risk_id, timestamp, detection_type, risk_level.

11. Wiz.io -> Table: [wiz_vulnerability_issues]
    - Maps cloud infrastructure exposures and insecure role configurations.
    - Core Fields: issue_id, resource_name, severity, remediation_steps.

12. SentinelOne -> Table: [sentinelone_threat_activities]
    - Logs endpoint detection and response (EDR) local server compromises.
    - Core Fields: activity_id, timestamp, agent_hostname, process_blocked.

13. Azure Platform -> Table: [azure_activity_logs]
    - Tracks Azure Resource Manager (ARM) deployments and RBAC role updates.
    - Core Fields: operation_id, event_timestamp, caller_identity, status.

------------------------------------------------------------------------
3. MVP1 COMPONENT WALKTHROUGH
------------------------------------------------------------------------

A. External Threat Ingestion
   - Location: "Threat Ingestion" tab.
   - Ingests feeds from external CTI repositories and RSS feeds (like
     Daily Green).
   - Feeds can be added, enabled/disabled, or manually constructed.

B. Threat Registry
   - Location: "Threats Registry" tab.
   - Displays all threat bulletins with dynamic, deterministic compliance 
     scores calculated based on severe techniques.
   - Click "Details" next to any bulletin to jump directly to its Visual 
     Mapping dashboard.

C. Ingestion History & SQL Data Viewer
   - Location: "Ingestion History" tab.
   - A dynamic split panel:
     * Left sidebar: Select any of the 13 Scoped Systems.
     * Right viewer: Directly pulls and displays the top 50 log records 
       for that system from the SQL Server database.

D. Defensive Spec & Mitigation Engine
   - Location: "Defensive Spec" tab.
   - Maps MITRE ATT&CK techniques found in threat intel to D3FEND 
     countermeasures.
   - Runs automated posture checks against the 13 scoped tables to verify 
     compliance.

------------------------------------------------------------------------
4. HOW TO RUN THE MVP1 STACK LOCALLY
------------------------------------------------------------------------
Prerequisites: Python 3.10+ and standard browser.

1. Install Dependencies:
   cd backend
   pip install -r requirements.txt

2. Run Web API Server:
   python -m uvicorn backend.app:app --host 127.0.0.1 --port 8001

3. Access Frontend:
   Open http://127.0.0.1:8001/ in your browser.

------------------------------------------------------------------------
5. MVP1 SYSTEM PROCESS FLOW
------------------------------------------------------------------------
The following diagram maps the step-by-step logical sequence of how threat
intelligence, D3FEND mappings, and local log verification flow through the 
relational layers:

     [ External CTI / RSS Feeds ] (e.g. Daily Green, CISA Alerts)
                   │
                   ▼
         [ 1. Ingestion Engine ] ─────────► Store in [threat_bulletins]
                   │
                   ▼
     [ 2. MITRE Technique Extractor ] ──► Parser regex (T1078.004, etc.)
                   │
                   ▼
     [ 3. D3FEND Defensive Mapper ] ────► Map to countermeasures (d3f:MFA)
                   │
                   ▼
       [ 4. SQL Posture Auditor ]
                   │
                   ├─► Query 13 Scoped log tables (ad_events, vault_logs)
                   ├─► Audit configuration states & event warnings
                   │
                   ▼
    [ 5. Dynamic Compliance Engine ] ───► Calculates bulletin ratings
                   │
                   ▼
      [ 6. Operator Tabular Viewer ]
                    ├─► Ingestion History: Browse raw SQL logs
                    └─► Registry: Inspect compliance details

------------------------------------------------------------------------
6. SAMPLES OF LLM INGESTION INPUT, OUTPUT & PIPELINE STEPS
------------------------------------------------------------------------

A. SAMPLE RAW CTI INPUT (Ingested via RSS or Bulletin Creator)
------------------------------------------------------------------------
"ADVISORY: TB-2026-4030 Cloud Credential Abuse observed by APT29. 
We have observed Scattered Spider conducting password spraying attacks 
targeting Entra ID cloud logins (T1110.003). After gaining access, the 
threat actor was seen using valid administrative accounts (T1078.004) 
to modify federated trust settings and exfiltrate data from Databricks 
metastores and AWS S3 Buckets (T1537)."

B. SAMPLE LLM PARSED JSON OUTPUT (Generated by Ollama Llama3 / Fallback)
------------------------------------------------------------------------
{
  "bulletin_id": "TB-2026-4030",
  "title": "Cloud Credential Abuse & Data Exfiltration",
  "threat_actors": ["APT29", "Scattered Spider"],
  "impact_rating": "HIGH",
  "summary": "APT29 and Scattered Spider leveraged password spraying and valid cloud accounts to compromise Entra ID, access data stores, and exfiltrate datalake assets.",
  "observed_behaviors": [
    {
      "description": "Password spraying targeting cloud endpoints",
      "mitre_attack_suggested": ["T1110.003"]
    },
    {
      "description": "Administrative credential hijacking",
      "mitre_attack_suggested": ["T1078.004"]
    },
    {
      "description": "Data exfiltration from Databricks metastores & S3 Buckets",
      "mitre_attack_suggested": ["T1537"]
    }
  ]
}

C. PIPELINE EXECUTION STEPS EXPLAINED
------------------------------------------------------------------------
Once the JSON object is generated, the pipeline executes the following 
steps automatically:

Step 1: MITRE ATT&CK Extraction
  - Extracts raw technique IDs: ["T1110.003", "T1078.004", "T1537"].

Step 2: D3FEND Countermeasure Mapping
  - Maps Technique IDs to D3FEND security countermeasure specifications:
    * T1110.003  ──► d3f:CredentialAccessAuditing
    * T1078.004  ──► d3f:MultiFactorAuthentication
    * T1537      ──► d3f:DataTransferSanitization

Step 3: Database Posture Auditing
  - ITDR Shield queries the relevant tables from the 13 Scoped Systems 
    to verify if the defense countermeasure is active:
    * Query `entra_signin_logs` to verify if MFA was enforced.
    * Query `databricks_audit_logs` or `aws_cloudtrail_logs` to check 
      if data transfer boundaries are configured.
    * Check if risk events exist in `entra_risk_detections`.

Step 4: Dynamic Compliance Calculation
  - Computes the dynamic compliance rate based on the ratio of active 
    mitigations versus identified gaps.
  - Updates the Threats Registry and Compliance Reports Index in real-time.

------------------------------------------------------------------------
7. CODES & SCHEMAS FOR PIPELINE EXTRACTION STEPS 3 & 4
------------------------------------------------------------------------

A. PIPELINE PYTHON SAMPLE CODE (Threat intel parser -> mapper -> database check)
------------------------------------------------------------------------
```python
# Extract MITRE ATT&CK Technique IDs from bulletin text
def extract_techniques(bulletin_content: str) -> list[str]:
    return re.findall(r"T\d{4}(?:\.\d{3})?", bulletin_content)

# Map extracted techniques to D3FEND Countermeasures (Step 3 Output)
def map_techniques_to_d3fend(technique_ids: list[str]) -> list[dict]:
    spec = []
    for tid in technique_ids:
        if tid == "T1078.004":
            spec.append({
                "attack_technique": "T1078.004",
                "attack_name": "Valid Accounts: Cloud Accounts",
                "d3fend_countermeasures": [{
                    "d3fend_id": "D3-MFA",
                    "name": "Multi-Factor Authentication Enforcement",
                    "verification_script": "Get-MgUserAuthenticationMethod",
                    "target_infrastructure": "Microsoft Entra ID"
                }]
            })
    return spec

# Audit D3FEND countermeasures against Scoped Database tables (Step 4 Output)
def audit_countermeasures(defensive_spec: list[dict], sql_conn) -> list[dict]:
    audit_results = []
    for spec in defensive_spec:
        for cm in spec["d3fend_countermeasures"]:
            cm_id = cm["d3fend_id"]
            status = "Secured"
            details = "Baseline verified compliant. Security control active."
            
            # Check Active Directory
            if cm_id == "D3-CredentialRotation":
                res = sql_conn.fetch_all("SELECT COUNT(*) as cnt FROM ad_events WHERE success = 0")
                if res and res[0]["cnt"] > 10:
                    status = "Gap Detected"
                    details = f"Account Lockout Gap: {res[0]['cnt']} password spray failures."
            
            # Check Entra ID
            elif cm_id == "D3-MFA":
                res = sql_conn.fetch_all("SELECT COUNT(*) as cnt FROM entra_signin_logs WHERE success = 0")
                if res and res[0]["cnt"] > 5:
                    status = "Gap Detected"
                    details = f"MFA Fatigue/Bypass Gap: {res[0]['cnt']} unverified logins."

            audit_results.append({
                "countermeasure_id": cm_id,
                "countermeasure_name": cm["name"],
                "status": status,
                "details": details,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            })
    return audit_results
```

B. AUDIT CHECKS AGAINST EACH SOURCE (Step 3 & 4 Targets)
------------------------------------------------------------------------
The platform runs targeted SQL audits against each system log table:
*   `ad_events` (Active Directory): Audits failed login count to identify 
    brute force/spraying risks.
*   `entra_signin_logs` (Entra ID): Audits failed MFA challenge events to 
    detect bypass fatigue.
*   `vault_audit_logs` (HashiCorp): Monitors request paths for access token 
    creations by non-admin identities.
*   `databricks_audit_logs` (Data Lake): Scrapes select database queries 
    accessing restricted metastores.
*   `aws_cloudtrail_logs` (AWS): Scans trail logs for anonymous public bucket 
    policy creations.
*   `azure_activity_logs` (Azure Platform): Scans for RBAC administrative role 
    deletions/modifications.
*   `beyondtrust_session_logs` (BeyondTrust): Audits active session records for 
    non-standard shell commands.
*   `elasticsearch_audit_logs` (Elastic): Scans for SIEM agent indexing failures 
    and deleted indices.
*   `vector_search_logs` (AI Vector DB): Audits query requests for abnormal semantic 
    model overwrite denials.
*   `mdi_security_alerts` (MDI): Audits DCSync alerts and directory service attack 
    logs.
*   `entra_risk_detections` (Entra ID Protection): Audits impossible travel and 
    risk-level promotions.
*   `wiz_vulnerability_issues` (Wiz.io): Scrapes exposed VMs and unpatched cloud 
    resource profiles.
*   `sentinelone_threat_activities` (S1): Audits EDR endpoint alerts for active 
    payload execution blocks.

C. STEP 3 OUTPUT DATA SCHEMA (D3FEND Mappings Specification)
------------------------------------------------------------------------
Generated format from Technique mapping:
```json
[
  {
    "attack_technique": "T1078.004",
    "attack_name": "Valid Accounts: Cloud Accounts",
    "d3fend_countermeasures": [
      {
        "d3fend_id": "D3-MFA",
        "name": "Multi-Factor Authentication Enforcement",
        "verification_script": "Powershell: Get-MgUserAuthenticationMethod -UserId admin@scb.com",
        "target_infrastructure": "Microsoft Entra ID / AWS IAM"
      }
    ]
  }
]
```

D. STEP 4 OUTPUT DATA SCHEMA (Audit Results Log payload)
------------------------------------------------------------------------
Saved to [audit_results] table to calculate the compliance rates:
```json
[
  {
    "countermeasure_id": "D3-MFA",
    "countermeasure_name": "Multi-Factor Authentication Enforcement",
    "status": "Gap Detected",
    "details": "MFA Bypass/Fatigue Gap: Detected 7 unverified sign-in attempts in Entra ID sign-in logs.",
    "timestamp": "2026-07-27T11:20:00Z"
  }
]
```
========================================================================

------------------------------------------------------------------------
12. ITDR 3-LAYER RULE ENGINE: ATTACK TYPES FILTER AUDIT REPORT
------------------------------------------------------------------------
Out of 699 global Enterprise Attack Types in the specification:
* Active & Monitored in Database: 639 Attack Types (91.4% Active Coverage)
* Filtered Off / Out of Digital Telemetry Scope: 60 Attack Types (8.6% Filtered Off)
* Total Executable T-SQL Rules: 2,078 Executable Rules across 13 Enterprise Systems

GLOBAL ENTERPRISE ATTACK TYPES SPECIFICATION: 699 ATTACK TYPES
├── Active & Monitored in DB: 639 Attack Types (91.4%)
│   └── Executed via 2,078 T-SQL Audit Rules
└── Filtered Off / Out of Digital Telemetry Scope: 60 Attack Types (8.6%)
    └── Physical, Hardware, Optical, and Out-of-Band RF Telemetry

Why 60 Attack Types are Filtered Off:
The 60 filtered-off attack types represent non-digital physical or out-of-band threat vectors:
1. Physical & Environmental Security: Badge Cloning, Physical Facility Break-In, Hardware Theft.
2. Hardware & RF Interception: TEMPEST Electromagnetic Radiation, Optical/Laser Microphones.
3. Physical Firmware EEPROM Flashing: Physical EEPROM SPI Microcode Flashing.

Breakdown of 2,078 Executable T-SQL Rules across 13 Enterprise Source Systems:
* EDR / OS Event Logs: 595 Rules
* CIS / NIST Control Libraries: 538 Rules
* SailPoint IGA: 210 Rules
* Wiz.io CSPM: 134 Rules
* BeyondTrust PAM: 124 Rules
* HashiCorp Vault: 110 Rules
* GCP Cloud: 75 Rules
* Azure Cloud: 66 Rules
* AWS Cloud: 64 Rules
* Active Directory: 46 Rules
* Defender for Identity (MDI): 46 Rules
* Entra ID & Risk Protection: 70 Rules
========================================================================

------------------------------------------------------------------------
13. BLAST RADIUS ENGINES ARCHITECTURAL SPECIFICATION DOCUMENT
------------------------------------------------------------------------
A comprehensive executive technical document detailing the operational 
differences, T-SQL 5-hop recursive CTE algorithms, relational database 
table schemas, and multi-plane telemetry connections across all three 
Blast Radius engines has been generated at:

File Path: ITDR_Blast_Radius_Engines_Architecture.html

Engines Detailed:
1. Standard Graph Blast Radius (Identity-focused user privilege propagation)
2. 3-Layer Rule Engine Blast Radius (Single entry entity 5-hop CTE blast)
3. Threat Bulletin All-Entry Blast Radius (Multi-entry cumulative threat blast)
========================================================================

------------------------------------------------------------------------
14. ENTERPRISE DATA SOURCES & USAGE ARCHITECTURE DOCUMENT
------------------------------------------------------------------------
An exhaustive technical reference specifying all 13 enterprise telemetry 
sources, relational dataset schemas across 24 SQL tables, known PowerShell 
and REST extraction methods, and precise application usage across the 2,078 
executable T-SQL security audit rules has been generated at:

File Path: ALL_DATASource_and_USAGE.html

13 Enterprise Telemetry Sources Detailed:
 1. Active Directory (On-Premises) -> [ad_events], [ad_users], [ad_gpo_reports]
 2. Entra ID / Azure AD (Cloud)    -> [entra_signin_logs], [entra_role_assignments]
 3. AWS Cloud (CloudTrail & IAM)   -> [aws_cloudtrail_events], [aws_iam_policies]
 4. Azure Cloud (Activity & RBAC)  -> [azure_activity_logs], [azure_rbac_assignments]
 5. GCP Cloud (Audit Logs & IAM)   -> [gcp_audit_logs], [gcp_iam_bindings]
 6. HashiCorp Vault (Secrets/KV)   -> [vault_audit_logs], [vault_acl_policies]
 7. BeyondTrust PAM (Bastion)      -> [beyondtrust_session_logs], [beyondtrust_active_sessions]
 8. SailPoint IGA (Governance)     -> [sailpoint_identity_events], [sailpoint_identities]
 9. Wiz.io CSPM (Toxic Issues)     -> [wiz_vulnerability_issues], [wiz_issues]
10. Defender for Identity (MDI)    -> [defender_identity_alerts], [mdi_security_alerts]
11. SentinelOne / EDR (Host Logs)  -> [sentinelone_threat_activities], [compliance_benchmark_reports]
12. Elastic SIEM (SIEM Audit)      -> [elasticsearch_audit_logs]
13. Vector DB / AI Query Logs      -> [vector_search_logs]
========================================================================

------------------------------------------------------------------------
15. ATTACK POINTS GENERATION & MULTI-HOP LAYER TRAVERSAL SPECIFICATION
------------------------------------------------------------------------
A technical document detailing the 5 attack point types generated by 
the application, the step-by-step layer traversal mechanics for discovering 
next hops, production Python/T-SQL source code for all three blast radius 
engines, the construction of table security_blast_radius_edges, the source 
files used (CSV, bank_topology.json, AD, AWS, Azure, GCP, Vault, PAM, Wiz), 
and interactive SVG flowcharts has been generated at:

File Path: Blast_Radius_flow.html

Key Topics & Data Pipelines Detailed:
 1. 5 Attack Point Types (User Identity, Compute, Service Principal, Vault, PAM)
 2. Layer Traversal Mechanics (Hop 0 -> Hop 1 -> Hop 2 -> Hop 3 -> Hop 4 -> Hop 5)
 3. DDL & Construction of [security_blast_radius_edges] Table
 4. Source Files Ingested (bank_topology.json, threat_blast_radius_data_spec.csv)
 5. Python Data Pipeline (BlastRadiusDataGenerator & _build_topological_blast_radius_edges)
========================================================================

------------------------------------------------------------------------
16. ENTERPRISE BANK TOPOLOGY CREATION & EXTRACTION GUIDE
------------------------------------------------------------------------
An operational handbook instructing security operations, cloud admins, 
and IT teams on how to extract raw telemetry from 13 enterprise systems, 
format topology inputs, and digest data into the foundational graph store 
[bank_topology.json] & [security_blast_radius_edges] has been generated at:

File Path: BankTopologyCreator.html

Features & Concrete System Mappings Detailed:
 1. Executive Concept: Bank Topology as Foundational Graph Base
 2. Concrete JSON Samples for all 13 Enterprise Systems (AD, Entra, AWS, Azure, GCP, Vault, PAM, IGA, Wiz, MDI, EDR, SIEM, Vector DB)
 3. Field-by-Field Graph Mapping (Nodes Generated, Edges Synthesized, Hop Levels 0 to 5)
 4. Ready-to-Run Extraction Commands (PowerShell, AWS/Azure/GCP CLI, REST & GraphQL APIs)
 5. Standalone SQL DB Builder: [backend/db/sql_topology_builder.py] (Truncates & Re-creates [sql_topology_nodes] & [security_blast_radius_edges] with optional --generate-json flag)
========================================================================

------------------------------------------------------------------------
17. SQLITE DATABASE SUPPORT, CONSOLIDATED DDL & JSON DUMPS
------------------------------------------------------------------------
The platform now includes full portable SQLite 3 database support as a 
configurable backend option alongside Microsoft SQL Server.

Key SQLite Modules & Artifacts:
 1. Consolidated SQLite DDL Schema: [backend/db/sqlite_schema.sql]
 2. Database JSON Exporter: [backend/db/export_db_to_json.py] 
    (Exports all SQL Server tables to [backend/db/json_dumps/*.json])
 3. SQLite Database Loader: [backend/db/sqlite_loader.py] 
    (Initializes [backend/itdr_3layer.db] and imports all JSON dumps)
 4. SQLite Connector: [backend/db/sqlite_conn.py]
 5. Dynamic DB Factory Router: [backend/db/db_factory.py]
    (Switch engines using environment variable: DB_ENGINE="sqlite" or "sqlserver")

Execution Instructions for Fresh Environments:
 1. Export SQL Server to JSON Dumps: python -m backend.db.export_db_to_json
 2. Load JSON Dumps into SQLite DB:  python -m backend.db.sqlite_loader
========================================================================

------------------------------------------------------------------------
18. VS CODE AGENT INSTALLATION GUIDE & LIGHT MODE THEME FIXES
------------------------------------------------------------------------
A standalone setup manual tailored for AI Coding Agents and systems 
engineers to autonomously install, configure, choose the DB engine at 
startup, and execute the ITDR platform inside VS Code has been created at:

File Path: readme_Inst.txt

Features & Fixes Detailed:
 1. Executive Directive for AI Agents & Developers
 2. Startup Database Selection (Option 1: SQLite 3 vs. Option 2: SQL Server)
 3. VS Code Prerequisites & Environment Setup Commands
 4. Direct Formatted LLM JSON Ingestion Point: [POST /api/ingest/threat-bulletin-json]
 5. Light Mode Theme Fixes: All LitElement widgets, stepper containers, tables, 
    nav buttons, code blocks, and math cards updated to adapt to light theme CSS variables.
========================================================================




