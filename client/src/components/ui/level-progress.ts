import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Level } from '@irl/shared';
import { renderIcon } from '../../utilities/icons.js';
import { levelStyles } from '../../utilities/design-tokens.js';

/**
 * A component displaying user's current level and progress to the next level.
 *
 * Features:
 * - Gradient background with brand colors
 * - Level icon and name
 * - Total points display
 * - Progress bar to next level
 * - Max level celebration message
 *
 * @example
 * html`<level-progress
 *   .currentLevel=${currentLevel}
 *   .nextLevel=${nextLevel}
 *   .totalPoints=${totalPoints}
 *   .progressPercent=${progressPercent}
 * ></level-progress>`
 */
@customElement('level-progress')
export class LevelProgress extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @property({ type: Object })
  currentLevel: Level | null = null;

  @property({ type: Object })
  nextLevel: Level | null = null;

  @property({ type: Number })
  totalPoints = 0;

  @property({ type: Number })
  progressPercent = 0;

  render() {
    const { currentLevel, nextLevel, totalPoints, progressPercent } = this;
    const isMaxLevel = !nextLevel;

    return html`
      <div class="${levelStyles.container}">
        <!-- Level Header -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <div class="${levelStyles.icon} text-3xl">
              ${renderIcon(currentLevel?.iconName || 'star')}
            </div>
            <div class="flex flex-col gap-1">
              <div class="text-sm opacity-90 font-medium">
                ${currentLevel ? `Level ${currentLevel.levelNumber}` : 'No Level Yet'}
              </div>
              <div class="text-2xl font-bold">
                ${currentLevel?.name || 'Get Started!'}
              </div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold leading-none">${totalPoints}</div>
            <div class="text-sm opacity-90 mt-1">Total Points</div>
          </div>
        </div>

        <!-- Progress Section -->
        ${!isMaxLevel && nextLevel
          ? html`
              <div class="mt-6">
                <div class="flex justify-between items-center mb-3">
                  <span class="text-sm opacity-90">
                    Next: Level ${nextLevel.levelNumber} - ${nextLevel.name}
                  </span>
                  <span class="text-sm opacity-90">${progressPercent}%</span>
                </div>
                <div class="${levelStyles.progressBar.container}">
                  <div
                    class="${levelStyles.progressBar.fill}"
                    style="width: ${progressPercent}%"
                  ></div>
                </div>
                <div class="text-right mt-2 text-xs opacity-90">
                  ${nextLevel.pointsRequired - totalPoints} points to go
                </div>
              </div>
            `
          : html`
              <div class="${levelStyles.maxLevelMessage}">
                🎉 You've reached the maximum level! Amazing work!
              </div>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'level-progress': LevelProgress;
  }
}
