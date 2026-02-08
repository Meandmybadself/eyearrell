import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { logout } from '../store/slices/auth.js';
import { selectCurrentUser, selectSystemName } from '../store/selectors.js';
import { pageStyles, textColors } from '../utilities/design-tokens.js';
import type { AppStore } from '../store/index.js';
import '../components/ui/person-creation-wizard.js';

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
      <div class="${pageStyles.container}">
        <div class="${pageStyles.content}">
          <div class="max-w-2xl mx-auto text-center mb-8">
            <h1 class="text-3xl font-bold mb-2 ${textColors.primary}">
              Welcome to ${this.systemName}!
            </h1>
            <p class="text-lg ${textColors.secondary} mb-4">
              Hey ${this.userName}, let's set up your profile.
            </p>
            <button
              type="button"
              @click=${this.handleLogout}
              ?disabled=${this.isLoggingOut}
              class="text-sm font-medium ${textColors.tertiary} hover:${textColors.secondary} transition-colors disabled:opacity-50"
            >
              ${this.isLoggingOut ? 'Signing out...' : 'Sign out and use a different account'}
            </button>
          </div>

          <person-creation-wizard></person-creation-wizard>
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
