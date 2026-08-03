import logging
import json
from typing import Dict, Any, List
import networkx as nx
from ..db.sql_server_conn import SqlServerConnector
from ..db.neo4j_conn import Neo4jConnector

logger = logging.getLogger(__name__)

class GraphService:
    def __init__(self, sql_conn: SqlServerConnector, neo_conn: Neo4jConnector):
        self.sql = sql_conn
        self.neo = neo_conn

    def get_topology_graph(self) -> Dict:
        """Returns nodes and edges from Neo4j if online; otherwise falls back to database-driven SQL Server tables."""
        is_connected = self.neo.check_health()["status"] == "connected"
        if is_connected:
            return self.neo.get_topology()

        # Fallback: Query SQL Server tables bank_topology_nodes and bank_topology_edges
        try:
            nodes_data = self.sql.fetch_all("SELECT id, name, type, tier, risk_score, details FROM bank_topology_nodes")
            edges_data = self.sql.fetch_all("SELECT source, target, type FROM bank_topology_edges")

            nodes = []
            for n in nodes_data:
                try:
                    props = json.loads(n.get("details") or "{}")
                except Exception:
                    props = {}
                nodes.append({
                    "id": n["id"],
                    "label": n["name"],
                    "type": n["type"],
                    "tier": n["tier"],
                    "properties": {
                        "tier": n["tier"],
                        "risk": n["risk_score"],
                        **props
                    }
                })

            edges = []
            for e in edges_data:
                edges.append({
                    "source": e["source"],
                    "target": e["target"],
                    "type": e["type"]
                })

            logger.info(f"Loaded topology graph from SQL Server: {len(nodes)} nodes, {len(edges)} edges.")
            return {"nodes": nodes, "edges": edges, "source": "sql_server_tables"}
        except Exception as ex:
            logger.error(f"Error querying topology from SQL Server: {ex}")
            return self.neo.get_topology()

    def get_blast_radius(self, identity_user: str, bulletin_id: str = None) -> Dict:
        """Computes reachable network boundary and transitive paths from SQL Server topology tables."""
        is_connected = self.neo.check_health()["status"] == "connected"
        if is_connected and not bulletin_id:
            return self.neo.get_blast_radius(identity_user)

        try:
            import re
            nodes_data = self.sql.fetch_all("SELECT id, name, type, tier, risk_score, details FROM bank_topology_nodes")
            edges_data = self.sql.fetch_all("SELECT source, target, type FROM bank_topology_edges")

            # Regulate graph nodes to active threat techniques if bulletin_id is provided
            allowed_types = set()
            if bulletin_id:
                b = self.sql.fetch_one("SELECT content, impact_rating FROM threat_bulletins WHERE id = ? OR bulletin_id = ?", (bulletin_id, bulletin_id))
                if b:
                    content = b.get("content") or ""
                    tech_ids = re.findall(r"T\d{4}(?:\.\d{3})?", content)
                    
                    is_cloud = any(tid in ["T1078.004", "T1566.002", "T1556.006", "T1537", "T1486"] for tid in tech_ids)
                    is_onprem = any(tid in ["T1059.001", "T1078.002", "T1484.001", "T1003.001", "T1550.002", "T1021.002"] for tid in tech_ids)
                    
                    if is_cloud and not is_onprem:
                        allowed_types = {"CloudAccount", "CloudRole", "Datastore", "AppInstance", "User", "Identity"}
                    elif is_onprem and not is_cloud:
                        allowed_types = {"Computer", "Group", "DomainController", "Server", "User", "Identity"}
            
            if allowed_types:
                nodes_data = [n for n in nodes_data if n.get("type") in allowed_types or n.get("id") == identity_user]
                node_ids = set(n["id"] for n in nodes_data)
                edges_data = [e for e in edges_data if e["source"] in node_ids and e["target"] in node_ids]

            G = nx.DiGraph()
            nodes_by_id = {}

            for n in nodes_data:
                try:
                    props = json.loads(n.get("details") or "{}")
                except Exception:
                    props = {}
                tier = n.get("tier", "Tier2")
                tier_val = 2
                if "0" in str(tier):
                    tier_val = 0
                elif "1" in str(tier):
                    tier_val = 1

                nodes_by_id[n["id"]] = {
                    "id": n["id"],
                    "label": n["name"],
                    "type": n["type"],
                    "tier": tier_val,
                    "risk": n["risk_score"],
                    "properties": props
                }
                G.add_node(n["id"], **nodes_by_id[n["id"]])

            for e in edges_data:
                G.add_edge(e["source"], e["target"], rel=e["type"])

            reachable_assets = []
            attack_paths = []
            t0_comp = 0
            t1_comp = 0
            t2_comp = 0

            if identity_user in G:
                # Transitive reachable nodes up to cutoff=3
                sub = nx.single_source_shortest_path_length(G, identity_user, cutoff=3)
                for node in sub:
                    if node != identity_user:
                        ndata = G.nodes[node]
                        t_val = ndata.get("tier", 2)
                        if t_val == 0:
                            t0_comp += 1
                        elif t_val == 1:
                            t1_comp += 1
                        else:
                            t2_comp += 1

                        reachable_assets.append({
                            "id": str(node),
                            "type": ndata.get("type", "Node"),
                            "tier": ndata.get("tier", 2),
                            "details": ndata
                        })

                # Calculate specific path chains leading to Tier 0 targets
                for node in G.nodes():
                    if G.nodes[node].get("tier") == 0:
                        # Find simple paths up to length 3
                        for path in nx.all_simple_paths(G, identity_user, node, cutoff=3):
                            chain_str = " \u2192 ".join(path)
                            risk_level = "CRITICAL" if any(G.nodes[step].get("tier") == 0 for step in path[1:]) else "HIGH"
                            attack_paths.append({
                                "chain": chain_str,
                                "risk": risk_level
                            })

            total_nodes = len(G.nodes())
            reachable_count = len(reachable_assets)
            ratio = round((reachable_count / total_nodes) * 100, 1) if total_nodes > 0 else 0.0

            return {
                "identity": identity_user,
                "reachable": reachable_count,
                "total": total_nodes,
                "tier0_compromised": t0_comp,
                "tier1_compromised": t1_comp,
                "tier2_compromised": t2_comp,
                "compromise_ratio": ratio,
                "resources": reachable_assets,
                "attack_paths": attack_paths,
                "source": "sql_server_graph_computation"
            }
        except Exception as ex:
            logger.error(f"Error computing blast radius via SQL Server tables: {ex}")
            return self.neo.get_blast_radius(identity_user)
