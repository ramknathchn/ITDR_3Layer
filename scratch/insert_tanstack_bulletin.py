from backend.db.sql_server_conn import sql_db
from backend.services.llm_service import ThreatLlmParser
from backend.services.mapper_service import MitreMapper
mitre_mapper = MitreMapper()
import json
import time

raw_text = """
BULLETIN ID: TB-2026-45321
TITLE: TanStack npm packages compromised: inside the Mini Shai-Hulud supply chain attack
THREAT ACTORS: TeamPCP
SEVERITY: CRITICAL
CVE: CVE-2026-45321 | GHSA: GHSA-g7cv-rxg3-hmpx

On May 11, 2026, between 19:20 and 19:26 UTC, 84 malicious npm package artifacts were published across 42 packages in the @tanstack namespace. The packages were published by TanStack's legitimate release pipeline using its trusted OIDC identity after attacker-controlled code hijacked the runner mid-workflow (T1195.002, T1195.001). The worm produced valid SLSA provenance certificates (T1553.002) signed via Sigstore because the runner itself was hijacked. Malicious postinstall scripts harvested host environment secrets and cloud access tokens (T1552.001, T1078.004).
"""

bulletin_id = "TB-2026-45321"
title = "TanStack npm packages compromised: inside the Mini Shai-Hulud supply chain attack"
impact_rating = "CRITICAL"
actors = "TeamPCP"

# Check if exists
existing = sql_db.fetch_one("SELECT * FROM threat_bulletins WHERE bulletin_id = ?", (bulletin_id,))

if existing:
    sql_db.execute_non_query("""
        UPDATE threat_bulletins 
        SET title = ?, content = ?, summary = ?, impact_rating = ?, actors = ?
        WHERE bulletin_id = ?
    """, (title, raw_text, raw_text[:300], impact_rating, actors, bulletin_id))
    print("Updated existing bulletin:", bulletin_id)
else:
    sql_db.execute_non_query("""
        INSERT INTO threat_bulletins (id, bulletin_id, title, content, summary, impact_rating, actors, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE())
    """, (bulletin_id, bulletin_id, title, raw_text, raw_text[:300], impact_rating, actors))
    print("Inserted new bulletin:", bulletin_id)

# Perform analysis & save audit results
parser = ThreatLlmParser()
intel = parser.parse_threat_bulletin(raw_text)

technique_ids = ["T1195.002", "T1195.001", "T1553.002", "T1078.004", "T1552.001"]
defensive_spec = mitre_mapper.map_techniques_to_defenses(technique_ids)
audit_results = mitre_mapper.verify_countermeasures_against_db(defensive_spec, sql_db)

sql_db.execute_non_query("DELETE FROM audit_results WHERE bulletin_id = ?", (bulletin_id,))
for ar in audit_results:
    sql_db.execute_non_query("""
        INSERT INTO audit_results (bulletin_id, countermeasure_id, countermeasure_name, status, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (bulletin_id, ar["countermeasure_id"], ar["countermeasure_name"], ar["status"], ar["details"], ar["timestamp"]))

print("Successfully mapped and saved audit results for:", bulletin_id)
print("Mapped Techniques:", technique_ids)
