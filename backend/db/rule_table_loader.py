import os
import csv
import re
import logging
from .sql_server_conn import SqlServerConnector

logger = logging.getLogger(__name__)

CSV_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "all_sources_vulnerability_extraction_with_queries.csv")
)

def load_vulnerability_rule_table(sql_conn: SqlServerConnector, force_reload: bool = False) -> dict:
    """Reads all_sources_vulnerability_extraction_with_queries.csv and inserts rules into SQL Server DB."""
    if not os.path.exists(CSV_PATH):
        logger.error(f"Rule CSV not found at path: {CSV_PATH}")
        return {"status": "error", "message": f"CSV file not found: {CSV_PATH}", "records_loaded": 0}

    try:
        # Ensure column target_table_name exists in SQL DB
        sql_conn.execute_non_query("""
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID('rule_vulnerability_queries') AND name = 'target_table_name'
            )
            BEGIN
                ALTER TABLE rule_vulnerability_queries ADD target_table_name VARCHAR(128);
            END
        """)

        # Check existing count
        existing = sql_conn.fetch_one("SELECT COUNT(*) AS cnt FROM rule_vulnerability_queries")
        count = existing.get("cnt", 0) if existing else 0

        if count > 0 and not force_reload:
            logger.info(f"rule_vulnerability_queries table already populated with {count} records. Skipping reload.")
            return {"status": "skipped", "message": "Already populated", "records_loaded": count}

        if force_reload:
            sql_conn.execute_non_query("TRUNCATE TABLE rule_vulnerability_queries")

        records = []
        with open(CSV_PATH, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f, delimiter="|")
            for row in reader:
                source = (row.get("Source") or "").strip()
                attack_id = (row.get("Attack ID") or "").strip()
                attack_tech = (row.get("Attack Technique") or "").strip()
                d3fend = (row.get("D3FEND Control") or "").strip()
                data_extract = (row.get("Data to Extract") or "").strip()
                audit_criteria = (row.get("Vulnerability Audit Criteria") or "").strip()
                remediation = (row.get("Remediation Command") or "").strip()
                q_num = (row.get("Query_Number") or "").strip()
                gen_q = (row.get("GenQuery") or "").strip()
                llm_q = (row.get("LLMQuery") or "").strip()

                # Use LLMQuery as active_query by default
                active_q = llm_q if llm_q else gen_q

                # Extract Target Table Name from FROM clause in SQL
                tbl_match = re.search(r"FROM\s+\[?([a-zA-Z0-9_]+)\]?", active_q, re.IGNORECASE)
                target_table = tbl_match.group(1) if tbl_match else "identity_events"

                records.append((
                    source, target_table, attack_id, attack_tech, d3fend, data_extract,
                    audit_criteria, remediation, q_num, gen_q, llm_q, active_q
                ))

        logger.info(f"Loaded {len(records)} rule records from CSV. Inserting into SQL Server DB...")

        # Batch insert into SQL Server DB
        batch_size = 200
        inserted_count = 0
        with sql_conn.get_connection() as conn:
            cursor = conn.cursor()
            insert_sql = """
                INSERT INTO rule_vulnerability_queries (
                    source_system, target_table_name, attack_id, attack_technique, d3fend_control, data_to_extract,
                    vulnerability_audit_criteria, remediation_command, query_number, gen_query, llm_query, active_query
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            for i in range(0, len(records), batch_size):
                batch = records[i:i+batch_size]
                cursor.executemany(insert_sql, batch)
                conn.commit()
                inserted_count += len(batch)

        logger.info(f"Successfully inserted {inserted_count} rules into rule_vulnerability_queries.")
        return {"status": "success", "message": f"Inserted {inserted_count} rules", "records_loaded": inserted_count}

    except Exception as e:
        logger.error(f"Error loading rule table CSV: {e}")
        return {"status": "error", "message": str(e), "records_loaded": 0}
