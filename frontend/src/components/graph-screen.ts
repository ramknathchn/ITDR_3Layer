import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { fetchGraphTopology, fetchBlastRadius } from '../services/api.js';

@customElement('graph-screen')
export class GraphScreen extends LitElement {
  static styles = css`
    :host { display: block; color: #f0f4f8; }
    .header { margin-bottom: 20px; }
    .canvas-container {
      background: #06080d;
      border: 1px solid #1e2638;
      border-radius: 12px;
      height: 480px;
      position: relative;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .graph-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
      padding: 20px;
      width: 100%;
      height: 100%;
      overflow-y: auto;
    }
    .node-card {
      background: rgba(13, 17, 26, 0.9);
      border: 1px solid #1e2638;
      border-radius: 8px;
      padding: 14px;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .node-card:hover { border-color: #00e5ff; }
    .node-type {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #00e5ff;
      margin-bottom: 4px;
    }
    .node-title { font-weight: 600; font-size: 14px; color: #fff; }
    .blast-box {
      margin-top: 24px;
      background: rgba(13, 17, 26, 0.85);
      border: 1px solid #1e2638;
      border-radius: 10px;
      padding: 20px;
    }
    input {
      background: #090c12;
      border: 1px solid #1e2638;
      color: #fff;
      padding: 8px 14px;
      border-radius: 6px;
      width: 300px;
    }
    .btn {
      padding: 8px 16px;
      background: #00b4d8;
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
  `;

  @state() graphData: any = { nodes: [], edges: [], source: '' };
  @state() queryIdentity = 'john.smith@scb.com';
  @state() blastRes: any = null;

  connectedCallback() {
    super.connectedCallback();
    this.loadGraph();
  }

  async loadGraph() {
    try {
      this.graphData = await fetchGraphTopology();
    } catch (e) {
      console.error(e);
    }
  }

  async handleBlastRadius() {
    try {
      this.blastRes = await fetchBlastRadius(this.queryIdentity);
    } catch (e) {
      console.error(e);
    }
  }

  render() {
    return html`
      <div class="header">
        <h1 style="font-size: 24px; color: #fff;">Knowledge Graph & Blast Radius Visualizer</h1>
        <p style="color: #8a99ad;">
          Neo4j Graph Database Topology (<span style="color: #00e5ff;">Source: ${this.graphData.source || 'neo4j'}</span>) mapping Users, Groups, Assets, and MITRE D3FEND Countermeasures.
        </p>
      </div>

      <div class="canvas-container">
        <div class="graph-grid">
          ${this.graphData.nodes?.map((n: any) => html`
            <div class="node-card">
              <div class="node-type">${n.type}</div>
              <div class="node-title">${n.label || n.id}</div>
              <div style="font-size: 11px; color: #8a99ad; margin-top: 6px;">ID: ${n.id}</div>
            </div>
          `)}
        </div>
      </div>

      <div class="blast-box">
        <h3>⚡ Blast Radius Analyzer</h3>
        <p style="color: #8a99ad; margin-bottom: 12px; font-size: 13px;">Enter compromised user identity to calculate reachable cloud assets and groups from Neo4j Graph.</p>
        <div style="display: flex; gap: 10px;">
          <input type="text" .value=${this.queryIdentity} @input=${(e: any) => this.queryIdentity = e.target.value} />
          <button class="btn" @click=${this.handleBlastRadius}>Calculate Blast Radius</button>
        </div>

        ${this.blastRes ? html`
          <div style="margin-top: 16px; padding: 14px; background: rgba(0,229,255,0.05); border: 1px solid #00e5ff; border-radius: 8px;">
            <div style="font-weight: 700; color: #00e5ff; margin-bottom: 8px;">
              Blast Radius for ${this.blastRes.identity}: ${this.blastRes.blast_radius_count} Reachable Resources
            </div>
            <ul style="padding-left: 20px; color: #c0cdf0;">
              ${this.blastRes.resources?.map((r: any) => html`
                <li><strong>[${r.type}]</strong> ${r.id}</li>
              `)}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }
}
