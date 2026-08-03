import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchEvents, injectAttackSimulation, fetchFeeds } from '../services/api.js';

export class TelemetryScreen extends LitElement {
  static properties = {
    events: { type: Array },
    selectedProvider: { type: String },
    searchUser: { type: String },
    minRisk: { type: Number },
    simScenario: { type: String },
    simActive: { type: Boolean },
    toastMsg: { type: String },
    feeds: { type: Array }
  };

  static styles = css`
    :host { display: block; color: var(--text-primary); }

    /* ── PAGE HEADER ── */
    .header { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px; }
    .title { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .subtitle { font-size: 11.5px; color: var(--text-muted); margin: 2px 0 0 0; }

    /* ── KPI ROW ── */
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
    .kpi-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .kpi-lbl { font-size: 10px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; }
    .kpi-num { font-size: 22px; font-weight: 700; color: var(--text-primary); }

    /* ── LAYOUT ── */
    .grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; align-items: start; }

    /* ── CARD ── */
    .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 16px; }
    .card-title { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin: 0 0 12px 0; display: flex; align-items: center; justify-content: space-between; }

    /* ── FILTER BAR (search + provider select) ── */
    .filter-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; background: var(--bg-input); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 6px; }
    input[type="text"] { background: transparent; border: none; color: var(--text-primary); padding: 4px 0; font-size: 12px; flex: 1; outline: none; min-width: 180px; }
    input[type="text"]::placeholder { color: var(--text-muted); }
    select { background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); padding: 7px 10px; border-radius: 6px; font-size: 12px; outline: none; }

    /* ── LOG TABLE ── */
    .table-wrapper { flex: 1; max-height: 450px; overflow-y: auto; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11.5px; }
    th { padding: 9px 10px; color: var(--text-muted); font-size: 10.5px; text-transform: uppercase; border-bottom: 1px solid var(--border-color); background: var(--bg-sidebar); white-space: nowrap; }
    td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); }
    tr:hover td { background: var(--bg-card-hover); }
    .table-empty { text-align: center; color: var(--text-muted); padding: 24px; }

    /* ── STATUS BADGES ── */
    .badge-pass { background: rgba(16,185,129,0.18); color: var(--color-success,#10b981); border: 1px solid var(--color-success,#10b981); padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 700; }
    .badge-fail { background: rgba(239,68,68,0.18); color: var(--color-danger,#ef4444); border: 1px solid var(--color-danger,#ef4444); padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 700; }
    .badge-active { background: rgba(16,185,129,0.18); color: var(--color-success,#10b981); border: 1px solid var(--color-success,#10b981); padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: 700; }

    /* ── BUTTONS ── */
    .btn { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-accent); background: var(--bg-input); color: var(--text-accent); display: inline-flex; align-items: center; gap: 5px; transition: all 0.18s ease; }
    .btn:hover { background: var(--text-accent); color: var(--bg-main); }
    .btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-sm { padding: 3px 8px; font-size: 10px; }
    .btn-stop { border-color: var(--color-danger,#ef4444); color: var(--color-danger,#ef4444); background: rgba(239,68,68,0.1); }
    .btn-stop:hover { background: var(--color-danger,#ef4444); color: #fff; }
    .btn-muted { border-color: var(--border-color); color: var(--text-muted); background: var(--bg-card); }
    .btn-muted:hover { border-color: var(--border-accent); color: var(--text-accent); background: var(--bg-card); }

    /* ── SIMULATOR ── */
    .sim-running-banner { background: rgba(255,165,0,0.1); border: 1px dashed orange; border-radius: 6px; padding: 8px; text-align: center; font-size: 10px; color: orange; font-weight: 600; margin-top: 10px; }

    /* ── FEED STATUS CARDS ── */
    .feed-item { display: flex; justify-content: space-between; align-items: center; padding: 7px 10px; background: var(--bg-input); border-radius: 4px; border: 1px solid var(--border-color); font-size: 11.5px; }
    .feed-name { font-weight: 600; color: var(--text-primary); }
    .feed-url { font-size: 10px; color: var(--text-muted); margin-top: 1px; }

    /* ── TOAST ── */
    .toast { padding: 10px 14px; background: rgba(16,185,129,0.15); border: 1px solid var(--color-success,#10b981); color: var(--color-success,#10b981); border-radius: 6px; font-size: 12px; font-weight: 600; }
  `;

  constructor() {
    super();
    this.events = [];
    this.selectedProvider = 'ALL';
    this.searchUser = '';
    this.minRisk = 0;
    this.simScenario = 'brute_force';
    this.simActive = false;
    this.toastMsg = '';
    this.feeds = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  async loadData() {
    try {
      [this.events, this.feeds] = await Promise.all([
        fetchEvents({
          provider: this.selectedProvider === 'ALL' ? undefined : this.selectedProvider,
          identity_user: this.searchUser || undefined,
          min_risk: this.minRisk || undefined
        }).catch(() => []),
        fetchFeeds().catch(() => [])
      ]);
    } catch (e) {
      console.error('loadData error:', e);
    }
  }

  async handleStartSim() {
    if (!this.simScenario) return;
    this.simActive = true;
    try {
      const res = await injectAttackSimulation(this.simScenario);
      this.toastMsg = `Attack Simulation [${res.scenario}] launched against ${res.target_identity}! Event: ${res.event_id}`;
      await this.loadData();
    } catch (e) {
      this.toastMsg = 'Simulation API error – check server logs.';
    }
    setTimeout(() => { this.toastMsg = ''; }, 5000);
  }

  render() {
    const totalEvents = this.events.length;
    const openAlerts  = 2; // static fallback – replace with live API call if available
    const avgRisk     = totalEvents > 0
      ? Math.round(this.events.reduce((s, e) => s + (e.risk_score || 0), 0) / totalEvents)
      : 0;

    return html`
      <div style="display: flex; flex-direction: column; gap: 16px;">

        <!-- ── PAGE HEADER ── -->
        <div class="header">
          <i class="fa-solid fa-fingerprint" style="font-size: 24px; color: var(--text-accent);"></i>
          <div>
            <h2 class="title">Identity Telemetry Monitor &amp; Feed Ingestion</h2>
            <p class="subtitle">Real-time authentication streams, log sources (AD, Entra ID, AWS, Zscaler, ForgeRock) and telemetry simulator</p>
          </div>
        </div>

        ${this.toastMsg ? html`<div class="toast">${this.toastMsg}</div>` : ''}

        <!-- ── ITDR KPIS ── -->
        <div class="kpi-row">
          <div class="kpi-card">
            <span class="kpi-lbl">Active Profiles</span>
            <span class="kpi-num">3</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-lbl">Ingested Events</span>
            <span class="kpi-num" style="color: var(--text-accent);">${totalEvents}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-lbl">Open Security Alerts</span>
            <span class="kpi-num" style="color: var(--color-danger, #ef4444);">${openAlerts}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-lbl">System Risk Level</span>
            <span class="kpi-num" style="color: var(--color-success, #10b981);">${avgRisk}%</span>
          </div>
        </div>

        <!-- ── MAIN 2-COLUMN LAYOUT ── -->
        <div class="grid-2-1">

          <!-- LEFT: LIVE LOG STREAM TABLE -->
          <div class="card" style="padding: 16px; min-height: 400px; display: flex; flex-direction: column;">
            <h3 class="card-title">
              <span>
                <i class="fa-solid fa-tower-broadcast fa-fade" style="color: var(--text-accent);"></i>
                Live Ingested Identity Log Stream
              </span>
              <span class="badge-active">STREAM ACTIVE</span>
            </h3>

            <!-- FILTER BAR: search + provider selector -->
            <div class="filter-bar">
              <i class="fa-solid fa-magnifying-glass" style="color: var(--text-muted); font-size: 12px;"></i>
              <input type="text"
                placeholder="Search user (e.g. john.smith@scb.com)…"
                .value=${this.searchUser}
                @input=${(e) => { this.searchUser = e.target.value; this.loadData(); }} />
              <select @change=${(e) => { this.selectedProvider = e.target.value; this.loadData(); }} style="max-width: 160px;">
                <option value="ALL">All Log Sources</option>
                <option value="ACTIVE_DIRECTORY">Active Directory</option>
                <option value="ENTRA_ID">Entra ID</option>
                <option value="AWS_IAM">AWS IAM</option>
                <option value="ZSCALER">Zscaler Activity</option>
                <option value="FORGEROCK">ForgeRock</option>
              </select>
            </div>

            <div class="table-wrapper" style="flex: 1;">
              <table>
                <thead>
                  <tr>
                    <th style="width: 130px;">Timestamp</th>
                    <th>Provider</th>
                    <th>Identity</th>
                    <th>Event Type</th>
                    <th>Source IP</th>
                    <th>Geo Location</th>
                    <th style="width: 70px;">Risk Score</th>
                    <th style="width: 60px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.events.length === 0 ? html`
                    <tr><td colspan="8" class="table-empty">No identity events ingested yet. Start the simulator or check logs.</td></tr>
                  ` : this.events.map(ev => html`
                    <tr>
                      <td style="font-size: 10.5px; color: var(--text-muted);">
                        ${(ev.timestamp || '').substring(0, 19).replace('T', ' ')}
                      </td>
                      <td>
                        <span style="color: var(--text-accent); font-weight: 700; font-size: 11px;">
                          ${ev.identity_provider}
                        </span>
                      </td>
                      <td style="font-weight: 600;">${ev.identity_user}</td>
                      <td style="color: var(--text-muted);">${ev.event_type}</td>
                      <td style="font-family: monospace; font-size: 11px; color: var(--text-muted);">
                        ${ev.source_ip || ev.ip_address || '—'}
                      </td>
                      <td style="font-size: 11px; color: var(--text-muted);">
                        ${ev.geo_location || ev.location || '—'}
                      </td>
                      <td>
                        <strong style="color: ${(ev.risk_score || 0) >= 70 ? 'var(--color-danger,#ef4444)' : 'var(--color-success,#10b981)'};">
                          ${ev.risk_score || 0}
                        </strong>
                      </td>
                      <td>
                        <span class="${ev.success === 1 || ev.success === true ? 'badge-pass' : 'badge-fail'}">
                          ${ev.success === 1 || ev.success === true ? 'SUCCESS' : 'FAILURE'}
                        </span>
                      </td>
                    </tr>
                  `)}
                </tbody>
              </table>
            </div>
          </div>

          <!-- RIGHT: SIMULATOR + FEED STATUS -->
          <div style="display: flex; flex-direction: column; gap: 16px;">

            <!-- THREAT ATTACK SIMULATOR CARD -->
            <div class="card">
              <h3 class="card-title" style="margin-bottom: 12px;">
                <i class="fa-solid fa-gamepad" style="color: var(--text-accent);"></i> Threat Attack Simulator
              </h3>
              <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
                Simulate live background user authentication traffic or inject standard identity attack vectors.
              </p>

              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div>
                  <label style="font-weight: 600; font-size: 10px; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">
                    Injection Attack Scenario
                  </label>
                  <select style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-input); color: var(--text-primary); font-size: 12px; outline: none;"
                    .value=${this.simScenario}
                    @change=${(e) => this.simScenario = e.target.value}>
                    <option value="">None (Normal User Behavior Traffic)</option>
                    <option value="brute_force">Brute Force Password Attack (T1110)</option>
                    <option value="impossible_travel">Impossible Travel Anomaly (T1078)</option>
                    <option value="dormant_account">Dormant Account Re-activation (T1078.001)</option>
                    <option value="mfa_bypass">Privileged MFA Push Fatigue / Bypass (T1556.006)</option>
                    <option value="password_spray">Distributed Password Spraying (T1110.003)</option>
                    <option value="privilege_abuse">AWS Cloud IAM Privilege Escalation (T1078.004)</option>
                  </select>
                </div>

                <div style="display: flex; gap: 8px; margin-top: 4px;">
                  <button class="btn" style="flex: 1;" @click=${this.handleStartSim}>
                    <i class="fa-solid fa-play"></i> Start Simulation
                  </button>
                  <button class="btn btn-stop" style="flex: 1;" @click=${() => this.simActive = false} ?disabled=${!this.simActive}>
                    <i class="fa-solid fa-stop"></i> Stop
                  </button>
                </div>

                ${this.simActive ? html`
                  <div class="sim-running-banner">
                    <i class="fa-solid fa-triangle-exclamation fa-beat"></i> ATTACK INJECTION ACTIVE
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- EXTERNAL FEED COLLECTORS CARD -->
            <div class="card">
              <h3 class="card-title">
                <span><i class="fa-solid fa-wifi" style="color: var(--text-accent);"></i> External Feed Collectors</span>
                <button class="btn btn-muted btn-sm" @click=${this.loadData}>
                  <i class="fa-solid fa-arrows-rotate"></i> Poll Now
                </button>
              </h3>

              <div style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto;">
                ${this.feeds.length === 0
                  ? html`<div style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 12px;">No configured feeds found.</div>`
                  : this.feeds.map(f => html`
                    <div class="feed-item">
                      <div>
                        <div class="feed-name">${f.name}</div>
                        <div class="feed-url">${f.url || ''}</div>
                      </div>
                      <span class="badge-active">ACTIVE</span>
                    </div>
                  `)
                }
              </div>
            </div>

          </div><!-- end right column -->
        </div><!-- end grid -->
      </div>
    `;
  }
}

customElements.define('telemetry-screen', TelemetryScreen);
