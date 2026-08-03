import pyodbc
import logging
import os
import json
from datetime import datetime

logger = logging.getLogger(__name__)

# Connection defaults
SERVER_NAME = os.getenv("SQL_SERVER_NAME", r"DESKTOP-DULJ3LT\SS2025NM")
DB_NAME = os.getenv("SQL_DB_NAME", "ITDR")
DRIVER_NAME = os.getenv("SQL_DRIVER", "ODBC Driver 17 for SQL Server")

class SqlServerConnector:
    def __init__(self, server: str = SERVER_NAME, database: str = DB_NAME, driver: str = DRIVER_NAME):
        self.server = server
        self.database = database
        self.driver = driver
        self.conn_str = f"DRIVER={{{self.driver}}};SERVER={self.server};DATABASE={self.database};Trusted_Connection=yes;"
        self._cached_health = False

    def get_connection(self):
        return pyodbc.connect(self.conn_str, timeout=5)

    def check_health(self) -> dict:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
                self._cached_health = True
                return {
                    "status": "connected",
                    "server": self.server,
                    "database": self.database,
                    "driver": self.driver
                }
        except Exception as e:
            self._cached_health = False
            logger.warning(f"SQL Server health check failed: {e}")
            return {
                "status": "disconnected",
                "error": str(e),
                "server": self.server,
                "database": self.database
            }

    def initialize_database(self) -> bool:
        """Creates individual SQL Server tables for every separate feed type."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                # 1. Dedicated Table for Active Directory Logs: ad_events
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ad_events')
                    BEGIN
                        CREATE TABLE ad_events (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 2. Dedicated Table for Entra ID Logs: entra_signin_logs
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'entra_signin_logs')
                    BEGIN
                        CREATE TABLE entra_signin_logs (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 3. Dedicated Table for AWS CloudTrail Logs: aws_cloudtrail_logs
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'aws_cloudtrail_logs')
                    BEGIN
                        CREATE TABLE aws_cloudtrail_logs (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 4. Dedicated Table for ForgeRock Audit Logs: forgerock_audit_logs
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'forgerock_audit_logs')
                    BEGIN
                        CREATE TABLE forgerock_audit_logs (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 5. Dedicated Table for Zscaler Logs: zscaler_activity_logs
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'zscaler_activity_logs')
                    BEGIN
                        CREATE TABLE zscaler_activity_logs (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 5b. Dedicated Table for HashiCorp Vault Logs: vault_audit_logs
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vault_audit_logs')
                    BEGIN
                        CREATE TABLE vault_audit_logs (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 5c. Dedicated Table for BeyondTrust Session Logs: beyondtrust_session_logs
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'beyondtrust_session_logs')
                    BEGIN
                        CREATE TABLE beyondtrust_session_logs (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 5d. Dedicated Table for Databricks Audit Logs: databricks_audit_logs
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'databricks_audit_logs')
                    BEGIN
                        CREATE TABLE databricks_audit_logs (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 5e. Dedicated Table for Elasticsearch Audit Logs: elasticsearch_audit_logs
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'elasticsearch_audit_logs')
                    BEGIN
                        CREATE TABLE elasticsearch_audit_logs (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 5f. Dedicated Table for Vector Search Logs: vector_search_logs
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vector_search_logs')
                    BEGIN
                        CREATE TABLE vector_search_logs (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 5g. Dedicated Table for Microsoft Defender for Identity Alerts: mdi_security_alerts
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mdi_security_alerts')
                    BEGIN
                        CREATE TABLE mdi_security_alerts (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 5h. Dedicated Table for Entra ID Protection Risk Detections: entra_risk_detections
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'entra_risk_detections')
                    BEGIN
                        CREATE TABLE entra_risk_detections (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 5i. Dedicated Table for Wiz Vulnerability Issues: wiz_vulnerability_issues
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'wiz_vulnerability_issues')
                    BEGIN
                        CREATE TABLE wiz_vulnerability_issues (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 5j. Dedicated Table for SentinelOne Threat Activities: sentinelone_threat_activities
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sentinelone_threat_activities')
                    BEGIN
                        CREATE TABLE sentinelone_threat_activities (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 5k. Dedicated Table for Azure Activity Logs: azure_activity_logs
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'azure_activity_logs')
                    BEGIN
                        CREATE TABLE azure_activity_logs (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 6. Combined Events View or master table identity_events
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'identity_events')
                    BEGIN
                        CREATE TABLE identity_events (
                            event_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            event_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            identity_type VARCHAR(100),
                            source_ip VARCHAR(100),
                            geo_location NVARCHAR(255),
                            identity_provider VARCHAR(100),
                            success INT,
                            risk_score FLOAT DEFAULT 0.0
                        )
                    END
                """)

                # 7. threat_bulletins
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'threat_bulletins')
                    BEGIN
                        CREATE TABLE threat_bulletins (
                            id VARCHAR(100) PRIMARY KEY,
                            bulletin_id VARCHAR(100),
                            title NVARCHAR(500),
                            content NVARCHAR(MAX),
                            actors NVARCHAR(MAX),
                            created_at VARCHAR(100),
                            impact_rating VARCHAR(50),
                            summary NVARCHAR(MAX)
                        )
                    END
                """)

                # 8. identity_profiles
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'identity_profiles')
                    BEGIN
                        CREATE TABLE identity_profiles (
                            identity_user NVARCHAR(255) PRIMARY KEY,
                            identity_type VARCHAR(100),
                            department NVARCHAR(255),
                            baseline_risk_score FLOAT DEFAULT 0.0,
                            current_risk_score FLOAT DEFAULT 0.0,
                            total_events INT DEFAULT 0,
                            failed_logins_24h INT DEFAULT 0,
                            last_seen VARCHAR(100),
                            normal_hours NVARCHAR(500),
                            normal_locations NVARCHAR(500),
                            normal_ips NVARCHAR(500),
                            status VARCHAR(50) DEFAULT 'active'
                        )
                    END
                """)

                # 9. identity_feeds
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'identity_feeds')
                    BEGIN
                        CREATE TABLE identity_feeds (
                            feed_id VARCHAR(100) PRIMARY KEY,
                            name NVARCHAR(255) NOT NULL,
                            url NVARCHAR(1000) NOT NULL,
                            category INT DEFAULT 1,
                            feed_type VARCHAR(50) DEFAULT 'rss',
                            enabled INT DEFAULT 1,
                            api_key_required INT DEFAULT 0,
                            fallback_sample_file NVARCHAR(255)
                        )
                    END
                """)

                # 10. identity_feed_entries
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'identity_feed_entries')
                    BEGIN
                        CREATE TABLE identity_feed_entries (
                            entry_id VARCHAR(100) PRIMARY KEY,
                            feed_id VARCHAR(100),
                            title NVARCHAR(500),
                            content NVARCHAR(MAX),
                            severity VARCHAR(50),
                            source NVARCHAR(255),
                            timestamp VARCHAR(100) DEFAULT CONVERT(VARCHAR, GETDATE(), 120)
                        )
                    END
                """)

                # 11. identity_alerts
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'identity_alerts')
                    BEGIN
                        CREATE TABLE identity_alerts (
                            alert_id VARCHAR(100) PRIMARY KEY,
                            timestamp VARCHAR(100) NOT NULL,
                            severity VARCHAR(50) NOT NULL,
                            alert_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            description NVARCHAR(MAX),
                            mitre_technique VARCHAR(100),
                            evidence NVARCHAR(MAX),
                            status VARCHAR(50) DEFAULT 'open',
                            response_action VARCHAR(100)
                        )
                    END
                """)

                # 12. response_actions
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'response_actions')
                    BEGIN
                        CREATE TABLE response_actions (
                            action_id VARCHAR(100) PRIMARY KEY,
                            alert_id VARCHAR(100),
                            action_type VARCHAR(100) NOT NULL,
                            identity_user NVARCHAR(255) NOT NULL,
                            timestamp VARCHAR(100) NOT NULL,
                            status VARCHAR(50) DEFAULT 'executed',
                            details NVARCHAR(MAX)
                        )
                    END
                """)

                # 13. bank_topology
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bank_topology')
                    BEGIN
                        CREATE TABLE bank_topology (
                            user_id VARCHAR(100) PRIMARY KEY,
                            name NVARCHAR(255),
                            role VARCHAR(100),
                            groups NVARCHAR(MAX),
                            assets NVARCHAR(MAX)
                        )
                    END
                """)

                # 13a. bank_topology_nodes
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bank_topology_nodes')
                    BEGIN
                        CREATE TABLE bank_topology_nodes (
                            id VARCHAR(100) PRIMARY KEY,
                            name NVARCHAR(255),
                            type VARCHAR(100),
                            tier VARCHAR(50),
                            risk_score FLOAT,
                            details NVARCHAR(MAX)
                        )
                    END
                """)

                # 13b. bank_topology_edges
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bank_topology_edges')
                    BEGIN
                        CREATE TABLE bank_topology_edges (
                            id INT IDENTITY(1,1) PRIMARY KEY,
                            source VARCHAR(100),
                            target VARCHAR(100),
                            type VARCHAR(100)
                        )
                    END
                """)

                # 14. audit_results
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_results')
                    BEGIN
                        CREATE TABLE audit_results (
                            id INT IDENTITY(1,1) PRIMARY KEY,
                            bulletin_id VARCHAR(100),
                            countermeasure_id VARCHAR(100),
                            countermeasure_name NVARCHAR(255),
                            status VARCHAR(50),
                            details NVARCHAR(MAX),
                            timestamp VARCHAR(100)
                        )
                    END
                """)

                # 15. rss_feeds
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'rss_feeds')
                    BEGIN
                        CREATE TABLE rss_feeds (
                            id INT IDENTITY(1,1) PRIMARY KEY,
                            name NVARCHAR(255),
                            url NVARCHAR(1000) UNIQUE,
                            enabled INT DEFAULT 1,
                            last_fetched VARCHAR(100)
                        )
                    END
                """)

                 # 16. json_upload_logs
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'json_upload_logs')
                    BEGIN
                        CREATE TABLE json_upload_logs (
                            id INT IDENTITY(1,1) PRIMARY KEY,
                            filename NVARCHAR(255) NOT NULL,
                            file_type VARCHAR(100),
                            record_count INT DEFAULT 0,
                            uploaded_at VARCHAR(100),
                            status VARCHAR(50),
                            error_message NVARCHAR(MAX)
                        )
                    END
                """)

                # 17. posture_change_logs
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'posture_change_logs')
                    BEGIN
                        CREATE TABLE posture_change_logs (
                            id INT IDENTITY(1,1) PRIMARY KEY,
                            countermeasure_id VARCHAR(100),
                            countermeasure_name NVARCHAR(255),
                            old_status VARCHAR(50),
                            new_status VARCHAR(50),
                            timestamp VARCHAR(100),
                            bulletin_id VARCHAR(100)
                        )
                    END
                """)

                # ================= 24 Multi-Plane Telemetry Tables =================
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'aws_iam_policies')
                    BEGIN
                        CREATE TABLE aws_iam_policies (
                            policy_id VARCHAR(64) PRIMARY KEY,
                            policy_name VARCHAR(128),
                            entity_type VARCHAR(32),
                            entity_name VARCHAR(128),
                            is_attached INT DEFAULT 1,
                            document_json NVARCHAR(MAX),
                            created_at VARCHAR(100)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'aws_security_groups')
                    BEGIN
                        CREATE TABLE aws_security_groups (
                            group_id VARCHAR(64) PRIMARY KEY,
                            vpc_id VARCHAR(64),
                            group_name VARCHAR(128),
                            direction VARCHAR(8),
                            protocol VARCHAR(16),
                            from_port INT,
                            to_port INT,
                            cidr_ipv4 VARCHAR(32),
                            cidr_ipv6 VARCHAR(64),
                            rule_json NVARCHAR(MAX)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'aws_cloudtrail_configs')
                    BEGIN
                        CREATE TABLE aws_cloudtrail_configs (
                            trail_arn VARCHAR(256) PRIMARY KEY,
                            trail_name VARCHAR(128),
                            s3_bucket VARCHAR(128),
                            is_multi_region INT DEFAULT 0,
                            log_validation_enabled INT DEFAULT 0,
                            kms_key_id VARCHAR(256),
                            is_logging INT DEFAULT 1,
                            config_json NVARCHAR(MAX)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'azure_rbac_assignments')
                    BEGIN
                        CREATE TABLE azure_rbac_assignments (
                            assignment_id VARCHAR(256) PRIMARY KEY,
                            principal_id VARCHAR(64),
                            principal_type VARCHAR(32),
                            principal_name VARCHAR(128),
                            role_name VARCHAR(128),
                            scope VARCHAR(512),
                            subscription_id VARCHAR(64),
                            is_guest INT DEFAULT 0
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'azure_nsg_rules')
                    BEGIN
                        CREATE TABLE azure_nsg_rules (
                            rule_id VARCHAR(256) PRIMARY KEY,
                            nsg_id VARCHAR(256),
                            nsg_name VARCHAR(128),
                            priority INT,
                            direction VARCHAR(16),
                            access VARCHAR(16),
                            source_prefix VARCHAR(64),
                            dest_port_range VARCHAR(64),
                            protocol VARCHAR(16),
                            raw_rule NVARCHAR(MAX)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'azure_diagnostic_settings')
                    BEGIN
                        CREATE TABLE azure_diagnostic_settings (
                            setting_id VARCHAR(256) PRIMARY KEY,
                            resource_id VARCHAR(512),
                            workspace_id VARCHAR(256),
                            storage_account VARCHAR(256),
                            log_categories NVARCHAR(MAX),
                            alerts_enabled INT DEFAULT 1
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'gcp_iam_bindings')
                    BEGIN
                        CREATE TABLE gcp_iam_bindings (
                            binding_id VARCHAR(128) PRIMARY KEY,
                            project_id VARCHAR(64),
                            role VARCHAR(128),
                            member_type VARCHAR(32),
                            member_email VARCHAR(128),
                            condition NVARCHAR(MAX),
                            policy_etag VARCHAR(64)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'gcp_firewall_rules')
                    BEGIN
                        CREATE TABLE gcp_firewall_rules (
                            rule_id VARCHAR(128) PRIMARY KEY,
                            project_id VARCHAR(64),
                            rule_name VARCHAR(128),
                            direction VARCHAR(16),
                            action VARCHAR(16),
                            priority INT,
                            source_ranges NVARCHAR(MAX),
                            allowed_ports NVARCHAR(MAX),
                            is_disabled INT DEFAULT 0
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'gcp_logging_sinks')
                    BEGIN
                        CREATE TABLE gcp_logging_sinks (
                            sink_name VARCHAR(128) PRIMARY KEY,
                            project_id VARCHAR(64),
                            destination VARCHAR(256),
                            filter_text NVARCHAR(MAX),
                            writer_identity VARCHAR(128),
                            is_disabled INT DEFAULT 0
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vault_server_configs')
                    BEGIN
                        CREATE TABLE vault_server_configs (
                            config_id VARCHAR(64) PRIMARY KEY,
                            hostname VARCHAR(128),
                            tls_disable INT DEFAULT 0,
                            disable_mlock INT DEFAULT 0,
                            storage_type VARCHAR(32),
                            listener_address VARCHAR(128),
                            config_raw NVARCHAR(MAX)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vault_acl_policies')
                    BEGIN
                        CREATE TABLE vault_acl_policies (
                            policy_name VARCHAR(128) PRIMARY KEY,
                            path_pattern VARCHAR(256),
                            capabilities NVARCHAR(MAX),
                            allowed_parameters NVARCHAR(MAX),
                            raw_hcl NVARCHAR(MAX)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vault_audit_devices')
                    BEGIN
                        CREATE TABLE vault_audit_devices (
                            device_path VARCHAR(128) PRIMARY KEY,
                            type VARCHAR(32),
                            description NVARCHAR(MAX),
                            options NVARCHAR(MAX),
                            is_active INT DEFAULT 1
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'beyondtrust_active_sessions')
                    BEGIN
                        CREATE TABLE beyondtrust_active_sessions (
                            session_id VARCHAR(128) PRIMARY KEY,
                            user_id VARCHAR(64),
                            account_name VARCHAR(128),
                            target_system VARCHAR(128),
                            protocol VARCHAR(16),
                            start_time VARCHAR(100),
                            max_duration_mins INT,
                            ticket_number VARCHAR(64),
                            status VARCHAR(32)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sailpoint_identities')
                    BEGIN
                        CREATE TABLE sailpoint_identities (
                            identity_id VARCHAR(128) PRIMARY KEY,
                            name VARCHAR(128),
                            email VARCHAR(128),
                            lifecycle_state VARCHAR(32),
                            title VARCHAR(128),
                            entitlements NVARCHAR(MAX),
                            last_certification_date VARCHAR(100)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ad_users')
                    BEGIN
                        CREATE TABLE ad_users (
                            sam_account_name VARCHAR(128) PRIMARY KEY,
                            dn VARCHAR(512),
                            enabled INT DEFAULT 1,
                            password_last_set VARCHAR(100),
                            password_never_expires INT DEFAULT 0,
                            last_logon_date VARCHAR(100),
                            member_of NVARCHAR(MAX),
                            uac_flags INT
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ad_gpo_reports')
                    BEGIN
                        CREATE TABLE ad_gpo_reports (
                            gpo_id VARCHAR(128) PRIMARY KEY,
                            gpo_name VARCHAR(256),
                            gpo_status VARCHAR(32),
                            lsa_protection_enabled INT DEFAULT 1,
                            ps_transcription_enabled INT DEFAULT 1,
                            ps_scriptblock_logging INT DEFAULT 1,
                            lm_hash_level INT DEFAULT 5,
                            raw_xml NVARCHAR(MAX)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'entra_role_assignments')
                    BEGIN
                        CREATE TABLE entra_role_assignments (
                            assignment_id VARCHAR(128) PRIMARY KEY,
                            role_definition_id VARCHAR(128),
                            role_name VARCHAR(128),
                            principal_id VARCHAR(128),
                            principal_name VARCHAR(128),
                            principal_type VARCHAR(32),
                            is_guest INT DEFAULT 0
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'defender_identity_alerts')
                    BEGIN
                        CREATE TABLE defender_identity_alerts (
                            alert_id VARCHAR(128) PRIMARY KEY,
                            title VARCHAR(256),
                            severity VARCHAR(16),
                            category VARCHAR(64),
                            status VARCHAR(32),
                            impacted_user VARCHAR(128),
                            impacted_computer VARCHAR(128),
                            mitre_techniques NVARCHAR(MAX)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'wiz_issues')
                    BEGIN
                        CREATE TABLE wiz_issues (
                            issue_id VARCHAR(128) PRIMARY KEY,
                            title VARCHAR(256),
                            severity VARCHAR(16),
                            status VARCHAR(32),
                            entity_id VARCHAR(128),
                            entity_name VARCHAR(128),
                            entity_type VARCHAR(64),
                            toxic_combination_tags NVARCHAR(MAX)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'compliance_benchmark_reports')
                    BEGIN
                        CREATE TABLE compliance_benchmark_reports (
                            report_id VARCHAR(128) PRIMARY KEY,
                            host_id VARCHAR(128),
                            benchmark_name VARCHAR(128),
                            rule_id VARCHAR(128),
                            rule_title VARCHAR(256),
                            result VARCHAR(16),
                            impact_score INT,
                            failed_reason NVARCHAR(MAX)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'edr_process_events')
                    BEGIN
                        CREATE TABLE edr_process_events (
                            event_id VARCHAR(128) PRIMARY KEY,
                            host_name VARCHAR(128),
                            timestamp VARCHAR(100),
                            process_name VARCHAR(256),
                            parent_process VARCHAR(256),
                            command_line NVARCHAR(MAX),
                            user_account VARCHAR(128),
                            is_suspicious INT DEFAULT 0
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'edr_powershell_scriptblocks')
                    BEGIN
                        CREATE TABLE edr_powershell_scriptblocks (
                            event_id VARCHAR(128) PRIMARY KEY,
                            host_name VARCHAR(128),
                            timestamp VARCHAR(100),
                            script_block_id VARCHAR(128),
                            script_content NVARCHAR(MAX),
                            user_account VARCHAR(128),
                            contains_obfuscation INT DEFAULT 0
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'edr_registry_file_audits')
                    BEGIN
                        CREATE TABLE edr_registry_file_audits (
                            event_id VARCHAR(128) PRIMARY KEY,
                            host_name VARCHAR(128),
                            timestamp VARCHAR(100),
                            process_name VARCHAR(256),
                            target_object VARCHAR(512),
                            operation_type VARCHAR(32),
                            user_account VARCHAR(128)
                        )
                    END
                """)

                # ================= Rule Engine Tables =================
                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'rule_vulnerability_queries')
                    BEGIN
                        CREATE TABLE rule_vulnerability_queries (
                            id INT IDENTITY(1,1) PRIMARY KEY,
                            source_system VARCHAR(128),
                            target_table_name VARCHAR(128),
                            attack_id VARCHAR(64),
                            attack_technique NVARCHAR(256),
                            d3fend_control NVARCHAR(256),
                            data_to_extract NVARCHAR(MAX),
                            vulnerability_audit_criteria NVARCHAR(MAX),
                            remediation_command NVARCHAR(MAX),
                            query_number VARCHAR(64),
                            gen_query NVARCHAR(MAX),
                            llm_query NVARCHAR(MAX),
                            active_query NVARCHAR(MAX)
                        )
                    END
                    ELSE IF NOT EXISTS (
                        SELECT * FROM sys.columns 
                        WHERE object_id = OBJECT_ID('rule_vulnerability_queries') AND name = 'target_table_name'
                    )
                    BEGIN
                        ALTER TABLE rule_vulnerability_queries ADD target_table_name VARCHAR(128);
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'threat_rule_execution_results')
                    BEGIN
                        CREATE TABLE threat_rule_execution_results (
                            id INT IDENTITY(1,1) PRIMARY KEY,
                            threat_id VARCHAR(100),
                            query_number VARCHAR(64),
                            attack_id VARCHAR(64),
                            attack_technique NVARCHAR(256),
                            d3fend_control NVARCHAR(256),
                            source_system VARCHAR(128),
                            status VARCHAR(32),
                            full_count INT DEFAULT 0,
                            failed_record_count INT DEFAULT 0,
                            success_record_count INT DEFAULT 0,
                            percentage_gap FLOAT DEFAULT 0.0,
                            executed_at VARCHAR(100)
                        )
                    END
                """)

                cursor.execute("""
                    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'threat_pipeline_execution_logs')
                    BEGIN
                        CREATE TABLE threat_pipeline_execution_logs (
                            id INT IDENTITY(1,1) PRIMARY KEY,
                            bulletin_id VARCHAR(100),
                            trace_json NVARCHAR(MAX),
                            total_duration_ms FLOAT DEFAULT 0.0,
                            created_at VARCHAR(100)
                        )
                    END
                """)

                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to initialize individual SQL Server database tables: {e}")
            return False

    def get_table_counts(self) -> dict:
        counts = {}
        tables = [
            "ad_events", "entra_signin_logs", "aws_cloudtrail_logs", "forgerock_audit_logs", "zscaler_activity_logs",
            "vault_audit_logs", "beyondtrust_session_logs", "databricks_audit_logs", "elasticsearch_audit_logs", "vector_search_logs",
            "mdi_security_alerts", "entra_risk_detections", "wiz_vulnerability_issues", "sentinelone_threat_activities", "azure_activity_logs",
            "identity_events", "threat_bulletins", "identity_profiles", "identity_feeds", "identity_feed_entries",
            "identity_alerts", "response_actions", "bank_topology", "bank_topology_nodes", "bank_topology_edges",
            "audit_results", "rss_feeds", "json_upload_logs", "posture_change_logs",
            "aws_iam_policies", "aws_security_groups", "aws_cloudtrail_configs", "azure_rbac_assignments", "azure_nsg_rules",
            "azure_diagnostic_settings", "gcp_iam_bindings", "gcp_firewall_rules", "gcp_logging_sinks", "vault_server_configs",
            "vault_acl_policies", "vault_audit_devices", "beyondtrust_active_sessions", "sailpoint_identities", "ad_users",
            "ad_gpo_reports", "entra_role_assignments", "defender_identity_alerts", "wiz_issues", "compliance_benchmark_reports",
            "edr_process_events", "edr_powershell_scriptblocks", "edr_registry_file_audits",
            "rule_vulnerability_queries", "threat_rule_execution_results", "threat_pipeline_execution_logs"
        ]
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                for tbl in tables:
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM [{tbl}]")
                        row = cursor.fetchone()
                        counts[tbl] = row[0] if row else 0
                    except Exception:
                        counts[tbl] = 0
        except Exception as e:
            logger.error(f"Error fetching table counts: {e}")
        return counts

    def execute_non_query(self, query: str, params: tuple = ()) -> int:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            conn.commit()
            return cursor.rowcount

    def fetch_all(self, query: str, params: tuple = ()) -> list:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            columns = [column[0] for column in cursor.description]
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            return results

    def fetch_one(self, query: str, params: tuple = ()) -> dict:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            if cursor.description:
                columns = [column[0] for column in cursor.description]
                row = cursor.fetchone()
                if row:
                    return dict(zip(columns, row))
            return None

sql_db = SqlServerConnector()
