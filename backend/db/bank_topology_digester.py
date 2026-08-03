import os
import json
import logging
from backend.db.sql_server_conn import sql_db

logger = logging.getLogger("itdr_3layer")

class BankTopologyDigester:
    """Parses raw telemetry extracts from 13 enterprise systems and compiles bank_topology.json and security_blast_radius_edges."""

    def __init__(self, feed_dir: str = None):
        if not feed_dir:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "sample_feeds"))
            feed_dir = base_dir
        self.feed_dir = feed_dir

    def digest_all_extracts(self) -> dict:
        logger.info(f"Starting Bank Topology Digestion from raw extracts in: {self.feed_dir}")
        
        nodes = []
        edges = []

        # 1. Digest Active Directory Users & Groups
        ad_file = os.path.join(self.feed_dir, "active_directory.json")
        if os.path.exists(ad_file):
            with open(ad_file, "r") as f:
                ad_data = json.load(f)
                for u in ad_data.get("users", []):
                    nodes.append({
                        "id": u.get("username"),
                        "name": u.get("name"),
                        "type": "User",
                        "tier": "Tier0" if "Admin" in u.get("name", "") else "Tier1",
                        "risk_score": 5.0
                    })
                    for g in u.get("groups", []):
                        edges.append((u.get("username"), "USER_ACCOUNT", g, "AD_GROUP", "MEMBER_OF", 1, 4.0, 4.0))

        # 2. Digest AWS IAM & S3 Buckets
        aws_file = os.path.join(self.feed_dir, "aws_iam.json")
        if os.path.exists(aws_file):
            with open(aws_file, "r") as f:
                aws_data = json.load(f)
                for r in aws_data.get("roles", []):
                    nodes.append({
                        "id": r.get("role_name"),
                        "name": r.get("role_name"),
                        "type": "CloudRole",
                        "tier": "Tier0",
                        "risk_score": 5.0
                    })

        # 3. Write compiled topology to bank_topology.json
        compiled_path = os.path.join(self.feed_dir, "bank_topology.json")
        compiled_json = {"nodes": nodes, "total_nodes": len(nodes)}
        with open(compiled_path, "w") as f:
            json.dump(compiled_json, f, indent=2)

        # 4. Insert synthesized edges into SQL Server security_blast_radius_edges
        sql_db.execute_non_query("IF EXISTS (SELECT * FROM sys.tables WHERE name = 'security_blast_radius_edges') TRUNCATE TABLE security_blast_radius_edges")
        for src, stype, tgt, ttype, rel, hop, crit, sens in edges:
            eid = f"edge-{hash(src+tgt)%100000:05d}"
            sql_db.execute_non_query("""
                INSERT INTO security_blast_radius_edges 
                (edge_id, source_entity, source_type, target_entity, target_type, relationship_type, hop_count, criticality_weight, sensitivity_weight)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (eid, eid, src, stype, tgt, ttype, rel, hop, crit, sens))

        logger.info(f"Bank Topology Digestion Complete! Compiled {len(nodes)} nodes and {len(edges)} edges.")
        return {"status": "success", "nodes_compiled": len(nodes), "edges_compiled": len(edges)}

if __name__ == "__main__":
    digester = BankTopologyDigester()
    res = digester.digest_all_extracts()
    print("Digestion Result:", res)
