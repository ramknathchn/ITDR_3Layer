import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { fetchDatabaseStats, initDatabaseTables, seedDatabase, uploadJsonFile } from '../services/api.js';

@customElement('upload-screen')
export class UploadScreen extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: #f0f4f8;
      font-family: inherit;
    }
    .header-banner {
      margin-bottom: 24px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .subtitle {
      color: #8a99ad;
      font-size: 14px;
    }
    .action-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 28px;
    }
    .btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #00b4d8 0%, #0077b6 100%);
      color: #ffffff;
      border-color: #00e5ff;
      box-shadow: 0 0 12px rgba(0, 229, 255, 0.25);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #00e5ff 0%, #0099cc 100%);
      box-shadow: 0 0 18px rgba(0, 229, 255, 0.45);
    }
    .btn-secondary {
      background: rgba(30, 38, 56, 0.6);
      color: #f0f4f8;
      border-color: #1e2638;
    }
    .btn-secondary:hover {
      background: rgba(30, 38, 56, 1);
      border-color: #00e5ff;
    }
    .dropzone {
      border: 2px dashed #1e2638;
      border-radius: 12px;
      padding: 40px 20px;
      text-align: center;
      background: rgba(13, 17, 26, 0.7);
      cursor: pointer;
      transition: all 0.25s ease;
      margin-bottom: 32px;
    }
    .dropzone:hover, .dropzone.active {
      border-color: #00e5ff;
      background: rgba(0, 229, 255, 0.06);
      box-shadow: 0 0 20px rgba(0, 229, 255, 0.15);
    }
    .dropzone-icon {
      font-size: 42px;
      color: #00e5ff;
      margin-bottom: 12px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: rgba(13, 17, 26, 0.85);
      border: 1px solid #1e2638;
      border-radius: 10px;
      padding: 16px;
      transition: border-color 0.2s;
    }
    .stat-card:hover {
      border-color: #00e5ff;
    }
    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #8a99ad;
      margin-bottom: 6px;
    }
    .stat-value {
      font-size: 22px;
      font-weight: 700;
      color: #00e5ff;
    }
    .table-container {
      background: rgba(13, 17, 26, 0.85);
      border: 1px solid #1e2638;
      border-radius: 10px;
      padding: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      padding: 12px 14px;
      color: #8a99ad;
      font-size: 12px;
      text-transform: uppercase;
      border-bottom: 1px solid #1e2638;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(30, 38, 56, 0.5);
      font-size: 13px;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
    }
    .status-success { background: rgba(0, 204, 136, 0.2); color: #00cc88; border: 1px solid #00cc88; }
    .status-failed { background: rgba(255, 51, 102, 0.2); color: #ff3366; border: 1px solid #ff3366; }
    .toast {
      padding: 12px 18px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-weight: 600;
      font-size: 13px;
    }
    .toast-success { background: rgba(0, 204, 136, 0.15); border: 1px solid #00cc88; color: #00cc88; }
    .toast-error { background: rgba(255, 51, 102, 0.15); border: 1px solid #ff3366; color: #ff3366; }
  `;

  @state() tableCounts: Record<string, number> = {};
  @state() uploadHistory: any[] = [];
  @state() toastMsg = '';
  @state() toastType: 'success' | 'error' = 'success';
  @state() loading = false;
  @state() dragActive = false;

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
    } catch (e: any) {
      this.showToast('Initialization failed: ' + e.message, 'error');
    } finally {
      this.loading = false;
    }
  }

  async handleSeedDatabase() {
    this.loading = true;
    try {
      const res = await seedDatabase();
      this.showToast('Sample JSON datasets seeded into SQL Server DB & Neo4j Graph!', 'success');
      if (res.table_counts) this.tableCounts = res.table_counts;
      this.loadStats();
    } catch (e: any) {
      this.showToast('Seeding failed: ' + e.message, 'error');
    } finally {
      this.loading = false;
    }
  }

  async handleFileSelected(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      await this.uploadFile(target.files[0]);
    }
  }

  async uploadFile(file: File) {
    this.loading = true;
    try {
      const res = await uploadJsonFile(file);
      this.showToast(`Successfully uploaded ${file.name}! Ingested ${res.records_inserted} records.`, 'success');
      if (res.table_counts) this.tableCounts = res.table_counts;
      this.loadStats();
    } catch (e: any) {
      this.showToast(`Upload failed: ${e.message}`, 'error');
    } finally {
      this.loading = false;
    }
  }

  showToast(msg: string, type: 'success' | 'error') {
    this.toastMsg = msg;
    this.toastType = type;
    setTimeout(() => { this.toastMsg = ''; }, 6000);
  }

  render() {
    return html`
      <div class="header-banner">
        <h1 class="title">Data Management & JSON Ingestion Screen</h1>
        <p class="subtitle">
          Initialize SQL Server DB tables, seed default feeds, or upload custom JSON files to populate the application & Neo4j Knowledge Graph.
        </p>
      </div>

      ${this.toastMsg ? html`
        <div class="toast toast-${this.toastType}">
          ${this.toastMsg}
        </div>
      ` : ''}

      <div class="action-bar">
        <button class="btn btn-primary" @click=${this.handleInitTables} ?disabled=${this.loading}>
          ⚙️ Create / Verify SQL Server Tables
        </button>
        <button class="btn btn-secondary" @click=${this.handleSeedDatabase} ?disabled=${this.loading}>
          📦 Seed All Default JSON Feeds
        </button>
      </div>

      <!-- Drag and Drop Dropzone -->
      <div class="dropzone ${this.dragActive ? 'active' : ''}"
           @dragover=${(e: Event) => { e.preventDefault(); this.dragActive = true; }}
           @dragleave=${() => { this.dragActive = false; }}
           @drop=${(e: DragEvent) => {
             e.preventDefault();
             this.dragActive = false;
             if (e.dataTransfer?.files[0]) this.uploadFile(e.dataTransfer.files[0]);
           }}
           @click=${() => (this.shadowRoot?.querySelector('#fileInput') as HTMLInputElement)?.click()}>
        <div class="dropzone-icon">📥</div>
        <h3>Drag & Drop JSON File here or Click to Browse</h3>
        <p style="color: #8a99ad; margin-top: 6px; font-size: 13px;">
          Supports identity events, threat bulletins, identity profiles, feed entries, and bank topology JSON files.
        </p>
        <input type="file" id="fileInput" accept=".json" style="display: none;" @change=${this.handleFileSelected} />
      </div>

      <!-- SQL Server Database Table Record Counters -->
      <h2 style="margin-bottom: 16px;">SQL Server Table Records (DB: ITDR)</h2>
      <div class="stats-grid">
        ${Object.entries(this.tableCounts).map(([table, count]) => html`
          <div class="stat-card">
            <div class="stat-label">${table.replace('_', ' ')}</div>
            <div class="stat-value">${count.toLocaleString()}</div>
          </div>
        `)}
      </div>

      <!-- JSON Upload History Audit Logs -->
      <div class="table-container">
        <h3 style="margin-bottom: 16px;">Recent JSON Upload Audit History</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Filename</th>
              <th>Detected Type</th>
              <th>Records Ingested</th>
              <th>Uploaded At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${this.uploadHistory.length === 0 ? html`
              <tr><td colspan="6" style="text-align: center; color: #8a99ad;">No uploads recorded yet.</td></tr>
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
