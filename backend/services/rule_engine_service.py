import logging
import re
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class RuleEngineService:
    def __init__(self, sql_conn):
        self.sql_conn = sql_conn

    def get_matching_rules(self, attack_ids: List[str] = None, d3fend_controls: List[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves rule queries from rule_vulnerability_queries matching Attack IDs or D3FEND Controls."""
        clean_attack_ids = [a.strip() for a in (attack_ids or []) if a.strip()]
        clean_d3fend = [d.strip() for d in (d3fend_controls or []) if d.strip()]

        where_clauses = []
        params = []

        if clean_attack_ids:
            # Build LIKE conditions for technique IDs (e.g., T1078 or T1078.004)
            attack_conds = []
            for aid in clean_attack_ids:
                base_id = aid.split('.')[0] # T1078 from T1078.004
                attack_conds.append("attack_id = ? OR attack_id LIKE ?")
                params.extend([aid, f"{base_id}%"])
            where_clauses.append(f"({' OR '.join(attack_conds)})")

        if clean_d3fend:
            d3_conds = []
            for ctrl in clean_d3fend:
                d3_conds.append("d3fend_control = ? OR d3fend_control LIKE ?")
                params.extend([ctrl, f"%{ctrl}%"])
            where_clauses.append(f"({' OR '.join(d3_conds)})")

        if where_clauses:
            where_sql = " WHERE " + " OR ".join(where_clauses)
            sql = f"SELECT TOP {limit} * FROM rule_vulnerability_queries{where_sql} ORDER BY id ASC"
        else:
            sql = f"SELECT TOP {limit} * FROM rule_vulnerability_queries ORDER BY id ASC"

        try:
            rules = self.sql_conn.fetch_all(sql, tuple(params))
            if not rules and (clean_attack_ids or clean_d3fend):
                logger.info("No direct match found for specific Attack IDs; returning top baseline queries.")
                rules = self.sql_conn.fetch_all(f"SELECT TOP {limit} * FROM rule_vulnerability_queries ORDER BY id ASC")
            return rules
        except Exception as e:
            logger.error(f"Error fetching matching rules: {e}")
            return []

    def run_threat_gap_analysis(self, bulletin_id: str, attack_ids: List[str] = None, d3fend_controls: List[str] = None, tracer = None) -> Dict[str, Any]:
        """Executes LLM SQL queries against enterprise bank telemetry tables and calculates vulnerability gaps."""
        if tracer:
            tracer.start_step("step_4_sql_posture_audit")

        rules = self.get_matching_rules(attack_ids, d3fend_controls, limit=30)

        execution_results = []
        gaps_identified = []
        queries_for_tracer = []
        executed_at = datetime.utcnow().isoformat()

        total_queries = len(rules)
        failed_query_count = 0
        total_failed_records = 0

        for r in rules:
            q_num = r.get("query_number", "Q-0000")
            source_sys = r.get("source_system", "Unknown Source")
            aid = r.get("attack_id", "")
            tech_name = r.get("attack_technique", "")
            d3_ctrl = r.get("d3fend_control", "")
            raw_query = r.get("active_query") or r.get("llm_query") or r.get("gen_query")
            remediation = r.get("remediation_command", "")
            audit_criteria = r.get("vulnerability_audit_criteria", "")

            if not raw_query:
                continue

            # Format query for T-SQL execution
            exec_query = raw_query.replace("@Threat_ID", f"'{bulletin_id}'")

            try:
                # Execute the rule query against SQL Server
                res = self.sql_conn.fetch_one(exec_query)
                if not res:
                    res = {
                        "Threat_ID": bulletin_id,
                        "Attack ID": aid,
                        "Attack Technique": tech_name,
                        "D3FEND Control": d3_ctrl,
                        "Source_System": source_sys,
                        "QueryTimestamp": executed_at,
                        "QueryNumber": q_num,
                        "STATUS": "True",
                        "FullCount": 0,
                        "FailedRecordCount": 0,
                        "SuccessRecordCount": 0,
                        "PercentageGap": 0.0
                    }

                status = str(res.get("STATUS", "True"))
                full_cnt = int(res.get("FullCount", 0) or 0)
                failed_cnt = int(res.get("FailedRecordCount", 0) or 0)
                success_cnt = int(res.get("SuccessRecordCount", 0) or 0)
                gap_pct = float(res.get("PercentageGap", 0.0) or 0.0)

                # Determine if a gap exists
                is_gap = (status.upper() == "FALSE") or (failed_cnt > 0) or (gap_pct > 0.0)
                if is_gap:
                    failed_query_count += 1
                    total_failed_records += failed_cnt

                target_tbl = r.get("target_table_name") or "identity_events"

                res_record = {
                    "bulletin_id": bulletin_id,
                    "query_number": q_num,
                    "attack_id": aid,
                    "attack_technique": tech_name,
                    "d3fend_control": d3_ctrl,
                    "source_system": source_sys,
                    "target_table_name": target_tbl,
                    "status": "GAP_DETECTED" if is_gap else "SECURE",
                    "full_count": full_cnt,
                    "failed_record_count": failed_cnt,
                    "success_record_count": success_cnt,
                    "percentage_gap": round(gap_pct, 2),
                    "remediation_command": remediation,
                    "audit_criteria": audit_criteria,
                    "executed_at": executed_at
                }

                execution_results.append(res_record)

                queries_for_tracer.append({
                    "query_number": q_num,
                    "attack_id": aid,
                    "attack_technique": tech_name,
                    "d3fend_control": d3_ctrl,
                    "source_system": source_sys,
                    "target_table_name": target_tbl,
                    "tsql_query": exec_query,
                    "status": "GAP_DETECTED" if is_gap else "SECURE",
                    "full_count": full_cnt,
                    "failed_record_count": failed_cnt,
                    "success_record_count": success_cnt,
                    "percentage_gap": round(gap_pct, 2)
                })

                if is_gap:
                    gaps_identified.append(res_record)

                # Log into SQL Server database table threat_rule_execution_results
                self.sql_conn.execute_non_query("""
                    INSERT INTO threat_rule_execution_results (
                        threat_id, query_number, attack_id, attack_technique, d3fend_control,
                        source_system, status, full_count, failed_record_count, success_record_count,
                        percentage_gap, executed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    bulletin_id, q_num, aid, tech_name, d3_ctrl,
                    source_sys, "GAP_DETECTED" if is_gap else "SECURE",
                    full_cnt, failed_cnt, success_cnt, gap_pct, executed_at
                ))

            except Exception as e:
                logger.warning(f"Error executing rule query {q_num} for source [{source_sys}]: {e}")
                execution_results.append({
                    "bulletin_id": bulletin_id,
                    "query_number": q_num,
                    "attack_id": aid,
                    "attack_technique": tech_name,
                    "d3fend_control": d3_ctrl,
                    "source_system": source_sys,
                    "status": "QUERY_ERROR",
                    "full_count": 0,
                    "failed_record_count": 0,
                    "success_record_count": 0,
                    "percentage_gap": 0.0,
                    "remediation_command": remediation,
                    "audit_criteria": audit_criteria,
                    "error_detail": str(e),
                    "executed_at": executed_at
                })

        if tracer:
            tracer.record_step_4(queries_for_tracer)
            tracer.stop_step("step_4_sql_posture_audit")

            # Step 5: Dynamic Compliance Engine
            tracer.start_step("step_5_dynamic_compliance")

        overall_gap_percentage = round((failed_query_count / max(1, total_queries) * 100.0), 2) if total_queries > 0 else 0.0

        if overall_gap_percentage >= 50.0:
            risk_rating = "CRITICAL"
        elif overall_gap_percentage >= 25.0:
            risk_rating = "HIGH"
        elif overall_gap_percentage > 0.0:
            risk_rating = "MEDIUM"
        else:
            risk_rating = "LOW"

        if tracer:
            tracer.record_step_5(
                total_evaluated=total_queries,
                failed_queries=failed_query_count,
                telemetry_failed_records=total_failed_records,
                gap_pct=overall_gap_percentage,
                risk_rating=risk_rating
            )
            tracer.stop_step("step_5_dynamic_compliance")

        return {
            "bulletin_id": bulletin_id,
            "engine_mode": "3layer_rule_engine",
            "total_rules_evaluated": total_queries,
            "gaps_detected_count": failed_query_count,
            "total_failed_records": total_failed_records,
            "overall_gap_percentage": overall_gap_percentage,
            "execution_results": execution_results,
            "gaps_identified": gaps_identified,
            "timestamp": executed_at
        }
