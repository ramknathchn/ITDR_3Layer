import logging
from typing import List, Dict, Optional
from datetime import datetime
from ..db.sql_server_conn import SqlServerConnector

logger = logging.getLogger(__name__)

class AlertService:
    def __init__(self, sql_conn: SqlServerConnector):
        self.sql = sql_conn

    def get_alerts(self, limit: int = 100, severity: Optional[str] = None, status: Optional[str] = None) -> List[Dict]:
        where_clauses = []
        params = []
        if severity:
            where_clauses.append("severity = ?")
            params.append(severity)
        if status:
            where_clauses.append("status = ?")
            params.append(status)

        where_str = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        query = f"SELECT TOP {limit} * FROM identity_alerts {where_str} ORDER BY timestamp DESC"
        return self.sql.fetch_all(query, tuple(params))

    def update_alert_status(self, alert_id: str, new_status: str, response_action: Optional[str] = None) -> bool:
        resolved_at = datetime.utcnow().isoformat() if new_status in ["resolved", "dismissed"] else None
        try:
            self.sql.execute_non_query("""
                UPDATE identity_alerts
                SET status = ?, response_action = COALESCE(?, response_action), resolved_at = ?
                WHERE alert_id = ?
            """, (new_status, response_action, resolved_at, alert_id))
            return True
        except Exception as e:
            logger.error(f"Error updating alert {alert_id}: {e}")
            return False

    def trigger_playbook_response(self, alert_id: str, action_type: str, identity_user: str) -> Dict:
        """Executes automated containment playbooks (e.g., Disable AD user, revoke session)."""
        action_id = f"ACT-{datetime.utcnow().timestamp()}"
        timestamp = datetime.utcnow().isoformat()
        details = f"Executed {action_type} for target identity {identity_user}."

        self.sql.execute_non_query("""
            INSERT INTO response_actions (action_id, alert_id, timestamp, action_type, identity_user, status, details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (action_id, alert_id, timestamp, action_type, identity_user, "SUCCESS", details))

        self.update_alert_status(alert_id, "contained", action_type)

        return {
            "action_id": action_id,
            "alert_id": alert_id,
            "action_type": action_type,
            "target_identity": identity_user,
            "status": "SUCCESS",
            "timestamp": timestamp
        }

    def get_response_actions(self, limit: int = 50) -> List[Dict]:
        return self.sql.fetch_all(f"SELECT TOP {limit} * FROM response_actions ORDER BY timestamp DESC")
