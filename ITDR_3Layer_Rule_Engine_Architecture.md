# 🛡️ ITDR 3-Layer DB Rule Engine: Architecture, Inputs & Design Spec

## 1. Executive Summary & Purpose

The **ITDR 3-Layer DB Rule Engine** is a real-time Identity Threat Detection & Response (ITDR) analysis framework designed to evaluate Cyber Threat Intelligence (CTI) bulletins against multi-plane enterprise infrastructure telemetry.

Unlike traditional static security scanners or probabilistic AI models, the 3-Layer DB Rule Engine uses **executable T-SQL security audit queries** executed directly against a relational SQL Server database (`ITDR`) to deliver 100% empirical, deterministic threat assessments and 5-hop graph blast radius calculations.

---

## 2. The 3-Layer System Inputs & Design Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: CTI THREAT INGESTION & ATTACK SPECIFICATION                     │
│ Inputs: Threat Bulletins, RSS Feeds, CVE Advisories, STIX 2.1 Attack Flow │
│ Extracted Context: Compromised Entities, Tactic/Technique IDs, Target IPs│
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: MULTI-PLANE TELEMETRY DATABASE (SQL SERVER `ITDR`)              │
│ Inputs: Live / Batch Telemetry across 13 Enterprise Source Systems        │
│ Tables: 24 Relational Telemetry Tables + `security_blast_radius_edges`  │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: 3-LAYER DB RULE ENGINE & T-SQL EXECUTION                        │
│ Core: 2,078 Security Audit T-SQL Queries (`rule_vulnerability_queries`)   │
│ Operations:                                                              │
│  1. Match CTI Threat Bulletin to Target Source System                    │
│  2. Execute Dynamic T-SQL Audit Queries against Layer 2 Telemetry        │
│  3. Execute 5-Hop Recursive CTE Graph Traversal & Blast Radius Formula   │
│  4. Output MITRE D3FEND Countermeasure Gap & Mitigation Reports          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Input Breakdown

### 📥 Input Layer 1: Threat Intelligence & Attack Specs
- **Sources**: Threat Bulletins, RSS feeds (CISA, Microsoft Security, SANS, Wiz, MDI alerts), STIX 2.1 JSON bundles.
- **Attributes**:
  - `bulletin_id` & `title`
  - Threat Actor & Attribution (e.g. APT29, Scattered Spider)
  - Target Platform Scope (M365, Active Directory, AWS, Azure, GCP, Vault, PAM)
  - MITRE ATT&CK Techniques (e.g. T1558.003 Kerberoasting, T1552.005 Cloud Instance Metadata)

### 📥 Input Layer 2: Multi-Plane Infrastructure Telemetry (13 Systems)
Telemetry ingested into 24 structured relational tables in SQL Server DB `ITDR`:
1. **Active Directory**: `ad_users`, `ad_computers_trusts`, `ad_kerberoastable_accounts`, `ad_gpo_reports`
2. **Entra ID (Azure AD)**: `entra_signin_logs`, `entra_service_principals`, `entra_role_assignments`, `entra_groups`, `entra_risky_entities`
3. **AWS Cloud**: `aws_cloudtrail_logs`, `aws_ec2_instances`, `aws_iam_policies`, `aws_security_groups`, `aws_s3_buckets`
4. **Azure Cloud**: `azure_virtual_machines`, `azure_rbac_assignments`, `azure_nsg_rules`, `azure_key_vaults`, `azure_diagnostic_settings`
5. **GCP Cloud**: `gcp_compute_instances`, `gcp_iam_bindings`, `gcp_firewall_rules`, `gcp_storage_datasets`, `gcp_logging_sinks`
6. **HashiCorp Vault**: `vault_audit_logs`, `vault_secret_mounts`, `vault_acl_policies`, `vault_identity_entities`
7. **BeyondTrust PAM**: `beyondtrust_session_logs`, `beyondtrust_managed_assets`, `beyondtrust_active_sessions`, `beyondtrust_user_policies`
8. **SailPoint IGA**: `sailpoint_identities`, `sailpoint_application_accounts`, `sailpoint_access_profiles`
9. **Defender for Identity**: `mdi_security_alerts`, `defender_lateral_movement_paths`, `defender_identity_alerts`
10. **Wiz.io CSPM**: `wiz_cloud_graph`, `wiz_issues`
11. **EDR / Host Telemetry**: `edr_process_events`, `edr_network_connections`, `edr_powershell_scriptblocks`, `edr_registry_file_audits`
12. **Compliance Libraries**: `compliance_benchmark_reports`
13. **Data Lake & Vector Audit**: `databricks_audit_logs`, `elasticsearch_audit_logs`, `vector_search_logs`

### 📥 Input Layer 3: Rule - SQL Query Registry (2,078 Security Audit Queries)
- **Source**: `all_sources_vulnerability_extraction_with_queries.csv` loaded into DB table `rule_vulnerability_queries`.
- **Fields**: `query_id`, `source_system`, `vulnerability_title`, `executable_tsql_query`, `impact_rating`, `mitre_attack_id`, `mitre_d3fend_id`.

---

## 4. Why the Rule - SQL Queries Are Critical

The **Rule - SQL queries** are the backbone of the 3-Layer architecture for four vital reasons:

### 1. 100% Deterministic Empirical Proof (Zero AI Hallucinations)
Instead of relying on LLMs or keyword matching to "guess" whether your environment is vulnerable, Layer 3 executes **exact T-SQL queries directly against live telemetry tables**.
- *Example Query (AD Kerberoasting Check)*:
  ```sql
  SELECT sam_account_name, spn, password_last_set 
  FROM ad_kerberoastable_accounts 
  WHERE is_rc4_enabled = 1;
  ```
- If this query returns rows, it provides **undeniable empirical evidence** of vulnerable RC4-encrypted service accounts.

### 2. High-Performance Audit at Enterprise Scale
Running pre-compiled, indexed T-SQL queries against SQL Server allows evaluating **2,000+ security rules across thousands of servers and user accounts in milliseconds**.

### 3. Powering the 5-Hop Recursive CTE Graph Traversal
The Blast Radius engine executes **Recursive Common Table Expressions (CTE)** against the `security_blast_radius_edges` table:
```sql
WITH BlastRadiusCTE AS (
    -- Anchor Member (Hop 1)
    SELECT source_entity, target_entity, 1 AS hop_depth, criticality_weight, sensitivity_weight
    FROM security_blast_radius_edges
    WHERE source_entity = @EntryEntity

    UNION ALL

    -- Recursive Member (Up to 5 Hops)
    SELECT e.source_entity, e.target_entity, c.hop_depth + 1, e.criticality_weight, e.sensitivity_weight
    FROM security_blast_radius_edges e
    INNER JOIN BlastRadiusCTE c ON e.source_entity = c.target_entity
    WHERE c.hop_depth < 5
)
SELECT * FROM BlastRadiusCTE;
```
This enables real-time mathematical risk calculation:
$$\text{Blast Radius Score} = \sum_{i=1}^{N} \left( \text{Asset Criticality}_i \times \text{Data Sensitivity}_i \times \frac{1}{\text{Hop Depth}_i} \right)$$

### 4. Direct Actionable Countermeasure Mapping (MITRE D3FEND)
Every executed SQL rule is mapped to specific **MITRE D3FEND countermeasures** (`D3-IAM`, `D3-NI`, `D3-PAM`, `D3-AL`), immediately outputting exact remediation steps whenever a query flags an active defense gap.

---

## 5. Summary Matrix

| Architectural Layer | Core Responsibility | Key Inputs | Key Output |
| :--- | :--- | :--- | :--- |
| **Layer 1: CTI Ingestion** | Threat Bulletin Parsing & Context Extraction | Threat Bulletins, RSS, STIX 2.1 | Attack Context & Entry Entities |
| **Layer 2: Telemetry DB** | Multi-Plane Data Persistence & Graph Topology | 13 Enterprise Source Systems (24 Tables) | Relational Records & Graph Edges |
| **Layer 3: DB Rule Engine** | T-SQL Rule Execution & 5-Hop CTE Blast Radius | 2,078 T-SQL Security Audit Queries | Real-Time Vulnerability Detections, Blast Radius Scores & D3FEND Gaps |
