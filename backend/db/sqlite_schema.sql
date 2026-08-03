-- Consolidated SQLite Database Schema Definition for ITDR 3-Layer Platform
-- Database Engine: SQLite 3

-- 1. Core Rule Base & Audit Queries
CREATE TABLE IF NOT EXISTS rule_vulnerability_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_system TEXT,
    target_table_name TEXT,
    attack_id TEXT,
    attack_technique TEXT,
    d3fend_control TEXT,
    data_to_extract TEXT,
    vulnerability_audit_criteria TEXT,
    remediation_command TEXT,
    query_number INTEGER,
    gen_query TEXT,
    llm_query TEXT,
    active_query TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Security Blast Radius Graph Edges (5-Hop Traversal)
CREATE TABLE IF NOT EXISTS security_blast_radius_edges (
    edge_id TEXT PRIMARY KEY,
    source_entity TEXT,
    source_type TEXT,
    target_entity TEXT,
    target_type TEXT,
    relationship_type TEXT,
    hop_count INTEGER DEFAULT 1,
    criticality_weight REAL DEFAULT 1.0,
    sensitivity_weight REAL DEFAULT 1.0,
    raw_edge_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. SQL Topology Nodes
CREATE TABLE IF NOT EXISTS sql_topology_nodes (
    node_id TEXT PRIMARY KEY,
    node_name TEXT,
    node_type TEXT,
    tier TEXT DEFAULT 'Tier1',
    risk_score REAL DEFAULT 1.0,
    source_table TEXT,
    properties_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Threat Bulletins Metadata
CREATE TABLE IF NOT EXISTS threat_bulletins (
    bulletin_id TEXT PRIMARY KEY,
    title TEXT,
    cve_id TEXT,
    cvss_score REAL,
    severity TEXT,
    vendor TEXT,
    affected_component TEXT,
    description TEXT,
    mitre_tactics TEXT,
    mitre_techniques TEXT,
    llm_summary TEXT,
    ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Audit Results Log
CREATE TABLE IF NOT EXISTS audit_results (
    audit_id TEXT PRIMARY KEY,
    rule_id INTEGER,
    source_system TEXT,
    target_table TEXT,
    violation_count INTEGER,
    status TEXT,
    audit_details TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Active Directory Telemetry Tables
CREATE TABLE IF NOT EXISTS ad_events (
    event_id TEXT PRIMARY KEY,
    timestamp TEXT,
    event_type TEXT,
    identity_user TEXT,
    identity_type TEXT,
    source_ip TEXT,
    geo_location TEXT,
    success INTEGER,
    risk_score REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ad_users (
    user_id TEXT PRIMARY KEY,
    sam_account_name TEXT,
    display_name TEXT,
    dn TEXT,
    user_principal_name TEXT,
    enabled INTEGER DEFAULT 1,
    password_last_set TEXT,
    member_of TEXT,
    service_principal_names TEXT,
    user_account_control INTEGER,
    risk_score REAL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS ad_gpo_reports (
    gpo_id TEXT PRIMARY KEY,
    display_name TEXT,
    domain_name TEXT,
    created_time TEXT,
    modified_time TEXT,
    status TEXT,
    security_filter TEXT,
    settings_summary TEXT
);

-- 7. Entra ID Telemetry Tables
CREATE TABLE IF NOT EXISTS entra_signin_logs (
    event_id TEXT PRIMARY KEY,
    timestamp TEXT,
    event_type TEXT,
    user_principal_name TEXT,
    app_display_name TEXT,
    client_app_used TEXT,
    ip_address TEXT,
    location TEXT,
    status_failure_reason TEXT,
    risk_detail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entra_role_assignments (
    assignment_id TEXT PRIMARY KEY,
    principal_id TEXT,
    principal_name TEXT,
    principal_type TEXT,
    role_definition_id TEXT,
    role_name TEXT,
    scope TEXT,
    assigned_date TEXT
);

-- 8. AWS Telemetry Tables
CREATE TABLE IF NOT EXISTS aws_cloudtrail_events (
    event_id TEXT PRIMARY KEY,
    event_time TEXT,
    event_name TEXT,
    event_source TEXT,
    user_identity_arn TEXT,
    aws_region TEXT,
    source_ip_address TEXT,
    user_agent TEXT,
    request_parameters TEXT,
    response_elements TEXT
);

CREATE TABLE IF NOT EXISTS aws_iam_policies (
    policy_id TEXT PRIMARY KEY,
    policy_name TEXT,
    policy_arn TEXT,
    entity_name TEXT,
    entity_type TEXT,
    policy_document TEXT,
    is_admin_policy INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS aws_ec2_instances (
    instance_id TEXT PRIMARY KEY,
    private_ip TEXT,
    public_ip TEXT,
    vpc_id TEXT,
    subnet_id TEXT,
    security_groups TEXT,
    iam_instance_profile TEXT,
    tags TEXT,
    environment TEXT,
    data_sensitivity TEXT
);

CREATE TABLE IF NOT EXISTS aws_s3_buckets (
    bucket_name TEXT PRIMARY KEY,
    vpc_restriction_id TEXT,
    is_public INTEGER DEFAULT 0,
    bucket_policy TEXT,
    kms_key_id TEXT,
    tags TEXT,
    data_classification TEXT
);

-- 9. Azure Telemetry Tables
CREATE TABLE IF NOT EXISTS azure_activity_logs (
    event_id TEXT PRIMARY KEY,
    event_time TEXT,
    operation_name TEXT,
    category TEXT,
    caller TEXT,
    resource_id TEXT,
    status TEXT,
    sub_status TEXT
);

CREATE TABLE IF NOT EXISTS azure_rbac_assignments (
    assignment_id TEXT PRIMARY KEY,
    principal_name TEXT,
    role_definition_name TEXT,
    scope TEXT,
    principal_type TEXT
);

CREATE TABLE IF NOT EXISTS azure_virtual_machines (
    vm_id TEXT PRIMARY KEY,
    vm_name TEXT,
    resource_group TEXT,
    private_ip TEXT,
    public_ip TEXT,
    subnet_id TEXT,
    nsg_id TEXT,
    managed_identity_id TEXT,
    tags TEXT
);

CREATE TABLE IF NOT EXISTS azure_key_vaults (
    vault_id TEXT PRIMARY KEY,
    vault_name TEXT,
    resource_group TEXT,
    access_policies TEXT,
    network_acls TEXT,
    secret_names TEXT,
    is_public_access INTEGER DEFAULT 0
);

-- 10. GCP Telemetry Tables
CREATE TABLE IF NOT EXISTS gcp_audit_logs (
    event_id TEXT PRIMARY KEY,
    timestamp TEXT,
    method_name TEXT,
    principal_email TEXT,
    resource_name TEXT,
    severity TEXT
);

CREATE TABLE IF NOT EXISTS gcp_iam_bindings (
    binding_id TEXT PRIMARY KEY,
    role TEXT,
    member TEXT,
    resource_name TEXT
);

-- 11. HashiCorp Vault Telemetry Tables
CREATE TABLE IF NOT EXISTS vault_audit_logs (
    event_id TEXT PRIMARY KEY,
    timestamp TEXT,
    operation TEXT,
    client_token_accessor TEXT,
    path TEXT,
    client_ip TEXT
);

CREATE TABLE IF NOT EXISTS vault_acl_policies (
    policy_id TEXT PRIMARY KEY,
    policy_name TEXT,
    path_pattern TEXT,
    capabilities TEXT
);

-- 12. BeyondTrust PAM Telemetry Tables
CREATE TABLE IF NOT EXISTS beyondtrust_session_logs (
    session_id TEXT PRIMARY KEY,
    start_time TEXT,
    user_name TEXT,
    system_name TEXT,
    account_name TEXT,
    ticket_number TEXT
);

CREATE TABLE IF NOT EXISTS beyondtrust_active_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT,
    target_system TEXT,
    account_used TEXT,
    checkout_time TEXT,
    status TEXT
);

-- 13. SailPoint IGA Telemetry Tables
CREATE TABLE IF NOT EXISTS sailpoint_identity_events (
    event_id TEXT PRIMARY KEY,
    timestamp TEXT,
    event_type TEXT,
    identity_name TEXT,
    entitlement_changed TEXT
);

CREATE TABLE IF NOT EXISTS sailpoint_identities (
    identity_id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    lifecycle_state TEXT,
    department TEXT,
    entitlements TEXT
);

-- 14. Wiz CSPM, Defender, SentinelOne, Elastic, Vector DB
CREATE TABLE IF NOT EXISTS wiz_vulnerability_issues (
    issue_id TEXT PRIMARY KEY,
    title TEXT,
    severity TEXT,
    entity_name TEXT,
    entity_type TEXT,
    description TEXT
);

CREATE TABLE IF NOT EXISTS defender_identity_alerts (
    alert_id TEXT PRIMARY KEY,
    timestamp TEXT,
    alert_title TEXT,
    user_name TEXT,
    device_name TEXT,
    severity TEXT
);

CREATE TABLE IF NOT EXISTS sentinelone_threat_activities (
    activity_id TEXT PRIMARY KEY,
    timestamp TEXT,
    agent_name TEXT,
    threat_name TEXT,
    process_path TEXT,
    classification TEXT
);

CREATE TABLE IF NOT EXISTS elasticsearch_audit_logs (
    event_id TEXT PRIMARY KEY,
    timestamp TEXT,
    action TEXT,
    user_name TEXT,
    ip_address TEXT
);

CREATE TABLE IF NOT EXISTS vector_search_logs (
    search_id TEXT PRIMARY KEY,
    timestamp TEXT,
    user_id TEXT,
    query_text TEXT,
    vector_dimension INTEGER,
    top_k_results INTEGER
);
