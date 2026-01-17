import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Level } from '@irl/shared';
import { renderIcon } from '../../utilities/icons.js';

@customElement('level-progress')
export class LevelProgress extends LitElement {
  @property({ type: Object })
  currentLevel: Level | null = null;

  @property({ type: Object })
  nextLevel: Level | null = null;

  @property({ type: Number })
  totalPoints = 0;

  @property({ type: Number })
  progressPercent = 0;

  static styles = css`
    :host {
      display: block;
    }

    .level-progress-container {
      padding: 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 0.75rem;
      color: white;
    }

    .level-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .level-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .level-icon {
      width: 3.5rem;
      height: 3.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      font-size: 2rem;
    }

    .level-text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .level-number {
      font-size: 0.875rem;
      opacity: 0.9;
      font-weight: 500;
    }

    .level-name {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .total-points {
      text-align: right;
    }

    .points-value {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
    }

    .points-label {
      font-size: 0.875rem;
      opacity: 0.9;
      margin-top: 0.25rem;
    }

    .progress-section {
      margin-top: 1.5rem;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .next-level-text {
      font-size: 0.875rem;
      opacity: 0.9;
    }

    .progress-bar-container {
      width: 100%;
      height: 1rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
      border-radius: 9999px;
      transition: width 0.5s ease;
    }

    .max-level-message {
      text-align: center;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      margin-top: 1rem;
    }
  `;

  render() {
    const { currentLevel, nextLevel, totalPoints, progressPercent } = this;
    const isMaxLevel = !nextLevel;

    return html`
      <div class="level-progress-container">
        <div class="level-header">
          <div class="level-info">
            <div class="level-icon">
              ${renderIcon(currentLevel?.iconName || 'star')}
            </div>
            <div class="level-text">
              <div class="level-number">
                ${currentLevel ? `Level ${currentLevel.levelNumber}` : 'No Level Yet'}
              </div>
              <div class="level-name">
                ${currentLevel?.name || 'Get Started!'}
              </div>
            </div>
          </div>
          <div class="total-points">
            <div class="points-value">${totalPoints}</div>
            <div class="points-label">Total Points</div>
          </div>
        </div>

        ${!isMaxLevel ? html`
          <div class="progress-section">
            <div class="progress-header">
              <span class="next-level-text">
                Next: Level ${nextLevel!.levelNumber} - ${nextLevel!.name}
              </span>
              <span class="next-level-text">
                ${progressPercent}%
              </span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div style="text-align: right; margin-top: 0.5rem; font-size: 0.75rem; opacity: 0.9;">
              ${nextLevel!.pointsRequired - totalPoints} points to go
            </div>
          </div>
        ` : html`
          <div class="max-level-message">
            🎉 You've reached the maximum level! Amazing work!
          </div>
        `}
      </div>
    `;
  }
}
