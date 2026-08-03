import time
import json
import logging
from datetime import datetime
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class PipelineTracer:
    """Manages high-precision timing and structured step-by-step execution logging for threat analysis."""
    def __init__(self, bulletin_id: str = None):
        self.bulletin_id = bulletin_id
        self.start_time = time.perf_counter()
        self.step_start_times = {}
        
        self.steps = {
            "step_1_ingestion": {
                "step_number": 1,
                "step_name": "Ingestion Engine",
                "description": "Ingests raw advisory text and processes via LLM / Rule Engine",
                "input_prompt": "",
                "output_json": {},
                "llm_used": False,
                "model_name": "",
                "status": "PENDING",
                "duration_ms": 0.0
            },
            "step_2_mitre_extraction": {
                "step_number": 2,
                "step_name": "MITRE Technique Extractor",
                "description": "Executes pattern matching and LLM extraction against MITRE ATT&CK Framework",
                "queries_run": [],
                "extracted_techniques": [],
                "status": "PENDING",
                "duration_ms": 0.0
            },
            "step_3_d3fend_mapping": {
                "step_number": 3,
                "step_name": "D3FEND Defensive Mapper",
                "description": "Queries D3FEND Framework database to map techniques to defensive countermeasures",
                "queries_run": [],
                "mapped_countermeasures": [],
                "status": "PENDING",
                "duration_ms": 0.0
            },
            "step_4_sql_posture_audit": {
                "step_number": 4,
                "step_name": "SQL Posture Auditor",
                "description": "Queries 24 multi-plane telemetry tables in SQL Server using formatted LLM rule queries",
                "queries_sent_to_rule_engine": [],
                "total_queries_executed": 0,
                "status": "PENDING",
                "duration_ms": 0.0
            },
            "step_5_dynamic_compliance": {
                "step_number": 5,
                "step_name": "Dynamic Compliance Engine",
                "description": "Calculates vulnerability gap ratios, telemetry failure counts, and overall posture score",
                "formula_used": "Gap % = (Failed Rule Queries / Total Evaluated Queries) * 100",
                "total_rules_evaluated": 0,
                "failed_rule_queries": 0,
                "telemetry_failed_records": 0,
                "overall_gap_percentage": 0.0,
                "risk_rating_derived": "LOW",
                "status": "PENDING",
                "duration_ms": 0.0
            },
            "step_6_operator_summary": {
                "step_number": 6,
                "step_name": "Operator Tabular Viewer",
                "description": "Operator execution time summary breakdown across all pipeline steps",
                "summary_table": [],
                "total_execution_time_ms": 0.0,
                "status": "PENDING"
            }
        }

    def start_step(self, step_key: str):
        self.step_start_times[step_key] = time.perf_counter()
        if step_key in self.steps:
            self.steps[step_key]["status"] = "IN_PROGRESS"

    def stop_step(self, step_key: str):
        if step_key in self.step_start_times:
            elapsed = (time.perf_counter() - self.step_start_times[step_key]) * 1000.0
            if step_key in self.steps:
                self.steps[step_key]["duration_ms"] = round(elapsed, 2)
                self.steps[step_key]["status"] = "COMPLETED"

    def record_step_1(self, input_prompt: str, output_json: dict, llm_used: bool = False, model_name: str = "Rule Engine"):
        s1 = self.steps["step_1_ingestion"]
        s1["input_prompt"] = input_prompt
        s1["output_json"] = output_json
        s1["llm_used"] = llm_used
        s1["model_name"] = model_name

    def record_step_2(self, queries_run: List[str], extracted_techniques: List[Dict[str, Any]]):
        s2 = self.steps["step_2_mitre_extraction"]
        s2["queries_run"] = queries_run
        s2["extracted_techniques"] = extracted_techniques

    def record_step_3(self, queries_run: List[str], mapped_countermeasures: List[Dict[str, Any]]):
        s3 = self.steps["step_3_d3fend_mapping"]
        s3["queries_run"] = queries_run
        s3["mapped_countermeasures"] = mapped_countermeasures

    def record_step_4(self, queries_sent: List[Dict[str, Any]]):
        s4 = self.steps["step_4_sql_posture_audit"]
        s4["queries_sent_to_rule_engine"] = queries_sent
        s4["total_queries_executed"] = len(queries_sent)

    def record_step_5(self, total_evaluated: int, failed_queries: int, telemetry_failed_records: int, gap_pct: float, risk_rating: str):
        s5 = self.steps["step_5_dynamic_compliance"]
        s5["total_rules_evaluated"] = total_evaluated
        s5["failed_rule_queries"] = failed_queries
        s5["telemetry_failed_records"] = telemetry_failed_records
        s5["overall_gap_percentage"] = round(gap_pct, 2)
        s5["risk_rating_derived"] = risk_rating
        s5["math_breakdown"] = {
            "formula": f"({failed_queries} Failed Queries / {total_evaluated} Total Queries) * 100",
            "calculation": f"({failed_queries} / {max(1, total_evaluated)}) * 100 = {round(gap_pct, 2)}%",
            "failed_records_sum": telemetry_failed_records,
            "risk_rating": risk_rating
        }

    def finalize_step_6_summary(self) -> dict:
        return {}

    def get_full_trace(self) -> Dict[str, Any]:
        total_ms = round((time.perf_counter() - self.start_time) * 1000.0, 2)
        
        # Build Step 6 Summary Table
        summary_rows = []
        step_keys = ["step_1_ingestion", "step_2_mitre_extraction", "step_3_d3fend_mapping", "step_4_sql_posture_audit", "step_5_dynamic_compliance"]
        
        for sk in step_keys:
            st = self.steps[sk]
            d_ms = st.get("duration_ms", 0.0)
            pct = round((d_ms / max(1.0, total_ms)) * 100.0, 1)
            
            proc_desc = ""
            if sk == "step_1_ingestion":
                proc_desc = f"Raw text ({len(st.get('input_prompt', ''))} chars) parsed via {st.get('model_name', 'LLM')}"
            elif sk == "step_2_mitre_extraction":
                proc_desc = f"{len(st.get('extracted_techniques', []))} MITRE techniques extracted"
            elif sk == "step_3_d3fend_mapping":
                proc_desc = f"{len(st.get('mapped_countermeasures', []))} D3FEND controls mapped"
            elif sk == "step_4_sql_posture_audit":
                proc_desc = f"{st.get('total_queries_executed', 0)} SQL queries executed against 24 telemetry tables"
            elif sk == "step_5_dynamic_compliance":
                proc_desc = f"Gap % derived: {st.get('overall_gap_percentage', 0.0)}% ({st.get('risk_rating_derived', 'LOW')} Risk)"

            summary_rows.append({
                "step_number": st["step_number"],
                "step_name": st["step_name"],
                "status": st["status"],
                "records_processed": proc_desc,
                "duration_ms": d_ms,
                "percentage_of_total_time": pct
            })

        s6 = self.steps["step_6_operator_summary"]
        s6["status"] = "COMPLETED"
        s6["summary_table"] = summary_rows
        s6["total_execution_time_ms"] = total_ms

        return {
            "bulletin_id": self.bulletin_id,
            "timestamp": datetime.utcnow().isoformat(),
            "total_execution_time_ms": total_ms,
            "steps": self.steps
        }
