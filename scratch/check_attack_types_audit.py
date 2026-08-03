from backend.db.sql_server_conn import sql_db

# Query total count in rule_vulnerability_queries
total_rules = sql_db.fetch_one("SELECT COUNT(*) as cnt FROM rule_vulnerability_queries")
total_rule_cnt = total_rules["cnt"] if total_rules else 0

# Query distinct attack techniques in rule_vulnerability_queries
distinct_techs = sql_db.fetch_all("SELECT DISTINCT attack_technique FROM rule_vulnerability_queries WHERE attack_technique IS NOT NULL AND attack_technique <> ''")
tech_list = [t["attack_technique"] for t in distinct_techs]

# Query by source system
source_breakdown = sql_db.fetch_all("SELECT source_system, COUNT(*) as cnt FROM rule_vulnerability_queries GROUP BY source_system")

print("=== ITDR 3-Layer DB Rule Engine Audit Report ===")
print(f"Total T-SQL Security Audit Rules Loaded in DB: {total_rule_cnt}")
print(f"Total Unique Attack Types / Technique Mappings: {len(tech_list)}")
print("\nBreakdown by Source System (13 Enterprise Systems):")
for s in source_breakdown:
    print(f" - System: {s['source_system']:<25} | Executable T-SQL Rules: {s['cnt']}")

print("\nSample Attack Types Covered:")
print(tech_list[:20])
