import os
import csv
import logging
from backend.db.sql_server_conn import sql_db

logger = logging.getLogger("itdr_3layer")

class BlastRadiusMigrator:
    """Evaluates threat_blast_radius_data_spec.csv and executes DDL migrations against SQL Server DB."""

    def __init__(self, spec_csv_path: str = None):
        if not spec_csv_path:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            spec_csv_path = os.path.join(base_dir, "threat_blast_radius_data_spec.csv")
        self.spec_csv_path = spec_csv_path

    def run_migrations(self):
        logger.info(f"Starting Database Schema Migration from spec: {self.spec_csv_path}")
        if not os.path.exists(self.spec_csv_path):
            logger.error(f"Spec CSV file not found at: {self.spec_csv_path}")
            return False

        # First, ensure security_blast_radius_edges table exists
        self._ensure_blast_radius_edges_table()

        new_count = 0
        changed_count = 0
        existing_count = 0

        with open(self.spec_csv_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                status = (row.get("Status") or "").strip().upper()
                table_name = (row.get("RDBMS Table Name") or "").strip()
                schema_def = (row.get("RDBMS Schema & Column Types (Including New Blast Radius Fields)") or "").strip()

                if not table_name or not schema_def:
                    continue

                if status == "NEW":
                    if self._create_new_table(table_name, schema_def):
                        new_count += 1
                elif status == "CHANGED":
                    if self._alter_changed_table(table_name, schema_def):
                        changed_count += 1
                elif status == "EXISTING":
                    if self._verify_existing_table(table_name):
                        existing_count += 1

        logger.info(f"Schema Synchronization Complete: {new_count} NEW tables created, {changed_count} CHANGED tables altered, {existing_count} EXISTING tables verified.")
        return True

    def _ensure_blast_radius_edges_table(self):
        """Creates global graph table for 5-hop recursive CTE graph traversal."""
        ddl = """
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
        """
        try:
            sql_db.execute_non_query(ddl)
            logger.info("Table 'security_blast_radius_edges' verified / created successfully.")
        except Exception as e:
            logger.error(f"Error creating security_blast_radius_edges table: {e}")

    def _create_new_table(self, table_name: str, schema_def: str) -> bool:
        """Constructs and executes ANSI/SQL Server CREATE TABLE DDL for NEW items."""
        # Convert JSONB to NVARCHAR(MAX) for SQL Server compatibility
        tsql_schema = schema_def.replace("JSONB", "NVARCHAR(MAX)").replace("TIMESTAMP", "DATETIME").replace("BOOLEAN", "BIT")
        
        # Strip generated column syntax for simple SQL Server DDL if present
        if "GENERATED ALWAYS AS" in tsql_schema:
            parts = tsql_schema.split("is_rc4_enabled")
            if len(parts) > 1:
                tsql_schema = parts[0] + "is_rc4_enabled BIT"

        ddl = f"""
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '{table_name}')
        BEGIN
            CREATE TABLE {table_name} (
                {tsql_schema}
            );
        END
        """
        try:
            sql_db.execute_non_query(ddl)
            logger.info(f"[NEW] Created table '{table_name}'")
            return True
        except Exception as e:
            logger.warning(f"[NEW] DDL execution for '{table_name}' failed or already exists: {e}")
            return False

    def _alter_changed_table(self, table_name: str, schema_def: str) -> bool:
        """Executes non-destructive ALTER TABLE ... ADD COLUMN DDL for CHANGED items."""
        tsql_schema = schema_def.replace("JSONB", "NVARCHAR(MAX)").replace("TIMESTAMP", "DATETIME").replace("BOOLEAN", "BIT")
        
        # Ensure base table exists first
        if not self._verify_existing_table(table_name):
            return self._create_new_table(table_name, tsql_schema)

        # Parse columns from schema_def
        columns = [c.strip() for c in tsql_schema.split(",") if c.strip()]
        added = 0
        for col in columns:
            col_name = col.split()[0].replace("[", "").replace("]", "")
            if col_name.upper() in ["PRIMARY", "KEY", "CONSTRAINT", "FOREIGN"]:
                continue
            
            # Form data type string
            col_parts = col.split()[1:]
            col_type = " ".join(col_parts)
            if "PRIMARY KEY" in col_type.upper():
                col_type = col_type.upper().replace("PRIMARY KEY", "").strip()

            alter_ddl = f"""
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('{table_name}') AND name = '{col_name}')
            BEGIN
                ALTER TABLE {table_name} ADD {col_name} {col_type};
            END
            """
            try:
                sql_db.execute_non_query(alter_ddl)
                added += 1
            except Exception as e:
                pass

        logger.info(f"[CHANGED] Altered table '{table_name}' (added/verified {added} columns)")
        return True

    def _verify_existing_table(self, table_name: str) -> bool:
        """Verifies that table schema exists in SQL Server."""
        rows = sql_db.fetch_all(f"SELECT * FROM sys.tables WHERE name = '{table_name}'")
        return len(rows) > 0

blast_migrator = BlastRadiusMigrator()
