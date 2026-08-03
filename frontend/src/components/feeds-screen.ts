import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { fetchFeeds, toggleFeed, fetchBulletins } from '../services/api.js';

@customElement('feeds-screen')
export class FeedsScreen extends LitElement {
  static styles = css`
    :host { display: block; color: #f0f4f8; }
    .header { margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .card { background: rgba(13, 17, 26, 0.85); border: 1px solid #1e2638; border-radius: 10px; padding: 16px; }
    .feed-name { font-weight: 700; color: #fff; margin-bottom: 6px; }
    .feed-url { font-size: 12px; color: #00e5ff; font-family: monospace; }
  `;

  @state() feeds: any[] = [];
  @state() bulletins: any[] = [];

  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  async loadData() {
    try {
      this.feeds = await fetchFeeds();
      this.bulletins = await fetchBulletins();
    } catch (e) {
      console.error(e);
    }
  }

  async handleToggle(feedId: string, enabled: boolean) {
    await toggleFeed(feedId, !enabled);
    this.loadData();
  }

  render() {
    return html`
      <div class="header">
        <h1 style="font-size: 24px; color: #fff;">External Feeds & Cyber Threat Intelligence (CTI)</h1>
        <p style="color: #8a99ad;">37 Configured Identity Feed Collectors and RSS Threat Bulletins stored in SQL Server.</p>
      </div>

      <h2>Configured Collectors</h2>
      <div class="grid">
        ${this.feeds.map(f => html`
          <div class="card">
            <div class="feed-name">${f.name}</div>
            <div class="feed-url">${f.url}</div>
            <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; color: #8a99ad;">Category ${f.category}</span>
              <button class="btn" style="padding: 4px 10px; font-size: 11px; background: ${f.enabled ? '#00cc88' : '#334155'}; color: #fff; border: none; border-radius: 4px; cursor: pointer;"
                      @click=${() => this.handleToggle(f.feed_id, f.enabled)}>
                ${f.enabled ? 'ACTIVE' : 'DISABLED'}
              </button>
            </div>
          </div>
        `)}
      </div>

      <h2>Latest CTI Threat Bulletins</h2>
      <div class="grid">
        ${this.bulletins.map(b => html`
          <div class="card">
            <div style="font-weight: 700; color: #00e5ff; margin-bottom: 6px;">${b.title}</div>
            <div style="font-size: 12px; color: #c0cdf0; margin-bottom: 8px;">${b.summary || b.content}</div>
            <div style="font-size: 11px; color: #8a99ad;">Created: ${b.created_at} | Rating: ${b.impact_rating}</div>
          </div>
        `)}
      </div>
    `;
  }
}
