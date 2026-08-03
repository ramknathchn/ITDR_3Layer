import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchHealth } from '../services/api.js?v=3';

import './dashboard-screen.js?v=3';
import './reports-screen.js?v=3';
import './telemetry-screen.js?v=3';
import './alerts-screen.js?v=3';
import './ueba-screen.js?v=3';
import './graph-screen.js?v=3';
import './ingest-screen.js?v=3';
import './visual-screen.js?v=3';
import './feeds-screen.js?v=3';
import './spec-screen.js?v=3';
import './simulator-screen.js?v=3';
import './settings-modal.js?v=3';
import './history-screen.js?v=3';
import './threat-exposure-screen.js?v=3';
import './threat-scenarios-screen.js?v=3';
import './resilience-screen.js?v=6';

export class ItdrApp extends LitElement {
  static properties = {
    activeTab: { type: String },
    healthData: { type: Object },
    isSettingsOpen: { type: Boolean },
    theme: { type: String },
    selectedBulletinId: { type: String },
    mvp1Mode: { type: Boolean }
  };

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background-color: var(--bg-main, #000000);
      color: var(--text-primary, #ffffff);
      font-family: 'Inter', sans-serif;
    }
    .app-container {
      display: flex;
      min-height: 100vh;
      width: 100vw;
    }
    .app-sidebar {
      width: 260px;
      min-width: 260px;
      background-color: var(--bg-sidebar, #08090d);
      border-right: 1px solid var(--border-color, #222634);
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .sidebar-logo {
      padding: 24px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--border-color, #222634);
    }
    .logo-icon {
      font-size: 24px;
      color: var(--text-accent, #00ffff);
    }
    .logo-text h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary, #ffffff);
      margin: 0;
    }
    .logo-text span {
      font-size: 10px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted, #94a3b8);
      display: block;
      margin-top: 2px;
    }
    .sidebar-menu {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px 12px;
      flex: 1;
      overflow-y: auto;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 16px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted, #94a3b8);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }
    .tab-btn:hover {
      background-color: var(--bg-card-hover, #161822);
      color: var(--text-accent, #00ffff);
    }
    .tab-btn.active {
      background-color: var(--bg-card-hover, #161822);
      color: var(--text-accent, #00ffff);
      border-left: 3px solid var(--text-accent, #00ffff);
      box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.1);
    }
    .sidebar-status-box {
      padding: 16px 20px;
      border-top: 1px solid var(--border-color, #222634);
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: var(--bg-input, #050508);
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-dot.online { background-color: #10b981; box-shadow: 0 0 8px #10b981; }
    .status-dot.offline { background-color: #f59e0b; box-shadow: 0 0 8px #f59e0b; }

    .app-main-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      background-color: var(--bg-main, #000000);
    }
    .top-control-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 14px 28px;
      background: var(--bg-sidebar, #08090d);
      border-bottom: 1px solid var(--border-color, #222634);
    }
    .top-btn {
      background: var(--bg-card, #0d0e12);
      border: 1px solid var(--border-color, #222634);
      color: var(--text-primary, #ffffff);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .top-btn:hover {
      border-color: var(--text-accent, #00ffff);
      color: var(--text-accent, #00ffff);
      box-shadow: 0 0 12px rgba(0, 255, 255, 0.2);
    }
    .workspace-pane {
      flex: 1;
      padding: 28px;
      overflow-y: auto;
    }
  `;

  constructor() {
    super();
    this.activeTab = 'resilience';
    this.healthData = null;
    this.isSettingsOpen = false;
    this.theme = localStorage.getItem('itdr-theme') || 'dark';
    this.mvp1Mode = localStorage.getItem('itdr-mvp1-mode') === 'true';
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadHealth();
    this.applyTheme(this.theme);
  }

  async loadHealth() {
    try {
      this.healthData = await fetchHealth();
    } catch (e) {
      console.error(e);
    }
  }

  applyTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    document.body.style.backgroundColor = theme === 'dark' ? '#000000' : '#e6f5f4';
    document.body.style.color = theme === 'dark' ? '#ffffff' : '#003B5C';
    localStorage.setItem('itdr-theme', theme);
  }

  toggleTheme() {
    const nextTheme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
  }

  toggleMvp1Mode(e) {
    this.mvp1Mode = e.target.checked;
    localStorage.setItem('itdr-mvp1-mode', String(this.mvp1Mode));
    
    // Redirect active tab if it's hidden under MVP1
    if (this.mvp1Mode) {
      const forbidden = ['telemetry', 'alerts', 'ueba', 'graph', 'simulator'];
      if (forbidden.includes(this.activeTab)) {
        this.activeTab = 'dashboard';
      }
    }
  }

  handleViewThreat(e) {
    this.selectedBulletinId = e.detail.bulletinId;
    this.activeTab = 'visual';
  }

  handleSwitchTab(e) {
    if (typeof e.detail === 'string') {
      this.activeTab = e.detail;
    } else if (e.detail && e.detail.tab) {
      this.activeTab = e.detail.tab;
      if (e.detail.entryEntity) {
        this.selectedEntryEntity = e.detail.entryEntity;
      }
    }
  }

  render() {
    const sqlStatus = this.healthData?.database_layer?.sql_server?.status || 'connecting';
    const neoStatus = this.healthData?.database_layer?.neo4j_graph?.status || 'connecting';

    return html`
      <div class="app-container" data-theme=${this.theme}>
        <!-- LEFT PANEL / SIDEBAR NAVIGATION -->
        <aside class="app-sidebar">
          <div class="sidebar-logo">
            <i class="fa-solid fa-shield-halved logo-icon"></i>
            <div class="logo-text">
              <h1>ITDR Shield</h1>
              <span>Identity Threat Detection & Response</span>
            </div>
          </div>

          <!-- SIDEBAR MENU CATEGORIES MATCHING REFERENCE UI DESIGN -->
          <nav class="sidebar-menu">
            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:8px 12px 4px 12px;">IDENTITY THREAT INSIGHTS</div>
            
            <button class="tab-btn ${this.activeTab === 'resilience' ? 'active' : ''}" @click=${() => this.activeTab = 'resilience'}>
              <i class="fa-solid fa-chart-pie" style="color:#00e5ff;"></i> Identity Resilience Dashboard
            </button>
            <button class="tab-btn ${this.activeTab === 'exposure' ? 'active' : ''}" @click=${() => this.activeTab = 'exposure'}>
              <i class="fa-solid fa-triangle-exclamation" style="color:#10b981;"></i> Identity Threat Exposure
            </button>
            <button class="tab-btn ${this.activeTab === 'scenarios' ? 'active' : ''}" @click=${() => this.activeTab = 'scenarios'}>
              <i class="fa-solid fa-layer-group" style="color:#00e5ff;"></i> Identity Threat Scenarios
            </button>

            <div style="font-size:10px;font-weight:800;color:#00e5ff;text-transform:uppercase;letter-spacing:1px;padding:14px 12px 4px 12px;display:flex;align-items:center;gap:6px;">
              <i class="fa-solid fa-burst"></i> BLAST RADIUS ANALYSIS (3 ENGINES)
            </div>
            <button class="tab-btn ${this.activeTab === 'graph' ? 'active' : ''}" @click=${() => this.activeTab = 'graph'}>
              <i class="fa-solid fa-network-wired" style="color:#38bdf8;"></i> Standard Graph Blast Radius
            </button>
            <button class="tab-btn ${this.activeTab === 'rule_blast' ? 'active' : ''}" @click=${() => this.activeTab = 'rule_blast'}>
              <i class="fa-solid fa-burst" style="color:#00e5ff;"></i> 3-Layer Rule Engine Blast Radius
            </button>
            <button class="tab-btn ${this.activeTab === 'bulletin_blast' ? 'active' : ''}" @click=${() => this.activeTab = 'bulletin_blast'}>
              <i class="fa-solid fa-layer-group" style="color:#f59e0b;"></i> Threat Bulletin All-Entry Blast Radius
            </button>

            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:14px 12px 4px 12px;">IDENTITY THREAT WORKSPACE</div>

            <button class="tab-btn ${this.activeTab === 'dashboard' ? 'active' : ''}" @click=${() => this.activeTab = 'dashboard'}>
              <i class="fa-solid fa-gauge"></i> Threat Summary
            </button>
            <button class="tab-btn ${this.activeTab === 'ingest' ? 'active' : ''}" @click=${() => this.activeTab = 'ingest'}>
              <i class="fa-solid fa-file-import"></i> Add new Threats
            </button>
            <button class="tab-btn ${this.activeTab === 'feeds' ? 'active' : ''}" @click=${() => this.activeTab = 'feeds'}>
              <i class="fa-solid fa-database"></i> Threat Intelligence Feeds
            </button>
            <button class="tab-btn ${this.activeTab === 'visual' ? 'active' : ''}" @click=${() => this.activeTab = 'visual'}>
              <i class="fa-solid fa-circle-nodes"></i> Threat Modeling
            </button>
            <button class="tab-btn ${this.activeTab === 'reports' ? 'active' : ''}" @click=${() => this.activeTab = 'reports'}>
              <i class="fa-solid fa-chart-line"></i> Completed Intelligence Reports
            </button>

            ${!this.mvp1Mode ? html`
              <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:14px 12px 4px 12px;">ADVANCED TELEMETRY</div>
              <button class="tab-btn ${this.activeTab === 'telemetry' ? 'active' : ''}" @click=${() => this.activeTab = 'telemetry'}>
                <i class="fa-solid fa-fingerprint"></i> Identity Monitor
              </button>
              <button class="tab-btn ${this.activeTab === 'alerts' ? 'active' : ''}" @click=${() => this.activeTab = 'alerts'}>
                <i class="fa-solid fa-bell"></i> Identity Alerts
              </button>
              <button class="tab-btn ${this.activeTab === 'ueba' ? 'active' : ''}" @click=${() => this.activeTab = 'ueba'}>
                <i class="fa-solid fa-users"></i> Risk Profiles
              </button>
              <button class="tab-btn ${this.activeTab === 'simulator' ? 'active' : ''}" @click=${() => this.activeTab = 'simulator'}>
                <i class="fa-solid fa-bolt"></i> Attack Simulator
              </button>
            ` : ''}

            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:14px 12px 4px 12px;">SYSTEM REGISTRY</div>
            <button class="tab-btn ${this.activeTab === 'uploads' ? 'active' : ''}" @click=${() => this.activeTab = 'uploads'}>
              <i class="fa-solid fa-clock-rotate-left"></i> Ingestion History
            </button>
            <button class="tab-btn ${this.activeTab === 'spec' ? 'active' : ''}" @click=${() => this.activeTab = 'spec'}>
              <i class="fa-solid fa-code"></i> Defensive Spec
            </button>
          </nav>

          <!-- Sidebar Connection Status Footer -->
          <div class="sidebar-status-box">
            <div class="status-indicator">
              <span class="status-dot ${sqlStatus === 'connected' ? 'online' : 'offline'}"></span>
              <i class="fa-solid fa-database"></i>
              <span>SQL Server: <strong style="color: ${sqlStatus === 'connected' ? '#10b981' : '#f59e0b'};">${sqlStatus.toUpperCase()}</strong></span>
            </div>
            <div class="status-indicator">
              <span class="status-dot ${neoStatus === 'connected' ? 'online' : 'offline'}"></span>
              <i class="fa-solid fa-diagram-project"></i>
              <span>Neo4j Graph: <strong style="color: ${neoStatus === 'connected' ? '#10b981' : '#f59e0b'};">${neoStatus.toUpperCase()}</strong></span>
            </div>
          </div>
        </aside>

        <!-- MAIN WORKSPACE CONTENT -->
        <main class="app-main-content">
          <!-- TOP CONTROL BAR -->
          <div class="top-control-bar">
            <!-- MVP1 Mode Toggle Switch -->
            <div style="display:flex;align-items:center;gap:10px;margin-right:auto;">
              <span style="font-size:12.5px;font-weight:700;color:var(--text-muted, #94a3b8);">MVP1 Scope Only</span>
              <label class="switch" style="position:relative;display:inline-block;width:38px;height:20px;cursor:pointer;">
                <input type="checkbox" .checked=${this.mvp1Mode} @change=${this.toggleMvp1Mode} style="opacity:0;width:0;height:0;">
                <span class="slider" style="position:absolute;top:0;left:0;right:0;bottom:0;background-color:${this.mvp1Mode ? '#00ffff' : '#222634'};border-radius:20px;transition:.4s;box-shadow:${this.mvp1Mode ? '0 0 10px rgba(0,255,255,0.4)' : 'none'};"></span>
                <span class="slider-knob" style="position:absolute;height:14px;width:14px;left:3px;bottom:3px;background-color:#ffffff;border-radius:50%;transition:.4s;transform:${this.mvp1Mode ? 'translateX(18px)' : 'none'};"></span>
              </label>
            </div>

            <button class="top-btn" @click=${() => this.isSettingsOpen = true}>
              <i class="fa-solid fa-gear" style="color: #00ffff;"></i> Settings & Targeted DB Loader
            </button>
            <button class="top-btn" @click=${this.toggleTheme} title="Toggle Light / Dark Theme">
              <i class="fa-solid ${this.theme === 'dark' ? 'fa-sun' : 'fa-moon'}" style="color: ${this.theme === 'dark' ? '#f59e0b' : '#003B5C'};"></i>
              <span>${this.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          <!-- ACTIVE WORKSPACE PANE -->
          <div class="workspace-pane" @switch-tab=${this.handleSwitchTab} @switch-tab-with-context=${this.handleSwitchTab} @view-threat=${this.handleViewThreat}>
            ${this.activeTab === 'resilience' ? html`<resilience-screen></resilience-screen>` : ''}
            ${this.activeTab === 'exposure' ? html`<threat-exposure-screen></threat-exposure-screen>` : ''}
            ${this.activeTab === 'scenarios' ? html`<threat-scenarios-screen></threat-scenarios-screen>` : ''}
            ${this.activeTab === 'dashboard' ? html`<dashboard-screen .mvp1Mode=${this.mvp1Mode}></dashboard-screen>` : ''}
            ${this.activeTab === 'reports' ? html`<reports-screen></reports-screen>` : ''}
            ${this.activeTab === 'telemetry' ? html`<telemetry-screen></telemetry-screen>` : ''}
            ${this.activeTab === 'alerts' ? html`<alerts-screen></alerts-screen>` : ''}
            ${this.activeTab === 'ueba' ? html`<ueba-screen></ueba-screen>` : ''}
            ${this.activeTab === 'graph' ? html`<graph-screen></graph-screen>` : ''}
            ${this.activeTab === 'rule_blast' ? html`<rule-engine-blast-screen .entryEntity=${this.selectedEntryEntity || 'USER_JDOE'}></rule-engine-blast-screen>` : ''}
            ${this.activeTab === 'bulletin_blast' ? html`<threat-bulletin-blast-screen .bulletinId=${this.selectedBulletinId || 'TB-2026-LIVE'}></threat-bulletin-blast-screen>` : ''}
            ${this.activeTab === 'ingest' ? html`<ingest-screen></ingest-screen>` : ''}
            ${this.activeTab === 'visual' ? html`<visual-screen .preselectedBulletinId=${this.selectedBulletinId}></visual-screen>` : ''}
            ${this.activeTab === 'feeds' ? html`<feeds-screen></feeds-screen>` : ''}
            ${this.activeTab === 'uploads' ? html`<history-screen></history-screen>` : ''}
            ${this.activeTab === 'spec' ? html`<spec-screen></spec-screen>` : ''}
            ${this.activeTab === 'simulator' ? html`<simulator-screen></simulator-screen>` : ''}
          </div>
        </main>

        <!-- SETTINGS & TARGETED DB LOADER MODAL -->
        <settings-modal
          .open=${this.isSettingsOpen}
          @close-settings=${() => this.isSettingsOpen = false}>
        </settings-modal>
      </div>
    `;
  }
}

customElements.define('itdr-app', ItdrApp);
