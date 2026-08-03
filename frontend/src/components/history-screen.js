import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchDatabaseStats, fetchTableData } from '../services/api.js';

export class HistoryScreen extends LitElement {
  static properties = {
    selectedSource: { type: Object },
    tableRows:      { type: Array },
    tableCounts:    { type: Object },
    loadingDetails: { type: Boolean }
  };

  static styles = css`
    :host { display: block; color: var(--text-primary); }
    .header { margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; }
    .title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .subtitle { color: var(--text-muted); font-size: 12px; margin-top: 2px; }

    .layout-grid { display: grid; grid-template-columns: 320px 1fr; gap: 20px; align-items: start; }
    @media (max-width: 900px) {
      .layout-grid { grid-template-columns: 1fr; }
    }

    .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    .card-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }

    .source-list { display: flex; flex-direction: column; gap: 8px; max-height: 520px; overflow-y: auto; padding-right: 4px; }
    
    .source-item { 
      display: flex; 
      align-items: center; 
      justify-content: space-between;
      gap: 12px; 
      padding: 10px 12px; 
      border-radius: 6px; 
      border: 1px solid var(--border-color); 
      background: var(--bg-input); 
      cursor: pointer; 
      transition: all 0.2s; 
    }
    .source-item:hover { border-color: var(--border-accent); background: var(--bg-card-hover); }
    .source-item.active { border-color: var(--text-accent); background: var(--bg-card-hover); box-shadow: inset 0 0 8px rgba(0,255,255,0.08); }

    .source-meta { display: flex; flex-direction: column; gap: 2px; }
    .source-name { font-size: 12px; font-weight: 700; color: var(--text-primary); }
    .source-table { font-family: monospace; font-size: 10px; color: var(--text-muted); }
    
    .source-badge { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 800; color: var(--text-accent); background: rgba(0,255,255,0.08); padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(0,255,255,0.15); }

    .table-container { overflow-x: auto; max-height: 500px; border: 1px solid var(--border-color); border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 10px 12px; color: #ffffff; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--border-color); background: var(--bg-sidebar); white-space: nowrap; }
    td { padding: 10px 12px; border-bottom: 1px solid var(--border-color); font-size: 12px; color: var(--text-primary); white-space: nowrap; }

    .loader { font-size: 13px; color: var(--text-muted); padding: 40px; text-align: center; }
    .empty-prompt { font-size: 13px; color: var(--text-muted); padding: 50px; text-align: center; border: 1px dashed var(--border-color); border-radius: 8px; background: var(--bg-input); }
  `;

  // Explicit mappings for the 13 Scoped Sources to their corresponding SQL database tables
  static SOURCES_MAPPING = [
    { name: "HashiCorp Vault",        table: "vault_audit_logs",             icon: "fa-key",         desc: "Access token creations and secrets read audit log" },
    { name: "BeyondTrust",            table: "beyondtrust_session_logs",     icon: "fa-shield-halved", desc: "PAM administrator session logins and proxy events" },
    { name: "Data Lake (Databricks)",  table: "databricks_audit_logs",        icon: "fa-database",    desc: "Workspace access and cloud metastore activity logs" },
    { name: "Elasticsearch",          table: "elasticsearch_audit_logs",     icon: "fa-search",      desc: "SIEM log integrations and search policy deletions" },
    { name: "AI Vector Database",     table: "vector_search_logs",           icon: "fa-brain",       desc: "Vector schema queries and LLM agent write denials" },
    { name: "Defender for Identity",   table: "mdi_security_alerts",          icon: "fa-user-shield", desc: "Microsoft MDI DCSync and Pass-the-Hash security alerts" },
    { name: "Entra ID Protection",     table: "entra_risk_detections",        icon: "fa-triangle-exclamation", desc: "Anomalous IP and impossible travel identity risks" },
    { name: "Wiz.io",                 table: "wiz_vulnerability_issues",     icon: "fa-cloud-meatball", desc: "Exposed VM workloads and overprivileged cloud role checks" },
    { name: "SentinelOne",            table: "sentinelone_threat_activities",icon: "fa-shield",      desc: "EDR endpoint agent reverse shell blocks and activity alerts" },
    { name: "Active Directory (AD)",  table: "ad_events",                    icon: "fa-network-wired", desc: "On-Prem active directory logins and security events" },
    { name: "Entra ID (Azure AD)",    table: "entra_signin_logs",            icon: "fa-windows",     desc: "Cloud Microsoft Entra sign-in audit logs and tokens" },
    { name: "AWS Cloud",              table: "aws_cloudtrail_logs",          icon: "fa-aws",         desc: "AWS CloudTrail infrastructure IAM and S3 actions" },
    { name: "Azure Platform",         table: "azure_activity_logs",          icon: "fa-microsoft",   desc: "Azure subscription RBAC operations and VM deployments" }
  ];

  constructor() {
    super();
    this.selectedSource = null;
    this.tableRows = [];
    this.tableCounts = {};
    this.loadingDetails = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadStats();
  }

  async loadStats() {
    try {
      const stats = await fetchDatabaseStats();
      this.tableCounts = stats.table_counts || {};
    } catch (e) {
      console.error("Failed to load table counts:", e);
    }
  }

  async selectSource(src) {
    this.selectedSource = src;
    this.loadingDetails = true;
    try {
      const data = await fetchTableData(src.table);
      this.tableRows = Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(`Failed to load data for table ${src.table}:`, e);
      this.tableRows = [];
    } finally {
      this.loadingDetails = false;
    }
  }

  render() {
    return html`
      <!-- PAGE HEADER -->
      <div class="header">
        <h1 class="title"><i class="fa-solid fa-database" style="color: var(--text-accent); margin-right: 8px;"></i> Scoped Systems Log Registry</h1>
        <p class="subtitle">Select any of the 13 scoped security components to view its loaded database telemetry records.</p>
      </div>

      <div class="layout-grid">
        <!-- LEFT: 13 SYSTEMS LIST -->
        <div class="card">
          <div class="card-title">
            <span><i class="fa-solid fa-server" style="color: var(--text-accent); margin-right: 6px;"></i> 13 Scoped Systems</span>
            <button class="btn-detail" @click=${this.loadStats} style="font-size:11px; padding: 4px 8px; background:var(--bg-input); border: 1px solid var(--border-color); color:var(--text-primary); cursor:pointer; border-radius:4px;">
              <i class="fa-solid fa-arrows-rotate"></i> Refresh
            </button>
          </div>

          <div class="source-list">
            ${HistoryScreen.SOURCES_MAPPING.map(src => {
              const active = this.selectedSource && this.selectedSource.table === src.table;
              const count = this.tableCounts[src.table] || 0;
              return html`
                <div class="source-item ${active ? 'active' : ''}" @click=${() => this.selectSource(src)}>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <i class="fa-solid ${src.icon}" style="font-size: 15px; color: ${active ? 'var(--text-accent)' : 'var(--text-muted)'};"></i>
                    <div class="source-meta">
                      <span class="source-name">${src.name}</span>
                      <span class="source-table">[${src.table}]</span>
                    </div>
                  </div>
                  <span class="source-badge">${count} logs</span>
                </div>
              `;
            })}
          </div>
        </div>

        <!-- RIGHT: RECORDS VIEWER -->
        <div class="card">
          <div class="card-title">
            <span><i class="fa-solid fa-table" style="color: var(--text-accent); margin-right: 6px;"></i> SQL Table Data Viewer</span>
            ${this.selectedSource ? html`<span style="font-family:monospace; font-size:11.5px; color:var(--text-accent); font-weight:700;">${this.selectedSource.name}</span>` : ''}
          </div>

          <div class="table-container">
            ${this.loadingDetails ? html`<div class="loader">Querying table data from SQL Server...</div>` : ''}
            
            ${!this.selectedSource && !this.loadingDetails ? html`
              <div class="empty-prompt">Select one of the 13 scoped data sources on the left to browse its SQL table contents.</div>
            ` : ''}

            ${this.selectedSource && !this.loadingDetails && this.tableRows.length === 0 ? html`
              <div class="empty-prompt" style="color: var(--color-danger, #ef4444); border-color: var(--color-danger, #ef4444);">
                No log records have been loaded yet for [${this.selectedSource.name}].
              </div>
            ` : ''}

            ${this.selectedSource && !this.loadingDetails && this.tableRows.length > 0 ? html`
              <table>
                <thead>
                  <tr>
                    ${Object.keys(this.tableRows[0]).map(key => html`<th>${key}</th>`)}
                  </tr>
                </thead>
                <tbody>
                  ${this.tableRows.map(row => html`
                    <tr>
                      ${Object.values(row).map(val => html`
                        <td>${val === null || val === undefined ? 'NULL' : String(val)}</td>
                      `)}
                    </tr>
                  `)}
                </tbody>
              </table>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('history-screen', HistoryScreen);
