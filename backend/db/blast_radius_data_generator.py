import logging
import random
import json
from datetime import datetime, timedelta
from backend.db.sql_server_conn import sql_db

logger = logging.getLogger("itdr_3layer")

class BlastRadiusDataGenerator:
    """Generates realistic enterprise bank sample data at scale across thousands of servers and user accounts."""

    def seed_all_telemetry(self, force_reseed: bool = False):
        logger.info("Starting Enterprise Bank Multi-Plane Telemetry Data Seed...")
        
        # Check if already seeded
        check = sql_db.fetch_one("SELECT COUNT(*) as cnt FROM security_blast_radius_edges")
        if check and check["cnt"] > 100 and not force_reseed:
            logger.info(f"security_blast_radius_edges already contains {check['cnt']} edges. Skipping reseed.")
            return True

        self._seed_aws_ec2_and_s3()
        self._seed_azure_vms_and_keyvaults()
        self._seed_gcp_instances_and_storage()
        self._seed_hashicorp_vault()
        self._seed_beyondtrust_pam()
        self._seed_sailpoint_iga()
        self._seed_active_directory_and_spns()
        self._seed_entra_id_and_service_principals()
        self._seed_defender_lateral_movement()
        self._seed_wiz_cloud_graph()
        self._seed_edr_network_connections()
        self._build_topological_blast_radius_edges()

        logger.info("Enterprise Bank Multi-Plane Telemetry Data Seed Completed Successfully!")
        return True

    def _seed_aws_ec2_and_s3(self):
        logger.info("Seeding AWS EC2 Instances & S3 Buckets...")
        # AWS EC2 Instances
        environments = ["PRODUCTION", "STAGING", "DEVELOPMENT", "PCI_PAYMENT_ZONE"]
        sensitivities = ["HIGH_CONFIDENTIAL", "PCI_DSS", "RESTRICTED", "PUBLIC"]
        vpcs = ["vpc-0a1b2c3d_prod_us", "vpc-0e5f6g7h_pci_core", "vpc-0i9j8k7l_cloud_app"]

        for i in range(1, 151):
            iid = f"i-0789a{i:04d}bank"
            priv_ip = f"10.240.{(i // 254) + 1}.{i % 254 + 1}"
            pub_ip = f"54.210.{(i // 254) + 1}.{i % 254 + 1}" if i % 3 == 0 else None
            env = random.choice(environments)
            sens = random.choice(sensitivities)
            vpc = random.choice(vpcs)
            profile = f"arn:aws:iam::123456789012:instance-profile/Bank-EC2-{env}-Role"

            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM aws_ec2_instances WHERE instance_id = ?)
                BEGIN
                    INSERT INTO aws_ec2_instances (instance_id, private_ip, public_ip, vpc_id, subnet_id, security_groups, iam_instance_profile, tags, environment, data_sensitivity)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                END
            """, (iid, iid, priv_ip, pub_ip, vpc, f"subnet-{(i%5)+1:02d}", json.dumps([f"sg-bank-web-{(i%3)+1}"]), profile, json.dumps({"Name": f"ec2-prod-server-{i}", "Dept": "CoreBanking"}), env, sens))

        # AWS S3 Buckets
        bucket_types = ["bank-customer-pii-vault", "bank-swift-transaction-logs", "bank-cardholder-pci-data", "bank-analytics-lake", "bank-backups-archive"]
        for idx, bname in enumerate(bucket_types):
            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM aws_s3_buckets WHERE bucket_name = ?)
                BEGIN
                    INSERT INTO aws_s3_buckets (bucket_name, vpc_restriction_id, is_public, bucket_policy, kms_key_id, tags, data_classification)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                END
            """, (bname, bname, "vpc-0e5f6g7h_pci_core", 0, json.dumps({"Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Principal": "*", "Action": "s3:GetObject"}]}), "arn:aws:kms:us-east-1:123456789012:key/bank-s3-key", json.dumps({"Compliance": "PCI-DSS"}), "RESTRICTED"))

    def _seed_azure_vms_and_keyvaults(self):
        logger.info("Seeding Azure VMs & Key Vaults...")
        for i in range(1, 151):
            vmid = f"/subscriptions/sub-az-bank-01/resourceGroups/rg-core-banking/providers/Microsoft.Compute/virtualMachines/vm-az-bank-{i:03d}"
            vmname = f"vm-az-bank-{i:03d}"
            priv_ip = f"10.130.{(i // 254) + 1}.{i % 254 + 1}"
            pub_ip = f"20.42.{(i // 254) + 1}.{i % 254 + 1}" if i % 4 == 0 else None
            mi = f"mi-az-spn-bank-app-{i}"

            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM azure_virtual_machines WHERE vm_id = ?)
                BEGIN
                    INSERT INTO azure_virtual_machines (vm_id, vm_name, resource_group, private_ip, public_ip, subnet_id, nsg_id, managed_identity_id, tags)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                END
            """, (vmid, vmid, vmname, "rg-core-banking", priv_ip, pub_ip, "/subscriptions/sub-az-bank-01/subnets/snet-app", "nsg-az-bank-core", mi, json.dumps({"Workload": "CorePayment", "Zone": "Prod"})))

        # Azure Key Vaults
        kv_names = ["kv-bank-prod-secrets", "kv-bank-pci-keys", "kv-bank-api-tokens"]
        for kv in kv_names:
            kvid = f"/subscriptions/sub-az-bank-01/resourceGroups/rg-sec/providers/Microsoft.KeyVault/vaults/{kv}"
            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM azure_key_vaults WHERE vault_id = ?)
                BEGIN
                    INSERT INTO azure_key_vaults (vault_id, vault_name, resource_group, access_policies, network_acls, secret_names, is_public_access)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                END
            """, (kvid, kvid, kv, "rg-sec", json.dumps([{"tenantId": "tenant-bank-01", "permissions": {"secrets": ["get", "list"]}}]), json.dumps({"defaultAction": "Deny"}), json.dumps(["db-conn-string", "master-api-key", "hsm-root-cert"]), 0))

    def _seed_gcp_instances_and_storage(self):
        logger.info("Seeding GCP Compute & Datasets...")
        for i in range(1, 101):
            iid = f"gcp-instance-prod-bank-{i:03d}"
            priv_ip = f"10.180.{(i // 254) + 1}.{i % 254 + 1}"
            pub_ip = f"35.200.{(i // 254) + 1}.{i % 254 + 1}" if i % 5 == 0 else None
            sa = f"sa-gcp-bank-svc-{i}@bank-gcp-prod.iam.gserviceaccount.com"

            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM gcp_compute_instances WHERE instance_id = ?)
                BEGIN
                    INSERT INTO gcp_compute_instances (instance_id, project_id, instance_name, internal_ip, external_ip, network_name, service_account_email, scopes, tags)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                END
            """, (iid, iid, "prj-bank-finance-prod", iid, priv_ip, pub_ip, "vpc-gcp-bank-main", sa, json.dumps(["https://www.googleapis.com/auth/cloud-platform"]), json.dumps(["env-prod", "tier-database"])))

    def _seed_hashicorp_vault(self):
        logger.info("Seeding HashiCorp Vault Mounts & Entities...")
        mounts = ["secret/data/database/prod", "aws/creds/bank-admin-role", "pki/issue/bank-internal-ca", "transit/encrypt/bank-card-numbers"]
        for m in mounts:
            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM vault_secret_mounts WHERE mount_path = ?)
                BEGIN
                    INSERT INTO vault_secret_mounts (mount_path, engine_type, default_lease_ttl, token_accessor, bound_cidrs, associated_policies)
                    VALUES (?, ?, ?, ?, ?, ?)
                END
            """, (m, m, "kv-v2" if "secret" in m else "aws", 3600, f"acc-vault-{hash(m)%1000}", json.dumps(["10.240.0.0/16", "10.130.0.0/16"]), json.dumps(["policy-vault-bank-prod", "policy-vault-db-read"])))

    def _seed_beyondtrust_pam(self):
        logger.info("Seeding BeyondTrust PAM Managed Assets & Sessions...")
        for i in range(1, 101):
            sid = f"sys-bt-pam-bank-{i:03d}"
            hname = f"srv-pam-target-{i:03d}.bank.lan"
            ip = f"10.240.10.{(i%250)+1}"
            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM beyondtrust_managed_assets WHERE system_id = ?)
                BEGIN
                    INSERT INTO beyondtrust_managed_assets (system_id, host_name, ip_address, os_type, managed_accounts, criticality_level)
                    VALUES (?, ?, ?, ?, ?, ?)
                END
            """, (sid, sid, hname, ip, "Windows Server 2022 Datacenter", json.dumps(["DomainAdmin", "LocalAdmin", "svc_sql_admin"]), "CRITICAL" if i <= 30 else "HIGH"))

    def _seed_sailpoint_iga(self):
        logger.info("Seeding SailPoint Accounts & Access Profiles...")
        for i in range(1, 201):
            acc_id = f"sp-acc-bank-{i:04d}"
            ident_id = f"user.employee.{i}@bank.com"
            src = random.choice(["Active Directory", "AWS IAM", "Entra ID", "SAP ERP", "Salesforce"])
            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM sailpoint_application_accounts WHERE account_id = ?)
                BEGIN
                    INSERT INTO sailpoint_application_accounts (account_id, identity_id, native_identity, source_name, is_uncorrelated, is_disabled, entitlements)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                END
            """, (acc_id, acc_id, ident_id, f"CN={ident_id},OU=Users,DC=bank,DC=lan", src, 1 if i % 15 == 0 else 0, 0, json.dumps([f"Role_{src}_Admin", "Group_SWIFT_Operator"])))

    def _seed_active_directory_and_spns(self):
        logger.info("Seeding AD Computers & Kerberoastable SPN Accounts...")
        # AD Computers
        for i in range(1, 201):
            cname = f"DC-BANK-NODE-{i:03d}.bank.lan"
            ip = f"10.100.{(i//250)+1}.{(i%250)+1}"
            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM ad_computers_trusts WHERE computer_name = ?)
                BEGIN
                    INSERT INTO ad_computers_trusts (computer_name, os_name, ip_address, spns, domain_trust_target, trust_direction, is_transitive)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                END
            """, (cname, cname, "Windows Server 2022 Domain Controller", ip, json.dumps([f"HOST/{cname}", f"RPC/{cname}"]), "corp.bank.lan", "BiDirectional", 1))

        # AD Kerberoastable SPN Accounts
        spn_accounts = [
            ("svc_sql_production", "MSSQLSvc/sql-prod-cluster.bank.lan:1433"),
            ("svc_iis_webportal", "HTTP/portal.bank.lan"),
            ("svc_backup_agent", "VAM/backup-node.bank.lan"),
            ("svc_swift_connector", "SWIFT/swift-gw.bank.lan"),
            ("svc_sharepoint_farm", "HTTP/sp.bank.lan")
        ]
        for sam, spn in spn_accounts:
            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM ad_kerberoastable_accounts WHERE sam_account_name = ?)
                BEGIN
                    INSERT INTO ad_kerberoastable_accounts (sam_account_name, spn, password_last_set, encryption_types)
                    VALUES (?, ?, GETDATE(), 4)
                END
            """, (sam, sam, spn))

    def _seed_entra_id_and_service_principals(self):
        logger.info("Seeding Entra ID Service Principals & Dynamic Groups...")
        for i in range(1, 101):
            appid = f"app-spn-bank-core-{i:03d}"
            name = f"Bank Financial API Engine {i}"
            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM entra_service_principals WHERE app_id = ?)
                BEGIN
                    INSERT INTO entra_service_principals (app_id, display_name, principal_type, secret_expiration, certificate_count, oauth_permissions, app_roles)
                    VALUES (?, ?, ?, DATEADD(day, 365, GETDATE()), ?, ?, ?)
                END
            """, (appid, appid, name, "ServicePrincipal", 2, json.dumps(["Directory.ReadWrite.All", "Mail.ReadWrite"]), json.dumps(["GlobalAdministrator"])))

    def _seed_defender_lateral_movement(self):
        logger.info("Seeding Defender Lateral Movement Paths...")
        paths = [
            ("WS-FINANCE-01", "DC-BANK-NODE-001.bank.lan", 2, ["SRV-APP-04.bank.lan"]),
            ("WS-TELLER-12", "DC-BANK-NODE-002.bank.lan", 3, ["SRV-MIDDLEWARE-01.bank.lan", "SRV-DB-02.bank.lan"]),
            ("USER_JDOE", "USER_DOMAIN_ADMIN", 1, ["WS-ADMIN-01.bank.lan"]),
            ("EC2-APP-01", "AWS_ACCOUNT_PROD_ROOT", 2, ["ARN:AWS:IAM::123456789012:ROLE/ASSUMEROLE_ADMIN"])
        ]
        for src, tgt, hops, devs in paths:
            pid = f"lmp-{hash(src+tgt)%10000}"
            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM defender_lateral_movement_paths WHERE path_id = ?)
                BEGIN
                    INSERT INTO defender_lateral_movement_paths (path_id, source_entity, target_entity, hop_count, intermediate_devices, is_target_sensitive)
                    VALUES (?, ?, ?, ?, ?, ?)
                END
            """, (pid, pid, src, tgt, hops, json.dumps(devs), 1))

    def _seed_wiz_cloud_graph(self):
        logger.info("Seeding Wiz Cloud Security Graph Edges...")
        w_edges = [
            ("INTERNET_INBOUND_01", "i-0789a0001bank", "PUBLIC_EXPOSURE", "CRITICAL"),
            ("i-0789a0001bank", "Bank-EC2-PRODUCTION-Role", "HAS_INSTANCE_PROFILE", "HIGH"),
            ("Bank-EC2-PRODUCTION-Role", "bank-customer-pii-vault", "CAN_READ_S3_BUCKET", "CRITICAL"),
            ("vm-az-bank-001", "kv-bank-prod-secrets", "ACCESSES_KEY_VAULT", "CRITICAL")
        ]
        for s, t, r, sev in w_edges:
            eid = f"wiz-edge-{hash(s+t)%10000}"
            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM wiz_cloud_graph WHERE edge_id = ?)
                BEGIN
                    INSERT INTO wiz_cloud_graph (edge_id, source_resource_id, target_resource_id, relationship_type, risk_severity, raw_edge)
                    VALUES (?, ?, ?, ?, ?, ?)
                END
            """, (eid, eid, s, t, r, sev, json.dumps({"provider": "AWS/Azure"})))

    def _seed_edr_network_connections(self):
        logger.info("Seeding EDR Active Network Connections...")
        for i in range(1, 201):
            eid = f"edr-evt-net-conn-{i:04d}"
            src_ip = f"10.240.10.{(i%250)+1}"
            dst_ip = f"10.100.1.{(i%50)+1}"
            proc = "powershell.exe" if i % 4 == 0 else "cmd.exe" if i % 3 == 0 else "lsass.exe"
            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM edr_network_connections WHERE event_id = ?)
                BEGIN
                    INSERT INTO edr_network_connections (event_id, host_name, timestamp, source_ip, destination_ip, destination_port, protocol, process_name, process_id, user_account)
                    VALUES (?, ?, GETDATE(), ?, ?, ?, ?, ?, ?, ?)
                END
            """, (eid, eid, f"srv-host-{i:03d}", src_ip, dst_ip, 445 if i%2==0 else 3389, "TCP", proc, 1024+i, "USER_JDOE" if i%2==0 else "SYSTEM"))

    def _build_topological_blast_radius_edges(self):
        logger.info("Building Global Security Blast Radius Edges for 5-Hop Recursive CTE Graph Traversal...")
        
        edges = [
            # Entry point USER_JDOE (Identity -> Entitlements -> Target Accounts)
            ("USER_JDOE", "USER_ACCOUNT", "WS-FINANCE-01", "WORKSTATION", "LOGS_INTO", 1, 3.0, 3.0),
            ("USER_JDOE", "USER_ACCOUNT", "Entra_GlobalAdmin_Role", "ENTRA_ROLE", "ASSIGNED_ROLE", 1, 5.0, 5.0),
            ("USER_JDOE", "USER_ACCOUNT", "svc_sql_production", "SERVICE_ACCOUNT", "HAS_SPN_RIGHTS", 1, 4.0, 4.0),

            # Hop 1 -> Hop 2
            ("WS-FINANCE-01", "WORKSTATION", "i-0789a0001bank", "AWS_EC2", "ACTIVE_SOCKET_PORT_445", 2, 4.0, 3.0),
            ("Entra_GlobalAdmin_Role", "ENTRA_ROLE", "app-spn-bank-core-001", "SERVICE_PRINCIPAL", "CONTROLS_APP", 2, 5.0, 4.0),
            ("svc_sql_production", "SERVICE_ACCOUNT", "DC-BANK-NODE-001.bank.lan", "DOMAIN_CONTROLLER", "KERBEROASTABLE_TO", 2, 5.0, 5.0),

            # Hop 2 -> Hop 3
            ("i-0789a0001bank", "AWS_EC2", "Bank-EC2-PRODUCTION-Role", "AWS_IAM_ROLE", "ASSUMES_IAM_ROLE", 3, 4.0, 4.0),
            ("app-spn-bank-core-001", "SERVICE_PRINCIPAL", "kv-bank-prod-secrets", "AZURE_KEYVAULT", "READS_SECRETS", 3, 5.0, 5.0),
            ("DC-BANK-NODE-001.bank.lan", "DOMAIN_CONTROLLER", "DOMAIN_ADMINS_GROUP", "AD_GROUP", "DCSYNC_REPLICATION", 3, 5.0, 5.0),

            # Hop 3 -> Hop 4
            ("Bank-EC2-PRODUCTION-Role", "AWS_IAM_ROLE", "bank-customer-pii-vault", "AWS_S3_BUCKET", "READS_S3_DATA", 4, 5.0, 5.0),
            ("kv-bank-prod-secrets", "AZURE_KEYVAULT", "sys-bt-pam-bank-001", "PAM_BASTION", "CONTAINS_DB_PASSWORDS", 4, 4.0, 5.0),
            ("DOMAIN_ADMINS_GROUP", "AD_GROUP", "corp.bank.lan", "FOREST_ROOT", "FULL_FOREST_CONTROL", 4, 5.0, 5.0),

            # Hop 4 -> Hop 5
            ("bank-customer-pii-vault", "AWS_S3_BUCKET", "gcp-instance-prod-bank-001", "GCP_COMPUTE", "CROSS_CLOUD_SYNC", 5, 4.0, 5.0),
            ("sys-bt-pam-bank-001", "PAM_BASTION", "srv-pam-target-001.bank.lan", "PAYMENT_GATEWAY", "UNCONSTRAINED_CHECKOUT", 5, 5.0, 5.0)
        ]

        for src, stype, tgt, ttype, rel, hop, c_w, s_w in edges:
            eid = f"edge-{hash(src+tgt)%100000}"
            sql_db.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM security_blast_radius_edges WHERE edge_id = ?)
                BEGIN
                    INSERT INTO security_blast_radius_edges (edge_id, source_entity, source_type, target_entity, target_type, relationship_type, hop_count, criticality_weight, sensitivity_weight, raw_edge_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                END
            """, (eid, eid, src, stype, tgt, ttype, rel, hop, c_w, s_w, json.dumps({"source": "MultiPlaneTelemetry"})))

blast_data_gen = BlastRadiusDataGenerator()
