from backend.db.sql_server_conn import sql_db

rows = sql_db.fetch_all("SELECT * FROM threat_bulletins")
print(f"Total Bulletins in DB: {len(rows)}")

tanstack_found = False
for r in rows:
    title = r.get("title") or ""
    bid = r.get("bulletin_id") or r.get("id")
    if "tanstack" in title.lower() or "45321" in str(bid).lower():
        print(f"FOUND: ID={bid} | Title={title}")
        tanstack_found = True

if not tanstack_found:
    print("NO TanStack bulletin currently in DB. Listing top 5 bulletins:")
    for r in rows[:5]:
        print(f" - ID={r.get('bulletin_id') or r.get('id')} | Title={r.get('title')}")
