import urllib.request
import json

url = "http://127.0.0.1:8001/api/threats/TB-2026-45321"
req = urllib.request.Request(url)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("Threat Details API Data:")
        print("Keys:", data.keys())
        bulletin = data.get("bulletin") or {}
        print("Bulletin ID:", bulletin.get("bulletin_id") or bulletin.get("id"))
        print("Title:", bulletin.get("title"))
        print("Defensive Spec Count:", len(data.get("defensive_spec", {}).get("defensive_spec", [])))
        print("Defensive Spec Techniques:", [s.get("attack_technique") for s in data.get("defensive_spec", {}).get("defensive_spec", [])])
        print("Audit Results Count:", len(data.get("audit_results", [])))
except Exception as e:
    print("Error calling threat details API:", e)
