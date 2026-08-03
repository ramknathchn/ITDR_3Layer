import json
import re
import logging
import time
import urllib.request
import os

logger = logging.getLogger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

class ThreatLlmParser:
    def __init__(self, ollama_url: str = OLLAMA_URL, model_name: str = OLLAMA_MODEL):
        self.ollama_url = ollama_url
        self.model_name = model_name
        self._last_check_time = 0.0
        self._cached_health = False

    def parse_threat_bulletin(self, raw_text: str) -> dict:
        """Parses raw text into structured Threat Intel data using Ollama LLM (or deterministic fallback)."""
        if self._check_ollama_healthy():
            try:
                return self._parse_with_ollama(raw_text)
            except Exception as e:
                logger.warning(f"Ollama parsing failed ({e}). Falling back to rule parser.")
        else:
            logger.info("Ollama LLM service offline/unreachable. Running deterministic rule parser.")
        
        return self._parse_with_fallback(raw_text)

    def _check_ollama_healthy(self) -> bool:
        now = time.time()
        if now - self._last_check_time < 10.0:
            return self._cached_health
            
        self._last_check_time = now
        try:
            req = urllib.request.Request(f"{self.ollama_url}/api/tags")
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                self._cached_health = (resp.status == 200)
                return self._cached_health
        except Exception:
            self._cached_health = False
            return False

    def _parse_with_ollama(self, raw_text: str) -> dict:
        prompt = (
            "You are a Cyber Threat Intelligence analyst. Analyze the following threat bulletin and extract:\n"
            "1. A bulletin ID (format: TB-2026-XXXX).\n"
            "2. The title of the threat bulletin.\n"
            "3. Identified threat actors (list of names).\n"
            "4. Observed behaviors. For each behavior, provide a description and a list of suggested MITRE ATT&CK technique IDs (e.g. T1078.004, T1059.001, T1020, T1537, T1110, T1566, T1053).\n"
            "5. An impact rating ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW').\n"
            "6. A concise executive summary of the threat.\n\n"
            "Return output strictly as valid JSON with keys: bulletin_id, title, threat_actors, impact_rating, summary, observed_behaviors.\n\n"
            f"Threat Bulletin:\n{raw_text}"
        )

        payload = json.dumps({
            "model": self.model_name,
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.1}
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{self.ollama_url}/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"}
        )

        with urllib.request.urlopen(req, timeout=30) as resp:
            res_json = json.loads(resp.read().decode("utf-8"))
            resp_text = res_json.get("response", "").strip()
            res_data = self.sanitize_and_validate_attack_framework(parsed_data, raw_text)
            res_data["llm_used"] = True
            res_data["model"] = self.model_name
            return res_data

    def sanitize_and_validate_attack_framework(self, llm_output: dict, raw_text: str) -> dict:
        """Post-LLM Assessment Guardrail: Sanitizes, validates, and converts LLM output to MITRE ATT&CK framework."""
        logger.info("Executing Post-LLM Assessment Guardrail for MITRE ATT&CK conversion.")
        
        # 1. Enforce Bulletin ID format
        bid = llm_output.get("bulletin_id") or ""
        if not re.match(r'^TB-2026-\w+$', bid, re.IGNORECASE):
            match = re.search(r'(TB-\d{4}-\d{4}|AL-\d{4}-\d{4}|TB-2026-\d+)', raw_text, re.IGNORECASE)
            bid = match.group(1).upper() if match else f"TB-2026-{int(time.time()) % 10000:04d}"
        llm_output["bulletin_id"] = bid.upper()

        # 2. Extract & Validate MITRE ATT&CK Technique IDs (Guardrail against hallucinations)
        all_techs = []
        behaviors = llm_output.get("observed_behaviors", [])
        for bh in behaviors:
            tech_list = (bh.get("mitre_techniques") or []) + (bh.get("mitre_attack_suggested") or [])
            for t in tech_list:
                t_clean = str(t).strip().upper()
                if re.match(r'^T\d{4}(\.\d{3})?$', t_clean):
                    if t_clean not in all_techs:
                        all_techs.append(t_clean)
                        
        # 3. Regex Scan raw text for any missed explicit technique codes
        text_matches = re.findall(r'\bT\d{4}(?:\.\d{3})?\b', raw_text, re.IGNORECASE)
        for tm in text_matches:
            tm_up = tm.upper()
            if tm_up not in all_techs:
                all_techs.append(tm_up)

        # 4. Fallback if no valid technique codes survived sanitization
        if not all_techs:
            if any(k in raw_text.lower() for k in ["npm", "supply chain", "oidc", "tanstack"]):
                all_techs = ["T1195.002", "T1195.001", "T1553.002", "T1078.004"]
            else:
                all_techs = ["T1078.004", "T1059.001", "T1110"]

        # 5. Inject Guardrail Metadata
        llm_output["sanitized_mitre_techniques"] = all_techs
        llm_output["guardrail_applied"] = True
        llm_output["guardrail_timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        return llm_output

    def _parse_with_fallback(self, raw_text: str) -> dict:
        bulletin_match = re.search(r'(TB-\d{4}-\d{4}|AL-\d{4}-\d{4}|TB-2026-\d+)', raw_text, re.IGNORECASE)
        bulletin_id = bulletin_match.group(1).upper() if bulletin_match else f"TB-2026-{int(time.time()) % 10000:04d}"

        title_lines = [line.strip("#* ") for line in raw_text.splitlines() if line.strip()]
        title = title_lines[0] if title_lines else "Ingested Threat Bulletin"
        if len(title) > 100: title = title[:97] + "..."

        actors = []
        for actor in ["TeamPCP", "Cozy Bear", "APT29", "Scattered Spider", "APT41", "Lazarus", "LockBit", "Sandworm", "Adversary X"]:
            if re.search(r'\b' + re.escape(actor) + r'\b', raw_text, re.IGNORECASE):
                actors.append(actor)
        if not actors:
            actors = ["TeamPCP"] if any(k in raw_text.lower() for k in ["npm", "tanstack", "supply chain", "slsa", "oidc"]) else ["APT29"]

        mitre_techs = []
        # Extract explicit technique codes directly from text (e.g. T1195.002, T1078.004, T1556.006)
        explicit_matches = re.findall(r'\bT\d{4}(?:\.\d{3})?\b', raw_text, re.IGNORECASE)
        for m in explicit_matches:
            upper_m = m.upper()
            if upper_m not in mitre_techs:
                mitre_techs.append(upper_m)

        # Domain & keyword based fallback technique detection
        text_lower = raw_text.lower()
        if "npm" in text_lower or "supply chain" in text_lower or "tanstack" in text_lower or "package" in text_lower:
            if "T1195.002" not in mitre_techs: mitre_techs.append("T1195.002")
            if "T1195.001" not in mitre_techs: mitre_techs.append("T1195.001")
            if "T1553.002" not in mitre_techs: mitre_techs.append("T1553.002")
        if "oidc" in text_lower or "credential" in text_lower or "token" in text_lower:
            if "T1078.004" not in mitre_techs: mitre_techs.append("T1078.004")
        if "powershell" in text_lower or "script" in text_lower:
            if "T1059.001" not in mitre_techs: mitre_techs.append("T1059.001")
        if "mfa" in text_lower or "push" in text_lower or "fatigue" in text_lower:
            if "T1556.006" not in mitre_techs: mitre_techs.append("T1556.006")
        if "exfiltration" in text_lower or "s3" in text_lower:
            if "T1537" not in mitre_techs: mitre_techs.append("T1537")
        if "brute" in text_lower or "spray" in text_lower:
            if "T1110" not in mitre_techs: mitre_techs.append("T1110")

        if not mitre_techs:
            mitre_techs = ["T1195.002", "T1078.004"]

        behaviors = [
            {
                "description": f"Observed threat behavior: {title}",
                "mitre_attack_suggested": mitre_techs,
                "mitre_techniques": mitre_techs
            }
        ]

        res_dict = {
            "bulletin_id": bulletin_id,
            "title": title,
            "threat_actors": actors,
            "impact_rating": "CRITICAL" if any(k in text_lower for k in ["critical", "cve", "supply chain", "npm"]) else "HIGH",
            "summary": raw_text[:350] + ("..." if len(raw_text) > 350 else ""),
            "observed_behaviors": behaviors,
            "llm_used": False,
            "model": "rule_engine_fallback"
        }
        return self.sanitize_and_validate_attack_framework(res_dict, raw_text)
