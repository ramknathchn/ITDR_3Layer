import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchIdentitySummary, fetchDatabaseStats, fetchBulletins } from '../services/api.js';

export class DashboardScreen extends LitElement {
  static properties = {
    summary:      { type: Object },
    tableCounts:  { type: Object },
    bulletins:    { type: Array },
    collapsed:    { type: Object },   // tracks which tree phases are collapsed
    mvp1Mode:     { type: Boolean }
  };

  /* ─────────────────────────── STYLES ─────────────────────────── */
  static styles = css`
    :host { display: block; color: var(--text-primary); }

    /* Header */
    .header { margin-bottom: 18px; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .subtitle { color: var(--text-muted); font-size: 12px; margin-top: 2px; }

    /* KPI row */
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 18px; }
    .kpi-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; }
    .kpi-num   { font-size: 26px; font-weight: 800; color: var(--text-primary); }

    /* Chart / quick-action grid */
    .grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; align-items: start; margin-bottom: 18px; }
    .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .card-title { font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }

    .progress-bar  { height: 8px; background: var(--bg-main); border-radius: 4px; overflow: hidden; margin-top: 4px; margin-bottom: 10px; }
    .progress-fill { height: 100%; transition: width 0.4s ease; }

    .btn { padding: 7px 13px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-accent); background: var(--bg-input); color: var(--text-accent); display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s; }
    .btn:hover { background: var(--text-accent); color: var(--bg-main); }

    /* ── PARALLEL TREE CONTAINER ── */
    .tree-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 10px;
    }

    /* Attack pane — red top border */
    .tree-pane-attack {
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-top: 4px solid #ef4444;
      border-radius: 8px;
      padding: 16px;
    }
    /* Defend pane — green top border */
    .tree-pane-defend {
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-top: 4px solid #10b981;
      border-radius: 8px;
      padding: 16px;
    }

    /* ── TREE CONNECTORS ── */
    .tree-branch-list {
      list-style: none;
      padding-left: 20px;
      position: relative;
      margin: 6px 0 0 0;
    }
    .tree-branch-list::before {
      content: "";
      position: absolute;
      top: 0; bottom: 0;
      left: 9px;
      border-left: 2px dashed rgba(0,255,255,0.2);
    }
    .tree-item { margin: 8px 0; position: relative; }
    .tree-item::before {
      content: "";
      position: absolute;
      top: 18px; left: -11px;
      width: 12px; height: 2px;
      border-top: 2px dashed rgba(0,255,255,0.2);
    }

    /* ── PHASE HEADER (clickable) ── */
    .phase-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 13px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      user-select: none;
    }
    .phase-header:hover { border-color: var(--border-accent); background: var(--bg-card-hover); }
    .phase-title { font-size: 12.5px; font-weight: 700; color: var(--text-primary); }
    .phase-chevron { font-size: 10px; color: var(--text-muted); transition: transform 0.25s ease; }
    .phase-chevron.open { transform: rotate(180deg); }

    /* ── TECHNIQUE / COUNTERMEASURE CARD ── */
    .tech-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 10px 12px;
      transition: border-color 0.2s, background 0.2s;
    }
    .tech-card:hover { border-color: var(--border-accent); background: var(--bg-card-hover); }
    .tech-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 5px;
    }
    .tech-name { font-size: 12px; font-weight: 600; color: var(--text-primary); line-height: 1.35; }
    .tech-desc { font-size: 11px; color: var(--text-muted); line-height: 1.4; margin-bottom: 6px; }
    .tech-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }

    /* ── CODE CHIP ── */
    code {
      font-family: monospace;
      color: var(--text-accent);
      font-weight: 700;
      background: rgba(0,255,255,0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      white-space: nowrap;
    }

    /* ── RISK PILLS ── */
    .pill { padding: 1px 7px; border-radius: 10px; font-size: 10px; font-weight: 700; white-space: nowrap; border: 1px solid; }
    .pill-critical { background: rgba(239,68,68,0.15); color: var(--color-danger,#ef4444); border-color: var(--color-danger,#ef4444); }
    .pill-high     { background: rgba(245,158,11,0.15); color: orange; border-color: orange; }
    .pill-medium   { background: rgba(0,229,255,0.12); color: var(--text-accent); border-color: var(--text-accent); }
    .pill-actor    { background: rgba(148,163,184,0.12); color: var(--text-muted); border-color: var(--border-color); }
    .pill-platform { background: rgba(99,102,241,0.12); color: #818cf8; border-color: #818cf8; }

    /* ── D3FEND STATUS BADGES ── */
    .badge-pass    { background: rgba(16,185,129,0.18); color: var(--color-success,#10b981); border: 1px solid var(--color-success,#10b981); padding: 1px 7px; border-radius: 10px; font-size: 10px; font-weight: 700; white-space: nowrap; }
    .badge-gap     { background: rgba(239,68,68,0.18); color: var(--color-danger,#ef4444); border: 1px solid var(--color-danger,#ef4444); padding: 1px 7px; border-radius: 10px; font-size: 10px; font-weight: 700; white-space: nowrap; }
    .badge-inactive{ background: rgba(148,163,184,0.12); color: var(--text-muted); border: 1px solid var(--border-color); padding: 1px 7px; border-radius: 10px; font-size: 10px; font-weight: 700; }
    .coverage-bar  { height: 4px; border-radius: 2px; margin-top: 6px; background: var(--bg-main); overflow: hidden; }
    .coverage-fill { height: 100%; border-radius: 2px; transition: width 0.4s ease; }

    /* Prompt banner */
    .prompt-banner { background: rgba(0,255,255,0.04); border: 1px dashed rgba(0,255,255,0.25); border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; margin-top: 16px; }
  `;

  /* ─────────────────────────── DATA ─────────────────────────── */

  // 5-phase MITRE ATT&CK kill-chain with full technique detail
  static ATTACK_PHASES = [
    {
      id: 'p1', label: '⚔️ Phase 1 — Reconnaissance & Initial Access',
      techniques: [
        { id: 'T1589.001', name: 'Credentials from Breach Databases', risk: 'HIGH',   actor: 'APT29', platform: 'Cloud/Web', desc: 'Adversary harvests leaked enterprise email + password pairs from public breach corpora and credential-stuffing lists.' },
        { id: 'T1566.002', name: 'Spear Phishing Link via OAuth Token', risk: 'CRITICAL', actor: 'APT29', platform: 'M365/Entra', desc: 'Targeted phishing email embeds malicious OAuth consent link, hijacking access tokens without capturing the password.' },
        { id: 'T1078.004', name: 'Valid Cloud Account Takeover',        risk: 'CRITICAL', actor: 'APT29', platform: 'AWS/Azure', desc: 'Stolen cloud credentials used to authenticate directly to tenant console, bypassing on-prem controls entirely.' },
        { id: 'T1556.006', name: 'MFA Push Fatigue & Token Reuse',      risk: 'HIGH',   actor: 'Scattered Spider', platform: 'Entra ID', desc: 'Repeated push notification bombing forces the target to accidentally approve. Session token then cloned across attacker devices.' }
      ]
    },
    {
      id: 'p2', label: '💻 Phase 2 — Execution & Privilege Escalation',
      techniques: [
        { id: 'T1059.001', name: 'PowerShell Scripted Command Execution', risk: 'HIGH',   actor: 'APT29', platform: 'Windows', desc: 'Obfuscated PowerShell payloads decode and run in-memory, evading signature-based AV and harvesting LSASS memory.' },
        { id: 'T1548.002', name: 'Bypass UAC via Token Manipulation',      risk: 'HIGH',   actor: 'APT41', platform: 'Windows', desc: 'Auto-elevation abuse via COM object hijacking to spawn a high-integrity process without UAC dialog.' },
        { id: 'T1078.002', name: 'Domain Admin Account Privilege Abuse',   risk: 'CRITICAL', actor: 'APT29', platform: 'Active Directory', desc: 'Compromised Domain Admin credentials leverage AD delegated rights to deploy payloads to all domain-joined hosts.' }
      ]
    },
    {
      id: 'p3', label: '🔒 Phase 3 — Persistence & Defense Evasion',
      techniques: [
        { id: 'T1053.005', name: 'Scheduled Task Persistence Creation',   risk: 'HIGH',   actor: 'APT41', platform: 'Windows', desc: 'Malicious task registered under SYSTEM context runs at logon, executing the C2 beacon on every system boot.' },
        { id: 'T1484.001', name: 'Group Policy Object Modification',       risk: 'CRITICAL', actor: 'APT29', platform: 'Active Directory', desc: 'Attacker modifies existing GPO linked to OU containing privileged hosts to deploy backdoors org-wide.' },
        { id: 'T1562.001', name: 'Disable Security Tools & EDR Telemetry', risk: 'CRITICAL', actor: 'Sandworm', platform: 'Windows/Linux', desc: 'BYOVD exploit loads vulnerable driver to terminate EDR sensor processes and blind SIEM data pipeline.' }
      ]
    },
    {
      id: 'p4', label: '🗝️ Phase 4 — Credential Access & Lateral Movement',
      techniques: [
        { id: 'T1003.001', name: 'LSASS Memory Credential Dumping',      risk: 'CRITICAL', actor: 'APT29', platform: 'Windows', desc: 'Mimikatz / ProcDump used to extract NTLM hashes and Kerberos tickets from LSASS process memory on Domain Controllers.' },
        { id: 'T1550.002', name: 'Pass-the-Hash Lateral Movement',        risk: 'CRITICAL', actor: 'APT29', platform: 'Windows/AD', desc: 'Extracted NTLM hash replayed without cracking to authenticate across segments; escalates to all domain hosts within minutes.' },
        { id: 'T1021.002', name: 'SMB / Windows Admin Share Traversal',   risk: 'HIGH',   actor: 'APT41', platform: 'Windows', desc: 'Adversary uses legitimate admin shares (C$, ADMIN$) to copy and execute payloads on adjacent hosts without additional exploits.' }
      ]
    },
    {
      id: 'p5', label: '📤 Phase 5 — Exfiltration & Impact',
      techniques: [
        { id: 'T1537',   name: 'Transfer Data to Cloud Account',          risk: 'CRITICAL', actor: 'APT29', platform: 'AWS/GCP', desc: 'Database dumps synced to attacker-controlled S3 bucket using legitimate cloud CLI tools, blending with normal egress traffic.' },
        { id: 'T1486',   name: 'Data Encryption for Ransom (Ransomware)', risk: 'CRITICAL', actor: 'LockBit', platform: 'Windows/Linux', desc: 'AES-256 file encryption deployed across NAS shares and backup volumes simultaneously; ransom note dropped in every directory.' },
        { id: 'T1489',   name: 'Service Stop & Business Disruption',      risk: 'HIGH',   actor: 'Sandworm', platform: 'Windows/Linux', desc: 'Critical services (SQL Server, AD DS, backup agents) forcibly stopped to maximise operational downtime and ransom leverage.' }
      ]
    }
  ];

  // 5-pillar D3FEND defense with coverage details
  static DEFEND_PILLARS = [
    {
      id: 'd1', label: '🛡️ Pillar 1 — Identity Hardening & MFA',
      controls: [
        { id: 'D3-MFA',  name: 'Multi-Factor Authentication Enforcement', status: 'SECURED',    coverage: 95, platform: 'Entra ID / AWS IAM', detail: 'FIDO2 hardware keys enforced for all privileged accounts; TOTP enforced for standard users.' },
        { id: 'D3-OTP',  name: 'One-Time Password Token Management',      status: 'SECURED',    coverage: 88, platform: 'ForgeRock / RSA', detail: 'TOTP seed rotation enforced every 90 days; hardware token inventory fully audited.' },
        { id: 'D3-AL',   name: 'Authentication Event Audit Logging',      status: 'ACTIVE GAP', coverage: 32, platform: 'SIEM / Splunk', detail: 'Cloud SSO logs not forwarded to centralised SIEM. Auth failures from Entra ID missing from correlation rules.' }
      ]
    },
    {
      id: 'd2', label: '🔑 Pillar 2 — Credential & Privileged Access',
      controls: [
        { id: 'D3-CH',   name: 'Credential Hardening via Password Vault',  status: 'SECURED',    coverage: 90, platform: 'CyberArk / Vault', detail: 'Service account passwords vaulted and auto-rotated every 30 days. Break-glass accounts sealed.' },
        { id: 'D3-PAM',  name: 'Privileged Access Management Controls',    status: 'ACTIVE GAP', coverage: 45, platform: 'Active Directory', detail: 'PAM solution covers only 60% of Tier-0 accounts. Cloud IAM roles not yet onboarded to vaulting.' },
        { id: 'D3-JUAC', name: 'Just-in-Time Admin Account Controls',      status: 'ACTIVE GAP', coverage: 20, platform: 'Azure PIM / AD', detail: 'JIT elevation only implemented for M365 global admin. On-prem DA accounts remain permanently active.' }
      ]
    },
    {
      id: 'd3', label: '⚙️ Pillar 3 — Process & Execution Monitoring',
      controls: [
        { id: 'D3-PLA',  name: 'Process Lineage Analysis',                 status: 'SECURED',    coverage: 82, platform: 'CrowdStrike / EDR', detail: 'Parent-child process trees monitored and alerted; wscript/cscript spawning Office apps triggers immediate alert.' },
        { id: 'D3-PSL',  name: 'PowerShell Transcription & Block Logging', status: 'SECURED',    coverage: 91, platform: 'Windows GPO / WEF', detail: 'Module, Script Block, and Transcription logging enabled via GPO on all domain controllers and jump servers.' },
        { id: 'D3-EI',   name: 'Endpoint Isolation Containment Policy',    status: 'ACTIVE GAP', coverage: 55, platform: 'CrowdStrike / MDM', detail: 'Automated containment playbook deployed but requires manual SOC approval — mean-time-to-contain is 47 minutes.' }
      ]
    },
    {
      id: 'd4', label: '🌐 Pillar 4 — Network & Lateral Movement Detection',
      controls: [
        { id: 'D3-NTF',  name: 'Network Traffic Filtering & Micro-segmentation', status: 'SECURED',    coverage: 78, platform: 'Palo Alto / Zscaler', detail: 'East-west traffic between server tiers filtered via Zscaler ZTNA; zero-trust micro-segments applied to Crown Jewels.' },
        { id: 'D3-PCSM', name: 'Protocol Connection Segment Monitoring',         status: 'ACTIVE GAP', coverage: 40, platform: 'SIEM / NDR', detail: 'SMB lateral movement detection rules in place but uncovered on cloud workloads and VDI infrastructure segments.' },
        { id: 'D3-UBA',  name: 'User & Entity Behavior Analytics (UEBA)',        status: 'SECURED',    coverage: 86, platform: 'ITDR Engine / SQL', detail: 'Baseline deviation alerts fire within 120s. Impossible travel, MFA fatigue, and dormant account rules active.' }
      ]
    },
    {
      id: 'd5', label: '💾 Pillar 5 — Data Protection & Exfiltration Prevention',
      controls: [
        { id: 'D3-DLP',  name: 'Data Loss Prevention Policy Enforcement',  status: 'ACTIVE GAP', coverage: 38, platform: 'Purview / CASB', detail: 'DLP policies cover M365 email and SharePoint but not AWS S3, GCP Storage, or SaaS file-share integrations.' },
        { id: 'D3-CSA',  name: 'Cloud Storage Public Access Audit',         status: 'ACTIVE GAP', coverage: 25, platform: 'AWS Config / Defender', detail: 'S3 public-access block not enforced on staging and DR buckets. 3 buckets identified as publicly listable.' },
        { id: 'D3-DE',   name: 'Data Encryption At Rest & In Transit',      status: 'SECURED',    coverage: 94, platform: 'KMS / Azure Key Vault', detail: 'AES-256 at rest for all SQL databases; TLS 1.3 enforced for all API endpoints. Certificate lifecycle managed via Vault.' }
      ]
    }
  ];

  constructor() {
    super();
    this.summary = {};
    this.tableCounts = {};
    this.bulletins = [];
    // All phases open by default
    this.collapsed = {};
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  async loadData() {
    try {
      this.summary    = await fetchIdentitySummary();
      const stats     = await fetchDatabaseStats();
      this.tableCounts = stats.table_counts || {};
      this.bulletins  = await fetchBulletins();
    } catch (e) {
      console.error(e);
    }
  }

  togglePhase(id) {
    this.collapsed = { ...this.collapsed, [id]: !this.collapsed[id] };
  }

  /* ─────────────────────────── RENDER HELPERS ─────────────────────────── */

  _riskPill(risk) {
    const cls = risk === 'CRITICAL' ? 'pill-critical' : risk === 'HIGH' ? 'pill-high' : 'pill-medium';
    return html`<span class="pill ${cls}">${risk}</span>`;
  }

  _attackPhase(phase) {
    const open = !this.collapsed[phase.id];
    return html`
      <li class="tree-item">
        <div class="phase-header" @click=${() => this.togglePhase(phase.id)}>
          <span class="phase-title">${phase.label}</span>
          <i class="fa-solid fa-chevron-down phase-chevron ${open ? 'open' : ''}"></i>
        </div>
        ${open ? html`
          <ul class="tree-branch-list">
            ${phase.techniques.map(t => html`
              <li class="tree-item">
                <div class="tech-card">
                  <div class="tech-top">
                    <span class="tech-name"><code>${t.id}</code>${t.name}</span>
                    ${this._riskPill(t.risk)}
                  </div>
                  <div class="tech-desc">${t.desc}</div>
                  <div class="tech-meta">
                    <span class="pill pill-actor"><i class="fa-solid fa-user-secret" style="font-size:9px;margin-right:3px;"></i>${t.actor}</span>
                    <span class="pill pill-platform"><i class="fa-solid fa-layer-group" style="font-size:9px;margin-right:3px;"></i>${t.platform}</span>
                  </div>
                </div>
              </li>
            `)}
          </ul>
        ` : ''}
      </li>
    `;
  }

  _defendPillar(pillar) {
    const open = !this.collapsed[pillar.id];
    return html`
      <li class="tree-item">
        <div class="phase-header" @click=${() => this.togglePhase(pillar.id)}>
          <span class="phase-title">${pillar.label}</span>
          <i class="fa-solid fa-chevron-down phase-chevron ${open ? 'open' : ''}"></i>
        </div>
        ${open ? html`
          <ul class="tree-branch-list">
            ${pillar.controls.map(c => html`
              <li class="tree-item">
                <div class="tech-card">
                  <div class="tech-top">
                    <span class="tech-name"><code>${c.id}</code>${c.name}</span>
                    <span class="${c.status === 'SECURED' ? 'badge-pass' : 'badge-gap'}">
                      ${c.status}
                    </span>
                  </div>
                  <div class="tech-desc">${c.detail}</div>
                  <div class="tech-meta">
                    <span class="pill pill-platform"><i class="fa-solid fa-microchip" style="font-size:9px;margin-right:3px;"></i>${c.platform}</span>
                    <span style="font-size: 10px; color: var(--text-muted); margin-left: 2px;">Coverage: <strong style="color: ${c.coverage >= 75 ? 'var(--color-success,#10b981)' : c.coverage >= 50 ? 'orange' : 'var(--color-danger,#ef4444)'};">${c.coverage}%</strong></span>
                  </div>
                  <!-- Coverage bar -->
                  <div class="coverage-bar">
                    <div class="coverage-fill" style="width:${c.coverage}%; background:${c.coverage >= 75 ? 'var(--color-success,#10b981)' : c.coverage >= 50 ? 'orange' : 'var(--color-danger,#ef4444)'};"></div>
                  </div>
                </div>
              </li>
            `)}
          </ul>
        ` : ''}
      </li>
    `;
  }

  /* ─────────────────────────── MAIN RENDER ─────────────────────────── */
  render() {
    const totalThreats  = this.bulletins.length || 25;
    const criticalCount = this.bulletins.filter(b => b.impact_rating === 'CRITICAL').length || 4;
    const highCount     = this.bulletins.filter(b => b.impact_rating === 'HIGH').length    || 12;
    const mediumCount   = this.bulletins.filter(b => b.impact_rating === 'MEDIUM').length  || 9;

    return html`
      <!-- PAGE HEADER -->
      <div class="header">
        <div class="header-left">
          <i class="fa-solid fa-shield-halved" style="font-size: 24px; color: var(--text-accent);"></i>
          <div>
            <h1 class="title">Enterprise Threat Security Posture</h1>
            <p class="subtitle">Historical baseline defense compliance overview across all analysed bulletins in SQL Server DB.</p>
          </div>
        </div>
      </div>

      <!-- MVP1 MODE ALERT BANNER -->
      ${this.mvp1Mode ? html`
        <div style="background: rgba(0, 229, 255, 0.05); border: 1px dashed var(--border-color); border-radius: 8px; padding: 12px 20px; display: flex; align-items: center; gap: 12px; margin-bottom: 18px; box-shadow: 0 0 10px rgba(0,255,255,0.05);">
          <i class="fa-solid fa-circle-info" style="color: var(--text-accent); font-size: 16px;"></i>
          <span style="font-size: 12.5px; font-weight: 700; color: var(--text-accent);">🛡 MVP1 Mode Active: Live Telemetry &amp; Simulation Feeds Suspended (CTI Ingestion &amp; Mapping Active)</span>
        </div>
      ` : ''}

      <!-- KPI ROW -->
      <div class="kpi-row">
        <div class="kpi-card" style="cursor: pointer;" @click=${() => this.dispatchEvent(new CustomEvent('switch-tab', { detail: 'scenarios', bubbles: true, composed: true }))}>
          <span class="kpi-label">Ingested Scenarios</span>
          <span class="kpi-num">${totalThreats}</span>
        </div>
        <div class="kpi-card" style="cursor: pointer;" @click=${() => this.dispatchEvent(new CustomEvent('switch-tab', { detail: 'exposure', bubbles: true, composed: true }))}>
          <span class="kpi-label">Active Threat Exposure Gaps</span>
          <span class="kpi-num" style="color: var(--color-danger,#ef4444);">67</span>
        </div>
        <div class="kpi-card" style="cursor: pointer;" @click=${() => this.dispatchEvent(new CustomEvent('switch-tab', { detail: 'exposure', bubbles: true, composed: true }))}>
          <span class="kpi-label">Sighted With Coverage</span>
          <span class="kpi-num" style="color: var(--color-success,#10b981);">12</span>
        </div>
        <div class="kpi-card" style="cursor: pointer;" @click=${() => this.dispatchEvent(new CustomEvent('switch-tab', { detail: 'scenarios', bubbles: true, composed: true }))}>
          <span class="kpi-label">Average Scenarios Coverage</span>
          <span class="kpi-num" style="color: var(--text-accent);">66.0%</span>
        </div>
      </div>

      <!-- CHART + QUICK ACTIONS -->
      <div class="grid-2-1">
        <div class="card">
          <div class="card-title">
            <span><i class="fa-solid fa-chart-line" style="color: var(--text-accent); margin-right: 6px;"></i> Historical Ingested Threat Severity Breakdown</span>
          </div>
          ${[
            { label: 'CRITICAL Severity', count: criticalCount, color: 'var(--color-danger,#ef4444)' },
            { label: 'HIGH Severity',     count: highCount,     color: 'orange' },
            { label: 'MEDIUM Severity',   count: mediumCount,   color: 'var(--text-accent)' }
          ].map(s => html`
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 2px;">
                <span>${s.label}</span>
                <span style="color: ${s.color}; font-weight: 700;">${s.count} Bulletins</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${(s.count / totalThreats) * 100}%; background: ${s.color};"></div>
              </div>
            </div>
          `)}
        </div>

        <!-- QUICK ACTIONS & NEW REPORT LINKS -->
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div class="card" style="padding: 14px; border-color: rgba(16, 185, 129, 0.4);">
            <h4 style="margin: 0 0 4px 0; font-size: 13px; color: #10b981;">
              <i class="fa-solid fa-triangle-exclamation"></i> Identity Threat Exposure
            </h4>
            <p style="font-size: 11px; color: var(--text-muted); margin: 0 0 10px 0;">View 13-Tactic MITRE ATT&CK Exposure Matrix Heatmap (Sighted: 79, Covered: 12, Uncovered: 67).</p>
            <button class="btn" style="border-color: #10b981; color: #10b981;" @click=${() => this.dispatchEvent(new CustomEvent('switch-tab', { detail: 'exposure', bubbles: true, composed: true }))}>
              <i class="fa-solid fa-arrow-right"></i> Open Threat Exposure Heatmap
            </button>
          </div>

          <div class="card" style="padding: 14px; border-color: rgba(0, 229, 255, 0.4);">
            <h4 style="margin: 0 0 4px 0; font-size: 13px; color: #00e5ff;">
              <i class="fa-solid fa-layer-group"></i> Identity Threat Scenarios
            </h4>
            <p style="font-size: 11px; color: var(--text-muted); margin: 0 0 10px 0;">Inspect 55 Assessed Threat Scenarios with Detection & Mitigation Coverage progress bars.</p>
            <button class="btn" style="border-color: #00e5ff; color: #00e5ff;" @click=${() => this.dispatchEvent(new CustomEvent('switch-tab', { detail: 'scenarios', bubbles: true, composed: true }))}>
              <i class="fa-solid fa-arrow-right"></i> Open Threat Scenarios Index
            </button>
          </div>

          <div class="card" style="padding: 14px;">
            <h4 style="margin: 0 0 4px 0; font-size: 13px; color: var(--text-primary);">Ingest Threat Bulletin</h4>
            <p style="font-size: 11px; color: var(--text-muted); margin: 0 0 10px 0;">Paste raw CTI bulletins to map controls, identify gaps, and run audits.</p>
            <button class="btn" @click=${() => this.dispatchEvent(new CustomEvent('switch-tab', { detail: 'ingest', bubbles: true, composed: true }))}>
              <i class="fa-solid fa-arrow-right"></i> Open Ingestion Engine
            </button>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════
           RICH PARALLEL MULTI-LEVEL ATTACK & DEFEND TREE VIEW
           ══════════════════════════════════════════════════════ -->
      <div class="card">
        <div class="card-title">
          <span>
            <i class="fa-solid fa-sitemap" style="color: var(--text-accent); margin-right: 6px;"></i>
            Parallel Multi-Level Threat Structure (Attack vs Defend)
          </span>
          <span style="display: flex; align-items: center; gap: 8px;">
            <span class="badge-gap" style="font-size: 10px; padding: 2px 8px;">6 ACTIVE GAPS</span>
            <span class="badge-pass" style="font-size: 10px; padding: 2px 8px;">9 SECURED</span>
          </span>
        </div>

        <!-- Column labels -->
        <div class="tree-grid" style="margin-bottom: 8px; margin-top: 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.25); border-radius: 6px;">
            <h4 style="margin: 0; font-size: 12.5px; color: #ef4444; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-skull-crossbones"></i> ⚔️ ATTACK VECTOR PARALLEL TREE
            </h4>
            <span class="badge-inactive">MITRE ATT&amp;CK v14</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.25); border-radius: 6px;">
            <h4 style="margin: 0; font-size: 12.5px; color: #10b981; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-shield-halved"></i> 🛡️ DEFENSE COUNTERMEASURES PARALLEL TREE
            </h4>
            <span class="badge-pass">MITRE D3FEND</span>
          </div>
        </div>

        <div class="tree-grid">

          <!-- ──── LEFT: ATTACK TREE ──── -->
          <div class="tree-pane-attack">
            <ul class="tree-branch-list" style="padding-left: 4px;">
              ${DashboardScreen.ATTACK_PHASES.map(p => this._attackPhase(p))}
            </ul>
          </div>

          <!-- ──── RIGHT: DEFEND TREE ──── -->
          <div class="tree-pane-defend">
            <ul class="tree-branch-list" style="padding-left: 4px;">
              ${DashboardScreen.DEFEND_PILLARS.map(p => this._defendPillar(p))}
            </ul>
          </div>

        </div>
      </div>

      <!-- PROMPT BANNER -->
      <div class="prompt-banner">
        <i class="fa-solid fa-info-circle" style="color: var(--text-accent);"></i>
        <span style="font-size: 11.5px; color: var(--text-muted);">
          Click any phase or pillar header to expand / collapse its techniques.
          Paste a security bulletin on the <strong style="color: var(--text-primary);">Ingest Threat</strong> tab to perform live analysis, or select a feed entry to run compliance mapping.
        </span>
      </div>
    `;
  }
}

customElements.define('dashboard-screen', DashboardScreen);
