import logging
import time
import os
import networkx as nx

logger = logging.getLogger(__name__)

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

class Neo4jConnector:
    def __init__(self, uri: str = NEO4J_URI, user: str = NEO4J_USER, password: str = NEO4J_PASSWORD):
        self.uri = uri
        self.user = user
        self.password = password
        self.driver = None
        self._last_check_time = 0.0
        self._cached_health = False

        # In-memory graph fallback
        self.fallback_graph = nx.DiGraph()

    def connect(self) -> bool:
        try:
            self.close()
            from neo4j import GraphDatabase
            self.driver = GraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password),
                connection_timeout=1.5,
                max_connection_lifetime=30.0
            )
            self.driver.verify_connectivity()
            logger.info(f"Neo4j connected successfully at {self.uri}")
            self._cached_health = True
            return True
        except Exception as e:
            logger.warning(f"Neo4j connection info ({self.uri}): {e}")
            self.driver = None
            self._cached_health = False
            return False

    def close(self):
        if self.driver:
            try:
                self.driver.close()
            except Exception:
                pass
            self.driver = None

    def check_health(self) -> dict:
        now = time.time()
        if now - self._last_check_time < 5.0:
            return {"status": "connected" if self._cached_health else "fallback", "uri": self.uri}
        self._last_check_time = now

        if not self.driver:
            connected = self.connect()
        else:
            try:
                self.driver.verify_connectivity()
                connected = True
            except Exception:
                connected = self.connect()

        self._cached_health = connected
        return {
            "status": "connected" if connected else "fallback_in_memory",
            "uri": self.uri,
            "user": self.user
        }

    def initialize_graph(self, topology_data: dict = None, mapping_data: dict = None) -> bool:
        """Populates Neo4j graph nodes and edges (or fallback in-memory graph)."""
        is_connected = self.check_health()["status"] == "connected"

        # Build fallback graph regardless
        self._build_fallback_graph(topology_data, mapping_data)

        if not is_connected:
            logger.info("Neo4j offline. Built local in-memory knowledge graph.")
            return False

        try:
            with self.driver.session() as session:
                try:
                    session.run("CREATE CONSTRAINT UNIQUE_ATTACK_ID IF NOT EXISTS FOR (t:AttackTechnique) REQUIRE t.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT UNIQUE_D3FEND_ID IF NOT EXISTS FOR (c:D3fendCountermeasure) REQUIRE c.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT UNIQUE_USER_ID IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE")
                except Exception as ce:
                    logger.warning(f"Neo4j constraint creation note: {ce}")

                if mapping_data:
                    for tech_id, details in mapping_data.items():
                        tech_name = details.get("attack_name", "")
                        session.run(
                            "MERGE (t:AttackTechnique {id: $tech_id}) SET t.name = $tech_name",
                            tech_id=tech_id, tech_name=tech_name
                        )
                        for cm in details.get("d3fend_countermeasures", []):
                            cm_id = cm.get("d3fend_id", "")
                            cm_name = cm.get("name", "")
                            cm_script = cm.get("verification_script", "")
                            cm_infra = cm.get("target_infrastructure", "")
                            session.run(
                                """
                                MERGE (c:D3fendCountermeasure {id: $cm_id})
                                SET c.name = $cm_name, c.verification_script = $cm_script, c.target_infrastructure = $cm_infra
                                WITH c
                                MATCH (t:AttackTechnique {id: $tech_id})
                                MERGE (t)-[:MITIGATED_BY]->(c)
                                """,
                                cm_id=cm_id, cm_name=cm_name, cm_script=cm_script, cm_infra=cm_infra, tech_id=tech_id
                            )

                if topology_data:
                    for user in topology_data.get("users", []):
                        session.run(
                            """
                            MERGE (u:User {id: $id})
                            SET u.name = $name, u.role = $role, u.department = $department, u.risk_score = $risk_score
                            """,
                            id=user.get("id"), name=user.get("name"), role=user.get("role"),
                            department=user.get("department"), risk_score=user.get("risk_score", 0)
                        )
                        for grp in user.get("groups", []):
                            session.run(
                                """
                                MERGE (g:Group {name: $grp})
                                WITH g
                                MATCH (u:User {id: $uid})
                                MERGE (u)-[:MEMBER_OF]->(g)
                                """,
                                grp=grp, uid=user.get("id")
                            )

            logger.info("Neo4j database successfully initialized and seeded.")
            return True
        except Exception as e:
            logger.error(f"Failed to populate Neo4j graph: {e}")
            return False

    def _build_fallback_graph(self, topology_data: dict, mapping_data: dict):
        self.fallback_graph.clear()
        if topology_data:
            if "nodes" in topology_data and "edges" in topology_data:
                for n in topology_data.get("nodes", []):
                    nid = n.get("id")
                    if not nid:
                        continue
                    ntype = n.get("type", "Node")
                    label = n.get("name", nid)
                    tier = n.get("tier", "Tier2")
                    # Map tier string to integer: Tier0 -> 0, Tier1 -> 1, Tier2 -> 2
                    tier_val = 2
                    if "0" in str(tier):
                        tier_val = 0
                    elif "1" in str(tier):
                        tier_val = 1
                    
                    self.fallback_graph.add_node(
                        nid,
                        type=ntype,
                        label=label,
                        tier=tier_val,
                        risk=n.get("risk_score", 10.0),
                        properties=n.get("details", {})
                    )
                for e in topology_data.get("edges", []):
                    source = e.get("source")
                    target = e.get("target")
                    rel = e.get("type", "CONNECTED_TO")
                    if source and target:
                        self.fallback_graph.add_edge(source, target, rel=rel)
            else:
                for u in topology_data.get("users", []):
                    uid = u.get("id", u.get("name"))
                    self.fallback_graph.add_node(uid, type="User", label=u.get("name"), role=u.get("role"), dept=u.get("department"), risk=u.get("risk_score", 10))
                    for g in u.get("groups", []):
                        self.fallback_graph.add_node(g, type="Group", label=g)
                        self.fallback_graph.add_edge(uid, g, rel="MEMBER_OF")
                    for a in u.get("assets", []):
                        aid = a.get("name", a.get("id", "asset"))
                        self.fallback_graph.add_node(aid, type="Asset", label=aid, ip=a.get("ip"))
                        self.fallback_graph.add_edge(uid, aid, rel="HAS_ACCESS")
        if mapping_data:
            for tech_id, details in mapping_data.items():
                self.fallback_graph.add_node(tech_id, type="AttackTechnique", label=details.get("attack_name", tech_id))
                for cm in details.get("d3fend_countermeasures", []):
                    cm_id = cm.get("d3fend_id", cm.get("name"))
                    self.fallback_graph.add_node(cm_id, type="D3fendCountermeasure", label=cm.get("name", cm_id))
                    self.fallback_graph.add_edge(tech_id, cm_id, rel="MITIGATED_BY")

    def get_topology(self) -> dict:
        nodes = []
        edges = []
        is_connected = self.check_health()["status"] == "connected"

        if is_connected:
            try:
                with self.driver.session() as session:
                    res = session.run("""
                        MATCH (n)
                        OPTIONAL MATCH (n)-[r]->(m)
                        RETURN n, r, m LIMIT 300
                    """)
                    seen_nodes = set()
                    for record in res:
                        n = record["n"]
                        if n and n.element_id not in seen_nodes:
                            seen_nodes.add(n.element_id)
                            labels = list(n.labels)
                            lbl = labels[0] if labels else "Node"
                            props = dict(n)
                            nodes.append({
                                "id": props.get("id", props.get("name", str(n.id))),
                                "label": props.get("name", props.get("id", "Node")),
                                "type": lbl,
                                "properties": props
                            })
                        r = record["r"]
                        m = record["m"]
                        if r and m:
                            edges.append({
                                "source": dict(n).get("id", dict(n).get("name", str(n.id))),
                                "target": dict(m).get("id", dict(m).get("name", str(m.id))),
                                "type": r.type
                            })
                    if nodes:
                        return {"nodes": nodes, "edges": edges, "source": "neo4j"}
            except Exception as e:
                logger.warning(f"Neo4j query error, falling back to local graph: {e}")

        for n, data in self.fallback_graph.nodes(data=True):
            nodes.append({
                "id": str(n),
                "label": data.get("label", str(n)),
                "type": data.get("type", "Node"),
                "properties": data
            })
        for u, v, data in self.fallback_graph.edges(data=True):
            edges.append({
                "source": str(u),
                "target": str(v),
                "type": data.get("rel", "CONNECTED_TO")
            })

        return {"nodes": nodes, "edges": edges, "source": "in_memory_graph"}

    def get_blast_radius(self, identity: str) -> dict:
        reachable_assets = []
        is_connected = self.check_health()["status"] == "connected"

        if is_connected:
            try:
                with self.driver.session() as session:
                    res = session.run("""
                        MATCH (u:User {id: $identity})-[*1..3]->(target)
                        RETURN target, labels(target) as labels
                    """, identity=identity)
                    for r in res:
                        t = dict(r["target"])
                        lbl = r["labels"][0] if r["labels"] else "Asset"
                        reachable_assets.append({"id": t.get("name", t.get("id")), "type": lbl, "details": t})
                    return {"identity": identity, "blast_radius_count": len(reachable_assets), "resources": reachable_assets}
            except Exception as e:
                logger.warning(f"Blast radius query error: {e}")

        if identity in self.fallback_graph:
            sub = nx.single_source_shortest_path_length(self.fallback_graph, identity, cutoff=3)
            for node in sub:
                if node != identity:
                    ndata = self.fallback_graph.nodes[node]
                    reachable_assets.append({"id": str(node), "type": ndata.get("type", "Node"), "details": ndata})

        return {"identity": identity, "blast_radius_count": len(reachable_assets), "resources": reachable_assets}

    def execute_cypher(self, query: str, params: dict = None) -> list:
        is_connected = self.driver is not None and self._cached_health
        if not is_connected:
            return []
        try:
            with self.driver.session() as session:
                result = session.run(query, params or {})
                return [dict(record) for record in result]
        except Exception as e:
            logger.warning(f"Neo4j Cypher query failed: {e}")
            return []
