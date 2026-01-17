import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { UserStats } from '@irl/shared';
import { renderIcon } from '../../utilities/icons.js';

@customElement('user-stats-widget')
export class UserStatsWidget extends LitElement {
  @property({ type: Object })
  stats: UserStats | null = null;

  @property({ type: Boolean })
  loading = false;

  static styles = css`
    :host {
      display: block;
    }

    .stats-container {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .stats-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .stats-icon {
      width: 2.5rem;
      height: 2.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .stats-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 0.5rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #7c3aed;
      line-height: 1;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 500;
    }

    .level-item {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 0.5rem;
    }

    .level-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .level-icon-small {
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      font-size: 1rem;
    }

    .level-text {
      display: flex;
      flex-direction: column;
    }

    .level-number-small {
      font-size: 0.75rem;
      opacity: 0.9;
    }

    .level-name-small {
      font-size: 1rem;
      font-weight: 700;
    }

    .level-progress-mini {
      width: 6rem;
      height: 0.5rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      overflow: hidden;
    }

    .level-progress-fill {
      height: 100%;
      background: #10b981;
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    .loading-state {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
    }

    .view-all-link {
      margin-top: 1rem;
      text-align: center;
    }

    .view-all-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: #7c3aed;
      color: white;
      border-radius: 0.5rem;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.875rem;
      transition: background 0.2s;
    }

    .view-all-button:hover {
      background: #6d28d9;
    }
  `;

  render() {
    if (this.loading) {
      return html`
        <div class="stats-container">
          <div class="loading-state">
            ${renderIcon('spinner')} Loading stats...
          </div>
        </div>
      `;
    }

    if (!this.stats) {
      return html`
        <div class="stats-container">
          <div class="loading-state">No stats available</div>
        </div>
      `;
    }

    const { stats } = this;
    const completionRate = stats.achievementCount > 0
      ? Math.round((stats.completedAchievementCount / stats.achievementCount) * 100)
      : 0;

    return html`
      <div class="stats-container">
        <div class="stats-header">
          <div class="stats-icon">
            ${renderIcon('chart-bar')}
          </div>
          <div class="stats-title">Your Progress</div>
        </div>

        <div class="stats-grid">
          ${stats.currentLevel ? html`
            <div class="level-item">
              <div class="level-info">
                <div class="level-icon-small">
                  ${renderIcon(stats.currentLevel.iconName || 'star')}
                </div>
                <div class="level-text">
                  <div class="level-number-small">Level ${stats.currentLevel.levelNumber}</div>
                  <div class="level-name-small">${stats.currentLevel.name}</div>
                </div>
              </div>
              ${stats.nextLevel ? html`
                <div class="level-progress-mini">
                  <div class="level-progress-fill" style="width: ${stats.progressPercent}%"></div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <div class="stat-item">
            <div class="stat-value">${stats.totalPoints}</div>
            <div class="stat-label">Total Points</div>
          </div>

          <div class="stat-item">
            <div class="stat-value">${completionRate}%</div>
            <div class="stat-label">Achievements</div>
          </div>
        </div>

        <div class="view-all-link">
          <a href="/achievements" class="view-all-button">
            ${renderIcon('trophy')} View All Achievements
          </a>
        </div>
      </div>
    `;
  }
}
