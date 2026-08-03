import sqlite3
import logging
import os
import json
from typing import List, Dict, Any, Optional

logger = logging.getLogger("sqlite_conn")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# Default SQLite database path inside workspace
DEFAULT_SQLITE_PATH = os.getenv("SQLITE_DB_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "itdr_3layer.db")))

class SqliteConnector:
    """SQLite Database Connector implementing the same interface as SqlServerConnector."""

    def __init__(self, db_path: str = DEFAULT_SQLITE_PATH):
        self.db_path = os.path.abspath(db_path)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._cached_health = False

    def get_connection(self):
        conn = sqlite3.connect(self.db_path, timeout=10)
        conn.row_factory = sqlite3.Row  # Dict-like row access
        return conn

    def check_health(self) -> dict:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
                self._cached_health = True
                return {
                    "status": "connected",
                    "engine": "SQLite 3",
                    "database_path": self.db_path
                }
        except Exception as e:
            self._cached_health = False
            logger.warning(f"SQLite health check failed: {e}")
            return {
                "status": "disconnected",
                "engine": "SQLite 3",
                "error": str(e),
                "database_path": self.db_path
            }

    def fetch_all(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                rows = cursor.fetchall()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Error executing SQLite fetch_all query: {e}")
            return []

    def fetch_one(self, query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error executing SQLite fetch_one query: {e}")
            return None

    def execute_non_query(self, query: str, params: tuple = ()) -> bool:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error executing SQLite execute_non_query: {e}")
            return False

# Global SQLite DB instance
sqlite_db = SqliteConnector()
