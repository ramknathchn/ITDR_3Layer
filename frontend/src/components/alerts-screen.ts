import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { fetchAlerts, triageAlert, executePlaybook } from '../services/api.js';

@customElement('alerts-screen')
export class AlertsScreen extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: #f0f4f8;
    }
    .header { margin-bottom: 24px; }
    .alert-card {
      background: rgba(13, 17, 26, 0.85);
      border: 1px solid #1e2638;
      border-left: 5px solid #00e5ff;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .alert-critical { border-left-color: #ff3366; }
    .alert-high { border-left-color: #ff9900; }
    .alert-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .alert-title {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
    }
    .alert-desc {
      color: #c0cdf0;
      margin-bottom: 14px;
    }
    .btn-group {
      display: flex;
      gap: 10px;
      margin-top: 14px;
    }
    .btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .btn-resolve { background: rgba(0, 204, 136, 0.2); color: #00cc88; border-color: #00cc88; }
    .btn-playbook { background: rgba(255, 51, 102, 0.2); color: #ff3366; border-color: #ff3366; }
    .btn-playbook:hover { background: #ff3366; color: #fff; }
  `;

  @state() alerts: any[] = [];
  @state() msg = '';

  connectedCallback() {
    super.connectedCallback();
    this.loadAlerts();
  }

  async loadAlerts() {
    try {
      this.alerts = await fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  }

  async handleTriage(alertId: string, status: string) {
    try {
      await triageAlert(alertId, status);
      this.msg = `Alert ${alertId} updated to ${status}.`;
      this.loadAlerts();
    } catch (e: any) {
      this.msg = `Error: ${e.message}`;
    }
  }

  async handlePlaybook(alertId: string, actionType: string, user: string) {
    try {
      const res = await executePlaybook(alertId, actionType, user);
      this.msg = `Playbook executed: ${res.details}`;
      this.loadAlerts();
    } catch (e: any) {
      this.msg = `Playbook failed: ${e.message}`;
    }
  }

  render() {
    return html`
      <div class="header">
        <h1 style="font-size: 24px; color: #fff;">Security Alerts & Automated Playbook Response</h1>
        <p style="color: #8a99ad;">Incident triage dashboard with automated Active Directory and Entra ID containment playbooks.</p>
      </div>

      ${this.msg ? html`<div style="padding: 10px 16px; background: rgba(0,229,255,0.15); border: 1px solid #00e5ff; color: #00e5ff; border-radius: 6px; margin-bottom: 20px;">${this.msg}</div>` : ''}

      <div>
        ${this.alerts.length === 0 ? html`
          <div style="padding: 30px; text-align: center; color: #8a99ad; background: rgba(13,17,26,0.85); border-radius: 10px;">
            No active security alerts triggered. Run the Attack Simulator to inject incidents!
          </div>
        ` : this.alerts.map(a => html`
          <div class="alert-card ${a.severity === 'CRITICAL' ? 'alert-critical' : 'alert-high'}">
            <div class="alert-title-row">
              <span class="alert-title">${a.alert_type}</span>
              <span style="font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 10px; background: rgba(255,51,102,0.2); color: #ff3366;">${a.severity}</span>
            </div>

            <div class="alert-desc">${a.description}</div>
            <div style="font-size: 12px; color: #8a99ad;">
              <strong>Target Identity:</strong> <span style="color: #00e5ff;">${a.identity_user}</span> | 
              <strong>MITRE Technique:</strong> ${a.mitre_technique || 'T1110'} | 
              <strong>Status:</strong> ${a.status}
            </div>

            <div class="btn-group">
              <button class="btn btn-resolve" @click=${() => this.handleTriage(a.alert_id, 'resolved')}>
                ✓ Mark Resolved
              </button>
              <button class="btn btn-playbook" @click=${() => this.handlePlaybook(a.alert_id, 'DISABLE_AD_ACCOUNT', a.identity_user)}>
                🛡️ Disable AD Account
              </button>
              <button class="btn btn-playbook" @click=${() => this.handlePlaybook(a.alert_id, 'REVOKE_ENTRA_SESSIONS', a.identity_user)}>
                ⚡ Revoke Cloud Sessions
              </button>
            </div>
          </div>
        `)}
      </div>
    `;
  }
}
