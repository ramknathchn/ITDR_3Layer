import os
import json
import logging
from datetime import datetime
from .sql_server_conn import SqlServerConnector
from .neo4j_conn import Neo4jConnector
from .rule_table_loader import load_vulnerability_rule_table
from .bank_sample_data_generator import seed_enterprise_bank_sample_data

logger = logging.getLogger(__name__)

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "sample_feeds"))

def load_json_file(filepath: str):
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading JSON file {filepath}: {e}")
        return None

def seed_all_sample_data(sql_conn: SqlServerConnector, neo_conn: Neo4jConnector) -> dict:
    """Reads all sample JSON files and populates individual SQL Server tables and Neo4j graph."""
    results = {"sql_records_inserted": 0, "status": "success", "details": []}

    # 1. Initialize all individual SQL Server tables & Neo4j DB
    sql_conn.initialize_database()

    # 2. Seed 2,079+ Rule Vulnerability Queries from CSV
    rule_res = load_vulnerability_rule_table(sql_conn)
    results["details"].append({"component": "rule_vulnerability_queries", "res": rule_res})

    # 3. Seed 24 Multi-Plane Enterprise Bank Telemetry Tables
    bank_res = seed_enterprise_bank_sample_data(sql_conn)
    results["details"].append({"component": "enterprise_bank_data", "res": bank_res})

    # Seed Default Identity Feeds Configuration
    default_feeds = [
        ("sailpoint", "SailPoint Governance Access Log", "sim://sailpoint", 1, "sample", 0, "sailpoint_governance.json"),
        ("hashicorp", "HashiCorp Vault Access Audit Log", "sim://hashicorp", 1, "sample", 0, "hashicorp_vault.json"),
        ("beyondtrust", "BeyondTrust PAM Session Audit Log", "sim://beyondtrust", 1, "sample", 0, "beyondtrust_pam.json"),
        ("active_directory", "Active Directory Security Event Log", "sim://active_directory", 1, "sample", 0, "active_directory.json"),
        ("entra_id", "Microsoft Entra ID Authentication Sign-in Logs", "sim://entra_id", 1, "sample", 0, "entra_id.json"),
        ("aws_iam", "AWS IAM CloudTrail Activity Logs", "sim://aws_iam", 1, "sample", 0, "aws_iam.json"),
        ("azure_iam", "Azure Subscription RBAC Activity Logs", "sim://azure_iam", 1, "sample", 0, "azure_iam.json"),
        ("mdf_identity", "Microsoft Defender for Identity Alerts Log", "sim://mdf_identity", 2, "sample", 0, "mdf_identity.json"),
        ("entra_protection", "Microsoft Entra ID Identity Protection Risk Logs", "sim://entra_protection", 2, "sample", 0, "entra_protection.json"),
        ("wiz", "Wiz.io Cloud Tenant Identity Vulnerability Log", "sim://wiz", 2, "sample", 0, "wiz_io.json"),
        ("control_libs", "Enterprise Control Standards Libraries", "sim://control_libs", 4, "sample", 0, "control_libraries.json")
    ]

    for fid, name, url, cat, ftype, req, fallback in default_feeds:
        sql_conn.execute_non_query("""
            IF NOT EXISTS (SELECT 1 FROM identity_feeds WHERE feed_id = ?)
            BEGIN
                INSERT INTO identity_feeds (feed_id, name, url, category, feed_type, api_key_required, fallback_sample_file)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            END
        """, (fid, fid, name, url, cat, ftype, req, fallback))

    # Seed RSS Feeds
    default_rss = [
        ("CISA Cybersecurity Advisories", "https://www.cisa.gov/cybersecurity-advisories/all.xml"),
        ("SANS Internet Storm Center Diary", "https://isc.sans.edu/rssfeed_full.xml"),
        ("The Hacker News", "https://feeds.feedburner.com/TheHackerNews"),
        ("Cisco Talos Intelligence Blog", "http://feeds.feedburner.com/feedburner/Talos"),
        ("Microsoft Security Blog", "https://techcommunity.microsoft.com/t5/security-blog/bg-p/SecurityBlog/rss")
    ]
    for rname, rurl in default_rss:
        sql_conn.execute_non_query("""
            IF NOT EXISTS (SELECT 1 FROM rss_feeds WHERE url = ?)
            BEGIN
                INSERT INTO rss_feeds (name, url, enabled) VALUES (?, ?, 1)
            END
        """, (rurl, rname, rurl))

    log_file_table_mapping = [
        ("ad_events_sample.json", "ad_events", "ACTIVE_DIRECTORY"),
        ("entra_signin_sample.json", "entra_signin_logs", "ENTRA_ID"),
        ("aws_cloudtrail_sample.json", "aws_cloudtrail_logs", "AWS_IAM"),
        ("forgerock_audit_sample.json", "forgerock_audit_logs", "FORGEROCK"),
        ("zscaler_logs_sample.json", "zscaler_activity_logs", "ZSCALER"),
        ("vault_audit_sample.json", "vault_audit_logs", "HASHICORP_VAULT"),
        ("beyondtrust_session_sample.json", "beyondtrust_session_logs", "BEYONDTRUST"),
        ("databricks_audit_sample.json", "databricks_audit_logs", "DATABRICKS"),
        ("elasticsearch_audit_sample.json", "elasticsearch_audit_logs", "ELASTICSEARCH"),
        ("vector_search_sample.json", "vector_search_logs", "VECTOR_SEARCH"),
        ("mdi_alerts_sample.json", "mdi_security_alerts", "DEFENDER_MDI"),
        ("entra_risk_sample.json", "entra_risk_detections", "ENTRA_RISK"),
        ("wiz_issues_sample.json", "wiz_vulnerability_issues", "WIZ_IO"),
        ("sentinelone_threats_sample.json", "sentinelone_threat_activities", "SENTINELONE"),
        ("azure_activity_sample.json", "azure_activity_logs", "AZURE_PLATFORM")
    ]

    total_logs = 0
    for filename, table_name, provider_name in log_file_table_mapping:
        filepath = os.path.join(DATA_DIR, filename)
        data = load_json_file(filepath)
        if isinstance(data, list):
            for idx, item in enumerate(data):
                event_id = str(item.get("event_id", item.get("id", f"EVT-{table_name[:4].upper()}-{idx+1000}")))
                timestamp = str(item.get("timestamp", item.get("time", datetime.utcnow().isoformat())))
                event_type = str(item.get("event_type", item.get("action", "logon")))
                identity_user = str(item.get("user", item.get("identity", item.get("user_principal_name", "unknown.user@scb.com"))))
                identity_type = str(item.get("user_type", item.get("identity_type", "employee")))
                source_ip = str(item.get("source_ip", item.get("ip_address", "10.0.0.1")))
                geo_loc = str(item.get("geo_location", item.get("location", "Singapore")))
                success = 1 if item.get("status", item.get("success", "Success")) in [True, "Success", "SUCCESS", 1] else 0
                risk_score = float(item.get("risk_score", 15.0 if success == 1 else 75.0))

                # Insert into INDIVIDUAL DEDICATED TABLE
                sql_conn.execute_non_query(f"""
                    IF NOT EXISTS (SELECT 1 FROM [{table_name}] WHERE event_id = ?)
                    BEGIN
                        INSERT INTO [{table_name}] 
                        (event_id, timestamp, event_type, identity_user, identity_type, source_ip, geo_location, success, risk_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    END
                """, (event_id, event_id, timestamp, event_type, identity_user, identity_type, source_ip, geo_loc, success, risk_score))

                # Also insert into master identity_events table for unified telemetry monitoring
                sql_conn.execute_non_query("""
                    IF NOT EXISTS (SELECT 1 FROM identity_events WHERE event_id = ?)
                    BEGIN
                        INSERT INTO identity_events 
                        (event_id, timestamp, event_type, identity_user, identity_type, source_ip, geo_location, identity_provider, success, risk_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    END
                """, (event_id, event_id, timestamp, event_type, identity_user, identity_type, source_ip, geo_loc, provider_name, success, risk_score))
                total_logs += 1

    results["details"].append(f"Ingested {total_logs} records across individual log tables (ad_events, entra_signin_logs, aws_cloudtrail_logs, forgerock_audit_logs, zscaler_activity_logs).")

    # 3. Seed Threat Bulletins
    bulletin_file = os.path.join(DATA_DIR, "threat_bulletin_samples.json")
    bulletins_data = load_json_file(bulletin_file)
    bulletin_count = 0
    if isinstance(bulletins_data, list):
        for b in bulletins_data:
            bid = str(b.get("id", b.get("bulletin_id", f"TB-{bulletin_count+1}")))
            btitle = str(b.get("title", "Threat Bulletin"))
            bcontent = str(b.get("content", b.get("description", "")))
            bactors = json.dumps(b.get("actors", ["APT29"]))
            bcreated = str(b.get("created_at", datetime.utcnow().isoformat()))
            bimpact = str(b.get("impact_rating", "HIGH"))
            bsummary = str(b.get("summary", btitle))

            sql_conn.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM threat_bulletins WHERE id = ?)
                BEGIN
                    INSERT INTO threat_bulletins (id, bulletin_id, title, content, actors, created_at, impact_rating, summary)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                END
            """, (bid, bid, bid, btitle, bcontent, bactors, bcreated, bimpact, bsummary))
            bulletin_count += 1
    results["details"].append(f"Ingested {bulletin_count} threat bulletins into SQL Server table [threat_bulletins].")

    # 4. Seed Identity Profiles (UEBA Baselines)
    profiles_data = [
        {"identity": "john.smith@scb.com", "type": "Employee", "dept": "Global Banking", "base_risk": 12.5, "curr_risk": 88.0, "total": 142, "failed_24h": 6, "last_seen": "2026-07-23T14:20:00Z", "norm_hours": "08:00-18:00", "norm_locs": "Singapore, London", "norm_ips": "10.14.2.10, 10.14.2.11"},
        {"identity": "sarah.connor@scb.com", "type": "Privileged Admin", "dept": "Cyber Security Operations", "base_risk": 5.0, "curr_risk": 15.0, "total": 310, "failed_24h": 0, "last_seen": "2026-07-23T15:10:00Z", "norm_hours": "07:00-19:00", "norm_locs": "Singapore", "norm_ips": "10.20.1.5"},
        {"identity": "service_account_ad@scb.com", "type": "Service Account", "dept": "IT Infrastructure", "base_risk": 2.0, "curr_risk": 95.0, "total": 1250, "failed_24h": 42, "last_seen": "2026-07-23T15:12:00Z", "norm_hours": "24/7", "norm_locs": "Data Center SG", "norm_ips": "10.0.100.5"}
    ]
    for p in profiles_data:
        sql_conn.execute_non_query("""
            IF NOT EXISTS (SELECT 1 FROM identity_profiles WHERE identity_user = ?)
            BEGIN
                INSERT INTO identity_profiles 
                (identity_user, identity_type, department, baseline_risk_score, current_risk_score, total_events, failed_logins_24h, last_seen, normal_hours, normal_locations, normal_ips)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            END
        """, (p["identity"], p["identity"], p["type"], p["dept"], p["base_risk"], p["curr_risk"], p["total"], p["failed_24h"], p["last_seen"], p["norm_hours"], p["norm_locs"], p["norm_ips"]))

    # 5. Seed Neo4j Knowledge Graph
    topology_file = os.path.join(DATA_DIR, "bank_topology.json")
    topology_data = load_json_file(topology_file)
    if isinstance(topology_data, dict):
        # Seed bank_topology_nodes
        nodes_list = topology_data.get("nodes", [])
        for n in nodes_list:
            nid = n.get("id")
            if not nid:
                continue
            name = n.get("name", nid)
            ntype = n.get("type", "Node")
            tier = n.get("tier", "Tier2")
            risk = float(n.get("risk_score", 10.0))
            details = json.dumps(n.get("details", {}))

            sql_conn.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM bank_topology_nodes WHERE id = ?)
                BEGIN
                    INSERT INTO bank_topology_nodes (id, name, type, tier, risk_score, details)
                    VALUES (?, ?, ?, ?, ?, ?)
                END
            """, (nid, nid, name, ntype, tier, risk, details))

        # Seed bank_topology_edges
        edges_list = topology_data.get("edges", [])
        for e in edges_list:
            source = e.get("source")
            target = e.get("target")
            etype = e.get("type", "CONNECTED_TO")
            if source and target:
                sql_conn.execute_non_query("""
                    IF NOT EXISTS (SELECT 1 FROM bank_topology_edges WHERE source = ? AND target = ? AND type = ?)
                    BEGIN
                        INSERT INTO bank_topology_edges (source, target, type)
                        VALUES (?, ?, ?)
                    END
                """, (source, target, etype, source, target, etype))

        # Reconstruct and seed legacy bank_topology records (Users)
        user_nodes = [n for n in nodes_list if n.get("type") == "User" or n.get("type", "").lower() == "user"]
        for u in user_nodes:
            uid = u.get("id")
            uname = u.get("name", uid)
            udetails = u.get("details", {})
            urole = udetails.get("role") or u.get("tier") or "User"

            # Find matching groups from edges
            ugroups = [e.get("target") for e in edges_list if e.get("source") == uid and e.get("type") == "MEMBER_OF"]
            # Find matching assets from edges
            uassets = [e.get("target") for e in edges_list if e.get("source") == uid and e.get("type") == "HAS_ACCESS"]

            sql_conn.execute_non_query("""
                IF NOT EXISTS (SELECT 1 FROM bank_topology WHERE user_id = ?)
                BEGIN
                    INSERT INTO bank_topology (user_id, name, role, groups, assets)
                    VALUES (?, ?, ?, ?, ?)
                END
            """, (uid, uid, uname, urole, json.dumps(ugroups), json.dumps(uassets)))

            # Seed real Neo4j database instances if available
            neo_conn.execute_cypher("MERGE (u:User {id: $id}) SET u.name = $name, u.role = $role", {"id": uid, "name": uname, "role": urole})
            for g in ugroups:
                neo_conn.execute_cypher("MERGE (grp:Group {name: $g}) MERGE (u:User {id: $id}) MERGE (u)-[:MEMBER_OF]->(grp)", {"g": g, "id": uid})
            for a in uassets:
                neo_conn.execute_cypher("MERGE (ast:Asset {name: $a}) MERGE (u:User {id: $id}) MERGE (u)-[:HAS_ACCESS]->(ast)", {"a": a, "id": uid})

        # Initialize the fallback and Neo4j graph schemas using the helper
        try:
            from ..services.mapper_service import DEFAULT_MAPPING_DB
            neo_conn.initialize_graph(topology_data, DEFAULT_MAPPING_DB)
        except Exception as ex:
            logger.warning(f"Could not import or initialize mapper graph: {ex}")
            neo_conn.initialize_graph(topology_data, None)

    results["sql_records_inserted"] = total_logs + bulletin_count
    return results
