import logging
from typing import Optional, List, Dict
from ..db.sql_server_conn import SqlServerConnector

logger = logging.getLogger(__name__)

class IdentityService:
    def __init__(self, sql_conn: SqlServerConnector):
        self.sql = sql_conn

    def get_events(
        self,
        limit: int = 100,
        provider: Optional[str] = None,
        identity_user: Optional[str] = None,
        min_risk: float = 0.0,
        success: Optional[int] = None
    ) -> List[Dict]:
        """Fetches telemetry events from SQL Server with filtering and limit."""
        where_clauses = ["risk_score >= ?"]
        params = [min_risk]

        if provider:
            where_clauses.append("identity_provider = ?")
            params.append(provider)
        if identity_user:
            where_clauses.append("identity_user LIKE ?")
            params.append(f"%{identity_user}%")
        if success is not None:
            where_clauses.append("success = ?")
            params.append(success)

        where_str = " WHERE " + " AND ".join(where_clauses)
        query = f"SELECT TOP {limit} * FROM identity_events {where_str} ORDER BY timestamp DESC"
        
        events = self.sql.fetch_all(query, tuple(params))
        return events

    def get_profiles(self, limit: int = 50, min_risk: float = 0.0) -> List[Dict]:
        """Fetches UEBA identity profiles sorted by current risk score."""
        query = f"SELECT TOP {limit} * FROM identity_profiles WHERE current_risk_score >= ? ORDER BY current_risk_score DESC"
        profiles = self.sql.fetch_all(query, (min_risk,))
        return profiles

    def get_identity_summary(self) -> Dict:
        """Returns summary metrics for the telemetry dashboard."""
        events_total = self.sql.fetch_one("SELECT COUNT(*) as cnt FROM identity_events")
        high_risk_events = self.sql.fetch_one("SELECT COUNT(*) as cnt FROM identity_events WHERE risk_score >= 70.0")
        failed_logins = self.sql.fetch_one("SELECT COUNT(*) as cnt FROM identity_events WHERE success = 0")
        active_profiles = self.sql.fetch_one("SELECT COUNT(*) as cnt FROM identity_profiles")
        high_risk_users = self.sql.fetch_one("SELECT COUNT(*) as cnt FROM identity_profiles WHERE current_risk_score >= 70.0")

        return {
            "total_events": events_total["cnt"] if events_total else 0,
            "high_risk_events": high_risk_events["cnt"] if high_risk_events else 0,
            "failed_logins": failed_logins["cnt"] if failed_logins else 0,
            "monitored_identities": active_profiles["cnt"] if active_profiles else 0,
            "high_risk_identities": high_risk_users["cnt"] if high_risk_users else 0
        }
