import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchDatabaseStats, initDatabaseTables, seedDatabase, uploadJsonFile } from '../services/api.js';

export class SettingsModal extends LitElement {
  static properties = {
    open: { type: Boolean },
    selectedTable: { type: String },
    tableCounts: { type: Object },
    uploadHistory: { type: Array },
    toastMsg: { type: String },
    toastType: { type: String },
    loading: { type: Boolean },
    dragActive: { type: Boolean }
  };

  static styles = css`
    :host { display: block; }
    .backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(4, 6, 10, 0.85);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .modal {
      background: var(--bg-card);
      border: 1px solid var(--border-accent);
      border-radius: 14px;
      width: 100%;
      max-width: 900px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 0 40px rgba(0, 229, 255, 0.25);
      padding: 28px;
      color: var(--text-primary);
      font-family: inherit;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 16px;
    }
    .modal-title { font-size: 20px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
    .close-btn {
      background: transparent; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer; transition: color 0.2s;
    }
    .close-btn:hover { color: #ff3366; }
    
    .section-title { font-size: 15px; font-weight: 700; color: var(--text-accent); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .loader-box {
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
    select {
      width: 100%;
      background: var(--bg-card);
      border: 1px solid var(--border-accent);
      color: var(--text-primary);
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
    }
    .dropzone {
      border: 2px dashed var(--border-accent); border-radius: 10px; padding: 30px 20px; text-align: center; background: rgba(0, 229, 255, 0.04); cursor: pointer; transition: all 0.2s; margin-top: 12px;
    }
    .dropzone:hover, .dropzone.active { border-color: var(--border-accent); background: rgba(0, 229, 255, 0.09); box-shadow: 0 0 15px rgba(0, 229, 255, 0.2); }
    
    .btn {
      padding: 9px 18px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; display: inline-flex; align-items: center; gap: 8px;
    }
    .btn-primary { background: linear-gradient(135deg, #00b4d8 0%, #0077b6 100%); color: #fff; border-color: var(--border-accent); }
    .btn-secondary { background: var(--bg-input); color: var(--text-primary); border-color: var(--border-color); }
    .btn-secondary:hover { background: var(--bg-card-hover); border-color: var(--border-accent); }
 
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .stat-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; }
    .stat-label { font-size: 10px; text-transform: uppercase; color: var(--text-muted); }
    .stat-val { font-size: 18px; font-weight: 700; color: var(--text-accent); margin-top: 2px; }
 
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 10px; color: var(--text-muted); font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--border-color); background: var(--bg-sidebar); }
    td { padding: 10px; border-bottom: 1px solid var(--border-color); font-size: 12px; color: var(--text-primary); }
    .badge-success { background: rgba(0, 204, 136, 0.2); color: #00cc88; border: 1px solid #00cc88; padding: 2px 6px; border-radius: 8px; font-size: 10px; }
    .toast { padding: 10px 16px; border-radius: 6px; margin-bottom: 16px; font-weight: 600; font-size: 13px; }
    .toast-success { background: rgba(0, 204, 136, 0.15); border: 1px solid #00cc88; color: #00cc88; }
    .toast-error { background: rgba(255, 51, 102, 0.15); border: 1px solid #ff3366; color: #ff3366; }
  `;

  constructor() {
    super();
    this.open = false;
    this.selectedTable = 'identity_events';
    this.analysisPath = localStorage.getItem('itdr_analysis_path') || 'standard';
    this.tableCounts = {};
    this.uploadHistory = [];
    this.toastMsg = '';
    this.toastType = 'success';
    this.loading = false;
    this.dragActive = false;
  }

  handleAnalysisPathChange(e) {
    this.analysisPath = e.target.value;
    localStorage.setItem('itdr_analysis_path', this.analysisPath);
    this.showToast(`Threat Analysis Strategy updated to: ${this.analysisPath === '3layer_rule_engine' ? '3-Layer DB Rule Query Engine' : 'Standard Topology Audit'}`, 'success');
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadStats();
  }

  async loadStats() {
    try {
      const data = await fetchDatabaseStats();
      this.tableCounts = data.table_counts || {};
      this.uploadHistory = data.upload_history || [];
    } catch (e) {
      console.error(e);
    }
  }

  closeModal() {
    this.dispatchEvent(new CustomEvent('close-settings', { bubbles: true, composed: true }));
  }

  async handleInitTables() {
    this.loading = true;
    try {
      const res = await initDatabaseTables();
      this.showToast('SQL Server tables initialized successfully in ITDR database.', 'success');
      this.tableCounts = res.tables || {};
    } catch (e) {
      this.showToast('Initialization failed: ' + e.message, 'error');
    } finally {
      this.loading = false;
    }
  }

  async handleSeedDatabase() {
    this.loading = true;
    try {
      const res = await seedDatabase();
      this.showToast('Predefined sample feeds seeded into SQL Server DB & Neo4j Graph!', 'success');
      if (res.table_counts) this.tableCounts = res.table_counts;
      this.loadStats();
    } catch (e) {
      this.showToast('Seeding failed: ' + e.message, 'error');
    } finally {
      this.loading = false;
    }
  }

  async handleFileSelected(e) {
    const target = e.target;
    if (target.files && target.files[0]) {
      await this.uploadFile(target.files[0]);
    }
  }

  async uploadFile(file) {
    this.loading = true;
    try {
      const res = await uploadJsonFile(file, this.selectedTable);
      this.showToast(`Loaded ${file.name} directly into target table [${this.selectedTable}]! Ingested ${res.records_inserted} records.`, 'success');
      if (res.table_counts) this.tableCounts = res.table_counts;
      this.loadStats();
    } catch (e) {
      this.showToast(`Targeted upload failed: ${e.message}`, 'error');
    } finally {
      this.loading = false;
    }
  }

  showToast(msg, type) {
    this.toastMsg = msg;
    this.toastType = type;
    setTimeout(() => { this.toastMsg = ''; }, 6000);
  }

  render() {
    if (!this.open) return html``;

    return html`
      <div class="backdrop" @click=${(e) => { if (e.target.classList.contains('backdrop')) this.closeModal(); }}>
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">⚙️ Targeted Database Table JSON Loader & Settings</div>
            <button class="close-btn" @click=${this.closeModal}>&times;</button>
          </div>

          ${this.toastMsg ? html`<div class="toast toast-${this.toastType}">${this.toastMsg}</div>` : ''}

          <!-- Threat Analysis Strategy Switcher -->
          <div class="loader-box" style="border-color: #00e5ff;">
            <div class="section-title">⚡ Threat Analyser Execution Path Strategy</div>
            <div class="form-group">
              <label>Select Active Threat Analysis Engine:</label>
              <select .value=${this.analysisPath} @change=${this.handleAnalysisPathChange}>
                <option value="standard">🔹 Standard 5-Step Analysis (Topology Audit & Blast Radius - Default)</option>
                <option value="3layer_rule_engine">🛡️ 3-Layer DB Rule Query Engine (Multi-Plane Telemetry & LLM Queries)</option>
              </select>
              <p style="font-size: 11.5px; color: #8a99ad; margin-top: 6px;">
                ${this.analysisPath === '3layer_rule_engine' 
                  ? 'Active: Requests formatted LLM SQL queries against 24 multi-plane telemetry tables in SQL Server to identify enterprise vulnerability gaps (Blast Radius bypassed).' 
                  : 'Active: Audits baseline controls and builds Neo4j topology blast radius graph.'}
              </p>
            </div>
          </div>

          <!-- Targeted Table Selector Loader -->
          <div class="loader-box">
            <div class="section-title">🎯 Targeted Table JSON Ingestion</div>
            
            <div class="form-group">
              <label>Select Target Database Table to Ingest JSON Into:</label>
              <select .value=${this.selectedTable} @change=${(e) => this.selectedTable = e.target.value}>
                <option value="identity_events">📡 identity_events (Identity Telemetry Logs)</option>
                <option value="threat_bulletins">📰 threat_bulletins (CTI Threat Bulletins)</option>
                <option value="identity_profiles">👤 identity_profiles (UEBA User Risk Baselines)</option>
                <option value="identity_feeds">🌐 identity_feeds (Collector Feed Configs)</option>
                <option value="identity_feed_entries">⚠️ identity_feed_entries (Collector Warnings & Alerts)</option>
                <option value="bank_topology">🕸️ bank_topology (Neo4j Graph - Users, Groups, Assets)</option>
                <option value="audit_results">🛡️ audit_results (Compliance Countermeasure Audits)</option>
              </select>
            </div>

            <div class="dropzone ${this.dragActive ? 'active' : ''}"
                 @dragover=${(e) => { e.preventDefault(); this.dragActive = true; }}
                 @dragleave=${() => { this.dragActive = false; }}
                 @drop=${(e) => {
                   e.preventDefault();
                   this.dragActive = false;
                   if (e.dataTransfer?.files[0]) this.uploadFile(e.dataTransfer.files[0]);
                 }}
                 @click=${() => this.shadowRoot.querySelector('#modalFileInput').click()}>
              <div style="font-size: 32px; color: #00e5ff; margin-bottom: 6px;">📥</div>
              <h4 style="color: #fff; margin-bottom: 4px;">Click or Drag & Drop JSON file for target table <code>[${this.selectedTable}]</code></h4>
              <p style="color: #8a99ad; font-size: 12px;">Only loads records formatted for ${this.selectedTable}</p>
              <input type="file" id="modalFileInput" accept=".json" style="display: none;" @change=${this.handleFileSelected} />
            </div>
          </div>

          <!-- Quick Setup Actions -->
          <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <button class="btn btn-primary" @click=${this.handleInitTables} ?disabled=${this.loading}>
              ⚙️ Create / Verify SQL Server Tables
            </button>
            <button class="btn btn-secondary" @click=${this.handleSeedDatabase} ?disabled=${this.loading}>
              📦 Seed Predefined Sample Feeds
            </button>
          </div>

          <!-- Table Record Counters Grid -->
          <div class="section-title">📊 SQL Server Table Record Counts (DB: ITDR)</div>
          <div class="stats-grid">
            ${Object.entries(this.tableCounts).map(([table, count]) => html`
              <div class="stat-card">
                <div class="stat-label">${table.replace(/_/g, ' ')}</div>
                <div class="stat-val">${count.toLocaleString()}</div>
              </div>
            `)}
          </div>

          <!-- Audit Logs -->
          <div class="section-title">📜 Targeted Upload Audit History</div>
          <div style="background: rgba(11,14,22,0.8); border: 1px solid #1e2638; border-radius: 8px; padding: 12px;">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Filename</th>
                  <th>Target Table</th>
                  <th>Records</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${this.uploadHistory.length === 0 ? html`
                  <tr><td colspan="6" style="text-align: center; color: #8a99ad;">No targeted uploads recorded.</td></tr>
                ` : this.uploadHistory.map(u => html`
                  <tr>
                    <td>#${u.id}</td>
                    <td style="font-weight: 600; color: #00e5ff;">${u.filename}</td>
                    <td><span class="badge-success">${u.file_type}</span></td>
                    <td>${u.record_count}</td>
                    <td>${u.uploaded_at}</td>
                    <td><span class="badge-success">${u.status}</span></td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    `;
  }
}

customElements.define('settings-modal', SettingsModal);
