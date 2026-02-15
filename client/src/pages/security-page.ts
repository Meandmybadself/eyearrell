import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { addNotification } from '../store/slices/ui.js';
import { validateEmail } from '../utilities/validation.js';
import { apiClient } from '../services/api-client.js';
import { pageStyles, contentStateStyles } from '../utilities/design-tokens.js';
import type { AppStore } from '../store/index.js';
import type { User } from '@irl/shared';
import '../components/ui/input.js';
import '../components/ui/button.js';

@customElement('security-page')
export class SecurityPage extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: storeContext })
  @state()
  private store!: AppStore;

  @state()
  private profile: (User & { pendingEmail?: string }) | null = null;

  @state()
  private isLoading = true;

  // Email change form
  @state()
  private newEmail = '';

  @state()
  private newEmailError = '';

  @state()
  private isChangingEmail = false;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadProfile();
  }

  private async loadProfile() {
    this.isLoading = true;
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.data) {
        this.profile = response.data;
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to load profile',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  private handleEmailInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.name === 'newEmail') {
      this.newEmail = target.value;
      this.newEmailError = '';
    }
  }

  private async handleEmailSubmit(e: Event) {
    e.preventDefault();

    // Validate
    this.newEmailError = validateEmail(this.newEmail) || '';

    if (this.newEmailError) {
      return;
    }

    this.isChangingEmail = true;

    try {
      await apiClient.changeEmail(this.newEmail);
      this.store.dispatch(
        addNotification(
          'Verification email sent. Please check your new email address.',
          'success'
        )
      );

      // Reset form and reload profile to show pending email
      this.newEmail = '';
      this.newEmailError = '';
      await this.loadProfile();
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to request email change',
          'error'
        )
      );
    } finally {
      this.isChangingEmail = false;
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

    if (!this.profile) {
      return html`
        <div class="${contentStateStyles.containerFullHeight}">
          <p class="${contentStateStyles.emptyText}">Profile not found</p>
        </div>
      `;
    }

    return html`
      <div class="${pageStyles.container}">
        <div class="${pageStyles.content}">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Security Settings</h1>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <!-- Current Email Display -->
        <div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 mb-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account Information</h2>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Email
            </label>
            <p class="text-gray-900 dark:text-white">${this.profile.email}</p>
            ${this.profile.pendingEmail
              ? html`
                <div class="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p class="text-sm text-yellow-800 dark:text-yellow-200">
                    Pending email change to: <strong>${this.profile.pendingEmail}</strong>
                  </p>
                  <p class="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Please check your new email for a verification link.
                  </p>
                </div>
              `
              : ''}
          </div>
        </div>

        <!-- Change Email Form -->
        <div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Email</h2>
          <form @submit=${this.handleEmailSubmit} class="space-y-4">
            <div>
              <label for="newEmail" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Email Address
              </label>
              <input
                id="newEmail"
                name="newEmail"
                type="email"
                .value=${this.newEmail}
                required
                autocomplete="email"
                class="block w-full rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-base text-gray-900 dark:text-white outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:focus:outline-indigo-500 sm:text-sm ${this.newEmailError ? 'outline-red-500 focus:outline-red-600' : ''}"
                @input=${this.handleEmailInputChange}
              />
              ${this.newEmailError
                ? html`<p class="mt-1 text-sm text-red-600 dark:text-red-400">${this.newEmailError}</p>`
                : ''}
            </div>
            <div>
              <button
                type="submit"
                ?disabled=${this.isChangingEmail}
                class="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ${this.isChangingEmail
                  ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                  : ''}
                Request Email Change
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'security-page': SecurityPage;
  }
}
