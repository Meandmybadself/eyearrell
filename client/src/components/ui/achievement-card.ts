import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { AchievementWithCompletion } from '@irl/shared';
import { renderIcon } from '../../utilities/icons.js';
import { achievementStyles, textColors, backgroundColors, buttonStyles } from '../../utilities/design-tokens.js';

/**
 * A card component for displaying achievement information.
 *
 * Displays:
 * - Achievement icon
 * - Name and description
 * - Completion status (completed/locked)
 * - Points value
 * - Category badge
 * - Completion date (if completed)
 *
 * @example
 * html`<achievement-card .achievement=${achievement}></achievement-card>`
 */
@customElement('achievement-card')
export class AchievementCard extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @property({ type: Object })
  achievement!: AchievementWithCompletion;

  render() {
    const { achievement } = this;
    const isCompleted = achievement.completed;
    const iconName = achievement.iconName || 'trophy';

    // Card styling based on completion state
    const cardClasses = isCompleted
      ? `relative p-6 border rounded-lg transition-all ${achievementStyles.card.completed.border} ${achievementStyles.card.completed.bg}`
      : `relative p-6 border rounded-lg transition-all ${achievementStyles.card.locked.border} ${achievementStyles.card.locked.bg} opacity-60`;

    // Icon styling based on completion state
    const iconClasses = isCompleted
      ? `flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full text-2xl ${achievementStyles.card.completed.icon}`
      : `flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full text-2xl ${achievementStyles.card.locked.icon}`;

    return html`
      <div class="${cardClasses}">
        ${isCompleted
          ? html`
              <div class="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${achievementStyles.card.completed.badge}">
                ✓ Completed
              </div>
            `
          : ''}

        <div class="flex items-start gap-4 mb-3">
          <div class="${iconClasses}">
            ${renderIcon(iconName)}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-lg font-semibold mb-1 ${textColors.primary}">
              ${achievement.name}
            </div>
            <div class="text-sm ${textColors.secondary} leading-relaxed">
              ${achievement.description}
            </div>
            ${isCompleted && achievement.completedAt
              ? html`
                  <div class="text-xs mt-2 ${achievementStyles.card.completed.text}">
                    Earned ${new Date(achievement.completedAt).toLocaleDateString()}
                  </div>
                `
              : ''}
          </div>
        </div>

        <div class="flex items-center justify-between mt-4 pt-4 border-t ${backgroundColors.border}">
          <div class="text-sm ${achievementStyles.points}">
            +${achievement.points} points
          </div>
          <div class="flex items-center gap-2">
            ${!isCompleted && achievement.actionUrl
              ? html`
                  <a
                    href="${achievement.actionUrl}"
                    class="${buttonStyles.base} ${buttonStyles.sizes.sm} ${buttonStyles.variants.primary}"
                  >
                    Start
                  </a>
                `
              : ''}
            <div class="${achievementStyles.category.base} ${achievementStyles.category.bg} ${achievementStyles.category.text}">
              ${achievement.category}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'achievement-card': AchievementCard;
  }
}
