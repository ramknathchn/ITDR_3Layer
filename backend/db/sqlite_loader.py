import os
import json
import sqlite3
import logging
from backend.db.sqlite_conn import sqlite_db, DEFAULT_SQLITE_PATH

logger = logging.getLogger("sqlite_loader")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

class SqliteLoader:
    """Initializes SQLite database schema and loads all exported JSON table dumps into SQLite cleanly."""

    def __init__(self, db_path: str = DEFAULT_SQLITE_PATH, json_dumps_dir: str = None, schema_sql_path: str = None):
        self.db_path = os.path.abspath(db_path)
        
        base_dir = os.path.abspath(os.path.dirname(__file__))
        if not json_dumps_dir:
            json_dumps_dir = os.path.join(base_dir, "json_dumps")
        if not schema_sql_path:
            schema_sql_path = os.path.join(base_dir, "sqlite_schema.sql")

        self.json_dumps_dir = json_dumps_dir
        self.schema_sql_path = schema_sql_path

    def load_json_dumps_into_sqlite(self) -> dict:
        """Reads JSON dump files, creates tables with exact matching schemas, truncates, and loads all rows."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)

        if not os.path.exists(self.json_dumps_dir):
            logger.error(f"JSON dumps directory not found at: {self.json_dumps_dir}")
            return {"status": "error", "message": "JSON dumps directory missing"}

        json_files = [f for f in os.listdir(self.json_dumps_dir) if f.endswith(".json")]
        logger.info(f"Found {len(json_files)} JSON dump files in {self.json_dumps_dir}")

        total_loaded_records = 0
        table_summary = {}

        with sqlite_db.get_connection() as conn:
            cursor = conn.cursor()

            for jf in json_files:
                table_name = os.path.splitext(jf)[0]
                json_path = os.path.join(self.json_dumps_dir, jf)

                try:
                    with open(json_path, "r", encoding="utf-8") as f:
                        records = json.load(f)

                    # Drop table first to recreate cleanly without old schema mismatch
                    cursor.execute(f"DROP TABLE IF EXISTS [{table_name}]")
                    conn.commit()

                    if not records:
                        cursor.execute(f"CREATE TABLE IF NOT EXISTS [{table_name}] (id TEXT)")
                        table_summary[table_name] = 0
                        continue

                    # Determine columns from sample record
                    sample_columns = list(records[0].keys())
                    
                    col_defs = [f"[{col}] TEXT" for col in sample_columns]
                    create_ddl = f"CREATE TABLE [{table_name}] ({', '.join(col_defs)})"
                    cursor.execute(create_ddl)
                    conn.commit()

                    # Insert records
                    placeholders = ", ".join(["?"] * len(sample_columns))
                    col_names_str = ", ".join([f"[{c}]" for c in sample_columns])
                    insert_sql = f"INSERT INTO [{table_name}] ({col_names_str}) VALUES ({placeholders})"

                    row_tuples = []
                    for r in records:
                        row_vals = []
                        for c in sample_columns:
                            v = r.get(c)
                            if isinstance(v, (dict, list)):
                                v = json.dumps(v)
                            row_vals.append(v)
                        row_tuples.append(tuple(row_vals))

                    cursor.executemany(insert_sql, row_tuples)
                    conn.commit()

                    table_summary[table_name] = len(records)
                    total_loaded_records += len(records)
                    logger.info(f"Loaded [{table_name}]: {len(records)} rows into SQLite DB.")

                except Exception as e:
                    logger.error(f"Error loading JSON dump for [{table_name}]: {e}")
                    table_summary[table_name] = f"Error: {str(e)}"

        logger.info(f"SQLite DB Load Complete! Total {total_loaded_records} records loaded across {len(table_summary)} tables.")
        return {
            "status": "success",
            "sqlite_db_path": self.db_path,
            "total_records_loaded": total_loaded_records,
            "table_summary": table_summary
        }

if __name__ == "__main__":
    loader = SqliteLoader()
    res = loader.load_json_dumps_into_sqlite()
    print("SQLite Loader Result:", json.dumps(res, indent=2))
