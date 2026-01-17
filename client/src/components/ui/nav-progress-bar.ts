import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { apiContext } from '../../contexts/api-context.js';
import type { ApiClient } from '../../services/api-client.js';
import type { UserStats } from '@irl/shared';
import { ROUTES } from '../../constants.js';

@customElement('nav-progress-bar')
export class NavProgressBar extends LitElement {
  // Disable Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @state()
  private stats: UserStats | null = null;

  @state()
  private loading = true;

  connectedCallback() {
    super.connectedCallback();
    this.loadStats();
  }

  private async loadStats() {
    if (!this.api) {
      this.loading = false;
      return;
    }

    try {
      const response = await this.api.getUserStats();
      if (response.success && response.data) {
        this.stats = response.data;
      }
    } catch (error) {
      // Silent fail - progress bar is optional UI enhancement
      console.error('Failed to fetch user stats:', error);
    } finally {
      this.loading = false;
    }
  }

  private handleClick(e: Event) {
    e.preventDefault();
    window.history.pushState({}, '', ROUTES.ACHIEVEMENTS);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private getTooltipText(): string {
    if (!this.stats) return '';
    const levelName = this.stats.currentLevel?.name || 'No Level';
    return `${levelName} - ${this.stats.totalPoints} pts (${this.stats.progressPercent}%)`;
  }

  render() {
    // Don't render anything while loading or if no stats
    if (this.loading || !this.stats) {
      return html``;
    }

    // Clamp progressPercent to valid range for safe CSS injection
    const safeProgress = Math.max(0, Math.min(100, this.stats.progressPercent || 0));

    return html`
      <div
        @click=${this.handleClick}
        title=${this.getTooltipText()}
        class="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden cursor-pointer hover:brightness-110 transition-all"
      >
        <div
          class="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
          style="width: ${safeProgress}%"
        ></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nav-progress-bar': NavProgressBar;
  }
}
