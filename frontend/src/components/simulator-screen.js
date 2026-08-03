import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { injectAttackSimulation } from '../services/api.js';

export class SimulatorScreen extends LitElement {
  static properties = {
    selectedScenario: { type: String },
    isRunning: { type: Boolean },
    statusMsg: { type: String }
  };

  static styles = css`
    :host { display: block; color: var(--text-primary); }
    .header { margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; }
    .title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .subtitle { color: var(--text-muted); font-size: 12px; margin-top: 2px; }

    .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; max-width: 650px; margin-bottom: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
    .card-title { font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }

    select { width: 100%; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px; border-radius: 6px; font-size: 13px; outline: none; margin-bottom: 16px; }

    .btn-group { display: flex; gap: 10px; }
    .btn { flex: 1; padding: 10px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1px solid var(--border-accent); background: var(--bg-input); color: var(--text-accent); display: flex; align-items: center; justify-content: center; gap: 6px; }
    .btn-danger { border-color: #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.15); }

    .active-banner { background: rgba(245, 158, 11, 0.15); border: 1px dashed #f59e0b; color: #f59e0b; padding: 10px; border-radius: 6px; text-align: center; font-size: 12px; font-weight: 700; margin-top: 14px; }
    .toast { padding: 10px 14px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; border-radius: 6px; font-size: 12px; margin-bottom: 16px; font-weight: 600; }
  `;

  constructor() {
    super();
    this.selectedScenario = 'brute_force';
    this.isRunning = false;
    this.statusMsg = '';
  }

  async handleStart() {
    this.isRunning = true;
    try {
      const res = await injectAttackSimulation(this.selectedScenario);
      this.statusMsg = `Injected attack scenario [${res.scenario}] targeting ${res.target_identity}! Event ID: ${res.event_id}`;
    } catch (e) {
      this.statusMsg = `Simulation error: ${e.message}`;
    }
  }

  handleStop() {
    this.isRunning = false;
    this.statusMsg = 'Attack scenario simulation stopped.';
  }

  render() {
    return html`
      <!-- SCREEN 11: ATTACK SCENARIO TELEMETRY SIMULATOR -->
      <div class="header">
        <h1 class="title"><i class="fa-solid fa-bolt" style="color: #00ffff; margin-right: 8px;"></i> Threat Attack Simulator</h1>
        <p class="subtitle">Inject live background cyber attack vectors into SQL Server tables to evaluate UEBA detection rules and automated response playbooks.</p>
      </div>

      ${this.statusMsg ? html`<div class="toast">${this.statusMsg}</div>` : ''}

      <div class="card">
        <div class="card-title">
          <i class="fa-solid fa-gamepad" style="color: #00ffff;"></i> Select & Launch Attack Vector Scenario
        </div>
        <p style="font-size: 11.5px; color: #94a3b8; margin-bottom: 14px;">Simulate background user authentication traffic or inject standard identity attack vectors.</p>

        <label style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 6px;">Injection Attack Scenario</label>
        <select .value=${this.selectedScenario} @change=${(e) => this.selectedScenario = e.target.value}>
          <option value="brute_force">Brute Force Password Attack (T1110)</option>
          <option value="impossible_travel">Impossible Travel Anomaly (T1078)</option>
          <option value="dormant_account">Dormant Account Re-activation (T1078.001)</option>
          <option value="mfa_bypass">Privileged MFA Push Fatigue / Bypass (T1556.006)</option>
          <option value="password_spray">Distributed Password Spraying (T1110.003)</option>
          <option value="privilege_abuse">AWS Cloud IAM Privilege Escalation (T1078.004)</option>
        </select>

        <div class="btn-group">
          <button class="btn" @click=${this.handleStart}><i class="fa-solid fa-play"></i> Start Simulation</button>
          <button class="btn btn-danger" @click=${this.handleStop} ?disabled=${!this.isRunning}><i class="fa-solid fa-stop"></i> Stop</button>
        </div>

        ${this.isRunning ? html`
          <div class="active-banner">
            <i class="fa-solid fa-triangle-exclamation"></i> ATTACK INJECTION ACTIVE
          </div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('simulator-screen', SimulatorScreen);
