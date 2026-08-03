import os
import json
import logging
from datetime import datetime, date
from backend.db.sql_server_conn import sql_db

logger = logging.getLogger("db_exporter")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# Custom JSON encoder to serialize datetime/date objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

TABLES_TO_EXPORT = [
    "rule_vulnerability_queries",
    "security_blast_radius_edges",
    "sql_topology_nodes",
    "threat_bulletins",
    "audit_results",
    "ad_events",
    "ad_users",
    "ad_gpo_reports",
    "entra_signin_logs",
    "entra_role_assignments",
    "aws_cloudtrail_events",
    "aws_iam_policies",
    "aws_ec2_instances",
    "aws_s3_buckets",
    "azure_activity_logs",
    "azure_rbac_assignments",
    "azure_virtual_machines",
    "azure_key_vaults",
    "gcp_audit_logs",
    "gcp_iam_bindings",
    "vault_audit_logs",
    "vault_acl_policies",
    "beyondtrust_session_logs",
    "beyondtrust_active_sessions",
    "sailpoint_identity_events",
    "sailpoint_identities",
    "wiz_vulnerability_issues",
    "defender_identity_alerts",
    "sentinelone_threat_activities",
    "elasticsearch_audit_logs",
    "vector_search_logs"
]

def export_all_tables_to_json(dump_dir: str = None) -> dict:
    if not dump_dir:
        base_dir = os.path.abspath(os.path.dirname(__file__))
        dump_dir = os.path.join(base_dir, "json_dumps")
    
    os.makedirs(dump_dir, exist_ok=True)
    logger.info(f"Starting SQL Server Database Export to JSON files in: {dump_dir}")

    summary = {}
    total_exported_records = 0

    for table in TABLES_TO_EXPORT:
        try:
            query = f"SELECT * FROM [{table}]"
            rows = sql_db.fetch_all(query) or []
            file_path = os.path.join(dump_dir, f"{table}.json")
            
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(rows, f, indent=2, cls=DateTimeEncoder)
                
            summary[table] = len(rows)
            total_exported_records += len(rows)
            logger.info(f"Exported [{table}]: {len(rows)} records -> {file_path}")
        except Exception as e:
            logger.warning(f"Could not export table [{table}]: {e}")
            summary[table] = 0

    logger.info(f"Database Export Complete! Total {total_exported_records} records exported across {len(summary)} tables.")
    return {
        "status": "success",
        "dump_dir": dump_dir,
        "total_records": total_exported_records,
        "table_summary": summary
    }

if __name__ == "__main__":
    res = export_all_tables_to_json()
    print("Export Summary:", json.dumps(res, indent=2))
