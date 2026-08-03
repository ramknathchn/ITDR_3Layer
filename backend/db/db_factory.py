import os
import logging
from backend.db.sqlite_conn import sqlite_db, SqliteConnector
from backend.db.sql_server_conn import sql_db, SqlServerConnector

logger = logging.getLogger("db_factory")

# Database engine selection: "sqlite" or "sqlserver" (Defaults to "sqlite" for portable standalone deployments)
DB_ENGINE = os.getenv("DB_ENGINE", "sqlite").lower()

def get_db_connector():
    """Returns active database connector (SqliteConnector or SqlServerConnector) based on DB_ENGINE config."""
    if DB_ENGINE == "sqlserver":
        logger.info("Database Factory: Using SQL Server Connector")
        return sql_db
    else:
        logger.info("Database Factory: Using SQLite Connector (itdr_3layer.db)")
        return sqlite_db

# Primary database instance for application services
active_db = get_db_connector()
