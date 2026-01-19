import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { selectCurrentUser } from '../store/selectors.js';
import { textColors, backgroundColors, pageStyles, contentStateStyles, buttonStyles, inputStyles, cardStyles } from '../utilities/design-tokens.js';
import '../components/layout/admin-nav.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { Interest } from '@irl/shared';

@customElement('admin-interests-page')
export class AdminInterestsPage extends LitElement {
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
  private interests: Interest[] = [];

  @state()
  private isLoading = false;

  @state()
  private newInterestName = '';

  @state()
  private isCreating = false;

  @state()
  private editingId: number | null = null;

  @state()
  private editingName = '';

  @state()
  private isSaving = false;

  @state()
  private searchQuery = '';

  async connectedCallback() {
    super.connectedCallback();

    // Check if user is system admin
    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser?.isSystemAdmin) {
      window.history.pushState({}, '', '/home');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    await this.loadInterests();
  }

  private async loadInterests() {
    this.isLoading = true;
    try {
      const response = await this.api.getInterests(undefined, { limit: 1000 });
      if (response.success && response.data) {
        this.interests = response.data;
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to load interests',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  private get filteredInterests(): Interest[] {
    if (!this.searchQuery.trim()) {
      return this.interests;
    }
    const query = this.searchQuery.toLowerCase();
    return this.interests.filter(i => i.name.toLowerCase().includes(query));
  }

  private async handleCreate(e: Event) {
    e.preventDefault();

    const name = this.newInterestName.trim();
    if (!name) {
      this.store.dispatch(addNotification('Interest name is required', 'error'));
      return;
    }

    // Check for duplicates
    if (this.interests.some(i => i.name.toLowerCase() === name.toLowerCase())) {
      this.store.dispatch(addNotification('An interest with this name already exists', 'error'));
      return;
    }

    this.isCreating = true;
    try {
      const response = await this.api.createInterest({ name });
      if (response.success && response.data) {
        this.interests = [...this.interests, response.data].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        this.newInterestName = '';
        this.store.dispatch(addNotification('Interest created successfully', 'success'));
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to create interest',
          'error'
        )
      );
    } finally {
      this.isCreating = false;
    }
  }

  private startEditing(interest: Interest) {
    this.editingId = interest.id;
    this.editingName = interest.name;
  }

  private cancelEditing() {
    this.editingId = null;
    this.editingName = '';
  }

  private async saveEdit() {
    if (!this.editingId) return;

    const name = this.editingName.trim();
    if (!name) {
      this.store.dispatch(addNotification('Interest name is required', 'error'));
      return;
    }

    // Check for duplicates (excluding current interest)
    if (this.interests.some(i => i.id !== this.editingId && i.name.toLowerCase() === name.toLowerCase())) {
      this.store.dispatch(addNotification('An interest with this name already exists', 'error'));
      return;
    }

    this.isSaving = true;
    try {
      const response = await this.api.updateInterest(this.editingId, { name });
      if (response.success && response.data) {
        this.interests = this.interests
          .map(i => i.id === this.editingId ? response.data! : i)
          .sort((a, b) => a.name.localeCompare(b.name));
        this.editingId = null;
        this.editingName = '';
        this.store.dispatch(addNotification('Interest updated successfully', 'success'));
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to update interest',
          'error'
        )
      );
    } finally {
      this.isSaving = false;
    }
  }

  private async handleDelete(interest: Interest) {
    if (!confirm(`Are you sure you want to delete "${interest.name}"? This will remove it from all persons who have selected it.`)) {
      return;
    }

    try {
      const response = await this.api.deleteInterest(interest.id);
      if (response.success) {
        this.interests = this.interests.filter(i => i.id !== interest.id);
        this.store.dispatch(addNotification('Interest deleted successfully', 'success'));
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to delete interest',
          'error'
        )
      );
    }
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="${contentStateStyles.containerFullHeight}">
          <div class="inline-block w-8 h-8 border-4 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
        </div>
      `;
    }

    const filtered = this.filteredInterests;

    return html`
      <div class="${pageStyles.container}">
        <div class="${pageStyles.content}">
          <admin-nav currentPath="/admin/interests"></admin-nav>

          <div class="${cardStyles.base} ${cardStyles.padding.lg}">
            <h2 class="text-xl font-semibold ${textColors.primary} mb-6">Manage Interests</h2>

            <!-- Create new interest -->
            <form @submit=${this.handleCreate} class="mb-6 pb-6 border-b ${backgroundColors.border}">
              <label class="block text-sm font-medium ${textColors.primary} mb-2">
                Add New Interest
              </label>
              <div class="flex gap-3">
                <input
                  type="text"
                  .value=${this.newInterestName}
                  @input=${(e: Event) => this.newInterestName = (e.target as HTMLInputElement).value}
                  placeholder="Enter interest name"
                  class="${inputStyles.base} flex-1"
                />
                <button
                  type="submit"
                  ?disabled=${this.isCreating}
                  class="${buttonStyles.base} ${buttonStyles.sizes.md} ${buttonStyles.variants.primary}"
                >
                  ${this.isCreating ? 'Adding...' : 'Add Interest'}
                </button>
              </div>
            </form>

            <!-- Search -->
            <div class="mb-4">
              <input
                type="text"
                .value=${this.searchQuery}
                @input=${(e: Event) => this.searchQuery = (e.target as HTMLInputElement).value}
                placeholder="Search interests..."
                class="${inputStyles.base} w-full"
              />
            </div>

            <!-- Interest count -->
            <p class="text-sm ${textColors.secondary} mb-4">
              ${filtered.length} interest${filtered.length !== 1 ? 's' : ''}
              ${this.searchQuery ? `matching "${this.searchQuery}"` : 'total'}
            </p>

            <!-- Interests list -->
            <div class="space-y-2 max-h-96 overflow-y-auto">
              ${filtered.length === 0
                ? html`
                    <p class="text-center py-8 ${textColors.tertiary}">
                      ${this.searchQuery ? 'No interests match your search' : 'No interests yet'}
                    </p>
                  `
                : filtered.map(interest => html`
                    <div class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      ${this.editingId === interest.id
                        ? html`
                            <input
                              type="text"
                              .value=${this.editingName}
                              @input=${(e: Event) => this.editingName = (e.target as HTMLInputElement).value}
                              @keydown=${(e: KeyboardEvent) => {
                                if (e.key === 'Enter') this.saveEdit();
                                if (e.key === 'Escape') this.cancelEditing();
                              }}
                              class="${inputStyles.base} flex-1 mr-3"
                              autofocus
                            />
                            <div class="flex gap-2">
                              <button
                                @click=${this.saveEdit}
                                ?disabled=${this.isSaving}
                                class="${buttonStyles.base} ${buttonStyles.sizes.sm} ${buttonStyles.variants.primary}"
                              >
                                ${this.isSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                @click=${this.cancelEditing}
                                class="${buttonStyles.base} ${buttonStyles.sizes.sm} ${buttonStyles.variants.secondary}"
                              >
                                Cancel
                              </button>
                            </div>
                          `
                        : html`
                            <span class="${textColors.primary}">${interest.name}</span>
                            <div class="flex gap-2">
                              <button
                                @click=${() => this.startEditing(interest)}
                                class="${buttonStyles.base} ${buttonStyles.sizes.sm} ${buttonStyles.variants.secondary}"
                              >
                                Edit
                              </button>
                              <button
                                @click=${() => this.handleDelete(interest)}
                                class="${buttonStyles.base} ${buttonStyles.sizes.sm} ${buttonStyles.variants.danger}"
                              >
                                Delete
                              </button>
                            </div>
                          `
                      }
                    </div>
                  `)
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-interests-page': AdminInterestsPage;
  }
}
