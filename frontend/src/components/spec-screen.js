import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

export class SpecScreen extends LitElement {
  static properties = {
    toastMsg: { type: String }
  };

  static styles = css`
    :host { display: block; color: var(--text-primary); }
    .action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; }
    .bar-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: var(--text-primary); }

    .btn { padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-accent); background: var(--bg-input); color: var(--text-accent); display: inline-flex; align-items: center; gap: 6px; }
    .btn:hover { background: var(--text-accent); color: var(--bg-main); }

    pre { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; font-family: monospace; font-size: 12.5px; color: var(--text-accent); overflow-x: auto; max-height: calc(100vh - 220px); }
    .toast { padding: 10px 14px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; border-radius: 6px; font-size: 12px; margin-bottom: 14px; font-weight: 600; }
  `;

  constructor() {
    super();
    this.toastMsg = '';
  }

  handleCopy() {
    const spec = this.getSpecJson();
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    this.toastMsg = 'Defensive JSON Specification payload copied to clipboard!';
    setTimeout(() => { this.toastMsg = ''; }, 4000);
  }

  getSpecJson() {
    return {
      "type": "bundle",
      "id": "bundle--itdr-defensive-spec-2026",
      "spec_version": "2.1",
      "objects": [
        {
          "type": "course-of-action",
          "id": "course-of-action--d3-mfa",
          "name": "D3-MFA: Multi-Factor Authentication Enforcement",
          "description": "Enforce hardware-based FIDO2 MFA tokens across all cloud and domain identity authentication providers.",
          "x_d3fend_id": "D3-MFA",
          "x_mitre_attack_mapping": ["T1078.004", "T1110.003"]
        },
        {
          "type": "course-of-action",
          "id": "course-of-action--d3-powershell",
          "name": "D3-PowerShellLogging: PowerShell Transcription Logging",
          "description": "Enable Script Block Logging and Module Logging on Active Directory domain controllers.",
          "x_d3fend_id": "D3-PowerShellLogging",
          "x_mitre_attack_mapping": ["T1059.001"]
        }
      ]
    };
  }

  render() {
    return html`
      <!-- SCREEN 10: DEFENSIVE SPECIFICATION OUTPUT -->
      <div class="action-bar">
        <span class="bar-title"><i class="fa-solid fa-code" style="color: #00ffff; margin-right: 8px;"></i> Defensive JSON Specification Output</span>
        <button class="btn" @click=${this.handleCopy}>
          <i class="fa-solid fa-copy"></i> Copy JSON Payload
        </button>
      </div>

      ${this.toastMsg ? html`<div class="toast">${this.toastMsg}</div>` : ''}

      <pre><code>${JSON.stringify(this.getSpecJson(), null, 2)}</code></pre>
    `;
  }
}

customElements.define('spec-screen', SpecScreen);
