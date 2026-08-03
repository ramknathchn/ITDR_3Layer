import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchThreatSamples, analyzeThreatText, pullRssItems, analyzeRssItems, fetchFeeds, toggleFeed, ingestFormattedLlmJson } from '../services/api.js';
import './pipeline-stepper-view.js';

export class IngestScreen extends LitElement {
  static properties = {
    bulletinInput: { type: String },
    jsonInput: { type: String },
    ingestMode: { type: String },
    sampleBulletins: { type: Array },
    analyzing: { type: Boolean },
    resultMsg: { type: String },
    resultType: { type: String },
    analysisResponse: { type: Object },
    showRssModal: { type: Boolean },
    configuredFeeds: { type: Array },
    pulledRssItems: { type: Array },
    activeFeedName: { type: String },
    selectedRssIndices: { type: Object },
    analysisPath: { type: String }
  };

  static styles = css`
    :host { display: block; color: var(--text-primary); }
    .header { margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px; }
    .title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
    .subtitle { color: var(--text-muted); font-size: 13px; }
    
    .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 24px; max-width: 960px; margin: 0 auto 24px auto; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1); }
    .card-title { font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    
    textarea {
      width: 100%; min-height: 200px; padding: 14px; font-family: 'Inter', sans-serif; font-size: 13.5px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary); outline: none; resize: vertical; margin-bottom: 16px;
    }
    textarea:focus { border-color: var(--border-accent); box-shadow: 0 0 10px rgba(0, 255, 255, 0.2); }

    .control-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    select { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); padding: 9px 14px; border-radius: 6px; font-size: 13px; max-width: 380px; outline: none; }
    
    .btn { padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease; }
    .btn-primary { background: linear-gradient(135deg, #00b4d8 0%, #0077b6 100%); color: #fff; border-color: var(--border-accent); width: 100%; justify-content: center; font-size: 14px; padding: 12px; }
    .btn-primary:hover { box-shadow: 0 0 18px rgba(0, 229, 255, 0.4); }
    .btn-secondary { background: var(--bg-input); color: var(--text-primary); border-color: var(--border-color); }
    .btn-secondary:hover { border-color: var(--border-accent); color: var(--text-accent); }
    .btn-run { background: rgba(0, 229, 255, 0.2); color: var(--text-accent); border-color: var(--border-accent); }
    .btn-run:hover { background: var(--text-accent); color: var(--bg-main); }
    .btn-active { background: rgba(16, 185, 129, 0.2); color: #10b981; border-color: #10b981; }
    .btn-disabled { background: rgba(148, 163, 184, 0.2); color: var(--text-muted); border-color: var(--border-color); }
    .btn-gap { background: rgba(239, 68, 68, 0.2); color: #ef4444; border-color: #ef4444; }

    .intel-box { background: rgba(0, 255, 255, 0.05); border: 1px solid var(--border-accent); border-radius: 10px; padding: 20px; margin-top: 20px; }
    .intel-header { font-size: 16px; font-weight: 700; color: var(--text-accent); margin-bottom: 12px; }
    .badge { padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; }

    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .metric-card { background: rgba(10, 14, 23, 0.8); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; text-align: center; }
    .metric-val { font-size: 20px; font-weight: 700; color: var(--text-accent); }
    .metric-lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }

    /* Modal Backdrop & Table */
    .backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(4,6,10,0.85); backdrop-filter: blur(8px); z-index: 1000; display: flex; justify-content: center; align-items: center; padding: 20px; }
    .modal { background: var(--bg-card); border: 1px solid var(--border-accent); border-radius: 14px; width: 100%; max-width: 960px; max-height: 90vh; overflow-y: auto; padding: 28px; color: var(--text-primary); box-shadow: 0 0 40px rgba(0,229,255,0.25); }

    table { width: 100%; border-collapse: collapse; text-align: left; margin-bottom: 20px; }
    th { padding: 12px 14px; color: var(--text-muted); font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--border-color); background: var(--bg-sidebar); }
    td { padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 12.5px; color: var(--text-primary); }
    tr:hover td { background: var(--bg-card-hover); }
    .toast { padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; font-weight: 600; font-size: 13px; }
    .toast-success { background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #10b981; }
    .toast-error { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #ef4444; }
  `;

  constructor() {
    super();
    this.bulletinInput = '';
    this.jsonInput = '';
    this.ingestMode = 'text';
    this.sampleBulletins = [];
    this.analyzing = false;
    this.resultMsg = '';
    this.resultType = 'success';
    this.analysisResponse = null;
    this.showRssModal = false;
    this.configuredFeeds = [];
    this.pulledRssItems = [];
    this.activeFeedName = '';
    this.selectedRssIndices = {};
    this.analysisPath = localStorage.getItem('itdr_analysis_path') || 'standard';
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  async loadData() {
    try {
      this.sampleBulletins = await fetchThreatSamples();
      this.configuredFeeds = await fetchFeeds();
    } catch (e) {
      console.error(e);
    }
  }

  handleLoadJsonTemplate() {
    const template = {
      "bulletin_id": "TB-2026-MANUAL-001",
      "title": "Advisory: Entra ID Push Fatigue & Service Principal Abuse",
      "cve_id": "CVE-2026-9988",
      "cvss_score": 9.2,
      "severity": "CRITICAL",
      "vendor": "Microsoft / Cloud IdP",
      "affected_component": "Entra ID & Cloud Service Principals",
      "description": "Adversary exploiting weak OAuth permissions and MFA push fatigue to gain unauthorized access to bank cloud workloads.",
      "mitre_tactics": ["Credential Access", "Privilege Escalation"],
      "mitre_techniques": ["T1078.004", "T1110.003", "T1098.001"],
      "d3fend_controls": ["D3-MFA", "D3-MFA-CHALLENGE", "D3-PAM"],
      "observed_behaviors": [
        {
          "description": "Password spraying against Entra ID endpoints",
          "mitre_attack_suggested": ["T1110.003"]
        },
        {
          "description": "OIDC workload token theft and privilege escalation",
          "mitre_attack_suggested": ["T1078.004"]
        }
      ]
    };
    this.jsonInput = JSON.stringify(template, null, 2);
    this.showToast('Pre-filled sample formatted LLM JSON template into editor!', 'success');
  }

  async handleAnalyzeFormattedJson() {
    if (!this.jsonInput.trim()) {
      this.showToast('Please paste a formatted LLM JSON payload first.', 'error');
      return;
    }
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(this.jsonInput);
    } catch (err) {
      this.showToast('Invalid JSON syntax: ' + err.message, 'error');
      return;
    }

    this.analyzing = true;
    try {
      const res = await ingestFormattedLlmJson(parsedPayload, this.analysisPath);
      this.analysisResponse = res;
      this.showToast(`Direct Formatted LLM JSON Ingested Successfully! Analyzed threat advisory [${res.bulletin_id}] via ${this.analysisPath === '3layer_rule_engine' ? '3-Layer DB Rule Engine' : 'Standard 5-Step Pipeline'}.`, 'success');
    } catch (e) {
      this.showToast('Direct LLM JSON Ingestion Error: ' + e.message, 'error');
    } finally {
      this.analyzing = false;
    }
  }

  handleSelectSample(e) {
    const idx = parseInt(e.target.value);
    if (!isNaN(idx) && this.sampleBulletins[idx]) {
      const b = this.sampleBulletins[idx];
      this.bulletinInput = b.text || b.content || b.summary || '';
    }
  }

  handlePathToggle(e) {
    this.analysisPath = e.target.value;
    localStorage.setItem('itdr_analysis_path', this.analysisPath);
    this.showToast(`Analysis Strategy updated: ${this.analysisPath === '3layer_rule_engine' ? '3-Layer DB Rule Query Engine' : 'Standard Topology Audit'}`, 'success');
  }

  async handleAnalyze() {
    if (!this.bulletinInput.trim()) {
      this.showToast('Please paste threat bulletin text or select a sample first.', 'error');
      return;
    }
    this.analyzing = true;
    try {
      const res = await analyzeThreatText(this.bulletinInput, this.analysisPath);
      this.analysisResponse = res;
      if (this.analysisPath === '3layer_rule_engine') {
        const gapCount = res.rule_engine_results?.gaps_detected_count || 0;
        this.showToast(`3-Layer DB Rule Engine Analysis Complete! Evaluated ${res.rule_engine_results?.total_rules_evaluated || 0} LLM SQL queries against enterprise bank telemetry. Identified ${gapCount} security gaps.`, 'success');
      } else {
        const engine = res.parsed_intel?.llm_used ? `Ollama LLM (${res.parsed_intel.model})` : 'Rule Engine';
        this.showToast(`5-Step Synchronized Threat Analysis Complete via ${engine}! Mapped MITRE & D3FEND controls and audited environment.`, 'success');
      }
    } catch (e) {
      this.showToast('Threat analysis error: ' + e.message, 'error');
    } finally {
      this.analyzing = false;
    }
  }

  async handleToggleActive(feed) {
    try {
      const nextState = feed.enabled === 1 ? false : true;
      await toggleFeed(feed.feed_id, nextState);
      this.showToast(`Feed [${feed.name}] updated to ${nextState ? 'ACTIVE' : 'DISABLED'}`, 'success');
      this.loadData();
    } catch (e) {
      this.showToast('Toggle failed: ' + e.message, 'error');
    }
  }

  async handleRunFeed(feed) {
    this.activeFeedName = feed.name;
    try {
      const res = await pullRssItems(feed.url, feed.name);
      this.pulledRssItems = res.items || [];
      this.selectedRssIndices = {};
      this.showToast(`Successfully pulled ${this.pulledRssItems.length} live threat articles from ${feed.name}!`, 'success');
    } catch (e) {
      this.showToast('RSS Pull error: ' + e.message, 'error');
    }
  }

  async handleAnalyzeSelectedRss() {
    const selected = this.pulledRssItems.filter((_, idx) => this.selectedRssIndices[idx]);
    if (selected.length === 0) {
      this.showToast('Select at least one RSS article to analyze.', 'error');
      return;
    }
    this.analyzing = true;
    try {
      const res = await analyzeRssItems(selected);
      this.showToast(`Batch analyzed and ingested ${res.analyzed_count} RSS threat articles into SQL Server threat_bulletins!`, 'success');
      this.showRssModal = false;
    } catch (e) {
      this.showToast('Batch RSS analysis failed: ' + e.message, 'error');
    } finally {
      this.analyzing = false;
    }
  }

  showToast(msg, type) {
    this.resultMsg = msg;
    this.resultType = type;
    setTimeout(() => { this.resultMsg = ''; }, 6000);
  }

  render() {
    const res = this.analysisResponse;
    const intel = res?.parsed_intel;

    return html`
      <div class="header">
        <h1 class="title"><i class="fa-solid fa-file-import" style="color: #00ffff; margin-right: 8px;"></i> Threat Ingestion & Analysis Workspace</h1>
        <p class="subtitle">Full 5-step synchronized Threat Analysis engine: parse threat text using Ollama LLM, map MITRE ATT&CK techniques, audit D3FEND controls against SQL Server DB tables, and generate Attack Flow graphs.</p>
      </div>

      ${this.resultMsg ? html`<div class="toast toast-${this.resultType}">${this.resultMsg}</div>` : ''}

      <div class="card">
        <div class="card-title">
          <span><i class="fa-solid fa-wand-magic-sparkles" style="color: #00ffff;"></i> Ingest Custom Threat Bulletin Advisory</span>
          <span style="font-size: 12px; font-weight: normal; display: flex; align-items: center; gap: 8px;">
            <label style="color: #8a99ad;">Path:</label>
            <select style="padding: 4px 8px; font-size: 12px;" .value=${this.analysisPath} @change=${this.handlePathToggle}>
              <option value="standard">Standard 5-Step Audit (Topology)</option>
              <option value="3layer_rule_engine">🛡️ 3-Layer DB Rule Query Engine</option>
            </select>
          </span>
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
          <button
            class="btn ${this.ingestMode === 'text' ? 'btn-run' : 'btn-secondary'}"
            @click=${() => this.ingestMode = 'text'}
          >
            <i class="fa-solid fa-file-lines"></i> 1. Raw Text Advisory (Auto LLM Parsing)
          </button>
          <button
            class="btn ${this.ingestMode === 'formatted_json' ? 'btn-run' : 'btn-secondary'}"
            @click=${() => this.ingestMode = 'formatted_json'}
          >
            <i class="fa-solid fa-code" style="color: #00ffff;"></i> 2. Formatted LLM JSON Paste (Offline LLM Fallback)
          </button>
        </div>

        ${this.ingestMode === 'formatted_json' ? html`
          <div style="background: rgba(0, 229, 255, 0.05); border: 1px solid var(--border-cyan); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--text-accent); margin-bottom: 6px;">
              <i class="fa-solid fa-circle-info"></i> Direct LLM JSON Ingestion Point
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
              Use this option when your Local LLM (Ollama) is offline or unavailable. Paste a structured JSON payload generated from ChatGPT, Claude, DeepSeek, or an offline LLM model.
            </div>

            <textarea
              style="font-family: 'Fira Code', monospace; font-size: 12px; min-height: 220px;"
              .value=${this.jsonInput}
              @input=${(e) => this.jsonInput = e.target.value}
              placeholder='Paste formatted LLM JSON payload here: e.g. {"bulletin_id": "TB-MANUAL-01", "title": "...", "mitre_techniques": ["T1078.004"]}'
            ></textarea>

            <div class="control-row" style="margin-bottom: 12px;">
              <button class="btn btn-secondary" @click=${this.handleLoadJsonTemplate}>
                <i class="fa-solid fa-lightbulb" style="color: #f59e0b;"></i> Load Sample Formatted LLM JSON Template
              </button>

              <button class="btn btn-secondary" @click=${() => { this.jsonInput = ''; this.analysisResponse = null; }}>
                <i class="fa-solid fa-trash"></i> Clear JSON
              </button>
            </div>

            <button class="btn btn-primary" @click=${this.handleAnalyzeFormattedJson} ?disabled=${this.analyzing}>
              ${this.analyzing ? html`<i class="fa-solid fa-circle-notch fa-spin"></i> Processing Formatted LLM JSON...` : html`<i class="fa-solid fa-upload"></i> Ingest & Analyze Formatted LLM JSON`}
            </button>
          </div>
        ` : html`
          <textarea
            .value=${this.bulletinInput}
            @input=${(e) => this.bulletinInput = e.target.value}
            placeholder="Paste threat bulletin advisory text here (e.g. Adversary X targeting Cloud Infrastructure using stolen credentials, PowerShell exfiltration...)"
          ></textarea>

          <div class="control-row">
            <select @change=${this.handleSelectSample}>
              <option value="">-- Choose Pre-loaded Threat Sample (25 Available) --</option>
              ${this.sampleBulletins && this.sampleBulletins.length > 0 ? this.sampleBulletins.map((b, i) => html`
                <option value="${i}">${b.title}</option>
              `) : ''}
            </select>

            <button class="btn btn-secondary" @click=${() => this.showRssModal = true}>
              <i class="fa-solid fa-square-rss" style="color: #00ffff;"></i> CTI RSS Feed Ingest (Table Format)
            </button>

            <button class="btn btn-secondary" @click=${() => { this.bulletinInput = ''; this.analysisResponse = null; }}>
              <i class="fa-solid fa-trash"></i> Clear
            </button>
          </div>

          <button class="btn btn-primary" @click=${this.handleAnalyze} ?disabled=${this.analyzing}>
            ${this.analyzing ? html`<i class="fa-solid fa-circle-notch fa-spin"></i> Executing Threat Analysis...` : html`<i class="fa-solid fa-brain"></i> Run ${this.analysisPath === '3layer_rule_engine' ? '3-Layer DB Rule Query Engine' : '5-Step Synchronized Threat Analysis'}`}
          </button>
        `}

        ${res ? html`
          <div class="intel-box">
            <div class="intel-header">
              🧠 Threat Analysis Output — ${res.analysis_path === '3layer_rule_engine' ? '🛡️ 3-Layer DB Rule Engine (Multi-Plane LLM Queries)' : `Standard 5-Step (${intel?.llm_used ? 'Ollama LLM' : 'Rule Engine'})`}
            </div>
            <div style="margin-bottom: 8px;"><strong>Bulletin ID:</strong> <code style="color: #00ffff;">${res.bulletin_id}</code></div>
            <div style="margin-bottom: 8px;"><strong>Title:</strong> ${res.title}</div>
            <div style="margin-bottom: 8px;"><strong>Impact Severity:</strong> <span class="badge" style="background: rgba(255,51,102,0.2); color: #ff3366;">${res.impact_rating}</span></div>
            <div style="margin-bottom: 8px;"><strong>Threat Actors:</strong> ${Array.isArray(res.actors) ? res.actors.join(', ') : res.actors}</div>

            ${res.analysis_path === '3layer_rule_engine' && res.rule_engine_results ? html`
              <!-- 3-LAYER DB RULE QUERY ENGINE RESULTS -->
              <div style="margin-top: 18px; border-top: 1px solid #1e2638; padding-top: 14px;">
                <div style="font-size: 15px; font-weight: 700; color: #00ffff; margin-bottom: 12px;">
                  📊 Enterprise Multi-Plane Telemetry LLM SQL Query Execution & Gap Metrics
                </div>

                <div class="stats-row">
                  <div class="metric-card">
                    <div class="metric-val">${res.rule_engine_results.total_rules_evaluated}</div>
                    <div class="metric-lbl">Rules Evaluated</div>
                  </div>
                  <div class="metric-card" style="border-color: #ef4444;">
                    <div class="metric-val" style="color: #ef4444;">${res.rule_engine_results.gaps_detected_count}</div>
                    <div class="metric-lbl">Gaps Identified</div>
                  </div>
                  <div class="metric-card" style="border-color: #f59e0b;">
                    <div class="metric-val" style="color: #f59e0b;">${res.rule_engine_results.total_failed_records}</div>
                    <div class="metric-lbl">Failed Records</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-val" style="color: #00e5ff;">${res.rule_engine_results.overall_gap_percentage}%</div>
                    <div class="metric-lbl">Overall Gap %</div>
                  </div>
                </div>

                <div style="font-weight: 700; color: #00ffff; margin-bottom: 8px; margin-top: 14px;">
                  ⚡ Executed LLM Vulnerability Queries & Telemetry Results:
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Query #</th>
                      <th>Attack ID / Technique</th>
                      <th>D3FEND Control</th>
                      <th>Source System</th>
                      <th>Status</th>
                      <th>Audited (Total / Fail)</th>
                      <th>Gap %</th>
                      <th>Remediation / Criteria</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(res.rule_engine_results.execution_results || []).map(r => html`
                      <tr style="${r.status === 'GAP_DETECTED' ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
                        <td style="font-family: monospace; font-weight: 700; color: #00ffff;">${r.query_number}</td>
                        <td style="font-weight: 600;">${r.attack_id} <span style="color: #8a99ad; font-size: 11px;">(${r.attack_technique})</span></td>
                        <td style="color: #00e5ff; font-family: monospace;">${r.d3fend_control}</td>
                        <td><span class="badge" style="background: rgba(0,229,255,0.1); color: #00e5ff;">${r.source_system}</span></td>
                        <td>
                          <span class="${r.status === 'GAP_DETECTED' ? 'btn-gap' : 'btn-active'}" style="padding: 3px 8px; font-size: 10px; font-weight: 700;">
                            ${r.status}
                          </span>
                        </td>
                        <td>${r.full_count} / <strong style="color: ${r.failed_record_count > 0 ? '#ef4444' : '#10b981'};">${r.failed_record_count}</strong></td>
                        <td style="font-weight: 700; color: ${r.percentage_gap > 0 ? '#ef4444' : '#10b981'};">${r.percentage_gap}%</td>
                        <td style="font-size: 11.5px; color: #94a3b8;">
                          <div style="color: #e2e8f0; font-weight: 600; margin-bottom: 2px;">${r.remediation_command || 'Review hardening policy'}</div>
                          <div style="font-size: 10.5px; color: #64748b;">${r.audit_criteria}</div>
                        </td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              </div>
            ` : html`
              <!-- STANDARD 5-STEP ANALYSIS AUDIT RESULTS -->
              <div style="margin-top: 14px; font-weight: 700; color: #00ffff;">Mapped D3FEND Countermeasures & Environment Audit Results:</div>
              <table>
                <thead>
                  <tr>
                    <th>D3FEND Control</th>
                    <th>Status</th>
                    <th>Environment Audit Verification</th>
                  </tr>
                </thead>
                <tbody>
                  ${(res.audit_results || []).map(ar => html`
                    <tr>
                      <td style="font-family: monospace; color: #00ffff; font-weight: 700;">${ar.countermeasure_id} (${ar.countermeasure_name})</td>
                      <td>
                        <span class="${ar.status === 'Secured' ? 'btn-active' : 'btn-disabled'}" style="padding: 2px 6px; font-size: 11px;">${ar.status.toUpperCase()}</span>
                      </td>
                      <td style="color: #94a3b8; font-size: 12px;">${ar.details}</td>
                    </tr>
                  `)}
                </tbody>
              </table>
            `}

            <!-- STEP-BY-STEP PIPELINE EXECUTION TRACER & OPERATOR TABULAR VIEWER -->
            ${res.pipeline_trace ? html`
              <pipeline-stepper-view .traceData=${res.pipeline_trace}></pipeline-stepper-view>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <!-- CTI RSS FEED INGEST TABLE MODAL -->
      ${this.showRssModal ? html`
        <div class="backdrop" @click=${(e) => { if (e.target.classList.contains('backdrop')) this.showRssModal = false; }}>
          <div class="modal">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid #222634; padding-bottom: 12px;">
              <h2 style="font-size: 18px; color: #00ffff; margin: 0; display: flex; align-items: center; gap: 10px;">
                <i class="fa-solid fa-square-rss"></i> CTI RSS Feed Ingest Table Pipeline
              </h2>
              <button style="background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer;" @click=${() => this.showRssModal = false}>&times;</button>
            </div>

            <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">
              Table of configured CTI RSS feed pipes. Use buttons against each record to toggle Active/De-active status or Run the Current Feed immediately.
            </p>

            <!-- RSS FEED PIPES TABLE -->
            <div style="background: #050508; border: 1px solid #222634; border-radius: 8px; padding: 12px; margin-bottom: 24px;">
              <table>
                <thead>
                  <tr>
                    <th>Feed Name</th>
                    <th>URL Endpoint</th>
                    <th>Status</th>
                    <th>Feed Controls</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.configuredFeeds.map(f => html`
                    <tr>
                      <td style="font-weight: 600; color: var(--text-primary);">${f.name}</td>
                      <td style="font-family: monospace; color: var(--text-accent); font-size: 11.5px;">${f.url}</td>
                      <td>
                        <button class="btn ${f.enabled === 1 ? 'btn-active' : 'btn-disabled'}" @click=${() => this.handleToggleActive(f)}>
                          ${f.enabled === 1 ? '✓ ACTIVE' : '✕ DISABLED'}
                        </button>
                      </td>
                      <td>
                        <button class="btn btn-run" @click=${() => this.handleRunFeed(f)}>
                          ▶ Run Current Feed
                        </button>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>

            <!-- PULLED RSS ARTICLES CHECKLIST -->
            ${this.pulledRssItems.length > 0 ? html`
              <div style="background: rgba(0, 229, 255, 0.04); border: 1px solid #00e5ff; border-radius: 10px; padding: 20px; margin-top: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <h3 style="font-size: 15px; color: #00ffff; margin: 0;">
                    Pulled Articles from [${this.activeFeedName}] (${this.pulledRssItems.length} Bulletins)
                  </h3>
                </div>

                <div style="max-height: 260px; overflow-y: auto; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                  ${this.pulledRssItems.map((item, idx) => html`
                    <label style="display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-color); cursor: pointer;">
                      <input type="checkbox" style="width: 16px; height: 16px; cursor: pointer; margin-top: 2px;" .checked=${!!this.selectedRssIndices[idx]} @change=${(e) => this.selectedRssIndices = { ...this.selectedRssIndices, [idx]: e.target.checked }} />
                      <div>
                        <div style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${item.title}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${item.description}</div>
                      </div>
                    </label>
                  `)}
                </div>

                <button class="btn btn-primary" @click=${this.handleAnalyzeSelectedRss} ?disabled=${this.analyzing}>
                  ${this.analyzing ? html`<i class="fa-solid fa-circle-notch fa-spin"></i> Batch Analyzing with LLM...` : html`⚡ Start Batch Analysis on Selected RSS Bulletins`}
                </button>
              </div>
            ` : ''}

          </div>
        </div>
      ` : ''}
    `;
  }
}

customElements.define('ingest-screen', IngestScreen);
