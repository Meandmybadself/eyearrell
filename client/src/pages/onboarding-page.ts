import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { logout } from '../store/slices/auth.js';
import { selectCurrentUser, selectSystemName } from '../store/selectors.js';
import { pageStyles, textColors, backgroundColors } from '../utilities/design-tokens.js';
import type { AppStore } from '../store/index.js';
import '../components/ui/button.js';

@customElement('onboarding-page')
export class OnboardingPage extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @consume({ context: storeContext })
  @state()
  private store!: AppStore;

  @state()
  private isLoggingOut = false;

  private get systemName(): string {
    return selectSystemName(this.store.getState()) || 'IRL';
  }

  private get userName(): string {
    const user = selectCurrentUser(this.store.getState());
    return user?.email?.split('@')[0] || 'there';
  }

  private handleCreatePerson() {
    window.history.pushState({}, '', '/persons/create');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private async handleLogout() {
    this.isLoggingOut = true;
    try {
      await this.store.dispatch(logout());
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.isLoggingOut = false;
    }
  }

  render() {
    return html`
      <div class="${pageStyles.container} flex items-center justify-center">
        <div class="${pageStyles.content}">
          <div class="max-w-lg mx-auto ${backgroundColors.content} p-8 rounded-lg shadow-sm text-center">
            <div class="text-6xl mb-6">👋</div>

            <h1 class="text-3xl font-bold mb-4 ${textColors.primary}">
              Welcome to ${this.systemName}!
            </h1>

            <p class="text-lg ${textColors.secondary} mb-6">
              Hey ${this.userName}, we're excited to have you here.
            </p>

            <div class="${backgroundColors.pageAlt} rounded-lg p-6 mb-8 text-left">
              <h2 class="text-lg font-semibold ${textColors.primary} mb-3">
                Before you get started...
              </h2>
              <p class="${textColors.secondary} mb-4">
                You'll need to create your <strong>Person profile</strong>. This is your public identity in ${this.systemName} -
                it's how other members will find and connect with you.
              </p>
              <p class="${textColors.tertiary} text-sm">
                Your profile includes your name, pronouns, contact information, and interests.
                You can always update it later.
              </p>
            </div>

            <div class="flex flex-col gap-4">
              <button
                type="button"
                @click=${this.handleCreatePerson}
                class="w-full flex justify-center rounded-md bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Create My Profile
              </button>

              <button
                type="button"
                @click=${this.handleLogout}
                ?disabled=${this.isLoggingOut}
                class="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                ${this.isLoggingOut ? 'Signing out...' : 'Sign out and use a different account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'onboarding-page': OnboardingPage;
  }
}
