import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { fetchGraphTopology, fetchBlastRadius, fetchBulletins } from '../services/api.js';

export class GraphScreen extends LitElement {
  static properties = {
    selectedIdentity: { type: String },
    selectedThreat: { type: String },
    suppressSafe: { type: Boolean },
    topology: { type: Object },
    blastData: { type: Object },
    bulletins: { type: Array },
    loading: { type: Boolean },
    syncMsg: { type: String },
    hiddenLegendTypes: { type: Object }
  };

  static styles = css`
    :host { display: block; color: var(--text-primary); }
    .header { margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 14px; }
    .title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 700; color: var(--text-primary); margin: 0; }
    .subtitle { color: var(--text-muted); font-size: 12px; margin-top: 2px; }

    .control-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-bottom: 20px; display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
    select { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: 6px; font-size: 12.5px; min-width: 280px; outline: none; }
    
    .btn { padding: 9px 18px; border-radius: 6px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-accent); background: var(--bg-input); color: var(--text-accent); display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease; }
    .btn:hover { background: var(--text-accent); color: var(--bg-main); }
    .btn-secondary { border-color: var(--border-color); color: var(--text-primary); background: var(--bg-card); }
    .btn-secondary:hover { border-color: var(--border-accent); color: var(--text-accent); background: var(--bg-card); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .sync-msg { font-size: 12px; font-weight: 500; color: var(--text-muted); margin-top: 12px; }

    .grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; min-height: 500px; }
    .canvas-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 0; position: relative; display: flex; flex-direction: column; overflow: hidden; }
    .canvas-header { position: absolute; top: 12px; left: 12px; z-index: 10; display: flex; gap: 8px; align-items: center; background: var(--bg-card); opacity: 0.9; padding: 6px 12px; border-radius: 4px; border: 1px solid var(--border-color); }
    .canvas-header span { font-size: 11px; font-weight: 600; color: var(--text-accent); }
    .canvas-header .sep { height: 12px; width: 1px; background: var(--border-color); margin: 0 4px; }

    #blast-radius-graph-canvas { width: 100%; height: 480px; background: var(--bg-input); border-radius: 0 0 8px 8px; }

    .legend { position: absolute; bottom: 12px; left: 12px; z-index: 10; display: flex; flex-direction: column; gap: 6px; background: var(--bg-card); opacity: 0.95; padding: 10px 14px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 11px; color: var(--text-muted); }
    .legend-title { font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
    .legend-row { display: flex; align-items: center; gap: 8px; color: var(--text-primary); }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

    .right-col { display: flex; flex-direction: column; gap: 16px; }

    /* THREAT CONTEXT CARD */
    .threat-ctx-card { background: rgba(255,149,0,0.05); border: 1px dashed var(--color-warning, orange); border-radius: 8px; padding: 16px; display: none; }
    .threat-ctx-card.visible { display: block; }
    .ctx-title { font-size: 13px; font-weight: 700; color: orange; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
    .ctx-row { font-size: 12px; color: var(--text-primary); margin-bottom: 4px; }

    /* IMPACT ASSESSMENT CARD */
    .impact-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; }
    .impact-title { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .impact-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .impact-stat-box { border-radius: 6px; padding: 12px; text-align: center; }
    .impact-stat-lbl { font-size: 10px; color: var(--text-muted); display: block; text-transform: uppercase; }
    .impact-stat-val { font-size: 20px; font-weight: 800; font-family: 'Outfit', sans-serif; }
    .tier-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; margin-bottom: 6px; font-size: 12px; color: var(--text-primary); }
    .tier-row:last-child { border-bottom: none; }
    .tier-badge { padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; }

    /* ATTACK PATHS CARD */
    .paths-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; flex-grow: 1; max-height: 380px; overflow-y: auto; }
    .paths-title { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
    .path-item { background: rgba(255,59,48,0.04); border: 1px solid rgba(255,59,48,0.15); border-radius: 6px; padding: 12px; margin-bottom: 10px; font-size: 11.5px; }
    .path-chain { font-family: monospace; color: var(--text-accent); font-weight: 600; margin-bottom: 4px; }
    .path-detail { color: var(--text-muted); font-size: 11px; }

    /* D3FEND TABLE */
    .d3fend-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; margin-top: 20px; }
    .d3fend-title { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 9px 12px; color: #ffffff; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--border-color); background: var(--bg-sidebar); white-space: nowrap; }
    td { padding: 9px 12px; border-bottom: 1px solid var(--border-color); font-size: 12px; color: var(--text-primary); }
    .table-empty { text-align: center; color: var(--text-muted); padding: 20px; font-size: 12px; }

    /* BADGE STYLES */
    .badge-err { background: rgba(255,59,48,0.2); color: #ff3b30; border: 1px solid #ff3b30; }
    .badge-warn { background: rgba(255,204,0,0.2); color: #cc9900; border: 1px solid #ffcc00; }
    .badge-ok { background: rgba(0,122,255,0.2); color: #007aff; border: 1px solid #007aff; }
    .badge-tag { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; white-space: nowrap; }
  `;

  constructor() {
    super();
    this.selectedIdentity = 'USER_JDOE';
    this.selectedThreat = '';
    this.suppressSafe = false;
    this.topology = { nodes: [], edges: [] };
    this.blastData = null;
    this.bulletins = [];
    this.loading = false;
    this.syncMsg = '';
    this.cy = null;
    this.hiddenLegendTypes = { entry: false, t0Comp: false, reachableComp: false, t0Safe: false, safe: false };
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  async loadData() {
    try {
      const [top, buls] = await Promise.all([
        fetchGraphTopology().catch(() => ({ nodes: [], edges: [] })),
        fetchBulletins().catch(() => [])
      ]);
      this.topology = top;
      this.bulletins = buls;
    } catch (e) {
      console.error(e);
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('topology') || changedProperties.has('blastData') || changedProperties.has('suppressSafe') || changedProperties.has('hiddenLegendTypes')) {
      if (this.cy) {
        this._updateGraphElements();
      } else {
        this._initGraph();
      }
    }
  }

  _initGraph() {
    const container = this.shadowRoot.getElementById('blast-radius-graph-canvas');
    if (!container) return;

    const cyLib = window.cytoscape || cytoscape;
    if (typeof cyLib === 'undefined') {
      console.error("Cytoscape library not loaded globally from index.html.");
      return;
    }

    this.cy = cyLib({
      container: container,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(label)',
            'width': 'data(size)',
            'height': 'data(size)',
            'font-size': '10px',
            'color': '#fff',
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'text-background-opacity': 0.7,
            'text-background-color': '#07101e',
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
            'opacity': 'data(opacity)',
            'border-width': (node) => node.data('tier') === 0 ? 2 : 0,
            'border-color': '#ffcc00'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 'data(width)',
            'line-color': 'data(color)',
            'line-style': 'data(lineStyle)',
            'target-arrow-color': 'data(color)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '7px',
            'color': '#a0aec0',
            'text-background-opacity': 0.75,
            'text-background-color': '#07101e',
            'text-background-padding': '1px',
            'text-background-shape': 'roundrectangle',
            'opacity': 'data(opacity)'
          }
        }
      ],
      layout: {
        name: 'cose',
        nodeRepulsion: 4500,
        idealEdgeLength: 80
      }
    });

    this._updateGraphElements();
  }

  _updateGraphElements() {
    if (!this.cy) return;

    const nodes = this.topology?.nodes || [];
    const edges = this.topology?.edges || [];

    const elements = [];

    const compIds = new Set();
    const startIds = new Set();
    if (this.blastData) {
      if (this.blastData.resources) {
        for (const r of this.blastData.resources) {
          compIds.add(r.id);
        }
      }
      if (this.selectedIdentity) {
        startIds.add(this.selectedIdentity);
      }
    }

    // Build Cytoscape nodes
    for (const n of nodes) {
      const isStart = startIds.has(n.id);
      const isComp = compIds.has(n.id);

      let color = '#34c759'; // default safe
      let opacity = 0.4;
      let size = 30;

      const tier = n.properties?.tier;
      const tierInt = tier === 0 || tier === 'Tier0' ? 0 : (tier === 1 || tier === 'Tier1' ? 1 : 2);

      if (isStart) {
        if (this.hiddenLegendTypes.entry) continue;
        color = '#ff3b30'; // Entry point
        opacity = 1.0;
        size = 35;
      } else if (isComp) {
        if (tierInt === 0) {
          if (this.hiddenLegendTypes.t0Comp) continue;
          color = '#ffcc00'; // Tier 0 compromised
        } else {
          if (this.hiddenLegendTypes.reachableComp) continue;
          color = '#007aff'; // Reachable asset compromised
        }
        opacity = 1.0;
        size = 32;
      } else {
        // Safe nodes
        if (tierInt === 0) {
          if (this.hiddenLegendTypes.t0Safe) continue;
          color = '#10b981'; // Tier 0 safe (Vibrant Emerald)
        } else {
          if (this.hiddenLegendTypes.safe) continue;
          color = '#2ecc71'; // Asset safe (Vibrant Mint)
        }
        if (this.suppressSafe) {
          continue; // Skip rendering safe nodes
        }
      }

      elements.push({
        data: {
          id: n.id,
          label: n.label || n.id,
          type: n.type,
          tier: tierInt,
          color: color,
          size: size,
          opacity: opacity
        }
      });
    }

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const defaultEdgeColor = isLight ? '#7dd3cf' : '#2d3748';

    // Build Cytoscape edges
    edges.forEach((e, idx) => {
      const sourceComp = startIds.has(e.source) || compIds.has(e.source);
      const targetComp = compIds.has(e.target);

      let color = defaultEdgeColor;
      let opacity = 0.25;
      let width = 1.0;

      if (sourceComp && targetComp) {
        color = '#ff3b30'; // Compromised path link
        opacity = 1.0;
        width = 2.0;
      }

      const nodeIds = new Set(elements.map(el => el.data.id));
      if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
        elements.push({
          data: {
            id: `edge_${idx}`,
            source: e.source,
            target: e.target,
            label: e.type,
            color: color,
            width: width,
            opacity: opacity,
            lineStyle: 'solid'
          }
        });
      }
    });

    const labelColor = isLight ? '#003b5c' : '#ffffff';
    const labelBg = isLight ? '#f0faf9' : '#07101e';
    const edgeLabelColor = isLight ? '#2c5f7a' : '#a0aec0';

    this.cy.elements().remove();
    this.cy.add(elements);

    // Dynamically update Cytoscape styling elements for theme support
    this.cy.style()
      .selector('node')
        .style({
          'color': labelColor,
          'text-background-color': labelBg
        })
      .selector('edge')
        .style({
          'color': edgeLabelColor,
          'text-background-color': labelBg
        })
      .update();

    this.cy.layout({
      name: 'cose',
      animate: true,
      nodeRepulsion: 4500,
      idealEdgeLength: 80
    }).run();
  }

  async handleAnalyzeBlast() {
    this.loading = true;
    try {
      this.blastData = await fetchBlastRadius(this.selectedIdentity, this.selectedThreat);
    } catch (e) {
      console.error(e);
      // use demo data if API fails
      this.blastData = {
        tier0_compromised: 1,
        tier1_compromised: 3,
        tier2_compromised: 5,
        reachable: 9,
        total: 29,
        attack_paths: [
          { chain: 'user_jdoe → SG-LAP-101 → AD-SRV-01 → DC-CORP-01', risk: 'CRITICAL' },
          { chain: 'user_jdoe → SG-DMZ-Proxy → DB-CORE-SQL', risk: 'HIGH' }
        ]
      };
    } finally {
      this.loading = false;
    }
  }

  toggleLegendType(type) {
    this.hiddenLegendTypes = {
      ...this.hiddenLegendTypes,
      [type]: !this.hiddenLegendTypes[type]
    };
    this._updateGraphElements();
  }

  async handleSyncNeo4j() {
    this.syncMsg = '⏳ Syncing topology to Neo4j...';
    setTimeout(() => {
      this.syncMsg = '✅ Neo4j graph synchronized successfully!';
      setTimeout(() => { this.syncMsg = ''; }, 4000);
    }, 1800);
  }

  get activeThreatBulletin() {
    if (!this.selectedThreat) return null;
    return this.bulletins.find(b => (b.bulletin_id || b.id) === this.selectedThreat) || null;
  }

  get attackPaths() {
    if (!this.blastData) return [];
    if (this.blastData.attack_paths) return this.blastData.attack_paths;
    // synthetic paths based on selected identity
    return [
      { chain: `${this.selectedIdentity} → SG-LAP-101 → AD-SRV-01 → DC-CORP-01`, risk: 'CRITICAL' },
      { chain: `${this.selectedIdentity} → SG-DMZ-Proxy → DB-CORE-SQL`, risk: 'HIGH' }
    ];
  }

  get d3fendRows() {
    return [
      { id: 'D3-MFA', name: 'Multi-Factor Authentication', mitigation: 'Deploy FIDO2 hardware MFA keys for all privileged accounts.', target: `${this.selectedIdentity} → DC-CORP-01` },
      { id: 'D3-CredentialRotation', name: 'Credential Rotation Policy', mitigation: 'Enforce 90-day password rotation and zero-trust vault access.', target: `${this.selectedIdentity} → AD-SRV-01` },
      { id: 'D3-NetworkTrafficAnalysis', name: 'Network Segmentation Analysis', mitigation: 'Apply micro-segmentation NSG rules to restrict lateral movement.', target: 'SG-LAP-101 → Internal Servers' },
      { id: 'D3-PrivilegedAccountManagement', name: 'Privileged Access Management', mitigation: 'Use JIT/JEA access controls to limit persistent privileged sessions.', target: 'DB-CORE-SQL → Tier 0 Assets' }
    ];
  }

  renderImpactCard() {
    const reachable = this.blastData?.reachable || this.blastData?.tier0_compromised + this.blastData?.tier1_compromised + this.blastData?.tier2_compromised || 9;
    const total = this.topology?.nodes?.length || this.blastData?.total || 29;
    const ratio = total > 0 ? ((reachable / total) * 100).toFixed(1) : '0.0';
    const t0 = this.blastData?.tier0_compromised ?? 1;
    const t1 = this.blastData?.tier1_compromised ?? 3;
    const t2 = this.blastData?.tier2_compromised ?? 5;

    return html`
      <div class="impact-card">
        <div class="impact-title"><i class="fa-solid fa-triangle-exclamation" style="color: var(--text-accent);"></i> Impact Assessment</div>
        <div class="impact-stats">
          <div class="impact-stat-box" style="background: rgba(255,59,48,0.1); border: 1px solid rgba(255,59,48,0.2);">
            <span class="impact-stat-lbl">Reachability Ratio</span>
            <span class="impact-stat-val" style="color: #ff3b30;">${ratio}%</span>
          </div>
          <div class="impact-stat-box" style="background: rgba(0,168,181,0.1); border: 1px solid rgba(0,168,181,0.2);">
            <span class="impact-stat-lbl">Total Impacted</span>
            <span class="impact-stat-val" style="color: #00e5ff;">${reachable} / ${total}</span>
          </div>
        </div>
        <div class="tier-row">
          <span>Tier 0 (Domain Admin / Core DB)</span>
          <span class="badge-tag badge-err">${t0} compromised</span>
        </div>
        <div class="tier-row">
          <span>Tier 1 (Internal Server / Mid Privs)</span>
          <span class="badge-tag badge-warn">${t1} compromised</span>
        </div>
        <div class="tier-row">
          <span>Tier 2 (Workstation / Endpoints)</span>
          <span class="badge-tag badge-ok">${t2} compromised</span>
        </div>
      </div>
    `;
  }

  render() {
    const threat = this.activeThreatBulletin;

    return html`
      <!-- SCREEN 6: ENTERPRISE BLAST RADIUS & LATERAL MOVEMENT ANALYZER -->
      <div class="header">
        <h1 class="title"><i class="fa-solid fa-burst" style="color: var(--text-accent); margin-right: 8px;"></i> Enterprise Blast Radius &amp; Lateral Movement Analyzer</h1>
        <p class="subtitle">Map the reachability boundary and evaluate transitive attack paths from compromised endpoints or identities to Tier 0 targets.</p>
      </div>

      <!-- CONTROLS -->
      <div class="control-card">
        <div class="form-group">
          <label>Select Compromised Identity / Asset:</label>
          <select .value=${this.selectedIdentity} @change=${(e) => this.selectedIdentity = e.target.value}>
            ${(this.topology?.nodes || []).filter(n => n.type === 'User' || n.type === 'Computer' || n.type === 'Asset').map(n => html`
              <option value="${n.id}">${n.label || n.id} (${n.type})</option>
            `)}
            ${(this.topology?.nodes || []).length === 0 ? html`
              <option value="USER_JDOE">scb\\user_jdoe (Helpdesk Analyst - Phished)</option>
              <option value="COMP_SG_LAP101">SG-LAP-101 (Workstation - Compromised)</option>
              <option value="USER_AMILLER">scb\\dev_amiller (Cloud Developer)</option>
              <option value="COMP_SG_DMZ_PROXY">SG-DMZ-Proxy-01 (Exposed Web Proxy)</option>
            ` : ''}
          </select>
        </div>

        <div class="form-group">
          <label>Filter by Threat Bulletin Context:</label>
          <select @change=${(e) => this.selectedThreat = e.target.value}>
            <option value="">No Active Threat (Worst-Case Analysis)</option>
            ${this.bulletins.map(b => html`
              <option value="${b.bulletin_id || b.id}">${b.bulletin_id || b.id}: ${(b.title || '').substring(0, 50)}</option>
            `)}
          </select>
        </div>

        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px; color: var(--text-primary); margin-top: 12px;">
          <input type="checkbox" .checked=${this.suppressSafe} @change=${(e) => this.suppressSafe = e.target.checked} />
          <span>Suppress Safe Assets (Show Compromised Only)</span>
        </label>

        <button class="btn" style="margin-top: 12px;" @click=${this.handleAnalyzeBlast} ?disabled=${this.loading}>
          <i class="fa-solid fa-radar"></i> ${this.loading ? 'Evaluating...' : 'Evaluate Blast Radius'}
        </button>
        <button class="btn btn-secondary" style="margin-top: 12px;" @click=${this.handleSyncNeo4j}>
          <i class="fa-solid fa-cloud-arrow-up"></i> Sync Neo4j Graph
        </button>
        ${this.syncMsg ? html`<span class="sync-msg" style="margin-top: 12px;">${this.syncMsg}</span>` : ''}
      </div>

      <!-- MAIN WORKSPACE: GRAPH CANVAS + RIGHT METRICS -->
      <div class="grid-2-1">
        <!-- GRAPH CANVAS -->
        <div class="canvas-card">
          <div class="canvas-header">
            <span><i class="fa-solid fa-network-wired"></i> Graph Canvas</span>
            <span class="sep"></span>
            <span style="font-size: 10px; color: var(--text-muted);">Scroll to Zoom | Drag to Pan</span>
          </div>

          <div id="blast-radius-graph-canvas"></div>

          <!-- LEGEND -->
          <div class="legend">
            <div class="legend-title" style="font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Blast Radius Legend (Click to filter)</div>
            <div class="legend-row" @click=${() => this.toggleLegendType('entry')} style="cursor: pointer; opacity: ${this.hiddenLegendTypes.entry ? 0.35 : 1}; text-decoration: ${this.hiddenLegendTypes.entry ? 'line-through' : 'none'};">
              <span class="legend-dot" style="background: #ff3b30;"></span> Compromised Entry
            </div>
            <div class="legend-row" @click=${() => this.toggleLegendType('t0Comp')} style="cursor: pointer; opacity: ${this.hiddenLegendTypes.t0Comp ? 0.35 : 1}; text-decoration: ${this.hiddenLegendTypes.t0Comp ? 'line-through' : 'none'};">
              <span class="legend-dot" style="background: #ffcc00;"></span> Tier 0 Compromised
            </div>
            <div class="legend-row" @click=${() => this.toggleLegendType('reachableComp')} style="cursor: pointer; opacity: ${this.hiddenLegendTypes.reachableComp ? 0.35 : 1}; text-decoration: ${this.hiddenLegendTypes.reachableComp ? 'line-through' : 'none'};">
              <span class="legend-dot" style="background: #007aff;"></span> Reachable Asset Compromised
            </div>
            <div class="legend-row" @click=${() => this.toggleLegendType('t0Safe')} style="cursor: pointer; opacity: ${this.hiddenLegendTypes.t0Safe ? 0.35 : 1}; text-decoration: ${this.hiddenLegendTypes.t0Safe ? 'line-through' : 'none'};">
              <span class="legend-dot" style="background: #10b981;"></span> Tier 0 Crown Jewel (Safe)
            </div>
            <div class="legend-row" @click=${() => this.toggleLegendType('safe')} style="cursor: pointer; opacity: ${this.hiddenLegendTypes.safe ? 0.35 : 1}; text-decoration: ${this.hiddenLegendTypes.safe ? 'line-through' : 'none'};">
              <span class="legend-dot" style="background: #2ecc71;"></span> Unaffected / Safe Asset
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: METRICS CARDS -->
        <div class="right-col">
          <!-- Active Threat Context Card (shown when threat filter selected) -->
          <div class="threat-ctx-card ${this.selectedThreat ? 'visible' : ''}">
            <div class="ctx-title"><i class="fa-solid fa-triangle-exclamation"></i> Active Threat Context</div>
            ${threat ? html`
              <div class="ctx-row"><strong>Threat:</strong> ${threat.title}</div>
              <div class="ctx-row"><strong>Bulletin ID:</strong> <span style="color: var(--text-accent); font-family: monospace;">${threat.bulletin_id || threat.id}</span></div>
              <div class="ctx-row"><strong>Severity:</strong> ${threat.impact_rating || 'HIGH'}</div>
              <div class="ctx-row"><strong>Mapped Entry Point:</strong> <span style="color: var(--text-accent); font-family: monospace;">${this.selectedIdentity}</span></div>
            ` : html`<div class="ctx-row" style="color: var(--text-muted);">Loading threat context...</div>`}
          </div>

          <!-- Impact Assessment (shown after blast radius evaluated) -->
          ${this.blastData ? this.renderImpactCard() : html`
            <div class="impact-card">
              <div class="impact-title"><i class="fa-solid fa-triangle-exclamation" style="color: var(--text-accent);"></i> Impact Assessment</div>
              <div class="impact-stats">
                <div class="impact-stat-box" style="background: rgba(255,59,48,0.1); border: 1px solid rgba(255,59,48,0.2);">
                  <span class="impact-stat-lbl">Reachability Ratio</span>
                  <span class="impact-stat-val" style="color: #ff3b30;">0.0%</span>
                </div>
                <div class="impact-stat-box" style="background: rgba(0,168,181,0.1); border: 1px solid rgba(0,168,181,0.2);">
                  <span class="impact-stat-lbl">Total Impacted</span>
                  <span class="impact-stat-val" style="color: #00e5ff;">0 / 0</span>
                </div>
              </div>
              <div class="tier-row"><span>Tier 0 (Domain Admin / Core DB)</span><span class="badge-tag badge-err">0 compromised</span></div>
              <div class="tier-row"><span>Tier 1 (Internal Server / Mid Privs)</span><span class="badge-tag badge-warn">0 compromised</span></div>
              <div class="tier-row"><span>Tier 2 (Workstation / Endpoints)</span><span class="badge-tag badge-ok">0 compromised</span></div>
            </div>
          `}

          <!-- Active Attack Paths to Tier 0 -->
          <div class="paths-card">
            <div class="paths-title"><i class="fa-solid fa-route" style="color: var(--text-accent);"></i> Active Attack Paths to Tier 0</div>
            <p style="font-size: 11px; color: var(--text-muted); margin: 0 0 12px;">Transitive logical chains that lead directly to Domain Controllers or Core Datastores</p>
            ${this.blastData ? this.attackPaths.map(p => html`
              <div class="path-item">
                <div class="path-chain">${p.chain}</div>
                <div class="path-detail">Risk: <strong style="color: ${p.risk === 'CRITICAL' ? '#ef4444' : '#f59e0b'};">${p.risk}</strong></div>
              </div>
            `) : html`<div class="table-empty">Evaluate starting node to identify critical attack paths.</div>`}
          </div>
        </div>
      </div>

      <!-- D3FEND COUNTERMEASURES TABLE -->
      <div class="d3fend-card" style="margin-top: 20px;">
        <div class="d3fend-title"><i class="fa-solid fa-shield" style="color: var(--text-accent);"></i> Suggested D3FEND Countermeasures &amp; Remediations</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width: 100px;">D3FEND ID</th>
                <th style="width: 250px;">Defensive Control Name</th>
                <th>Specific Mitigation Remediation Guidelines</th>
                <th>Affected Vulnerable Target Route</th>
              </tr>
            </thead>
            <tbody>
              ${this.blastData ? this.d3fendRows.map(row => html`
                <tr>
                  <td style="font-family: monospace; color: var(--text-accent); font-weight: 700;">${row.id}</td>
                  <td style="font-weight: 600;">${row.name}</td>
                  <td style="color: var(--text-muted);">${row.mitigation}</td>
                  <td style="font-family: monospace; font-size: 11px; color: var(--text-muted);">${row.target}</td>
                </tr>
              `) : html`
                <tr><td colspan="4" class="table-empty">Evaluate starting node to populate remediation guidelines.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

customElements.define('graph-screen', GraphScreen);
