import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { AchievementWithCompletion, UserStats } from '@irl/shared';
import { renderIcon } from '../utilities/icons.js';

import '../components/ui/achievement-card.js';
import '../components/ui/level-progress.js';

@customElement('achievements-page')
export class AchievementsPage extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: storeContext })
  @state()
  private store!: AppStore;

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @state()
  private achievements: AchievementWithCompletion[] = [];

  @state()
  private stats: UserStats | null = null;

  @state()
  private isLoading = false;

  @state()
  private selectedCategory: string | null = null;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadData();
  }

  private async loadData() {
    this.isLoading = true;
    try {
      const [achievementsResponse, statsResponse] = await Promise.all([
        this.api.getAchievements(),
        this.api.getUserStats()
      ]);

      if (achievementsResponse.success && achievementsResponse.data) {
        this.achievements = achievementsResponse.data;
      }

      if (statsResponse.success && statsResponse.data) {
        this.stats = statsResponse.data;
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to load achievements',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  private getFilteredAchievements(): AchievementWithCompletion[] {
    if (!this.selectedCategory) {
      return this.achievements;
    }
    return this.achievements.filter(a => a.category === this.selectedCategory);
  }

  private getCategories(): string[] {
    const categories = new Set(this.achievements.map(a => a.category));
    return Array.from(categories).sort();
  }

  private getCategoryStats(category: string): { total: number; completed: number } {
    const categoryAchievements = this.achievements.filter(a => a.category === category);
    const completed = categoryAchievements.filter(a => a.completed).length;
    return { total: categoryAchievements.length, completed };
  }

  private handleCategoryFilter(category: string | null) {
    this.selectedCategory = category;
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="min-h-screen bg-gray-50 py-8">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center py-12">
              ${renderIcon('spinner')} Loading achievements...
            </div>
          </div>
        </div>
      `;
    }

    const filteredAchievements = this.getFilteredAchievements();
    const categories = this.getCategories();
    const completedCount = this.achievements.filter(a => a.completed).length;
    const totalCount = this.achievements.length;

    return html`
      <div class="min-h-screen bg-gray-50 py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Page Header -->
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">
              ${renderIcon('trophy')} Achievements
            </h1>
            <p class="text-gray-600">
              Track your progress and earn rewards as you explore the community.
              ${completedCount} of ${totalCount} completed.
            </p>
          </div>

          <!-- Level Progress Section -->
          ${this.stats ? html`
            <div class="mb-8">
              <level-progress
                .currentLevel=${this.stats.currentLevel}
                .nextLevel=${this.stats.nextLevel}
                .totalPoints=${this.stats.totalPoints}
                .progressPercent=${this.stats.progressPercent}
              ></level-progress>
            </div>
          ` : ''}

          <!-- Category Filter -->
          <div class="mb-6">
            <div class="flex flex-wrap gap-2">
              <button
                @click=${() => this.handleCategoryFilter(null)}
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  this.selectedCategory === null
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }"
              >
                All (${totalCount})
              </button>
              ${categories.map(category => {
                const stats = this.getCategoryStats(category);
                return html`
                  <button
                    @click=${() => this.handleCategoryFilter(category)}
                    class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      this.selectedCategory === category
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }"
                  >
                    ${category} (${stats.completed}/${stats.total})
                  </button>
                `;
              })}
            </div>
          </div>

          <!-- Achievements Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${filteredAchievements.map(achievement => html`
              <achievement-card .achievement=${achievement}></achievement-card>
            `)}
          </div>

          ${filteredAchievements.length === 0 ? html`
            <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
              <p class="text-gray-500">No achievements found in this category.</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}
