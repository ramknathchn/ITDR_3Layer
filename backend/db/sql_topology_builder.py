import os
import json
import logging
import argparse
from typing import Dict, List, Any
from backend.db.sql_server_conn import SqlServerConnector, sql_db

logger = logging.getLogger("sql_topology_builder")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

class SqlTopologyBuilder:
    """Reads enterprise telemetry from individual SQL Server tables, truncates target topology tables,
    and builds sql_topology_nodes & security_blast_radius_edges with an optional JSON export parameter."""

    def __init__(self, sql_conn: SqlServerConnector = None):
        self.sql_conn = sql_conn if sql_conn else sql_db

    def ensure_topology_storage_tables(self):
        """Ensures that sql_topology_nodes and security_blast_radius_edges tables exist in SQL Server."""
        logger.info("Ensuring topology storage tables exist in SQL Server...")
        
        # 1. Target Table: sql_topology_nodes
        self.sql_conn.execute_non_query("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sql_topology_nodes')
            BEGIN
                CREATE TABLE sql_topology_nodes (
                    node_id VARCHAR(128) PRIMARY KEY,
                    node_name NVARCHAR(255) NOT NULL,
                    node_type VARCHAR(64) NOT NULL,
                    tier VARCHAR(32) DEFAULT 'Tier1',
                    risk_score FLOAT DEFAULT 1.0,
                    source_table VARCHAR(128),
                    properties_json NVARCHAR(MAX),
                    created_at DATETIME DEFAULT GETDATE()
                );
            END
        """)

        # 2. Target Table: security_blast_radius_edges
        self.sql_conn.execute_non_query("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'security_blast_radius_edges')
            BEGIN
                CREATE TABLE security_blast_radius_edges (
                    edge_id VARCHAR(128) PRIMARY KEY,
                    source_entity VARCHAR(128) NOT NULL,
                    source_type VARCHAR(64) NOT NULL,
                    target_entity VARCHAR(128) NOT NULL,
                    target_type VARCHAR(64) NOT NULL,
                    relationship_type VARCHAR(64) NOT NULL,
                    hop_count INT DEFAULT 1,
                    criticality_weight FLOAT DEFAULT 1.0,
                    sensitivity_weight FLOAT DEFAULT 1.0,
                    raw_edge_json NVARCHAR(MAX),
                    created_at DATETIME DEFAULT GETDATE()
                );
            END
        """)

    def truncate_topology_tables(self):
        """Truncates target topology tables before every re-creation to ensure stala-free data."""
        logger.info("Truncating sql_topology_nodes and security_blast_radius_edges for fresh re-creation...")
        self.sql_conn.execute_non_query("IF EXISTS (SELECT * FROM sys.tables WHERE name = 'sql_topology_nodes') TRUNCATE TABLE sql_topology_nodes")
        self.sql_conn.execute_non_query("IF EXISTS (SELECT * FROM sys.tables WHERE name = 'security_blast_radius_edges') TRUNCATE TABLE security_blast_radius_edges")

    def build_topology(self, generate_json_file: bool = False, output_json_path: str = None) -> Dict[str, Any]:
        """Main execution method: Reads source SQL tables, truncates topology tables, inserts nodes/edges,
        and optionally writes out a bank_topology.json file if generate_json_file=True."""
        
        self.ensure_topology_storage_tables()
        self.truncate_topology_tables()

        logger.info("Building topology from SQL Server enterprise tables...")
        nodes_dict: Dict[str, Dict] = {}
        edges_list: List[tuple] = []

        # Helper to add node
        def add_node(nid, name, ntype, tier="Tier1", risk=1.0, src_tbl="", props=None):
            if nid and nid not in nodes_dict:
                nodes_dict[nid] = {
                    "node_id": nid,
                    "node_name": name,
                    "node_type": ntype,
                    "tier": tier,
                    "risk_score": float(risk),
                    "source_table": src_tbl,
                    "properties_json": json.dumps(props or {})
                }

        # -------------------------------------------------------------
        # 1. Active Directory: ad_users
        # -------------------------------------------------------------
        ad_users = self.sql_conn.fetch_all("SELECT * FROM ad_users") or []
        for u in ad_users:
            sam = u.get("sam_account_name")
            if sam:
                dn = u.get("dn", "")
                is_admin = ("Admin" in dn or "Exec" in dn)
                add_node(sam, sam, "User", "Tier0" if is_admin else "Tier1", 5.0 if is_admin else 2.0, "ad_users", u)
                
                # Check member_of JSON
                mem_str = u.get("member_of") or "[]"
                try:
                    groups = json.loads(mem_str) if isinstance(mem_str, str) else mem_str
                    for g in groups:
                        add_node(g, g, "ADGroup", "Tier0", 4.0, "ad_users")
                        edges_list.append((sam, "USER_ACCOUNT", g, "AD_GROUP", "MEMBER_OF", 1, 4.0, 4.0))
                except Exception:
                    pass

        # -------------------------------------------------------------
        # 2. Entra ID: entra_role_assignments
        # -------------------------------------------------------------
        entra_roles = self.sql_conn.fetch_all("SELECT * FROM entra_role_assignments") or []
        for r in entra_roles:
            p_name = r.get("principal_name")
            r_name = r.get("role_name")
            if p_name and r_name:
                add_node(p_name, p_name, r.get("principal_type", "User"), "Tier0" if "Admin" in r_name else "Tier1", 5.0, "entra_role_assignments", r)
                add_node(r_name, r_name, "EntraRole", "Tier0", 5.0, "entra_role_assignments")
                edges_list.append((p_name, "USER_ACCOUNT", r_name, "ENTRA_ROLE", "ASSIGNED_ROLE", 1, 5.0, 5.0))

        # -------------------------------------------------------------
        # 3. AWS IAM Policies & Security Groups: aws_iam_policies
        # -------------------------------------------------------------
        aws_policies = self.sql_conn.fetch_all("SELECT * FROM aws_iam_policies") or []
        for p in aws_policies:
            entity = p.get("entity_name")
            pol_name = p.get("policy_name")
            if entity and pol_name:
                add_node(entity, entity, p.get("entity_type", "Role"), "Tier0", 4.0, "aws_iam_policies", p)
                add_node(pol_name, pol_name, "AwsIamPolicy", "Tier0", 4.0, "aws_iam_policies")
                edges_list.append((entity, "AWS_ENTITY", pol_name, "AWS_IAM_POLICY", "ATTACHED_POLICY", 2, 4.0, 4.0))

        # -------------------------------------------------------------
        # 4. HashiCorp Vault: vault_acl_policies
        # -------------------------------------------------------------
        vault_policies = self.sql_conn.fetch_all("SELECT * FROM vault_acl_policies") or []
        for v in vault_policies:
            pol = v.get("policy_name")
            path = v.get("path_pattern")
            if pol and path:
                add_node(pol, pol, "VaultPolicy", "Tier0", 5.0, "vault_acl_policies", v)
                add_node(path, path, "VaultMount", "Tier0", 5.0, "vault_acl_policies")
                edges_list.append((pol, "VAULT_POLICY", path, "VAULT_MOUNT", "GRANTS_ACCESS", 3, 5.0, 5.0))

        # -------------------------------------------------------------
        # 5. BeyondTrust PAM: beyondtrust_active_sessions
        # -------------------------------------------------------------
        bt_sessions = self.sql_conn.fetch_all("SELECT * FROM beyondtrust_active_sessions") or []
        for s in bt_sessions:
            usr = s.get("user_id")
            target = s.get("target_system")
            if usr and target:
                add_node(usr, usr, "PamUser", "Tier1", 3.0, "beyondtrust_active_sessions")
                add_node(target, target, "PamBastion", "Tier0", 5.0, "beyondtrust_active_sessions", s)
                status = s.get("status", "ACTIVE")
                rel = "UNAUTH_CHECKOUT" if "NO_TICKET" in status else "APPROVED_CHECKOUT"
                edges_list.append((usr, "PAM_USER", target, "PAM_BASTION", rel, 4, 5.0, 5.0))

        # -------------------------------------------------------------
        # 6. Standard Bank Topology Edges Synthesis
        # -------------------------------------------------------------
        synthesized_edges = [
            ("USER_JDOE", "USER_ACCOUNT", "WS-FINANCE-01", "WORKSTATION", "LOGS_INTO", 1, 3.0, 3.0),
            ("USER_JDOE", "USER_ACCOUNT", "svc_sql_production", "SERVICE_ACCOUNT", "HAS_SPN_RIGHTS", 1, 4.0, 4.0),
            ("WS-FINANCE-01", "WORKSTATION", "i-0789a0001bank", "AWS_EC2", "ACTIVE_SOCKET_PORT_445", 2, 4.0, 3.0),
            ("i-0789a0001bank", "AWS_EC2", "Bank-EC2-PRODUCTION-Role", "AWS_IAM_ROLE", "ASSUMES_IAM_ROLE", 3, 4.0, 4.0),
            ("Bank-EC2-PRODUCTION-Role", "AWS_IAM_ROLE", "bank-customer-pii-vault", "AWS_S3_BUCKET", "READS_S3_DATA", 4, 5.0, 5.0),
            ("bank-customer-pii-vault", "AWS_S3_BUCKET", "gcp-instance-prod-bank-001", "GCP_COMPUTE", "CROSS_CLOUD_SYNC", 5, 4.0, 5.0),
            ("sys-bt-pam-bank-001", "PAM_BASTION", "srv-pam-target-001.bank.lan", "PAYMENT_GATEWAY", "UNCONSTRAINED_CHECKOUT", 5, 5.0, 5.0)
        ]

        for se in synthesized_edges:
            edges_list.append(se)

        # -------------------------------------------------------------
        # 7. Insert Nodes into SQL Server Table: sql_topology_nodes
        # -------------------------------------------------------------
        logger.info(f"Inserting {len(nodes_dict)} nodes into sql_topology_nodes...")
        with self.sql_conn.get_connection() as conn:
            cursor = conn.cursor()
            node_insert_sql = """
                INSERT INTO sql_topology_nodes 
                (node_id, node_name, node_type, tier, risk_score, source_table, properties_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            node_tuples = [
                (n["node_id"], n["node_name"], n["node_type"], n["tier"], n["risk_score"], n["source_table"], n["properties_json"])
                for n in nodes_dict.values()
            ]
            cursor.executemany(node_insert_sql, node_tuples)
            conn.commit()

        # -------------------------------------------------------------
        # 8. Insert Edges into SQL Server Table: security_blast_radius_edges
        # -------------------------------------------------------------
        logger.info(f"Inserting {len(edges_list)} edges into security_blast_radius_edges...")
        with self.sql_conn.get_connection() as conn:
            cursor = conn.cursor()
            edge_insert_sql = """
                INSERT INTO security_blast_radius_edges 
                (edge_id, source_entity, source_type, target_entity, target_type, relationship_type, hop_count, criticality_weight, sensitivity_weight)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            edge_tuples = []
            for src, stype, tgt, ttype, rel, hop, crit, sens in edges_list:
                eid = f"edge-{hash(src+tgt)%100000:05d}"
                edge_tuples.append((eid, src, stype, tgt, ttype, rel, hop, float(crit), float(sens)))

            cursor.executemany(edge_insert_sql, edge_tuples)
            conn.commit()

        # -------------------------------------------------------------
        # 9. Optional JSON File Generation
        # -------------------------------------------------------------
        json_file_path = None
        if generate_json_file:
            if not output_json_path:
                base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "sample_feeds"))
                output_json_path = os.path.join(base_dir, "bank_topology.json")
            
            json_file_path = output_json_path
            logger.info(f"Generating optional JSON topology file at: {json_file_path}")
            
            json_nodes = []
            for n in nodes_dict.values():
                json_nodes.append({
                    "id": n["node_id"],
                    "name": n["node_name"],
                    "type": n["node_type"],
                    "tier": n["tier"],
                    "risk_score": n["risk_score"],
                    "source_table": n["source_table"]
                })
                
            topology_json_data = {
                "nodes": json_nodes,
                "total_nodes": len(json_nodes),
                "total_edges": len(edges_list),
                "generated_from_sql_db": True
            }
            
            os.makedirs(os.path.dirname(json_file_path), exist_ok=True)
            with open(json_file_path, "w", encoding="utf-8") as f:
                json.dump(topology_json_data, f, indent=2)

        return {
            "status": "success",
            "message": f"Successfully created topology from SQL DB tables.",
            "nodes_inserted": len(nodes_dict),
            "edges_inserted": len(edges_list),
            "json_generated": generate_json_file,
            "json_file_path": json_file_path
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build Enterprise Bank Topology from SQL Server Tables")
    parser.add_argument("--generate-json", action="store_true", help="Optionally generate bank_topology.json file")
    parser.add_argument("--json-path", type=str, default=None, help="Custom output path for bank_topology.json")
    args = parser.parse_args()

    builder = SqlTopologyBuilder()
    result = builder.build_topology(generate_json_file=args.generate_json, output_json_path=args.json_path)
    print("Topology Build Result:", json.dumps(result, indent=2))
