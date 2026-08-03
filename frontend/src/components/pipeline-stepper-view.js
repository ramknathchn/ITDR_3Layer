import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

export class PipelineStepperView extends LitElement {
  static properties = {
    traceData: { type: Object },
    activeTab: { type: String }
  };

  static styles = css`
    :host { display: block; margin-top: 24px; font-family: 'Inter', sans-serif; }
    
    .container {
      background: var(--bg-card, #0d0e12);
      border: 1px solid var(--border-accent, #00e5ff);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 0 30px rgba(0, 229, 255, 0.15);
      color: var(--text-primary, #ffffff);
    }

    .stepper-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border-color, #222634);
      padding-bottom: 14px;
    }
    
    .stepper-title {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-accent, #00e5ff);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .time-badge {
      background: rgba(0, 229, 255, 0.15);
      color: var(--text-accent, #00e5ff);
      border: 1px solid var(--border-accent, #00e5ff);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }

    /* Step Navigation Bar */
    .nav-bar {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 24px;
    }

    .nav-step {
      background: var(--bg-card-hover, #161822);
      border: 1px solid var(--border-color, #222634);
      border-radius: 8px;
      padding: 10px 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .nav-step:hover {
      border-color: var(--border-accent, #00e5ff);
      background: rgba(0, 229, 255, 0.05);
    }

    .nav-step.active {
      border-color: var(--border-accent, #00e5ff);
      background: rgba(0, 229, 255, 0.15);
      box-shadow: 0 0 12px rgba(0, 229, 255, 0.3);
    }

    .step-num {
      font-size: 10px;
      text-transform: uppercase;
      color: var(--text-muted, #94a3b8);
      font-weight: 700;
    }

    .step-label {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--text-primary, #ffffff);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .step-time {
      font-size: 10px;
      color: var(--text-accent, #00e5ff);
      margin-top: 2px;
    }

    /* Content Cards */
    .step-card {
      background: var(--bg-card, #0d0e12);
      border: 1px solid var(--border-color, #222634);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 16px;
    }

    .card-head {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-accent, #00e5ff);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .code-block {
      background: var(--bg-input, #050508);
      border: 1px solid var(--border-color, #222634);
      border-radius: 8px;
      padding: 14px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 12px;
      color: var(--text-accent, #00ffff);
      max-height: 240px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
    th { padding: 10px 12px; color: var(--text-muted, #94a3b8); font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--border-color, #222634); background: var(--bg-sidebar, #08090d); }
    td { padding: 10px 12px; border-bottom: 1px solid var(--border-color, #222634); font-size: 12px; color: var(--text-primary, #ffffff); }
    tr:hover td { background: rgba(0, 229, 255, 0.03); }

    .badge-secure { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
    .badge-gap { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }

    .math-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 14px;
    }

    .math-box {
      background: #0b0f19;
      border: 1px solid #1e2638;
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    .math-lbl { font-size: 11px; color: #8a99ad; text-transform: uppercase; }
    .math-val { font-size: 22px; font-weight: 700; color: #00e5ff; margin-top: 4px; }
  `;

  constructor() {
    super();
    this.traceData = null;
    this.activeTab = 'step_1_ingestion';
  }

  render() {
    if (!this.traceData || !this.traceData.steps) {
      return html``;
    }

    const steps = this.traceData.steps;
    const totalMs = this.traceData.total_execution_time_ms || 0;

    return html`
      <div class="container">
        <div class="stepper-header">
          <div class="stepper-title">
            <i class="fa-solid fa-timeline"></i> Step-by-Step Threat Analysis Logging & Execution Viewer
          </div>
          <div class="time-badge">
            ⚡ Total Execution Time: ${totalMs} ms
          </div>
        </div>

        <!-- 6 Step Navigation Bar -->
        <div class="nav-bar">
          <div class="nav-step ${this.activeTab === 'step_1_ingestion' ? 'active' : ''}" @click=${() => this.activeTab = 'step_1_ingestion'}>
            <div class="step-num">Step 1</div>
            <div class="step-label">Ingestion Engine</div>
            <div class="step-time">${steps.step_1_ingestion?.duration_ms || 0} ms</div>
          </div>
          <div class="nav-step ${this.activeTab === 'step_2_mitre_extraction' ? 'active' : ''}" @click=${() => this.activeTab = 'step_2_mitre_extraction'}>
            <div class="step-num">Step 2</div>
            <div class="step-label">MITRE Extractor</div>
            <div class="step-time">${steps.step_2_mitre_extraction?.duration_ms || 0} ms</div>
          </div>
          <div class="nav-step ${this.activeTab === 'step_3_d3fend_mapping' ? 'active' : ''}" @click=${() => this.activeTab = 'step_3_d3fend_mapping'}>
            <div class="step-num">Step 3</div>
            <div class="step-label">D3FEND Mapper</div>
            <div class="step-time">${steps.step_3_d3fend_mapping?.duration_ms || 0} ms</div>
          </div>
          <div class="nav-step ${this.activeTab === 'step_4_sql_posture_audit' ? 'active' : ''}" @click=${() => this.activeTab = 'step_4_sql_posture_audit'}>
            <div class="step-num">Step 4</div>
            <div class="step-label">SQL Auditor</div>
            <div class="step-time">${steps.step_4_sql_posture_audit?.duration_ms || 0} ms</div>
          </div>
          <div class="nav-step ${this.activeTab === 'step_5_dynamic_compliance' ? 'active' : ''}" @click=${() => this.activeTab = 'step_5_dynamic_compliance'}>
            <div class="step-num">Step 5</div>
            <div class="step-label">Compliance Math</div>
            <div class="step-time">${steps.step_5_dynamic_compliance?.duration_ms || 0} ms</div>
          </div>
          <div class="nav-step ${this.activeTab === 'step_6_operator_summary' ? 'active' : ''}" @click=${() => this.activeTab = 'step_6_operator_summary'}>
            <div class="step-num">Step 6</div>
            <div class="step-label">Operator Summary</div>
            <div class="step-time">Timing View</div>
          </div>
        </div>

        <!-- STEP 1: INGESTION ENGINE -->
        ${this.activeTab === 'step_1_ingestion' ? html`
          <div class="step-card">
            <div class="card-head">
              <span>📥 Step 1: Ingestion Engine Log</span>
              <span style="font-size: 12px; color: #8a99ad;">Engine: ${steps.step_1_ingestion.model_name} (${steps.step_1_ingestion.duration_ms} ms)</span>
            </div>
            
            <div style="font-size: 13px; font-weight: 700; color: #00e5ff; margin-bottom: 6px;">1. Raw Input Text to LLM:</div>
            <div class="code-block">${steps.step_1_ingestion.input_prompt}</div>

            <div style="font-size: 13px; font-weight: 700; color: #00e5ff; margin-top: 14px; margin-bottom: 6px;">2. Formatted Parsed JSON Output from LLM:</div>
            <div class="code-block" style="color: #4ade80;">${JSON.stringify(steps.step_1_ingestion.output_json, null, 2)}</div>
          </div>
        ` : ''}

        <!-- STEP 2: MITRE EXTRACTOR -->
        ${this.activeTab === 'step_2_mitre_extraction' ? html`
          <div class="step-card">
            <div class="card-head">
              <span>🎯 Step 2: MITRE ATT&CK Technique Extractor Log</span>
              <span style="font-size: 12px; color: #8a99ad;">${steps.step_2_mitre_extraction.duration_ms} ms</span>
            </div>

            <div style="font-size: 13px; font-weight: 700; color: #00e5ff; margin-bottom: 6px;">1. Framework Queries & Heuristics Run:</div>
            <div class="code-block" style="max-height: 90px; color: #cbd5e1;">${(steps.step_2_mitre_extraction.queries_run || []).join('\n')}</div>

            <div style="font-size: 13px; font-weight: 700; color: #00e5ff; margin-top: 14px; margin-bottom: 6px;">2. Extracted MITRE ATT&CK Techniques:</div>
            <table>
              <thead>
                <tr>
                  <th>Technique ID</th>
                  <th>Observed Threat Behavior</th>
                </tr>
              </thead>
              <tbody>
                ${(steps.step_2_mitre_extraction.extracted_techniques || []).map(t => html`
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: #00e5ff;">${t.technique_id}</td>
                    <td style="color: #e2e8f0;">${t.behavior_description}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- STEP 3: D3FEND MAPPER -->
        ${this.activeTab === 'step_3_d3fend_mapping' ? html`
          <div class="step-card">
            <div class="card-head">
              <span>🛡️ Step 3: D3FEND Defensive Mapper Log</span>
              <span style="font-size: 12px; color: #8a99ad;">${steps.step_3_d3fend_mapping.duration_ms} ms</span>
            </div>

            <div style="font-size: 13px; font-weight: 700; color: #00e5ff; margin-bottom: 6px;">1. Framework Mapping Queries Run:</div>
            <div class="code-block" style="max-height: 90px; color: #cbd5e1;">${(steps.step_3_d3fend_mapping.queries_run || []).join('\n')}</div>

            <div style="font-size: 13px; font-weight: 700; color: #00e5ff; margin-top: 14px; margin-bottom: 6px;">2. Mapped Defensive Countermeasures:</div>
            <table>
              <thead>
                <tr>
                  <th>Attack Technique</th>
                  <th>D3FEND Control ID</th>
                  <th>Countermeasure Name</th>
                  <th>Target Infrastructure</th>
                </tr>
              </thead>
              <tbody>
                ${(steps.step_3_d3fend_mapping.mapped_countermeasures || []).map(m => html`
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: #f59e0b;">${m.technique_id}</td>
                    <td style="font-family: monospace; font-weight: 700; color: #00e5ff;">${m.d3fend_id}</td>
                    <td style="font-weight: 600; color: #e2e8f0;">${m.name}</td>
                    <td style="color: #8a99ad; font-size: 11.5px;">${m.target_infrastructure}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- STEP 4: SQL POSTURE AUDITOR -->
        ${this.activeTab === 'step_4_sql_posture_audit' ? html`
          <div class="step-card">
            <div class="card-head">
              <span>🔍 Step 4: SQL Posture Auditor Log</span>
              <span style="font-size: 12px; color: #8a99ad;">${steps.step_4_sql_posture_audit.total_queries_executed} Queries (${steps.step_4_sql_posture_audit.duration_ms} ms)</span>
            </div>

            <div style="font-size: 13px; font-weight: 700; color: #00e5ff; margin-bottom: 6px;">Executed LLM SQL Rule Queries against SQL Server Telemetry Tables:</div>
            <div style="max-height: 380px; overflow-y: auto;">
              <table>
                <thead>
                  <tr>
                    <th>Query #</th>
                    <th>Attack & Control</th>
                    <th>Source System</th>
                    <th>Target Table Name</th>
                    <th>Executed T-SQL Query</th>
                    <th>Audited (Full / Fail)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${(steps.step_4_sql_posture_audit.queries_sent_to_rule_engine || []).map(q => html`
                    <tr>
                      <td style="font-family: monospace; font-weight: 700; color: #00e5ff;">${q.query_number}</td>
                      <td>
                        <div style="font-weight: 600;">${q.attack_id}</div>
                        <div style="font-size: 10.5px; color: #8a99ad;">${q.d3fend_control}</div>
                      </td>
                      <td><span style="background: rgba(0,229,255,0.1); color: #00e5ff; padding: 2px 6px; border-radius: 4px; font-size: 10.5px;">${q.source_system}</span></td>
                      <td><span style="background: rgba(56,189,248,0.1); color: #38bdf8; border: 1px solid #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 10.5px; font-family: monospace;">[${q.target_table_name || 'identity_events'}]</span></td>
                      <td style="font-family: monospace; font-size: 11px; color: #38bdf8; max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${q.tsql_query}">${q.tsql_query}</td>
                      <td>${q.full_count} / <strong style="color: ${q.failed_record_count > 0 ? '#ef4444' : '#10b981'};">${q.failed_record_count}</strong></td>
                      <td>
                        <span class="${q.status === 'GAP_DETECTED' ? 'badge-gap' : 'badge-secure'}">${q.status}</span>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- STEP 5: DYNAMIC COMPLIANCE MATH -->
        ${this.activeTab === 'step_5_dynamic_compliance' ? html`
          <div class="step-card">
            <div class="card-head">
              <span>🧮 Step 5: Dynamic Compliance Engine Math Breakdown</span>
              <span style="font-size: 12px; color: #8a99ad;">${steps.step_5_dynamic_compliance.duration_ms} ms</span>
            </div>

            <div style="font-size: 13px; font-weight: 700; color: #00e5ff; margin-bottom: 6px;">Vulnerability Gap Calculation Formula & Derivation:</div>
            <div class="code-block" style="color: #f59e0b; font-size: 13px;">
Formula  : ${steps.step_5_dynamic_compliance.formula_used}
Math     : ${steps.step_5_dynamic_compliance.math_breakdown?.calculation || ''}
Failed Records Sum : ${steps.step_5_dynamic_compliance.telemetry_failed_records} Telemetry Records
Risk Rating        : ${steps.step_5_dynamic_compliance.risk_rating_derived}
            </div>

            <div class="math-grid">
              <div class="math-box">
                <div class="math-lbl">Total Rules Evaluated</div>
                <div class="math-val">${steps.step_5_dynamic_compliance.total_rules_evaluated}</div>
              </div>
              <div class="math-box" style="border-color: #ef4444;">
                <div class="math-lbl">Failed Rule Queries</div>
                <div class="math-val" style="color: #ef4444;">${steps.step_5_dynamic_compliance.failed_rule_queries}</div>
              </div>
              <div class="math-box" style="border-color: #f59e0b;">
                <div class="math-lbl">Failed Records Sum</div>
                <div class="math-val" style="color: #f59e0b;">${steps.step_5_dynamic_compliance.telemetry_failed_records}</div>
              </div>
              <div class="math-box" style="border-color: #00e5ff;">
                <div class="math-lbl">Overall Gap %</div>
                <div class="math-val" style="color: #00e5ff;">${steps.step_5_dynamic_compliance.overall_gap_percentage}%</div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- STEP 6: OPERATOR TABULAR VIEWER -->
        ${this.activeTab === 'step_6_operator_summary' ? html`
          <div class="step-card">
            <div class="card-head">
              <span>📊 Step 6: Operator Tabular Viewer — Performance & Timing Breakdown</span>
              <span class="time-badge">${totalMs} ms Total</span>
            </div>

            <div style="font-size: 13px; font-weight: 700; color: #00e5ff; margin-bottom: 6px;">Summary of Pipeline Operations with Time Spent (ms):</div>
            <table>
              <thead>
                <tr>
                  <th>Step #</th>
                  <th>Pipeline Step Name</th>
                  <th>Records / Operations Processed</th>
                  <th>Time Spent (ms)</th>
                  <th>% of Total Pipeline Time</th>
                </tr>
              </thead>
              <tbody>
                ${(steps.step_6_operator_summary?.summary_table || []).map(row => html`
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: #00e5ff;">Step ${row.step_number}</td>
                    <td style="font-weight: 600; color: #fff;">${row.step_name}</td>
                    <td style="color: #cbd5e1; font-size: 11.5px;">${row.records_processed}</td>
                    <td style="font-family: monospace; font-weight: 700; color: #00e5ff;">${row.duration_ms} ms</td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; background: #0b0f19; height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid #1e2638;">
                          <div style="background: linear-gradient(90deg, #00b4d8, #00e5ff); height: 100%; width: ${Math.min(100, row.percentage_of_total_time)}%;"></div>
                        </div>
                        <span style="font-size: 11px; font-weight: 700; width: 42px;">${row.percentage_of_total_time}%</span>
                      </div>
                    </td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>
        ` : ''}

      </div>
    `;
  }
}

customElements.define('pipeline-stepper-view', PipelineStepperView);
