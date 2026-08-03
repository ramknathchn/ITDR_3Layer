import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { fetchHealth } from '../services/api.js';

import './upload-screen.js';
import './telemetry-screen.js';
import './ueba-screen.js';
import './alerts-screen.js';
import './graph-screen.js';
import './feeds-screen.js';
import './simulator-screen.js';

@customElement('itdr-app')
export class ItdrApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #07090e;
      color: #f0f4f8;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .navbar {
      background: #0b0e16;
      border-bottom: 1px solid #1e2638;
      padding: 0 24px;
      height: 64px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #00e5ff 0%, #0077b6 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #fff;
      box-shadow: 0 0 10px rgba(0, 229, 255, 0.4);
    }
    .brand-title {
      font-weight: 700;
      font-size: 16px;
      color: #ffffff;
      letter-spacing: -0.01em;
    }
    .db-health {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .health-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(13, 17, 26, 0.9);
      border: 1px solid #1e2638;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .dot-online { background: #00cc88; box-shadow: 0 0 8px #00cc88; }
    .dot-fallback { background: #ff9900; box-shadow: 0 0 8px #ff9900; }
    
    .nav-tabs {
      background: #090c12;
      border-bottom: 1px solid #1e2638;
      padding: 0 24px;
      display: flex;
      gap: 8px;
      overflow-x: auto;
    }
    .nav-btn {
      padding: 14px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #8a99ad;
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .nav-btn:hover {
      color: #f0f4f8;
    }
    .nav-btn.active {
      color: #00e5ff;
      border-bottom-color: #00e5ff;
    }
    .content-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }
  `;

  @state() activeTab = 'upload';
  @state() healthData: any = null;

  connectedCallback() {
    super.connectedCallback();
    this.loadHealth();
  }

  async loadHealth() {
    try {
      this.healthData = await fetchHealth();
    } catch (e) {
      console.error(e);
    }
  }

  render() {
    const sqlStatus = this.healthData?.database_layer?.sql_server?.status || 'connecting';
    const neoStatus = this.healthData?.database_layer?.neo4j_graph?.status || 'connecting';

    return html`
      <!-- Top Navigation Bar -->
      <header class="navbar">
        <div class="brand">
          <div class="brand-logo">IT</div>
          <div>
            <div class="brand-title">Standard Chartered ITDR 3-Layer Platform</div>
            <div style="font-size: 11px; color: #8a99ad;">SQL Server DB & Neo4j Knowledge Graph</div>
          </div>
        </div>

        <!-- Database Health Header -->
        <div class="db-health">
          <div class="health-badge">
            <span class="dot ${sqlStatus === 'connected' ? 'dot-online' : 'dot-fallback'}"></span>
            <span>SQL Server (ITDR DB): <strong style="color: ${sqlStatus === 'connected' ? '#00cc88' : '#ff9900'};">${sqlStatus.toUpperCase()}</strong></span>
          </div>
          <div class="health-badge">
            <span class="dot ${neoStatus === 'connected' ? 'dot-online' : 'dot-fallback'}"></span>
            <span>Neo4j Graph: <strong style="color: ${neoStatus === 'connected' ? '#00cc88' : '#ff9900'};">${neoStatus.toUpperCase()}</strong></span>
          </div>
        </div>
      </header>

      <!-- View Selector Tabs -->
      <nav class="nav-tabs">
        <button class="nav-btn ${this.activeTab === 'upload' ? 'active' : ''}" @click=${() => this.activeTab = 'upload'}>
          📤 Data Upload & DB Management
        </button>
        <button class="nav-btn ${this.activeTab === 'telemetry' ? 'active' : ''}" @click=${() => this.activeTab = 'telemetry'}>
          📡 Identity Telemetry Monitor
        </button>
        <button class="nav-btn ${this.activeTab === 'ueba' ? 'active' : ''}" @click=${() => this.activeTab = 'ueba'}>
          👤 UEBA Risk Profiles
        </button>
        <button class="nav-btn ${this.activeTab === 'alerts' ? 'active' : ''}" @click=${() => this.activeTab = 'alerts'}>
          🚨 Alerts & Playbooks
        </button>
        <button class="nav-btn ${this.activeTab === 'graph' ? 'active' : ''}" @click=${() => this.activeTab = 'graph'}>
          🕸️ Neo4j Knowledge Graph
        </button>
        <button class="nav-btn ${this.activeTab === 'feeds' ? 'active' : ''}" @click=${() => this.activeTab = 'feeds'}>
          🌐 CTI Feeds
        </button>
        <button class="nav-btn ${this.activeTab === 'simulator' ? 'active' : ''}" @click=${() => this.activeTab = 'simulator'}>
          ⚡ Attack Simulator
        </button>
      </nav>

      <!-- Main Content View -->
      <main class="content-container">
        ${this.activeTab === 'upload' ? html`<upload-screen></upload-screen>` : ''}
        ${this.activeTab === 'telemetry' ? html`<telemetry-screen></telemetry-screen>` : ''}
        ${this.activeTab === 'ueba' ? html`<ueba-screen></ueba-screen>` : ''}
        ${this.activeTab === 'alerts' ? html`<alerts-screen></alerts-screen>` : ''}
        ${this.activeTab === 'graph' ? html`<graph-screen></graph-screen>` : ''}
        ${this.activeTab === 'feeds' ? html`<feeds-screen></feeds-screen>` : ''}
        ${this.activeTab === 'simulator' ? html`<simulator-screen></simulator-screen>` : ''}
      </main>
    `;
  }
}
