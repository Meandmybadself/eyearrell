import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { AchievementWithCompletion } from '@irl/shared';
import { renderIcon } from '../../utilities/icons.js';

@customElement('achievement-card')
export class AchievementCard extends LitElement {
  @property({ type: Object })
  achievement!: AchievementWithCompletion;

  static styles = css`
    :host {
      display: block;
    }

    .achievement-card {
      position: relative;
      padding: 1.5rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      background: white;
      transition: all 0.2s;
    }

    .achievement-card.completed {
      border-color: #10b981;
      background: #f0fdf4;
    }

    .achievement-card.locked {
      opacity: 0.6;
    }

    .achievement-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    .achievement-icon {
      flex-shrink: 0;
      width: 3rem;
      height: 3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      font-size: 1.5rem;
    }

    .achievement-icon.completed {
      background: #10b981;
      color: white;
    }

    .achievement-icon.locked {
      background: #e5e7eb;
      color: #9ca3af;
    }

    .achievement-info {
      flex: 1;
      min-width: 0;
    }

    .achievement-name {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 0.25rem;
    }

    .achievement-description {
      font-size: 0.875rem;
      color: #6b7280;
      line-height: 1.5;
    }

    .achievement-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .achievement-points {
      font-size: 0.875rem;
      font-weight: 600;
      color: #7c3aed;
    }

    .achievement-category {
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      background: #f3f4f6;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .completed-badge {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: #10b981;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .completed-date {
      font-size: 0.75rem;
      color: #059669;
      margin-top: 0.5rem;
    }
  `;

  private getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      ONBOARDING: '#3b82f6',
      PROFILE: '#8b5cf6',
      DISCOVERY: '#ec4899',
      SOCIAL: '#f59e0b',
      PRIVACY: '#10b981',
      ENGAGEMENT: '#ef4444'
    };
    return colors[category] || '#6b7280';
  }

  render() {
    const { achievement } = this;
    const isCompleted = achievement.completed;
    const iconName = achievement.iconName || 'trophy';

    return html`
      <div class="achievement-card ${isCompleted ? 'completed' : 'locked'}">
        ${isCompleted ? html`<div class="completed-badge">✓ Completed</div>` : ''}

        <div class="achievement-header">
          <div class="achievement-icon ${isCompleted ? 'completed' : 'locked'}">
            ${renderIcon(iconName)}
          </div>
          <div class="achievement-info">
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
            ${isCompleted && achievement.completedAt ? html`
              <div class="completed-date">
                Earned ${new Date(achievement.completedAt).toLocaleDateString()}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="achievement-footer">
          <div class="achievement-points">+${achievement.points} points</div>
          <div class="achievement-category" style="background-color: ${this.getCategoryColor(achievement.category)}20; color: ${this.getCategoryColor(achievement.category)}">
            ${achievement.category}
          </div>
        </div>
      </div>
    `;
  }
}
