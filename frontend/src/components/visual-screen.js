import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchBulletins, reanalyzeSingleThreat, fetchThreatDetails } from '../services/api.js';

/* ═══════════════════════════════════════════════════════════════
   ENRICHED KILL-CHAIN DATA
   ═══════════════════════════════════════════════════════════════ */
const MASTER_PHASES = [
  {
    id:'p1', label:'Phase 1', sub:'Recon, Supply Chain & Initial Access',
    icon:'fa-binoculars', color:'#ef4444',
    techniques:[
      { id:'T1195.002', name:'Software Supply Chain Compromise',  risk:'CRITICAL', actor:'TeamPCP',        platform:'npm / OIDC / CI-CD', tactic:'Initial Access', compliance:'NIST SSDF / SLSA Level 3', desc:'Attacker-controlled code hijacked CI/CD build runner mid-workflow using trusted OIDC tokens, publishing compromised package artifacts.',
        d3fend:[{id:'D3-SPP',name:'Software Provenance Verification',status:'ACTIVE GAP',cov:28,detail:'SLSA provenance verified build process, but malicious code payload executed prior to artifact signing.'},{id:'D3-CH',name:'Credential Hardening',status:'SECURED',cov:88,detail:'OIDC short-lived tokens used for registry deployment.'}] },
      { id:'T1195.001', name:'Compromise Software Dependencies', risk:'CRITICAL', actor:'TeamPCP',        platform:'npm Ecosystem',      tactic:'Initial Access', compliance:'OWASP A06:2021',           desc:'Malicious npm packages (@tanstack/*) published to public registry, infecting downstream consumers within hours.',
        d3fend:[{id:'D3-SPP',name:'Software Provenance Verification',status:'ACTIVE GAP',cov:28,detail:'Dependency lockfile integrity hash checking bypassed by upstream release.'},{id:'D3-AL',name:'Build Audit Logging',status:'ACTIVE GAP',cov:34,detail:'Package release pipeline audit logs not streamed to SIEM.'}] },
      { id:'T1566.002', name:'Spear Phishing OAuth Link',       risk:'CRITICAL', actor:'APT29',          platform:'M365/Entra', tactic:'Initial Access',     compliance:'ISO 27001 A.7.2.2', desc:'Malicious OAuth consent link in phishing email grants attacker access token without capturing the password. Token persists even after password reset.',
        d3fend:[{id:'D3-MFA',name:'MFA Enforcement',status:'SECURED',cov:95,detail:'FIDO2 hardware keys enforced for all privileged accounts.'},{id:'D3-UEM',name:'URL Phishing Detection',status:'ACTIVE GAP',cov:42,detail:'Safe Links not applied to OAuth consent URLs — consent phishing uncovered.'}] },
      { id:'T1078.004', name:'Valid Cloud Account Takeover',     risk:'CRITICAL', actor:'APT29',          platform:'AWS/Azure',  tactic:'Initial Access',     compliance:'PCI DSS 8.2',       desc:'Stolen cloud credentials used to authenticate into cloud management console, bypassing on-prem perimeter entirely.',
        d3fend:[{id:'D3-CH',name:'Credential Hardening',status:'SECURED',cov:88,detail:'Service account passwords vaulted in CyberArk, auto-rotated every 30 days.'},{id:'D3-AL',name:'Authentication Audit Logging',status:'ACTIVE GAP',cov:34,detail:'Entra ID sign-in failures not forwarded to SIEM.'}] },
      { id:'T1556.006', name:'MFA Push Fatigue & Token Reuse',   risk:'HIGH',     actor:'Scattered Spider',platform:'Entra ID',  tactic:'Initial Access',     compliance:'NIST AC-7',         desc:'Repeated MFA push bombing forces victim to accidentally approve. Session token cloned to attacker device and remains valid for 24+ hours.',
        d3fend:[{id:'D3-MFA',name:'MFA Enforcement',status:'SECURED',cov:95,detail:'Number matching and context shown for push notifications.'},{id:'D3-AL',name:'Auth Audit Logging',status:'ACTIVE GAP',cov:34,detail:'Push-fatigue pattern detection not implemented in SIEM.'}] }
    ]
  },
  {
    id:'p2', label:'Phase 2', sub:'Execution & Privilege Esc.',
    icon:'fa-terminal', color:'#f97316',
    techniques:[
      { id:'T1059.001', name:'PowerShell In-Memory Execution',   risk:'HIGH',     actor:'APT29',          platform:'Windows/AD', tactic:'Execution',          compliance:'CIS L2 / NIST SI-3',desc:'Obfuscated PowerShell decodes in-memory via AMSI bypass. Harvests LSASS credentials and establishes C2 beacon over HTTPS.',
        d3fend:[{id:'D3-PSL',name:'PowerShell Transcription Logging',status:'SECURED',cov:91,detail:'Module, Script Block, and Transcription logging enabled via GPO on all DCs.'},{id:'D3-PLA',name:'Process Lineage Analysis',status:'SECURED',cov:82,detail:'CrowdStrike detects Office spawning cmd.exe immediately.'}] },
      { id:'T1548.002', name:'UAC Bypass via Token Manipulation', risk:'HIGH',     actor:'APT41',          platform:'Windows',    tactic:'Privilege Escalation',compliance:'NIST SI-7',         desc:'Auto-elevation abuse via COM object hijacking spawns high-integrity process without UAC dialog.',
        d3fend:[{id:'D3-PLA',name:'Process Lineage Analysis',status:'SECURED',cov:82,detail:'Token integrity elevation monitored via Sysmon Event IDs 4697/4624.'},{id:'D3-EI',name:'Endpoint Isolation',status:'ACTIVE GAP',cov:55,detail:'Automated containment requires manual SOC approval — MTTR is 47 minutes.'}] },
      { id:'T1078.002', name:'Domain Admin Account Abuse',        risk:'CRITICAL', actor:'APT29',          platform:'Active Directory',tactic:'Privilege Escalation',compliance:'NIST AC-6',    desc:'Compromised Domain Admin credentials leverage AD delegated rights to deploy payloads to all domain-joined hosts simultaneously.',
        d3fend:[{id:'D3-JUAC',name:'JIT Admin Controls',status:'ACTIVE GAP',cov:20,detail:'JIT elevation only for M365 global admin. On-prem DA accounts permanently active.'},{id:'D3-PAM',name:'Privileged Access Mgmt',status:'ACTIVE GAP',cov:45,detail:'PAM vaulting covers only 60% of Tier-0 accounts.'}] }
    ]
  },
  {
    id:'p3', label:'Phase 3', sub:'Persistence & Evasion',
    icon:'fa-ghost', color:'#a855f7',
    techniques:[
      { id:'T1053.005', name:'Scheduled Task Persistence',        risk:'HIGH',     actor:'APT41',          platform:'Windows',    tactic:'Persistence',        compliance:'NIST SI-7',         desc:'Malicious scheduled task registered under SYSTEM context runs at every logon, disguised as Windows Update.',
        d3fend:[{id:'D3-PLA',name:'Process Lineage Analysis',status:'SECURED',cov:82,detail:'Task creation monitored via Sysmon Event ID 4698 forwarded to SIEM.'},{id:'D3-EI',name:'Endpoint Isolation',status:'ACTIVE GAP',cov:55,detail:'Automated containment requires manual SOC approval.'}] },
      { id:'T1484.001', name:'Group Policy Object Modification',   risk:'CRITICAL', actor:'APT29',          platform:'Active Directory',tactic:'Defense Evasion',  compliance:'ISO 27001 A.12.5',desc:'Existing GPO linked to privileged OU modified to deploy backdoors org-wide at next Group Policy refresh.',
        d3fend:[{id:'D3-AL',name:'Auth Audit Logging',status:'ACTIVE GAP',cov:34,detail:'GPO change events not correlated in SIEM for anomaly detection.'},{id:'D3-PAM',name:'Privileged Access Mgmt',status:'ACTIVE GAP',cov:45,detail:'GPO edit rights not gated by PAM approval workflow.'}] },
      { id:'T1562.001', name:'Disable EDR Sensor & Security Tools',risk:'CRITICAL', actor:'Sandworm',       platform:'Windows/Linux',tactic:'Defense Evasion',   compliance:'NIST SI-3',        desc:'BYOVD exploit loads vulnerable signed driver to terminate EDR sensor processes and blind SIEM data pipeline.',
        d3fend:[{id:'D3-EI',name:'Endpoint Isolation',status:'ACTIVE GAP',cov:55,detail:'No automatic EDR re-deployment if process killed — manual response required.'},{id:'D3-PLA',name:'Process Lineage Analysis',status:'SECURED',cov:82,detail:'Driver load events (Event ID 6) monitored — known vulnerable driver alert fires.'}] }
    ]
  },
  {
    id:'p4', label:'Phase 4', sub:'Credential & Lateral Move.',
    icon:'fa-key', color:'#eab308',
    techniques:[
      { id:'T1003.001', name:'LSASS Memory Credential Dumping',   risk:'CRITICAL', actor:'APT29',          platform:'Windows/AD', tactic:'Credential Access',  compliance:'NIST AC-17',        desc:'Mimikatz / ProcDump extract NTLM hashes and Kerberos TGTs from LSASS on Domain Controllers enabling Pass-the-Hash.',
        d3fend:[{id:'D3-CH',name:'Credential Hardening (PAM)',status:'ACTIVE GAP',cov:45,detail:'PAM vaulting covers only 60% of Tier-0 accounts.'},{id:'D3-JUAC',name:'JIT Admin Controls',status:'ACTIVE GAP',cov:20,detail:'On-prem DA accounts remain permanently active.'}] },
      { id:'T1550.002', name:'Pass-the-Hash Lateral Movement',     risk:'CRITICAL', actor:'APT29',          platform:'Windows/AD', tactic:'Lateral Movement',   compliance:'CIS L2',            desc:'Extracted NTLM hash replayed without cracking to authenticate across all domain hosts within minutes.',
        d3fend:[{id:'D3-NTF',name:'Network Traffic Filtering',status:'SECURED',cov:78,detail:'East-west traffic filtered via Zscaler ZTNA micro-segments.'},{id:'D3-PCSM',name:'Protocol Segment Monitoring',status:'ACTIVE GAP',cov:40,detail:'SMB lateral movement detection uncovered on cloud workloads.'}] },
      { id:'T1021.002', name:'SMB / Admin Share Traversal',        risk:'HIGH',     actor:'APT41',          platform:'Windows',    tactic:'Lateral Movement',   compliance:'NIST AC-17',        desc:'Legitimate admin shares (C$, ADMIN$) used to copy and execute payloads on adjacent hosts. Blends with IT admin traffic.',
        d3fend:[{id:'D3-UBA',name:'UEBA Behavioral Analytics',status:'SECURED',cov:86,detail:'Impossible lateral share access detected within 120s.'},{id:'D3-PCSM',name:'Protocol Segment Monitoring',status:'ACTIVE GAP',cov:40,detail:'VDI and cloud workload SMB traffic not monitored.'}] }
    ]
  },
  {
    id:'p5', label:'Phase 5', sub:'Exfiltration & Impact',
    icon:'fa-cloud-arrow-up', color:'#06b6d4',
    techniques:[
      { id:'T1537',   name:'Transfer Data to Cloud Account',       risk:'CRITICAL', actor:'APT29',          platform:'AWS/GCP',    tactic:'Exfiltration',       compliance:'PCI DSS 3.4',       desc:'Database dumps synced to attacker-controlled S3 bucket using legitimate AWS CLI tools. Exfil rate throttled to avoid anomaly detection.',
        d3fend:[{id:'D3-DLP',name:'Data Loss Prevention',status:'ACTIVE GAP',cov:38,detail:'DLP covers M365 but not AWS S3, GCP Storage, or SaaS file-share integrations.'},{id:'D3-CSA',name:'Cloud Storage Audit',status:'ACTIVE GAP',cov:25,detail:'3 staging S3 buckets publicly listable. Public-access block not enforced.'}] },
      { id:'T1486',   name:'Data Encryption for Ransom',           risk:'CRITICAL', actor:'LockBit',        platform:'Win/Linux',  tactic:'Impact',             compliance:'NIST RC.RP',        desc:'AES-256 file encryption deployed simultaneously across NAS shares and backup volumes. Ransom note dropped in every directory.',
        d3fend:[{id:'D3-DE',name:'Data Encryption At Rest',status:'SECURED',cov:94,detail:'AES-256 at rest for all SQL databases. Backup snapshots stored air-gapped offline.'},{id:'D3-DLP',name:'Data Loss Prevention',status:'ACTIVE GAP',cov:38,detail:'Encryption pattern detection not triggered until after file mass-write completes.'}] },
      { id:'T1489',   name:'Service Stop & Business Disruption',   risk:'HIGH',     actor:'Sandworm',       platform:'Win/Linux',  tactic:'Impact',             compliance:'NIST RC.RP',        desc:'Critical services (SQL Server, AD DS, backup agents) forcibly stopped to maximise operational downtime and ransom leverage.',
        d3fend:[{id:'D3-UBA',name:'UEBA Behavioral Analytics',status:'SECURED',cov:86,detail:'Mass service-stop pattern triggers UEBA alert within 30s.'},{id:'D3-EI',name:'Endpoint Isolation',status:'ACTIVE GAP',cov:55,detail:'Automated containment requires manual SOC approval.'}] }
    ]
  }
];

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export class VisualScreen extends LitElement {
  static properties = {
    bulletins:             { type: Array },
    selectedBulletinIdx:   { type: Number },
    selectedView:          { type: String },
    showGapsOnly:          { type: Boolean },
    showBulletinText:      { type: Boolean },
    treeCollapsed:         { type: Object },
    analyzing:             { type: Boolean },
    toastMsg:              { type: String },
    toastType:             { type: String },
    preselectedBulletinId: { type: String },
    activeThreatDetails:   { type: Object },
    selectedD3fendCard:    { type: Object }
  };

  static styles = css`
    :host { display: block; color: var(--text-primary); }
    .header   { margin-bottom:14px; border-bottom:1px solid var(--border-color); padding-bottom:14px; }
    .title    { font-family:'Outfit',sans-serif; font-size:20px; font-weight:700; color:var(--text-primary); margin:0; }
    .subtitle { color:var(--text-muted); font-size:12px; margin-top:2px; }
    .meta-banner { background:var(--bg-card); border:1px solid var(--border-accent); border-radius:10px; padding:14px 18px; display:flex; gap:20px; flex-wrap:wrap; align-items:center; margin-bottom:16px; box-shadow:0 0 14px rgba(0,255,255,0.07); }
    .meta-item { display:flex; flex-direction:column; gap:2px; }
    .meta-lbl  { font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:.5px; }
    .meta-val  { font-size:13px; font-weight:700; color:var(--text-primary); }
    .btn        { padding:7px 12px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary); display:inline-flex; align-items:center; gap:6px; transition:all .2s; }
    .btn:hover  { border-color:var(--border-accent); color:var(--text-accent); }
    .btn.active { border-color:var(--border-accent); color:var(--text-accent); background:var(--bg-card-hover); }
    .btn-xs     { padding:4px 9px; font-size:11px; }
    .btn-group  { display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
    .btn:disabled { opacity:.5; cursor:not-allowed; }
    .toast         { padding:10px 16px; border-radius:6px; font-weight:600; font-size:12px; margin-bottom:14px; }
    .toast-success { background:rgba(16,185,129,.15); border:1px solid #10b981; color:#10b981; }
    .toast-error   { background:rgba(239,68,68,.15);  border:1px solid #ef4444; color:#ef4444; }
    .spin { animation:spin 1s linear infinite; display:inline-block; }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    .card       { background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:18px; box-shadow:0 2px 10px rgba(0,0,0,.08); margin-bottom:16px; }
    .card-title { font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .filter-bar { background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:10px 16px; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
    .filter-bar label { display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; color:var(--text-primary); }
    code { font-family:monospace; color:var(--text-accent); font-weight:700; background:rgba(0,255,255,.1); padding:2px 6px; border-radius:4px; font-size:11px; white-space:nowrap; }
    .pill          { display:inline-flex; align-items:center; gap:3px; padding:2px 7px; border-radius:10px; font-size:10px; font-weight:700; white-space:nowrap; border:1px solid; }
    .pill-critical { background:rgba(239,68,68,.15);  color:var(--color-danger,#ef4444);  border-color:var(--color-danger,#ef4444); }
    .pill-high     { background:rgba(249,115,22,.15); color:#f97316;                      border-color:#f97316; }
    .pill-medium   { background:rgba(0,229,255,.12);  color:var(--text-accent);           border-color:var(--text-accent); }
    .pill-actor    { background:rgba(148,163,184,.1); color:var(--text-muted);            border-color:var(--border-color); }
    .pill-platform { background:rgba(99,102,241,.12); color:#818cf8;                      border-color:#818cf8; }
    .pill-tactic   { background:rgba(245,158,11,.1);  color:var(--color-warning,#f59e0b); border-color:var(--color-warning,#f59e0b); }
    .badge-pass { background:rgba(16,185,129,.18); color:var(--color-success,#10b981); border:1px solid var(--color-success,#10b981); padding:1px 7px; border-radius:10px; font-size:10px; font-weight:700; white-space:nowrap; }
    .badge-gap  { background:rgba(239,68,68,.18);  color:var(--color-danger,#ef4444); border:1px solid var(--color-danger,#ef4444);  padding:1px 7px; border-radius:10px; font-size:10px; font-weight:700; white-space:nowrap; }
    .cov-bar  { height:5px; border-radius:3px; background:var(--bg-main); overflow:hidden; margin-top:5px; }
    .cov-fill { height:100%; border-radius:3px; transition:width .4s ease; }
    table { width:100%; border-collapse:collapse; text-align:left; }
    th { padding:9px 12px; color:#ffffff; font-size:11px; text-transform:uppercase; border-bottom:1px solid var(--border-color); background:var(--bg-sidebar); white-space:nowrap; }
    td { padding:9px 12px; border-bottom:1px solid var(--border-color); font-size:12px; color:var(--text-primary); vertical-align:top; }
    tr:hover td { background:var(--bg-card-hover); }
    .tree-container { background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:16px; margin-bottom:16px; }
    .tree-branch-list { list-style:none; padding-left:20px; position:relative; margin:6px 0 0 0; }
    .tree-branch-list::before { content:""; position:absolute; top:0; bottom:0; left:9px; border-left:2px dashed rgba(0,255,255,.2); }
    .tree-item { margin:8px 0; position:relative; }
    .tree-item::before { content:""; position:absolute; top:16px; left:-11px; width:12px; height:2px; border-top:2px dashed rgba(0,255,255,.2); }
    .phase-hdr { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:6px; cursor:pointer; transition:all .2s; user-select:none; }
    .phase-hdr:hover { border-color:var(--border-accent); background:var(--bg-card-hover); }
    .phase-hdr-title { font-size:12.5px; font-weight:700; color:var(--text-primary); }
    .chevron { font-size:10px; color:var(--text-muted); transition:transform .25s; }
    .chevron.open { transform:rotate(180deg); }
    .tech-card { background:var(--bg-card); border:1px solid var(--border-color); border-radius:6px; padding:10px 13px; transition:border-color .2s,background .2s; }
    .tech-card:hover { border-color:var(--border-accent); background:var(--bg-card-hover); }
    .summary-card  { background:var(--bg-card); border:1px solid var(--border-color); border-left:4px solid var(--text-accent); border-radius:10px; padding:16px; margin-bottom:16px; }
    .bulletin-text { background:var(--bg-input); border:1px solid var(--border-color); border-radius:6px; padding:12px; max-height:200px; overflow-y:auto; font-size:11.5px; color:var(--text-muted); line-height:1.5; white-space:pre-wrap; }
    .gap-row   { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
    .gap-label { font-size:11.5px; color:var(--text-muted); min-width:140px; }

    /* Modal Overlay & Card Hover styles */
    .d3-countermeasure-card {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .d3-countermeasure-card:hover {
      background-color: var(--bg-card-hover) !important;
      border-color: var(--border-accent) !important;
      transform: translateY(-1.5px);
      box-shadow: 0 4px 12px rgba(0, 255, 255, 0.08);
    }
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(4, 8, 15, 0.85);
      backdrop-filter: blur(8px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-content {
      background: #0b1a2c;
      border: 1px solid var(--border-accent);
      box-shadow: 0 0 30px rgba(0, 255, 255, 0.18);
      border-radius: 12px;
      max-width: 500px;
      width: 100%;
      padding: 20px;
      position: relative;
      animation: modalFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .modal-close {
      position: absolute;
      top: 14px; right: 14px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 18px;
      transition: color 0.2s;
      outline: none;
    }
    .modal-close:hover {
      color: var(--text-primary);
    }
    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
  `;

  constructor() {
    super();
    this.bulletins = [];
    this.selectedBulletinIdx = 0;
    this.selectedView = 'flow';
    this.showGapsOnly = false;
    this.showBulletinText = true;
    this.treeCollapsed = {};
    this.preselectedBulletinId = '';
    this.analyzing = false;
    this.toastMsg  = '';
    this.toastType = 'success';
    this.activeThreatDetails = null;
    this.selectedD3fendCard = null;
  }

  connectedCallback() { super.connectedCallback(); this.loadData(); }
  async loadData() { try { this.bulletins = await fetchBulletins(); } catch(e) { console.error(e); } }

  willUpdate(changedProperties) {
    if (changedProperties.has('preselectedBulletinId') || changedProperties.has('bulletins')) {
      if (this.preselectedBulletinId && this.bulletins && this.bulletins.length > 0) {
        const idx = this.bulletins.findIndex(b => b.bulletin_id === this.preselectedBulletinId || b.id === this.preselectedBulletinId);
        if (idx !== -1 && idx !== this.selectedBulletinIdx) {
          this.selectedBulletinIdx = idx;
        }
      }
    }

    if (changedProperties.has('selectedBulletinIdx') || changedProperties.has('bulletins')) {
      this.loadActiveThreatDetails();
    }
  }

  async loadActiveThreatDetails() {
    const b = this._bulletin;
    const bulletinId = b ? (b.bulletin_id || b.id) : null;
    if (!bulletinId) return;

    try {
      const details = await fetchThreatDetails(bulletinId);
      this.activeThreatDetails = details;
    } catch (e) {
      console.error("Error loading threat details:", e);
    }
  }

  get _activePhases() {
    const b = this._bulletin;
    const spec = this.activeThreatDetails?.defensive_spec?.defensive_spec || [];
    const audits = this.activeThreatDetails?.audit_results || [];

    // Extract mapped technique IDs from defensive spec AND bulletin content/behaviors
    const mappedTechIds = new Set(
      spec
        .map(s => (s.attack_technique || '').toUpperCase())
        .filter(id => id)
    );

    // Extract techniques from observed_behaviors if present in bulletin
    if (b) {
      const behaviors = b.observed_behaviors || [];
      behaviors.forEach(bh => {
        const techs = bh.mitre_techniques || bh.mitre_attack_suggested || [];
        techs.forEach(t => mappedTechIds.add((t || '').toUpperCase()));
      });

      // Regex scan text for technique patterns (e.g. T1195.002, T1078.004)
      const text = `${b.title || ''} ${b.content || ''} ${b.summary || ''}`;
      const matches = text.match(/\bT\d{4}(?:\.\d{3})?\b/gi) || [];
      matches.forEach(m => mappedTechIds.add(m.toUpperCase()));
    }

    // Extract threat actor name dynamically
    let actorName = 'Threat Actor';
    if (b) {
      if (Array.isArray(b.threat_actors) && b.threat_actors.length > 0) {
        actorName = b.threat_actors.join(', ');
      } else if (b.actors) {
        actorName = Array.isArray(b.actors) ? b.actors.join(', ') : b.actors;
      }
    }

    // Create a mapping of countermeasure ID -> audit result safely
    const auditMap = {};
    for (const a of audits) {
      const cmId = (a.countermeasure_id || '').toUpperCase();
      if (cmId) {
        auditMap[cmId] = a;
      }
    }

    // Build the dynamic phases list by filtering MASTER_PHASES
    const dynamicPhases = [];

    for (const phase of MASTER_PHASES) {
      const filteredTechs = [];
      for (const tech of phase.techniques) {
        if (tech.id && mappedTechIds.has(tech.id.toUpperCase())) {
          // Update the D3FEND sub-nodes with the actual verification status and details from audits
          const updatedD3fend = (tech.d3fend || []).map(d => {
            const audit = d.id ? auditMap[d.id.toUpperCase()] : null;
            if (audit) {
              const statusUpper = (audit.status || '').toUpperCase();
              return {
                ...d,
                status: statusUpper === 'SECURED' || statusUpper === 'COMPLIANT' ? 'SECURED' : 'ACTIVE GAP',
                detail: audit.details || d.detail
              };
            }
            return d;
          });

          filteredTechs.push({
            ...tech,
            actor: actorName !== 'Threat Actor' ? actorName : tech.actor,
            d3fend: updatedD3fend
          });
        }
      }

      // Only include this phase if it has at least one matching technique in this report
      if (filteredTechs.length > 0) {
        dynamicPhases.push({
          ...phase,
          techniques: filteredTechs
        });
      }
    }

    // 2. Identify unlisted techniques (TTPs) present in mappedTechIds
    const matchedTechIds = new Set();
    dynamicPhases.forEach(p => (p.techniques || []).forEach(t => matchedTechIds.add((t.id || '').toUpperCase())));

    const unlistedTechIds = [...mappedTechIds].filter(id => id && !matchedTechIds.has(id.toUpperCase()));

    // 3. Auto-classify any unlisted TTP into its correct Kill-Chain Phase
    if (unlistedTechIds.length > 0) {
      unlistedTechIds.forEach(tid => {
        let targetPhaseIdx = 0; // Default Phase 1: Recon & Initial Access
        let tacticName = 'Initial Access';

        if (tid.startsWith('T1059') || tid.startsWith('T1548') || tid.startsWith('T1055') || tid.startsWith('T1203')) {
          targetPhaseIdx = 1; tacticName = 'Execution & Privilege Escalation';
        } else if (tid.startsWith('T1053') || tid.startsWith('T1547') || tid.startsWith('T1484') || tid.startsWith('T1562') || tid.startsWith('T1070')) {
          targetPhaseIdx = 2; tacticName = 'Persistence & Defense Evasion';
        } else if (tid.startsWith('T1003') || tid.startsWith('T1550') || tid.startsWith('T1021') || tid.startsWith('T1552') || tid.startsWith('T1558')) {
          targetPhaseIdx = 3; tacticName = 'Credential Access & Lateral Movement';
        } else if (tid.startsWith('T1537') || tid.startsWith('T1486') || tid.startsWith('T1489') || tid.startsWith('T1020') || tid.startsWith('T1041')) {
          targetPhaseIdx = 4; tacticName = 'Exfiltration & Impact';
        }

        const autoTechCard = {
          id: tid,
          name: `Observed Threat Behavior (${tid})`,
          risk: 'HIGH',
          actor: actorName,
          platform: 'Enterprise System',
          tactic: tacticName,
          compliance: 'MITRE ATT&CK Baseline',
          desc: `Threat technique ${tid} extracted from threat intelligence bulletin.`,
          d3fend: [
            {
              id: 'D3-AL',
              name: 'Authentication & Threat Audit Logging',
              status: 'ACTIVE GAP',
              cov: 40,
              detail: `Audit baseline check for technique ${tid}.`
            }
          ]
        };

        // Ensure phase exists in dynamicPhases
        const existingPhase = dynamicPhases.find(p => p.id === MASTER_PHASES[targetPhaseIdx].id);
        if (existingPhase) {
          existingPhase.techniques.push(autoTechCard);
        } else {
          dynamicPhases.push({
            ...MASTER_PHASES[targetPhaseIdx],
            techniques: [autoTechCard]
          });
        }
      });

      // Sort dynamicPhases by phase ID order (p1, p2, p3, p4, p5)
      dynamicPhases.sort((a, b) => a.id.localeCompare(b.id));
    }

    // Fallback if no specific match was found
    if (dynamicPhases.length === 0) {
      return MASTER_PHASES;
    }

    return dynamicPhases;
  }

  get _phases() {
    return this._activePhases;
  }

  async handleReanalyze() {
    if (this.analyzing) return;
    const b = this._bulletin;
    const bulletinId = b ? (b.bulletin_id || b.id) : null;
    if (!bulletinId) {
      this.toastType = 'error';
      this.toastMsg = '❌ No active threat bulletin selected to re-analyze.';
      return;
    }
    this.analyzing = true; this.toastMsg = '';
    const minDelay = new Promise(r => setTimeout(r, 800));
    try {
      // Trigger backend calculation
      const res = await reanalyzeSingleThreat(bulletinId);
      
      const [bulletins] = await Promise.all([fetchBulletins(), minDelay]);
      this.bulletins = bulletins || [];
      this.toastType = 'success';
      this.toastMsg  = '✅ Threat re-analysis complete \u2014 ' + bulletinId + ' posture updated. Countermeasure mappings refreshed.';
    } catch(e) {
      await minDelay;
      this.toastType = 'error';
      this.toastMsg  = '❌ Re-analysis failed: ' + (e.message || 'Network error \u2014 check server logs.');
    } finally { this.analyzing = false; }
    setTimeout(() => { this.toastMsg = ''; }, 7000);
  }

  get _bulletin() { return this.bulletins[this.selectedBulletinIdx] || null; }
  _covColor(n)    { return n >= 75 ? 'var(--color-success,#10b981)' : n >= 50 ? '#f97316' : 'var(--color-danger,#ef4444)'; }
  _toggleTree(k)  { this.treeCollapsed = { ...this.treeCollapsed, [k]: !this.treeCollapsed[k] }; }
  _riskPill(risk) {
    const r = (risk||'').toUpperCase();
    const cls = r==='CRITICAL'?'pill-critical':r==='HIGH'?'pill-high':'pill-medium';
    return html`<span class="pill ${cls}">${r}</span>`;
  }
  _allTechs() { return this._phases.flatMap(p => p.techniques.map(t => ({...t, phaseLabel:p.label, phaseSub:p.sub, phaseColor:p.color, phaseIcon:p.icon}))); }

  _d3card(d) {
    const bc = this._covColor(d.cov);
    const secured = d.status === 'SECURED';
    return html`
      <div @click=${() => this.selectedD3fendCard = d}
           style="background:var(--bg-input);border:1px solid ${secured ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'};border-radius:5px;padding:6px 8px;margin-top:4px;cursor:pointer;"
           class="d3-countermeasure-card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-bottom:3px;">
          <span style="font-size:9.5px;font-weight:600;color:var(--text-primary);">
            <code style="font-size:9px;">${d.id}</code> ${d.name}
          </span>
          <span class="${secured ? 'badge-pass' : 'badge-gap'}" style="font-size:8.5px;padding:1px 5px;">${secured ? 'SECURED' : 'GAP'}</span>
        </div>
        <div style="font-size:9.5px;color:var(--text-muted);line-height:1.3;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.detail}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="cov-bar" style="flex:1;"><div class="cov-fill" style="width:${d.cov}%;background:${bc};"></div></div>
          <span style="font-size:9px;font-weight:700;color:${bc};white-space:nowrap;">${d.cov}%</span>
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     VIEW 1 — ATTACK FLOW: Phases horizontal, steps vertical
     ══════════════════════════════════════════════════════════════ */
  _renderFlow() {
    const vp = this.showGapsOnly
      ? this._phases.filter(p => p.techniques.some(t => t.d3fend.some(d => d.status === 'ACTIVE GAP')))
      : this._phases;
    let sc = 0;
    const colW = 280;
    const arrowW = 34;
    const minW = vp.length * colW + (vp.length - 1) * arrowW;

    return html`
      <div class="card" style="padding:14px;overflow-x:auto;">
        <div class="card-title">
          <span>
            <i class="fa-solid fa-diagram-next" style="color:var(--text-accent);"></i>
            MITRE ATT&amp;CK Attack Flow — Phases Horizontal &middot; Steps Vertical
          </span>
          <span class="badge-pass" style="font-size:10px;">STIX 2.1</span>
        </div>
        <p style="font-size:11.5px;color:var(--text-muted);margin:0 0 14px;line-height:1.4;">
          Each <strong style="color:var(--text-primary);">column</strong> = kill-chain phase (left&nbsp;&rarr;&nbsp;right).
          Steps flow <strong style="color:var(--text-primary);">top&nbsp;&darr;&nbsp;bottom</strong> with arrows inside each column.
        </p>

        <div style="display:flex;align-items:flex-start;min-width:${minW}px;">
          ${vp.map((phase, pi) => {
            const gaps = phase.techniques.flatMap(t => t.d3fend).filter(d => d.status === 'ACTIVE GAP').length;
            const isLastPhase = pi === vp.length - 1;
            return html`

              <!-- ── PHASE COLUMN ── -->
              <div style="display:flex;flex-direction:column;width:${colW}px;flex-shrink:0;">

                <!-- Phase header -->
                <div style="background:${phase.color}18;border:1px solid ${phase.color}50;border-top:4px solid ${phase.color};border-radius:8px 8px 0 0;padding:10px 12px;display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <i class="fa-solid ${phase.icon}" style="color:${phase.color};font-size:13px;flex-shrink:0;"></i>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:${phase.color};">${phase.label}</div>
                    <div style="font-size:11.5px;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${phase.sub}</div>
                  </div>
                  <div style="text-align:right;flex-shrink:0;">
                    <div style="font-size:9px;color:var(--text-muted);">${phase.techniques.length} steps</div>
                    <div style="font-size:9px;font-weight:700;color:${gaps > 0 ? 'var(--color-danger,#ef4444)' : 'var(--color-success,#10b981)'};">${gaps} gap${gaps !== 1 ? 's' : ''}</div>
                  </div>
                </div>

                <!-- Steps body -->
                <div style="background:${phase.color}07;border:1px solid ${phase.color}25;border-radius:0 0 8px 8px;padding:10px;display:flex;flex-direction:column;gap:0;flex:1;">
                  ${phase.techniques.map((t, ti) => {
                    sc++;
                    const sn = sc;
                    const isGap = t.d3fend.some(d => d.status === 'ACTIVE GAP');
                    const isLastStep = ti === phase.techniques.length - 1;
                    const allSecured = t.d3fend.every(d => d.status === 'SECURED');
                    return html`
                      <!-- Step card -->
                      <div style="background:var(--bg-card);border:1px solid ${isGap ? 'rgba(239,68,68,0.35)' : 'var(--border-color)'};border-left:4px solid ${phase.color};border-radius:7px;padding:11px 12px;position:relative;margin-top:10px;">

                        <!-- Step badge -->
                        <div style="position:absolute;top:-10px;left:10px;background:${phase.color};color:#fff;font-size:8.5px;font-weight:700;padding:1px 7px;border-radius:8px;">STEP ${sn}</div>

                        <!-- ID + status -->
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:5px;">
                          <code style="font-size:10.5px;color:${phase.color};">${t.id}</code>
                          <span class="${allSecured ? 'badge-pass' : 'badge-gap'}" style="font-size:9px;white-space:nowrap;">${allSecured ? '🛡 OK' : '⚠ GAP'}</span>
                        </div>

                        <!-- Name -->
                        <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:5px;line-height:1.3;">${t.name}</div>

                        <!-- Description -->
                        <div style="font-size:10.5px;color:var(--text-muted);line-height:1.4;margin-bottom:7px;">${t.desc}</div>

                        <!-- Meta pills -->
                        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
                          ${this._riskPill(t.risk)}
                          <span class="pill pill-tactic" style="font-size:9px;"><i class="fa-solid fa-crosshairs" style="font-size:7px;"></i>${t.tactic}</span>
                          <span class="pill pill-actor" style="font-size:9px;"><i class="fa-solid fa-user-secret" style="font-size:7px;"></i>${t.actor}</span>
                          <span class="pill pill-platform" style="font-size:9px;"><i class="fa-solid fa-layer-group" style="font-size:7px;"></i>${t.platform}</span>
                        </div>

                        <!-- Compliance -->
                        <div style="font-size:9px;color:var(--text-muted);margin-bottom:8px;">
                          <i class="fa-solid fa-balance-scale" style="font-size:8px;margin-right:2px;"></i>${t.compliance}
                        </div>

                        <!-- D3FEND intercepts -->
                        <div style="border-top:1px dashed ${phase.color}40;padding-top:7px;">
                          <div style="font-size:8.5px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:.4px;margin-bottom:3px;">D3FEND Intercepts</div>
                          ${t.d3fend.map(d => this._d3card(d))}
                        </div>
                      </div>

                      <!-- Down-arrow between steps -->
                      ${!isLastStep ? html`
                        <div style="text-align:center;padding:5px 0 0;color:${phase.color};font-size:14px;opacity:0.6;">
                          <i class="fa-solid fa-arrow-down"></i>
                        </div>
                      ` : ''}
                    `;
                  })}
                </div>

                <!-- Compliance footer -->
                <div style="font-size:9px;color:var(--text-muted);padding:5px 8px;border-top:1px dashed var(--border-color);text-align:center;margin-top:5px;">
                  <i class="fa-solid fa-balance-scale" style="margin-right:2px;font-size:8px;"></i>
                  ${[...new Set(phase.techniques.map(t => t.compliance))].join(' · ')}
                </div>
              </div>

              <!-- Phase connector arrow -->
              ${!isLastPhase ? html`
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:44px;width:${arrowW}px;flex-shrink:0;">
                  <div style="width:1px;height:26px;border-left:1px dashed var(--border-color);"></div>
                  <i class="fa-solid fa-arrow-right" style="font-size:13px;color:${phase.color};opacity:0.55;margin:3px 0;"></i>
                  <div style="width:1px;height:26px;border-left:1px dashed var(--border-color);"></div>
                </div>
              ` : ''}
            `;
          })}
        </div>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════════
     VIEW 2 — COLLAPSIBLE TREE
     ══════════════════════════════════════════════════════════════ */
  _renderTree() {
    return html`
      <div class="tree-container">
        <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:14px;display:flex;align-items:center;gap:8px;">
          <i class="fa-solid fa-sitemap" style="color:var(--text-accent);"></i> Collapsible Threat Mappings Tree — MITRE ATT&amp;CK + D3FEND
        </div>
        <ul class="tree-branch-list" style="padding-left:4px;">
          ${this._phases.map((p, pi) => {
            const pKey = 'p' + pi;
            const pOpen = !this.treeCollapsed[pKey];
            return html`
              <li class="tree-item">
                <div class="phase-hdr" @click=${() => this._toggleTree(pKey)} style="border-left:3px solid ${p.color};">
                  <span class="phase-hdr-title">
                    <i class="fa-solid ${p.icon}" style="color:${p.color};margin-right:6px;font-size:11px;"></i>${p.label} — ${p.sub}
                  </span>
                  <i class="fa-solid fa-chevron-down chevron ${pOpen ? 'open' : ''}"></i>
                </div>
                ${pOpen ? html`
                  <ul class="tree-branch-list">
                    ${p.techniques.map((t, ti) => {
                      const tKey = 't' + pi + '-' + ti;
                      const tOpen = !this.treeCollapsed[tKey];
                      return html`
                        <li class="tree-item">
                          <div class="tech-card">
                            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:5px;cursor:pointer;" @click=${() => this._toggleTree(tKey)}>
                              <span style="font-size:12px;font-weight:600;color:var(--text-primary);"><code>${t.id}</code>${t.name}</span>
                              <div style="display:flex;align-items:center;gap:6px;">${this._riskPill(t.risk)}<i class="fa-solid fa-chevron-down chevron ${tOpen ? 'open' : ''}"></i></div>
                            </div>
                            ${tOpen ? html`
                              <div style="font-size:11px;color:var(--text-muted);line-height:1.4;margin-bottom:6px;">${t.desc}</div>
                              <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;">
                                <span class="pill pill-tactic" style="font-size:9.5px;"><i class="fa-solid fa-crosshairs" style="font-size:8px;"></i>${t.tactic}</span>
                                <span class="pill pill-actor" style="font-size:9.5px;"><i class="fa-solid fa-user-secret" style="font-size:8px;"></i>${t.actor}</span>
                                <span class="pill pill-platform" style="font-size:9.5px;"><i class="fa-solid fa-layer-group" style="font-size:8px;"></i>${t.platform}</span>
                              </div>
                              <ul class="tree-branch-list">
                                ${t.d3fend.map(d => html`
                                  <li class="tree-item">
                                    <div @click=${() => this.selectedD3fendCard = d}
                                         style="background:var(--bg-input);border:1px solid var(--border-color);border-radius:5px;padding:8px 10px;cursor:pointer;"
                                         class="d3-countermeasure-card">
                                      <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-bottom:4px;">
                                        <span style="font-size:11.5px;font-weight:600;color:var(--text-primary);"><code>${d.id}</code> ${d.name}</span>
                                        <div style="display:flex;gap:6px;align-items:center;">
                                          <span style="font-size:10px;font-weight:700;color:${this._covColor(d.cov)};">${d.cov}%</span>
                                          <span class="${d.status === 'SECURED' ? 'badge-pass' : 'badge-gap'}">${d.status}</span>
                                        </div>
                                      </div>
                                      <div style="font-size:10.5px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.detail}</div>
                                      <div class="cov-bar" style="margin-top:5px;"><div class="cov-fill" style="width:${d.cov}%;background:${this._covColor(d.cov)};"></div></div>
                                    </div>
                                  </li>
                                `)}
                              </ul>
                            ` : ''}
                          </div>
                        </li>
                      `;
                    })}
                  </ul>
                ` : ''}
              </li>
            `;
          })}
        </ul>
      </div>
    `;
  }

  /* ══════════════════════════════════════════════════════════════
     VIEW 3 — STIX 2.1 JSON
     ══════════════════════════════════════════════════════════════ */
  _renderJson() {
    const b = this._bulletin;
    const bundle = { type:'bundle', spec_version:'2.1', id:'bundle--visual-mapping', bulletin_id:b?.bulletin_id,
      objects: this._allTechs().map(t => ({
        type:'attack-pattern', id:'attack-pattern--' + t.id, name:t.name, description:t.desc,
        kill_chain_phases:[{kill_chain_name:'mitre-attack', phase_name:t.tactic.toLowerCase().replace(/ /g,'-')}],
        external_references:[{source_name:'mitre-attack', external_id:t.id}],
        x_extensions:{ risk:t.risk, actor:t.actor, platform:t.platform, compliance:t.compliance,
          d3fend:t.d3fend.map(d => ({id:d.id, name:d.name, status:d.status, coverage:d.cov})) }
      }))
    };
    const js = JSON.stringify(bundle, null, 2);
    return html`
      <div class="card">
        <div class="card-title">
          <span><i class="fa-solid fa-code" style="color:var(--text-accent);"></i> STIX 2.1 / Attack Flow v3.2.0 Specification Document</span>
          <button class="btn btn-xs" @click=${() => navigator.clipboard.writeText(js)}><i class="fa-solid fa-copy"></i> Copy JSON</button>
        </div>
        <pre style="background:#0b1a2c;padding:16px;border-radius:6px;color:#00e5ff;overflow-x:auto;font-size:11px;max-height:520px;overflow-y:auto;line-height:1.5;"><code>${js}</code></pre>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     VIEW 4 — D3FEND AUDIT MATRIX
     ══════════════════════════════════════════════════════════════ */
  _renderAudit() {
    const seen = new Set(); const rows = [];
    for (const t of this._allTechs())
      for (const d of t.d3fend) {
        const key = t.id + '::' + d.id;
        if (!seen.has(key)) { seen.add(key); rows.push({...d, attackId:t.id, attackName:t.name, tactic:t.tactic}); }
      }
    const visible = this.showGapsOnly ? rows.filter(r => r.status === 'ACTIVE GAP') : rows;
    return html`
      <div class="card">
        <div class="card-title">
          <span><i class="fa-solid fa-shield-halved" style="color:var(--text-accent);"></i> D3FEND Countermeasures Audit Matrix</span>
          <span style="display:flex;gap:8px;">
            <span class="badge-pass">${rows.filter(r => r.status === 'SECURED').length} SECURED</span>
            <span class="badge-gap">${rows.filter(r => r.status === 'ACTIVE GAP').length} GAPS</span>
          </span>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr>
              <th>D3FEND ID</th><th>Defensive Control</th><th style="width:110px;">Coverage</th>
              <th>Status</th><th>Counters</th><th>Tactic</th><th>Implementation Detail</th>
            </tr></thead>
            <tbody>
              ${visible.map(c => html`
                <tr>
                  <td style="font-family:monospace;font-weight:700;color:var(--text-accent);white-space:nowrap;">${c.id}</td>
                  <td style="font-weight:600;min-width:160px;">${c.name}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <div class="cov-bar" style="flex:1;"><div class="cov-fill" style="width:${c.cov}%;background:${this._covColor(c.cov)};"></div></div>
                      <span style="font-size:11px;font-weight:700;color:${this._covColor(c.cov)};white-space:nowrap;">${c.cov}%</span>
                    </div>
                  </td>
                  <td><span class="${c.status === 'SECURED' ? 'badge-pass' : 'badge-gap'}">${c.status}</span></td>
                  <td style="white-space:nowrap;"><code>${c.attackId}</code><div style="font-size:10.5px;color:var(--text-muted);margin-top:2px;">${c.attackName}</div></td>
                  <td><span class="pill pill-tactic" style="font-size:9.5px;">${c.tactic}</span></td>
                  <td style="font-size:11.5px;color:var(--text-muted);line-height:1.4;min-width:200px;">${c.detail}</td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     MAIN RENDER
     ══════════════════════════════════════════════════════════════ */
  render() {
    const b = this._bulletin;
    const allD3 = this._allTechs().flatMap(t => t.d3fend);
    const secured = allD3.filter(d => d.status === 'SECURED').length;
    const total   = allD3.length;
    const sev     = b?.impact_rating || 'HIGH';
    const sevClr  = sev==='CRITICAL'?'var(--color-danger,#ef4444)':sev==='HIGH'?'#f97316':sev==='MEDIUM'?'var(--text-accent)':'var(--color-success,#10b981)';

    return html`
      <!-- HEADER -->
      <div class="header">
        <h1 class="title"><i class="fa-solid fa-circle-nodes" style="color:var(--text-accent);margin-right:8px;"></i>Visual Threat Mapping &amp; STIX 2.1 Attack Flow</h1>
        <p class="subtitle">Interactive kill-chain visualisation with actor attribution, platform scope, and D3FEND countermeasure coverage across all ingested threat bulletins.</p>
      </div>

      <!-- TOAST -->
      ${this.toastMsg ? html`<div class="toast ${this.toastType === 'error' ? 'toast-error' : 'toast-success'}">${this.toastMsg}</div>` : ''}

      <!-- META BANNER -->
      <div class="meta-banner">
        <div class="meta-item">
          <span class="meta-lbl">Bulletin ID</span>
          <span class="meta-val" style="color:var(--text-accent);">${b?.bulletin_id || 'TB-2026-LIVE'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-lbl">Impact Severity</span>
          <span class="meta-val" style="color:${sevClr};">${sev}</span>
        </div>
        <div class="meta-item">
          <span class="meta-lbl">Kill-Chain Phases</span>
          <span class="meta-val">${this._phases.length}</span>
        </div>
        <div class="meta-item">
          <span class="meta-lbl">Techniques</span>
          <span class="meta-val" style="color:var(--text-accent);">${this._allTechs().length}</span>
        </div>
        <div class="meta-item">
          <span class="meta-lbl">D3FEND Posture</span>
          <span class="badge-pass">${Math.round((secured/total)*100)}% SECURED</span>
        </div>
        <div class="meta-item">
          <span class="meta-lbl">Active Gaps</span>
          <span class="badge-gap">${total - secured} GAPS</span>
        </div>
        <div class="meta-item">
          <span class="meta-lbl">3-Layer Engine Blast Radius</span>
          <span class="meta-val" style="display:flex;gap:6px;">
            <button class="btn" style="background:rgba(0,229,255,0.12);border-color:#00e5ff;color:#00e5ff;font-weight:800;padding:6px 12px;border-radius:6px;font-size:11.5px;box-shadow:0 0 10px rgba(0,229,255,0.3);"
                    @click=${(e) => {
                      e.preventDefault();
                      const bulId = b?.bulletin_id || b?.id || 'TB-2026-LIVE';
                      this.dispatchEvent(new CustomEvent('switch-tab-with-context', {
                        detail: { tab: 'bulletin_blast', bulletinId: bulId, entryEntity: bulId },
                        bubbles: true,
                        composed: true
                      }));
                    }}>
              <i class="fa-solid fa-layer-group" style="color:#00e5ff;"></i> 💥 Threat All-Entry-Points Blast Radius
            </button>
            <button class="btn" style="background:rgba(15,23,42,0.8);border-color:#334155;color:#94a3b8;font-weight:700;padding:6px 10px;border-radius:6px;font-size:11.5px;"
                    @click=${(e) => {
                      e.preventDefault();
                      const bulId = b?.bulletin_id || b?.id || 'TB-2026-LIVE';
                      this.dispatchEvent(new CustomEvent('switch-tab-with-context', {
                        detail: { tab: 'rule_blast', entryEntity: bulId },
                        bubbles: true,
                        composed: true
                      }));
                    }}>
              <i class="fa-solid fa-burst"></i> Single Entry
            </button>
          </span>
        </div>
        <div class="meta-item" style="margin-left:auto;">
          <span class="meta-lbl">Switch Bulletin</span>
          <select .value=${this.selectedBulletinIdx} @change=${(e) => { this.selectedBulletinIdx = parseInt(e.target.value); }}
            style="background:var(--bg-input);border:1px solid var(--border-accent);color:var(--text-primary);padding:5px 9px;border-radius:6px;font-size:11.5px;outline:none;cursor:pointer;">
            ${this.bulletins.map((bul, i) => html`<option value="${i}" ?selected=${this.selectedBulletinIdx === i}>${bul.bulletin_id || bul.id}: ${(bul.title || '').substring(0, 30)}</option>`)}
          </select>
        </div>
        <div class="meta-item">
          <button class="btn btn-xs" @click=${() => this.handleReanalyze()} ?disabled=${this.analyzing}
            style="${this.analyzing ? 'opacity:.75;cursor:not-allowed;border-color:var(--text-accent);color:var(--text-accent);' : ''}">
            <i class="fa-solid fa-arrows-spin" style="${this.analyzing ? 'animation:spin 0.8s linear infinite;display:inline-block;' : ''}"></i>
            ${this.analyzing ? 'Re-analysing\u2026' : 'Re-analyze Threat'}
          </button>
        </div>
      </div>

      <!-- VIEW TABS -->
      <div class="btn-group">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn ${this.selectedView === 'flow'  ? 'active' : ''}" @click=${() => this.selectedView = 'flow'}>
            <i class="fa-solid fa-diagram-next"></i> Attack Flow Graph
          </button>
          <button class="btn ${this.selectedView === 'tree'  ? 'active' : ''}" @click=${() => this.selectedView = 'tree'}>
            <i class="fa-solid fa-sitemap"></i> Collapsible Tree
          </button>
          <button class="btn ${this.selectedView === 'json'  ? 'active' : ''}" @click=${() => this.selectedView = 'json'}>
            <i class="fa-solid fa-code"></i> STIX 2.1 JSON
          </button>
          <button class="btn ${this.selectedView === 'audit' ? 'active' : ''}" @click=${() => this.selectedView = 'audit'}>
            <i class="fa-solid fa-shield-halved"></i> D3FEND Audit Matrix
          </button>
        </div>
        <button class="btn btn-xs" @click=${() => {
          const j = JSON.stringify({type:'bundle', spec_version:'2.1', objects: this._allTechs()}, null, 2);
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([j], {type:'application/json'}));
          a.download = 'attack-flow.json'; a.click();
        }}>
          <i class="fa-solid fa-download"></i> Export STIX JSON
        </button>
      </div>

      <!-- FILTER BAR -->
      <div class="filter-bar">
        <span style="font-size:13px;font-weight:600;color:var(--text-primary);">
          <i class="fa-solid fa-filter" style="color:var(--text-accent);margin-right:6px;"></i>Filter Mappings
        </span>
        <label>
          <input type="checkbox" .checked=${this.showGapsOnly} @change=${(e) => this.showGapsOnly = e.target.checked} />
          <span>Show active gaps only (suppress secured countermeasures)</span>
        </label>
      </div>

      <!-- ACTIVE VIEW -->
      ${this.selectedView === 'flow'  ? this._renderFlow()  : ''}
      ${this.selectedView === 'tree'  ? this._renderTree()  : ''}
      ${this.selectedView === 'json'  ? this._renderJson()  : ''}
      ${this.selectedView === 'audit' ? this._renderAudit() : ''}

      <!-- THREAT SUMMARY -->
      <div class="summary-card">
        <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:8px;display:flex;align-items:center;gap:8px;">
          <i class="fa-solid fa-brain" style="color:var(--text-accent);"></i> Threat Summary &amp; Enterprise Impact Assessment
        </div>
        <div style="font-size:12.5px;color:var(--text-primary);line-height:1.5;">
          ${b?.summary || 'Multi-phase APT campaign executed by APT29, APT41, LockBit across ' + this._allTechs().length + ' distinct MITRE ATT&CK techniques spanning all ' + this._phases.length + ' kill-chain phases. ' + (total - secured) + ' active D3FEND coverage gaps remain — Cloud Storage Audit (25%), JIT Admin Controls (20%), and PAM Vaulting (45%) require immediate remediation priority.'}
        </div>
      </div>

      <!-- BULLETIN SOURCE -->
      <div class="card">
        <div class="card-title" style="justify-content:space-between;">
          <span><i class="fa-solid fa-file-alt" style="color:var(--text-accent);"></i> Ingested Bulletin Source</span>
          <button class="btn btn-xs" @click=${() => this.showBulletinText = !this.showBulletinText}>
            ${this.showBulletinText ? 'Hide' : 'Show'} Source
          </button>
        </div>
        ${this.showBulletinText ? html`
          <div class="bulletin-text">${b?.summary || b?.content || 'No bulletin ingested yet. Paste a CTI bulletin on the Ingest Threat tab.'}</div>
        ` : ''}
      </div>

      <!-- GAP CHART -->
      <div class="card">
        <div class="card-title"><i class="fa-solid fa-chart-bar" style="color:var(--text-accent);"></i> D3FEND Coverage Gap Chart</div>
        ${(() => {
          const seen2 = new Set(); const unique = [];
          for (const t of this._allTechs()) for (const d of t.d3fend) { if (!seen2.has(d.id)) { seen2.add(d.id); unique.push(d); } }
          const rows2 = this.showGapsOnly ? unique.filter(d => d.status === 'ACTIVE GAP') : unique;
          return rows2.map(d => html`
            <div class="gap-row">
              <span class="gap-label"><code style="font-size:10.5px;">${d.id}</code></span>
              <div style="flex:1;height:10px;background:var(--bg-input);border-radius:5px;overflow:hidden;">
                <div style="width:${d.cov}%;height:100%;background:${this._covColor(d.cov)};border-radius:5px;transition:width .4s;"></div>
              </div>
              <span class="${d.status === 'SECURED' ? 'badge-pass' : 'badge-gap'}" style="font-size:10px;">${d.status}</span>
              <span style="font-size:10.5px;font-weight:700;color:${this._covColor(d.cov)};min-width:36px;text-align:right;">${d.cov}%</span>
            </div>
          `);
        })()}
      </div>

      <!-- D3FEND Countermeasure Modal -->
      ${this.selectedD3fendCard ? html`
        <div class="modal-overlay" @click=${() => this.selectedD3fendCard = null}>
          <div class="modal-content" @click=${(e) => e.stopPropagation()}>
            <button class="modal-close" @click=${() => this.selectedD3fendCard = null}><i class="fa-solid fa-xmark"></i></button>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px;letter-spacing:0.5px;">
              D3FEND Countermeasure Details
            </div>
            <h3 style="font-size:16px;font-weight:700;color:var(--text-primary);margin:0 0 12px 0;display:flex;align-items:center;gap:8px;">
              <code style="font-size:14px;background:rgba(0,255,255,0.15);">${this.selectedD3fendCard.id}</code>
              <span>${this.selectedD3fendCard.name}</span>
            </h3>
            
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;background:rgba(255,255,255,0.02);padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.04);">
              <span class="${this.selectedD3fendCard.status === 'SECURED' ? 'badge-pass' : 'badge-gap'}" style="font-size:11px;padding:3px 8px;">
                ${this.selectedD3fendCard.status === 'SECURED' ? '🛡 SECURED' : '⚠ ACTIVE GAP'}
              </span>
              <div style="display:flex;align-items:center;gap:8px;flex:1;">
                <div class="cov-bar" style="flex:1;height:8px;margin-top:0;"><div class="cov-fill" style="width:${this.selectedD3fendCard.cov}%;background:${this._covColor(this.selectedD3fendCard.cov)};"></div></div>
                <span style="font-size:11px;font-weight:700;color:${this._covColor(this.selectedD3fendCard.cov)};">${this.selectedD3fendCard.cov}% Strength</span>
              </div>
            </div>

            <div style="background:var(--bg-input);border:1px solid var(--border-color);border-radius:6px;padding:12px;margin-bottom:14px;">
              <div style="font-size:10px;font-weight:700;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Audit Assessment Details</div>
              <p style="font-size:12px;color:var(--text-primary);line-height:1.5;margin:0;white-space:pre-wrap;">
                ${this.selectedD3fendCard.detail || 'No detailed audit evaluation comments available.'}
              </p>
            </div>
            
            <div style="font-size:10.5px;color:var(--text-muted);line-height:1.4;display:flex;align-items:start;gap:6px;">
              <i class="fa-solid fa-circle-info" style="color:var(--text-accent);margin-top:2px;"></i>
              <span>This countermeasure represents defensive capability mapped to the observed threat technique. Status is verified dynamically against security controls audit scans.</span>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }
}

customElements.define('visual-screen', VisualScreen);
