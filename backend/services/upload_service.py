import json
import logging
import re
from datetime import datetime
from ..db.sql_server_conn import SqlServerConnector
from ..db.neo4j_conn import Neo4jConnector

logger = logging.getLogger(__name__)

class UploadService:
    def __init__(self, sql_conn: SqlServerConnector, neo_conn: Neo4jConnector):
        self.sql = sql_conn
        self.neo = neo_conn

    def process_targeted_upload(self, filename: str, content_bytes: bytes, target_table: str = None) -> dict:
        """Parses uploaded JSON and inserts into explicit relational columns of individual tables."""
        try:
            json_str = content_bytes.decode("utf-8")
            data = json.loads(json_str)
        except Exception as e:
            error_msg = f"Invalid JSON format: {e}"
            self._log_upload(filename, target_table or "unknown", 0, "failed", error_msg)
            return {"status": "error", "message": error_msg}

        table = target_table if target_table else self._detect_json_type(data, filename)
        inserted_count = 0

        try:
            if table == "identity_events":
                inserted_count = self._ingest_events(data if isinstance(data, list) else [data])
            elif table == "threat_bulletins":
                inserted_count = self._ingest_bulletins(data if isinstance(data, list) else [data])
            elif table == "identity_profiles":
                inserted_count = self._ingest_profiles(data if isinstance(data, list) else [data])
            elif table == "bank_topology":
                inserted_count = self._ingest_topology(data if isinstance(data, dict) else {"users": data})
            elif table == "identity_feed_entries":
                inserted_count = self._ingest_feed_entries(data if isinstance(data, list) else [data])
            elif table == "identity_feeds":
                inserted_count = self._ingest_feeds_config(data if isinstance(data, list) else [data])
            elif table == "audit_results":
                inserted_count = self._ingest_audit_results(data if isinstance(data, list) else [data])
            else:
                # Custom or new JSON feed: Create a dedicated individual table dynamically!
                inserted_count = self.create_custom_table_and_ingest(table, data)

            self._log_upload(filename, table, inserted_count, "success", None)
            return {
                "status": "success",
                "filename": filename,
                "target_table": table,
                "records_inserted": inserted_count,
                "table_counts": self.sql.get_table_counts()
            }
        except Exception as e:
            error_msg = f"Ingestion into target table [{table}] failed: {e}"
            logger.error(error_msg)
            self._log_upload(filename, table, 0, "failed", error_msg)
            return {"status": "error", "message": error_msg}

    def create_custom_table_and_ingest(self, table_name: str, data) -> int:
        """Dynamically creates an individual SQL Server table for a new JSON feed with explicit typed columns for each JSON property."""
        clean_table = re.sub(r'[^a-zA-Z0-9_]', '_', table_name.lower())
        items = data if isinstance(data, list) else [data]
        if not items:
            return 0

        first_item = items[0]
        if not isinstance(first_item, dict):
            return 0

        # Build DDL with typed columns for every key in the JSON object
        column_defs = ["id INT IDENTITY(1,1) PRIMARY KEY"]
        for key, val in first_item.items():
            clean_col = re.sub(r'[^a-zA-Z0-9_]', '_', key.lower())
            if clean_col == "id":
                continue
            if isinstance(val, int):
                col_type = "INT"
            elif isinstance(val, float):
                col_type = "FLOAT"
            elif isinstance(val, bool):
                col_type = "INT"
            else:
                col_type = "NVARCHAR(MAX)" if len(str(val)) > 200 else "NVARCHAR(255)"
            column_defs.append(f"[{clean_col}] {col_type}")

        ddl = f"""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = '{clean_table}')
            BEGIN
                CREATE TABLE [{clean_table}] (
                    {', '.join(column_defs)}
                )
            END
        """
        self.sql.execute_non_query(ddl)

        # Ingest items into individual typed columns
        count = 0
        cols = [re.sub(r'[^a-zA-Z0-9_]', '_', k.lower()) for k in first_item.keys() if k.lower() != "id"]
        placeholders = ", ".join(["?"] * len(cols))
        col_names = ", ".join([f"[{c}]" for c in cols])

        insert_sql = f"INSERT INTO [{clean_table}] ({col_names}) VALUES ({placeholders})"

        for item in items:
            if isinstance(item, dict):
                vals = []
                for k in first_item.keys():
                    if k.lower() == "id": continue
                    v = item.get(k)
                    if isinstance(v, (dict, list)):
                        vals.append(json.dumps(v))
                    else:
                        vals.append(v)
                self.sql.execute_non_query(insert_sql, tuple(vals))
                count += 1
        return count

    def _detect_json_type(self, data, filename: str) -> str:
        fname = filename.lower()
        if "topology" in fname or (isinstance(data, dict) and "users" in data):
            return "bank_topology"
        if "bulletin" in fname:
            return "threat_bulletins"
        if "profile" in fname:
            return "identity_profiles"
        if "feed" in fname:
            return "identity_feed_entries"

        if isinstance(data, list) and len(data) > 0:
            first = data[0]
            if isinstance(first, dict):
                if "event_id" in first or "event_type" in first or "source_ip" in first:
                    return "identity_events"
                if "bulletin_id" in first or "actors" in first:
                    return "threat_bulletins"
                if "baseline_risk_score" in first or "department" in first:
                    return "identity_profiles"
        return "identity_events"

    def _ingest_events(self, items: list) -> int:
        count = 0
        for item in items:
            event_id = str(item.get("event_id", item.get("id", f"EVT-UP-{datetime.utcnow().timestamp()}-{count}")))
            timestamp = str(item.get("timestamp", datetime.utcnow().isoformat()))
            event_type = str(item.get("event_type", "auth_event"))
            identity_user = str(item.get("user", item.get("identity_user", item.get("identity", "unknown@scb.com"))))
            identity_type = str(item.get("identity_type", "employee"))
            source_ip = str(item.get("source_ip", item.get("ip_address", "10.0.0.1")))
            geo_location = str(item.get("geo_location", item.get("location", "Internal")))
            provider = str(item.get("provider", item.get("identity_provider", "CUSTOM_UPLOAD")))
            success = 1 if item.get("success", True) in [True, 1, "Success"] else 0
            risk_score = float(item.get("risk_score", 30.0))

            self.sql.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM identity_events WHERE event_id = ?)
                BEGIN
                    INSERT INTO identity_events 
                    (event_id, timestamp, event_type, identity_user, identity_type, source_ip, geo_location, identity_provider, success, risk_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                END
            """, (event_id, event_id, timestamp, event_type, identity_user, identity_type, source_ip, geo_location, provider, success, risk_score))
            count += 1
        return count

    def _ingest_bulletins(self, items: list) -> int:
        count = 0
        for item in items:
            bid = str(item.get("id", item.get("bulletin_id", f"TB-UP-{count+1}")))
            title = str(item.get("title", "Uploaded Threat Bulletin"))
            content = str(item.get("content", item.get("description", "")))
            actors = json.dumps(item.get("actors", []))
            created_at = str(item.get("created_at", datetime.utcnow().isoformat()))
            impact = str(item.get("impact_rating", "MEDIUM"))
            summary = str(item.get("summary", title))

            self.sql.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM threat_bulletins WHERE id = ?)
                BEGIN
                    INSERT INTO threat_bulletins (id, bulletin_id, title, content, actors, created_at, impact_rating, summary)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                END
            """, (bid, bid, bid, title, content, actors, created_at, impact, summary))
            count += 1
        return count

    def _ingest_profiles(self, items: list) -> int:
        count = 0
        for item in items:
            user = str(item.get("identity_user", item.get("identity", f"user_{count}@scb.com")))
            itype = str(item.get("identity_type", "Employee"))
            dept = str(item.get("department", "General"))
            base_risk = float(item.get("baseline_risk_score", 10.0))
            curr_risk = float(item.get("current_risk_score", 10.0))
            total = int(item.get("total_events", 0))
            failed = int(item.get("failed_logins_24h", 0))
            last_seen = str(item.get("last_seen", datetime.utcnow().isoformat()))
            norm_h = str(item.get("normal_hours", "09:00-17:00"))
            norm_loc = str(item.get("normal_locations", "Singapore"))
            norm_ips = str(item.get("normal_ips", "10.0.0.1"))

            self.sql.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM identity_profiles WHERE identity_user = ?)
                BEGIN
                    INSERT INTO identity_profiles 
                    (identity_user, identity_type, department, baseline_risk_score, current_risk_score, total_events, failed_logins_24h, last_seen, normal_hours, normal_locations, normal_ips)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                END
            """, (user, user, itype, dept, base_risk, curr_risk, total, failed, last_seen, norm_h, norm_loc, norm_ips))
            count += 1
        return count

    def _ingest_topology(self, data: dict) -> int:
        users = data.get("users", [])
        count = 0
        for u in users:
            uid = u.get("id", f"USR-{count}")
            uname = u.get("name", "Unknown User")
            role = u.get("role", "User")
            groups = u.get("groups", [])
            assets = u.get("assets", [])

            self.neo.execute_cypher("MERGE (u:User {id: $id}) SET u.name = $name, u.role = $role", {"id": uid, "name": uname, "role": role})
            for g in groups:
                self.neo.execute_cypher("MERGE (grp:Group {name: $g}) MERGE (u:User {id: $id}) MERGE (u)-[:MEMBER_OF]->(grp)", {"g": g, "id": uid})
            for a in assets:
                self.neo.execute_cypher("MERGE (ast:Asset {name: $a}) MERGE (u:User {id: $id}) MERGE (u)-[:HAS_ACCESS]->(ast)", {"a": a, "id": uid})
            count += 1
        return count

    def _ingest_feed_entries(self, items: list) -> int:
        count = 0
        for item in items:
            eid = str(item.get("entry_id", f"ENT-{datetime.utcnow().timestamp()}-{count}"))
            fid = str(item.get("feed_id", "feed_custom"))
            title = str(item.get("title", "Feed Entry"))
            content = str(item.get("content", item.get("summary", "")))
            sev = str(item.get("severity", "MEDIUM"))
            src = str(item.get("source", "Collector"))

            self.sql.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM identity_feed_entries WHERE entry_id = ?)
                BEGIN
                    INSERT INTO identity_feed_entries (entry_id, feed_id, title, content, severity, source)
                    VALUES (?, ?, ?, ?, ?, ?)
                END
            """, (eid, eid, fid, title, content, sev, src))
            count += 1
        return count

    def _ingest_feeds_config(self, items: list) -> int:
        count = 0
        for item in items:
            fid = str(item.get("feed_id", f"FEED-{count+1}"))
            name = str(item.get("name", "Feed"))
            url = str(item.get("url", "https://example.com"))
            cat = str(item.get("category", "General"))
            ftype = str(item.get("feed_type", "rss"))
            key_req = 1 if item.get("api_key_required", False) else 0

            self.sql.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM identity_feeds WHERE feed_id = ?)
                BEGIN
                    INSERT INTO identity_feeds (feed_id, name, url, category, feed_type, api_key_required)
                    VALUES (?, ?, ?, ?, ?, ?)
                END
            """, (fid, fid, name, url, cat, ftype, key_req))
            count += 1
        return count

    def _ingest_audit_results(self, items: list) -> int:
        count = 0
        for item in items:
            bid = str(item.get("bulletin_id", "TB-AUDIT"))
            cid = str(item.get("countermeasure_id", "D3-MFA"))
            cname = str(item.get("countermeasure_name", "Multi-Factor Authentication"))
            status = str(item.get("status", "Secured"))
            details = str(item.get("details", "Passed verification script."))
            timestamp = str(item.get("timestamp", datetime.utcnow().isoformat()))

            self.sql.execute_non_query("""
                INSERT INTO audit_results (bulletin_id, countermeasure_id, countermeasure_name, status, details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (bid, cid, cname, status, details, timestamp))
            count += 1
        return count

    def _log_upload(self, filename: str, file_type: str, records: int, status: str, message: str):
        try:
            self.sql.execute_non_query("""
                INSERT INTO json_upload_logs (filename, file_type, record_count, uploaded_at, status, error_message)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (filename, file_type, records, datetime.utcnow().isoformat(), status, message))
        except Exception as e:
            logger.error(f"Failed to log upload audit: {e}")
