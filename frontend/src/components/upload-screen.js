import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchDatabaseStats, initDatabaseTables, seedDatabase, uploadJsonFile } from '../services/api.js';

export class UploadScreen extends LitElement {
  static properties = {
    tableCounts: { type: Object },
    uploadHistory: { type: Array },
    toastMsg: { type: String },
    toastType: { type: String },
    loading: { type: Boolean },
    dragActive: { type: Boolean }
  };

  static styles = css`
    :host { display: block; color: var(--text-primary); font-family: inherit; }
    .header-banner { margin-bottom: 24px; }
    .title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
    .subtitle { color: var(--text-muted); font-size: 14px; }
    .action-bar { display: flex; gap: 16px; margin-bottom: 28px; flex-wrap: wrap; }
    .btn {
      padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 8px;
    }
    .btn-primary { background: linear-gradient(135deg, #00b4d8 0%, #0077b6 100%); color: #ffffff; border-color: var(--border-accent); box-shadow: 0 0 12px rgba(0, 229, 255, 0.25); }
    .btn-primary:hover { background: linear-gradient(135deg, #00e5ff 0%, #0099cc 100%); box-shadow: 0 0 18px rgba(0, 229, 255, 0.45); }
    .btn-secondary { background: var(--bg-input); color: var(--text-primary); border-color: var(--border-color); }
    .btn-secondary:hover { background: var(--bg-card-hover); border-color: var(--border-accent); }
    .btn-threat { background: linear-gradient(135deg, #ff9900 0%, #cc6600 100%); color: #fff; border-color: #ff9900; }
    .btn-threat:hover { box-shadow: 0 0 14px rgba(255, 153, 0, 0.4); }
    
    .ingest-box {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
    }
    .dropzone {
      border: 2px dashed var(--border-accent); border-radius: 12px; padding: 40px 20px; text-align: center; background: rgba(0, 229, 255, 0.03); cursor: pointer; transition: all 0.25s ease; margin-top: 16px; color: var(--text-primary);
    }
    .dropzone:hover, .dropzone.active { border-color: var(--border-accent); background: rgba(0, 229, 255, 0.08); box-shadow: 0 0 20px rgba(0, 229, 255, 0.2); }
    .dropzone-icon { font-size: 42px; color: var(--text-accent); margin-bottom: 12px; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 16px; transition: border-color 0.2s; }
    .stat-card:hover { border-color: var(--border-accent); }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 6px; }
    .stat-value { font-size: 22px; font-weight: 700; color: var(--text-accent); }
    .table-container { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 12px 14px; color: var(--text-muted); font-size: 12px; text-transform: uppercase; border-bottom: 1px solid var(--border-color); background: var(--bg-sidebar); }
    td { padding: 12px 14px; border-bottom: 1px solid var(--border-color); font-size: 13px; color: var(--text-primary); }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; }
    .status-success { background: rgba(0, 204, 136, 0.2); color: #00cc88; border: 1px solid #00cc88; }
    .status-failed { background: rgba(255, 51, 102, 0.2); color: #ff3366; border: 1px solid #ff3366; }
    .toast { padding: 12px 18px; border-radius: 8px; margin-bottom: 20px; font-weight: 600; font-size: 13px; }
    .toast-success { background: rgba(0, 204, 136, 0.15); border: 1px solid #00cc88; color: #00cc88; }
    .toast-error { background: rgba(255, 51, 102, 0.15); border: 1px solid #ff3366; color: #ff3366; }
  `;

  constructor() {
    super();
    this.tableCounts = {};
    this.uploadHistory = [];
    this.toastMsg = '';
    this.toastType = 'success';
    this.loading = false;
    this.dragActive = false;
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
      this.showToast('All Threat Bulletins & Feeds ingested into SQL Server DB & Neo4j Graph!', 'success');
      if (res.table_counts) this.tableCounts = res.table_counts;
      this.loadStats();
    } catch (e) {
      this.showToast('Ingestion failed: ' + e.message, 'error');
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
      const res = await uploadJsonFile(file);
      this.showToast(`Successfully ingested ${file.name}! Parsed as [${res.detected_type}] & loaded ${res.records_inserted} records into SQL Server & Neo4j.`, 'success');
      if (res.table_counts) this.tableCounts = res.table_counts;
      this.loadStats();
    } catch (e) {
      this.showToast(`Threat feed upload failed: ${e.message}`, 'error');
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
    return html`
      <div class="header-banner">
        <h1 class="title">Threat Data Ingestion & DB Management</h1>
        <p class="subtitle">
          Ingest Threat Bulletins, AD/Entra ID logs, RSS advisories, and JSON feed datasets directly into SQL Server DB and Neo4j Knowledge Graph.
        </p>
      </div>

      ${this.toastMsg ? html`
        <div class="toast toast-${this.toastType}">
          ${this.toastMsg}
        </div>
      ` : ''}

      <!-- Database Setup Actions -->
      <div class="action-bar">
        <button class="btn btn-primary" @click=${this.handleInitTables} ?disabled=${this.loading}>
          ⚙️ Create / Verify SQL Server Tables
        </button>
        <button class="btn btn-threat" @click=${this.handleSeedDatabase} ?disabled=${this.loading}>
          🔥 Ingest All Predefined Threat Feeds & Bulletins
        </button>
      </div>

      <!-- Main Threat Ingestion Upload Section -->
      <div class="ingest-box">
        <h2 style="font-size: 18px; color: #fff; margin-bottom: 6px;">📥 Upload & Load Custom JSON Threat Feeds</h2>
        <p style="color: #8a99ad; font-size: 13px;">
          Upload any JSON threat feed file (Threat Bulletins, Telemetry Events, CTI advisories, Identity Profiles, or Bank Topology). The backend parser will automatically detect schema type, insert rows into SQL Server DB tables, and update Neo4j Graph nodes.
        </p>

        <div class="dropzone ${this.dragActive ? 'active' : ''}"
             @dragover=${(e) => { e.preventDefault(); this.dragActive = true; }}
             @dragleave=${() => { this.dragActive = false; }}
             @drop=${(e) => {
               e.preventDefault();
               this.dragActive = false;
               if (e.dataTransfer?.files[0]) this.uploadFile(e.dataTransfer.files[0]);
             }}
             @click=${() => this.shadowRoot.querySelector('#fileInput').click()}>
          <div class="dropzone-icon">🔥</div>
          <h3>Click or Drag & Drop Threat JSON File to Ingest into Database</h3>
          <p style="color: #8a99ad; margin-top: 6px; font-size: 13px;">
            Supported formats: <code>threat_bulletins.json</code>, <code>ad_events.json</code>, <code>entra_signin.json</code>, <code>bank_topology.json</code>, <code>control_libraries.json</code>
          </p>
          <input type="file" id="fileInput" accept=".json" style="display: none;" @change=${this.handleFileSelected} />
        </div>
      </div>

      <!-- SQL Server Database Table Record Counters -->
      <h2 style="margin-bottom: 16px;">SQL Server Database Tables Record Status (DB: ITDR)</h2>
      <div class="stats-grid">
        ${Object.entries(this.tableCounts).map(([table, count]) => html`
          <div class="stat-card">
            <div class="stat-label">${table.replace(/_/g, ' ')}</div>
            <div class="stat-value">${count.toLocaleString()}</div>
          </div>
        `)}
      </div>

      <!-- JSON Upload History Audit Logs -->
      <div class="table-container">
        <h3 style="margin-bottom: 16px;">Threat Ingestion Audit History</h3>
        <table>
          <thead>
            <tr>
              <th>Audit ID</th>
              <th>Filename</th>
              <th>Detected Threat Feed Type</th>
              <th>Records Ingested</th>
              <th>Ingestion Time</th>
              <th>DB Status</th>
            </tr>
          </thead>
          <tbody>
            ${this.uploadHistory.length === 0 ? html`
              <tr><td colspan="6" style="text-align: center; color: #8a99ad;">No threat uploads recorded yet.</td></tr>
            ` : this.uploadHistory.map(u => html`
              <tr>
                <td>#${u.id}</td>
                <td style="font-weight: 600; color: #00e5ff;">${u.filename}</td>
                <td><span class="status-badge status-success">${u.file_type}</span></td>
                <td>${u.record_count}</td>
                <td>${u.uploaded_at}</td>
                <td>
                  <span class="status-badge ${u.status === 'success' ? 'status-success' : 'status-failed'}">
                    ${u.status}
                  </span>
                </td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>
    `;
  }
}

customElements.define('upload-screen', UploadScreen);
