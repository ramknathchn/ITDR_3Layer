import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { injectAttackSimulation } from '../services/api.js';

@customElement('simulator-screen')
export class SimulatorScreen extends LitElement {
  static styles = css`
    :host { display: block; color: #f0f4f8; }
    .header { margin-bottom: 24px; }
    .sim-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
    .sim-card {
      background: rgba(13, 17, 26, 0.85);
      border: 1px solid #1e2638;
      border-radius: 12px;
      padding: 24px;
      transition: all 0.25s ease;
    }
    .sim-card:hover {
      border-color: #ff3366;
      box-shadow: 0 0 20px rgba(255, 51, 102, 0.2);
    }
    .sim-title { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .sim-desc { color: #8a99ad; font-size: 13px; margin-bottom: 20px; min-height: 40px; }
    .btn-sim {
      width: 100%;
      padding: 10px;
      background: linear-gradient(135deg, #ff3366 0%, #cc0033 100%);
      color: #fff;
      border: none;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
    }
  `;

  @state() statusMsg = '';

  async runScenario(scenario: string) {
    try {
      const res = await injectAttackSimulation(scenario);
      this.statusMsg = `Injected Attack Scenario [${res.scenario}] targeting ${res.target_identity}. Event ID: ${res.event_id}`;
    } catch (e: any) {
      this.statusMsg = `Simulation error: ${e.message}`;
    }
  }

  render() {
    return html`
      <div class="header">
        <h1 style="font-size: 24px; color: #fff;">Attack Scenario Telemetry Simulator</h1>
        <p style="color: #8a99ad;">Inject live cyber attack vectors into SQL Server tables to evaluate UEBA detection rules and automated response playbooks.</p>
      </div>

      ${this.statusMsg ? html`
        <div style="padding: 14px; background: rgba(255,51,102,0.15); border: 1px solid #ff3366; color: #ff3366; border-radius: 8px; margin-bottom: 24px; font-weight: 600;">
          ⚡ ${this.statusMsg}
        </div>
      ` : ''}

      <div class="sim-grid">
        <div class="sim-card">
          <div class="sim-title">💥 Brute Force & Spray</div>
          <div class="sim-desc">Injects 20 rapid failed logon attempts from a blacklisted Russian IP targeting john.smith@scb.com.</div>
          <button class="btn-sim" @click=${() => this.runScenario('brute_force')}>Launch Brute Force Scenario</button>
        </div>

        <div class="sim-card">
          <div class="sim-title">✈️ Impossible Travel</div>
          <div class="sim-desc">Simulates a login in Singapore followed 5 minutes later by a login from London, UK.</div>
          <button class="btn-sim" @click=${() => this.runScenario('impossible_travel')}>Launch Impossible Travel</button>
        </div>

        <div class="sim-card">
          <div class="sim-title">🔑 Privilege Escalation</div>
          <div class="sim-desc">Injects unauthorized Domain Admin role additions for service_account_ad@scb.com.</div>
          <button class="btn-sim" @click=${() => this.runScenario('privilege_escalation')}>Launch Privilege Escalation</button>
        </div>

        <div class="sim-card">
          <div class="sim-title">📲 MFA Push Fatigue</div>
          <div class="sim-desc">Fires 15 consecutive MFA push notifications in 2 minutes to induce user prompt fatigue.</div>
          <button class="btn-sim" @click=${() => this.runScenario('mfa_fatigue')}>Launch MFA Push Fatigue</button>
        </div>
      </div>
    `;
  }
}
