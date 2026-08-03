import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';
import { calculateBulletinBlastRadius, fetchBulletins } from '../services/api.js?v=8';

export class ThreatBulletinBlastScreen extends LitElement {
  static properties = {
    bulletinId: { type: String },
    bulletinData: { type: Object },
    bulletinsList: { type: Array },
    loading: { type: Boolean },
    selectedNode: { type: Object }
  };

  static styles = css`
    :host { display: block; font-family: 'Inter', sans-serif; color: var(--text-primary, #e2e8f0); }

    .header-bar {
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border-color, #1e2638);
      padding-bottom: 16px;
    }
    
    .title {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: var(--text-primary, #ffffff);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .subtitle {
      color: var(--text-muted, #94a3b8);
      font-size: 13px;
      margin-top: 4px;
      max-width: 950px;
    }

    /* Action Bar */
    .action-bar {
      display: flex;
      align-items: center;
      gap: 14px;
      background: var(--bg-card, #0d0e12);
      border: 1px solid var(--border-color, #1e2638);
      border-radius: 10px;
      padding: 16px 20px;
      margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .select-box {
      flex: 1;
      background: var(--bg-input, #090d16);
      border: 1px solid var(--border-color, #334155);
      color: var(--text-accent, #00e5ff);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      outline: none;
    }

    .calc-btn {
      background: #00e5ff;
      color: #050811;
      border: none;
      padding: 10px 22px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 0 16px rgba(0, 229, 255, 0.4);
    }
    .calc-btn:hover { background: #38bdf8; transform: translateY(-1px); }

    /* KPI Row */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 10px;
      padding: 16px 20px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .kpi-lbl {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.5px;
    }

    .kpi-val {
      font-size: 28px;
      font-weight: 800;
      font-family: 'Outfit', sans-serif;
      margin-top: 4px;
    }

    /* ENTRY POINTS COMPARISON MATRIX */
    .matrix-card {
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
      margin-top: 14px;
    }

    .ep-card {
      background: #050811;
      border: 1px solid #1e2638;
      border-left: 4px solid #00e5ff;
      border-radius: 8px;
      padding: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .ep-card:hover { border-color: #00e5ff; transform: translateY(-2px); box-shadow: 0 0 14px rgba(0, 229, 255, 0.2); }
    .ep-card.active-ep {
      border-color: #00e5ff !important;
      border-left-color: #00e5ff !important;
      background: rgba(0, 229, 255, 0.12) !important;
      box-shadow: 0 0 18px rgba(0, 229, 255, 0.35);
    }

    .ep-title { font-size: 13px; font-weight: 800; color: #ffffff; }
    .ep-type { font-size: 10px; font-weight: 800; color: #00e5ff; text-transform: uppercase; margin-top: 2px; }
    .ep-risk { font-size: 12px; font-weight: 700; color: #ef4444; margin-top: 6px; }
    .ep-driver { font-size: 11px; color: #94a3b8; margin-top: 4px; font-style: italic; }

    /* GRAPH CONTAINER */
    .graph-card {
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      position: relative;
    }

    .graph-legend-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(5, 8, 17, 0.9);
      border: 1px solid #1e2638;
      border-radius: 8px;
      padding: 10px 16px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .legend-header {
      font-size: 11px;
      font-weight: 800;
      color: #00e5ff;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-items {
      display: flex;
      align-items: center;
      gap: 18px;
      flex-wrap: wrap;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11.5px;
      color: #cbd5e1;
      font-weight: 600;
    }
    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }
    .legend-line {
      width: 22px;
      height: 3px;
      background: #00e5ff;
      border-radius: 2px;
      display: inline-block;
    }

    #bulletin-blast-cy-canvas {
      width: 100%;
      height: 540px;
      background: #050811;
      border: 1px solid #1e2638;
      border-radius: 8px;
      position: relative;
    }

    /* Node Inspector */
    .node-inspector {
      position: absolute;
      bottom: 34px;
      right: 34px;
      width: 290px;
      background: rgba(9, 13, 22, 0.95);
      border: 1px solid #00e5ff;
      border-radius: 8px;
      padding: 14px;
      box-shadow: 0 0 20px rgba(0, 229, 255, 0.25);
      z-index: 100;
    }

    /* Table */
    .table-card {
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 24px;
    }

    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 12px 14px; color: #8a99ad; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #1e2638; background: #0b0f19; font-weight: 700; }
    td { padding: 12px 14px; border-bottom: 1px solid #1e2638; font-size: 12.5px; color: #e2e8f0; vertical-align: middle; }
    tr:hover td { background: rgba(0, 229, 255, 0.03); }

    .ep-badge {
      display: inline-block;
      font-size: 9.5px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(0, 229, 255, 0.15);
      color: #00e5ff;
      border: 1px solid #00e5ff;
      margin-right: 4px;
      margin-bottom: 2px;
    }

    /* Gaps Panel */
    .gaps-card {
      background: rgba(10, 14, 23, 0.95);
      border: 1px solid #1e2638;
      border-radius: 10px;
      padding: 20px;
    }

    .gap-item {
      background: #090d16;
      border: 1px solid #1e2638;
      border-left: 4px solid #ef4444;
      border-radius: 6px;
      padding: 14px;
      margin-bottom: 10px;
    }
  `;

  static properties = {
    bulletinId: { type: String },
    bulletinData: { type: Object },
    bulletinsList: { type: Array },
    loading: { type: Boolean },
    selectedNode: { type: Object },
    selectedEntryPoint: { type: String }
  };

  constructor() {
    super();
    this.bulletinId = "TB-2026-LIVE";
    this.bulletinData = null;
    this.bulletinsList = [];
    this.loading = true;
    this.selectedNode = null;
    this.selectedEntryPoint = 'ALL';
    this.cy = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadBulletins();
    this.loadData();
  }

  updated(changedProperties) {
    if (changedProperties.has('bulletinId') && this.bulletinId) {
      this.selectedEntryPoint = 'ALL';
      this.loadData();
    }
    if (changedProperties.has('bulletinData') || changedProperties.has('selectedEntryPoint')) {
      setTimeout(() => this.renderCytoscapeGraph(), 100);
    }
  }

  async loadBulletins() {
    try {
      const list = await fetchBulletins();
      this.bulletinsList = list || [];
      if (this.bulletinsList.length > 0) {
        const firstId = this.bulletinsList[0].bulletin_id || this.bulletinsList[0].id;
        if (firstId && (this.bulletinId === 'TB-2026-LIVE' || !this.bulletinId)) {
          this.bulletinId = firstId;
        }
      }
    } catch (e) {
      console.error("Error loading bulletins:", e);
    }
  }

  async loadData() {
    this.loading = true;
    try {
      this.bulletinData = await calculateBulletinBlastRadius(this.bulletinId);
    } catch (e) {
      console.error("Error calculating Bulletin Blast Radius:", e);
    } finally {
      this.loading = false;
    }
  }

  renderCytoscapeGraph() {
    const container = this.shadowRoot.getElementById('bulletin-blast-cy-canvas');
    if (!container || !window.cytoscape) return;

    const data = this.bulletinData || {};
    const rawEntryPoints = data.entry_points_summary || [];
    const rawAssets = data.reachable_assets || [];

    const isAll = !this.selectedEntryPoint || this.selectedEntryPoint === 'ALL';

    const entryPoints = isAll ? rawEntryPoints : rawEntryPoints.filter(ep => ep.entry_id === this.selectedEntryPoint);
    const assets = isAll ? rawAssets : rawAssets.filter(a => (a.entry_points || []).includes(this.selectedEntryPoint) || a.entity === this.selectedEntryPoint);

    const elements = [];

    const epColors = ['#00e5ff', '#f43f5e', '#10b981', '#f59e0b', '#a855f7'];

    // 1. Entry Point Nodes
    entryPoints.forEach((ep, i) => {
      elements.push({
        data: {
          id: ep.entry_id,
          label: `ENTRY: ${ep.entry_id}`,
          type: ep.entry_type,
          isEntry: true,
          color: epColors[i % epColors.length],
          size: 55
        }
      });
    });

    // 2. Reachable Target Asset Nodes & Edges
    assets.forEach((a, idx) => {
      const isEntryNode = entryPoints.some(ep => ep.entry_id === a.entity);
      if (!isEntryNode) {
        elements.push({
          data: {
            id: a.entity,
            label: a.entity,
            type: a.type,
            hop: a.hop_depth,
            risk: a.risk_contribution,
            entryPoints: a.entry_points,
            color: a.entry_points && a.entry_points.length > 1 ? '#ef4444' : '#38bdf8',
            size: 42
          }
        });
      }

      // Connect to originating entry point(s)
      const epSources = (a.entry_points || []).filter(epId => isAll || epId === this.selectedEntryPoint);
      const sourcesToUse = epSources.length > 0 ? epSources : [entryPoints[0]?.entry_id || "USER_JDOE"];
      sourcesToUse.forEach((epId, epIdx) => {
        elements.push({
          data: {
            id: `edge_${idx}_${epIdx}`,
            source: epId,
            target: a.entity,
            label: a.relationship || 'COMPROMISES'
          }
        });
      });
    });

    if (this.cy) {
      this.cy.destroy();
    }

    this.cy = window.cytoscape({
      container: container,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(label)',
            'color': '#ffffff',
            'font-size': '11px',
            'font-weight': 'bold',
            'text-valign': 'bottom',
            'text-margin-y': '6px',
            'width': 'data(size)',
            'height': 'data(size)',
            'border-width': '2px',
            'border-color': '#ffffff',
            'shadow-blur': '14px',
            'shadow-color': 'data(color)'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '9px',
            'color': '#94a3b8',
            'text-background-color': '#050811',
            'text-background-opacity': 0.85,
            'text-background-padding': '2px'
          }
        }
      ],
      layout: {
        name: 'cose',
        directed: true,
        padding: 50,
        nodeRepulsion: 6000,
        idealEdgeLength: 100
      }
    });

    this.cy.on('tap', 'node', (evt) => {
      this.selectedNode = evt.target.data();
    });
  }

  render() {
    const data = this.bulletinData || {};
    const entryPoints = data.entry_points_summary || [];
    const assets = data.reachable_assets || [];
    const gaps = data.defense_gaps || [];
    const isAll = !this.selectedEntryPoint || this.selectedEntryPoint === 'ALL';

    return html`
      <div>
        <!-- HEADER -->
        <div class="header-bar">
          <div class="title">
            <i class="fa-solid fa-layer-group" style="color: #00e5ff;"></i> Threat Bulletin All-Entry-Points Cumulative Blast Radius
          </div>
          <div class="subtitle">
            Execute 5-Hop Recursive CTE Graph Traversal across ALL compromised entry points linked to a Threat Bulletin, computing cumulative risk scores and multi-entry network graph impact.
          </div>
        </div>

        <!-- ACTION BAR WITH SELECTED THREAT CONTEXT -->
        <div class="action-bar" style="flex-direction: column; align-items: stretch; gap: 14px;">
          <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
            <label style="font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Select Threat Bulletin:</label>
            <select class="select-box" style="flex: 1;" .value=${this.bulletinId} @change=${(e) => { this.bulletinId = e.target.value; this.loadData(); }}>
              <option value="TB-2026-LIVE">TB-2026-LIVE (Active M365 & Active Directory Compromise)</option>
              ${this.bulletinsList.map(b => html`
                <option value="${b.bulletin_id || b.id}">${b.bulletin_id || b.id}: ${(b.title || '').substring(0, 50)}</option>
              `)}
            </select>
            <button class="calc-btn" @click=${this.loadData} ?disabled=${this.loading}>
              <i class="fa-solid fa-calculator"></i> ${this.loading ? 'Calculating...' : `Calculate Blast Radius for ${this.bulletinId}`}
            </button>
          </div>

          <!-- SELECTED THREAT CONTEXT BANNER -->
          <div style="background: rgba(0, 229, 255, 0.06); border: 1px solid #00e5ff; border-radius: 8px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #00e5ff; text-transform: uppercase; letter-spacing: 0.5px;">ACTIVE SELECTED THREAT BULLETIN</div>
              <div style="font-size: 15px; font-weight: 800; color: #ffffff; margin-top: 2px;">
                <span style="color: #00e5ff;">[${data.bulletin_id || this.bulletinId}]</span> ${data.bulletin_title || 'Threat Bulletin Analysis'}
              </div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <span style="font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 4px; background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444;">
                <i class="fa-solid fa-triangle-exclamation"></i> SEVERITY: ${data.impact_rating || 'CRITICAL'}
              </span>
              <span style="font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 4px; background: rgba(0, 229, 255, 0.15); color: #00e5ff; border: 1px solid #00e5ff;">
                <i class="fa-solid fa-user-secret"></i> ACTOR: ${data.threat_actors || 'TeamPCP'}
              </span>
            </div>
          </div>
        </div>

        <!-- KPI ROW -->
        <div class="kpi-row">
          <div class="kpi-card" style="border-color: #ef4444;">
            <div class="kpi-lbl" style="color: #ef4444;">Cumulative Threat Risk Score</div>
            <div class="kpi-val" style="color: #ef4444;">${data.cumulative_score || 0.0}</div>
            <div style="font-size: 10.5px; color: #94a3b8; margin-top: 2px;">Formula: ∑(Individual Entry Scores)</div>
          </div>
          <div class="kpi-card" style="border-color: #00e5ff;">
            <div class="kpi-lbl" style="color: #00e5ff;">Compromised Entry Points</div>
            <div class="kpi-val" style="color: #00e5ff;">${data.total_entry_points || 0} Entry Points</div>
          </div>
          <div class="kpi-card" style="border-color: #f59e0b;">
            <div class="kpi-lbl" style="color: #f59e0b;">Total Reachable Assets</div>
            <div class="kpi-val" style="color: #f59e0b;">${data.total_combined_reachable_assets || 0} Assets</div>
          </div>
          <div class="kpi-card" style="border-color: #38bdf8;">
            <div class="kpi-lbl" style="color: #38bdf8;">Max Traversal Depth</div>
            <div class="kpi-val" style="color: #38bdf8;">${data.max_hop_depth || 0} Hops</div>
          </div>
        </div>

        <!-- ENTRY POINTS RISK COMPARISON & SELECTION MATRIX -->
        <div class="matrix-card">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; display: flex; align-items: center; justify-content: space-between;">
            <span><i class="fa-solid fa-network-wired" style="color:#00e5ff;"></i> Threat Bulletin Entry Points (Click to Filter Blast Radius)</span>
            <span style="font-size: 12px; color: #8a99ad;">
              Active View: <strong style="color: #00e5ff;">${isAll ? 'ALL ENTRY POINTS (CUMULATIVE)' : this.selectedEntryPoint}</strong>
            </span>
          </div>

          <div class="matrix-grid">
            <!-- ALL ENTRY POINTS CUMULATIVE CARD -->
            <div class="ep-card ${isAll ? 'active-ep' : ''}" @click=${() => this.selectedEntryPoint = 'ALL'}>
              <div class="ep-title"><i class="fa-solid fa-globe"></i> ALL ENTRY POINTS (CUMULATIVE)</div>
              <div class="ep-type" style="color: #00e5ff;">Unified Cumulative View</div>
              <div class="ep-risk">Cumulative Score: <strong>${data.cumulative_score || 0.0}</strong> | Reach: ${assets.length} Assets</div>
              <div class="ep-driver">Combined graph traversal across all ${entryPoints.length} threat entry vectors</div>
            </div>

            <!-- INDIVIDUAL ENTRY POINT CARDS -->
            ${entryPoints.map(ep => html`
              <div class="ep-card ${this.selectedEntryPoint === ep.entry_id ? 'active-ep' : ''}" @click=${() => this.selectedEntryPoint = ep.entry_id}>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div class="ep-title">${ep.entry_name}</div>
                  ${this.selectedEntryPoint === ep.entry_id ? html`
                    <span style="font-size: 9.5px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: #00e5ff; color: #050811;">SELECTED</span>
                  ` : ''}
                </div>
                <div class="ep-type">${ep.entry_type}</div>
                <div class="ep-risk">Individual Score: <strong>${ep.individual_score}</strong> | Reach: ${ep.reachable_count} Assets</div>
                <div class="ep-driver">Risk Driver: ${ep.primary_risk}</div>
              </div>
            `)}
          </div>
        </div>

        <!-- GRAPH CONTAINER -->
        <div class="graph-card">
          <div style="font-size: 16px; font-weight: 700; color: #00e5ff; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
            <span><i class="fa-solid fa-circle-nodes"></i> Blast Radius Network Graph: <strong style="color: #ffffff;">${isAll ? 'All Threat Entry Points' : `Entry Vector [${this.selectedEntryPoint}]`}</strong></span>
            <span style="font-size: 12px; color: #8a99ad;">Bulletin Context: <strong style="color: #00e5ff;">${this.bulletinId}</strong></span>
          </div>

          <!-- GRAPH VISUAL LEGEND BAR -->
          <div class="graph-legend-bar">
            <div class="legend-header"><i class="fa-solid fa-map"></i> GRAPH LEGEND:</div>
            <div class="legend-items">
              <div class="legend-item">
                <span class="legend-dot" style="background: #00e5ff; box-shadow: 0 0 8px #00e5ff;"></span>
                <span>Compromised Entry Point (Hop 0)</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background: #38bdf8;"></span>
                <span>Reachable Target Asset</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background: #ef4444; box-shadow: 0 0 8px #ef4444;"></span>
                <span>Critical Multi-Vector Overlap Asset</span>
              </div>
              <div class="legend-item">
                <span class="legend-line"></span>
                <span>Exploit / Propagation Vector Link</span>
              </div>
            </div>
          </div>

          <div id="bulletin-blast-cy-canvas"></div>

          <!-- NODE INSPECTOR POPOVER -->
          ${this.selectedNode ? html`
            <div class="node-inspector">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e2638; padding-bottom:6px; margin-bottom:8px;">
                <span style="font-weight:800; color:#00e5ff; font-size:12px;">Asset Node Inspector</span>
                <button @click=${() => this.selectedNode = null} style="background:none; border:none; color:#94a3b8; cursor:pointer;">✕</button>
              </div>
              <div style="font-weight:700; color:#ffffff; font-size:13px;">${this.selectedNode.id}</div>
              <div style="font-size:11px; color:#8a99ad; text-transform:uppercase;">${this.selectedNode.type}</div>
              <div style="margin-top:8px; font-size:11.5px; color:#cbd5e1;">
                <div>Depth: <strong style="color:#00e5ff;">Hop ${this.selectedNode.hop || 0}</strong></div>
                <div>Risk Contribution: <strong style="color:#ef4444;">+${this.selectedNode.risk || 0}</strong></div>
                <div>Originating Entry Points: ${(this.selectedNode.entryPoints || []).join(', ') || 'Direct'}</div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- COMBINED ASSETS TABLE -->
        <div class="table-card">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
            <span>Reachable Enterprise Assets List for <strong style="color: #00e5ff;">${isAll ? 'All Entry Vectors' : this.selectedEntryPoint}</strong></span>
            <span style="font-size: 12px; color: #8a99ad;">${(isAll ? assets : assets.filter(a => (a.entry_points || []).includes(this.selectedEntryPoint) || a.entity === this.selectedEntryPoint)).length} Assets Impacted</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Target Asset Entity</th>
                <th>Asset Type</th>
                <th>Relationship Type</th>
                <th>Hop Depth</th>
                <th>Compromised Via (Entry Points)</th>
                <th>Risk Contribution</th>
              </tr>
            </thead>
            <tbody>
              ${(isAll ? assets : assets.filter(a => (a.entry_points || []).includes(this.selectedEntryPoint) || a.entity === this.selectedEntryPoint)).map(a => html`
                <tr>
                  <td><strong style="color: #38bdf8;">${a.entity}</strong></td>
                  <td><span style="font-size: 11px; font-weight: 700; color: #8a99ad;">${a.type}</span></td>
                  <td><code style="font-size: 11px; color: #00e5ff;">${a.relationship}</code></td>
                  <td><span style="font-weight: 700; color: #ffffff;">Hop ${a.hop_depth}</span></td>
                  <td>
                    ${(a.entry_points || []).map(ep => html`<span class="ep-badge" style="${ep === this.selectedEntryPoint ? 'border-color: #00e5ff; background: rgba(0, 229, 255, 0.2);' : ''}">${ep}</span>`)}
                  </td>
                  <td><strong style="color: #ef4444;">+${a.risk_contribution}</strong></td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>

        <!-- D3FEND GAPS -->
        <div class="gaps-card">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-shield-cat" style="color: #ef4444;"></i> MITRE D3FEND Countermeasure Gap Audit Findings
          </div>

          ${gaps.map(g => html`
            <div class="gap-item">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <span style="font-weight:800; color:#ef4444; font-size:12px;">${g.code}</span>
                  <span style="font-weight:700; color:#ffffff; font-size:13px; margin-left:8px;">${g.name}</span>
                </div>
                <span style="font-size:10px; font-weight:800; color:#ef4444; background:rgba(239,68,68,0.15); padding:2px 8px; border-radius:4px; border:1px solid #ef4444;">${g.severity}</span>
              </div>
              <div style="font-size:12px; color:#94a3b8; margin-top:6px;">${g.finding}</div>
              <div style="font-size:12px; color:#10b981; font-weight:600; margin-top:6px; background:rgba(16,185,129,0.08); padding:8px 10px; border-radius:4px;">
                <i class="fa-solid fa-wrench"></i> Actionable Recommendation: ${g.recommendation}
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }
}

customElements.define('threat-bulletin-blast-screen', ThreatBulletinBlastScreen);
