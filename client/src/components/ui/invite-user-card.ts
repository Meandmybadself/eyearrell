import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { apiContext } from '../../contexts/api-context.js';
import { storeContext } from '../../contexts/store-context.js';
import { addNotification } from '../../store/slices/ui.js';
import { backgroundColors, textColors } from '../../utilities/text-colors.js';
import { validateEmail } from '../../utilities/validation.js';
import type { ApiClient } from '../../services/api-client.js';
import type { AppStore } from '../../store/index.js';

@customElement('invite-user-card')
export class InviteUserCard extends LitElement {
  createRenderRoot() {
    return this;
  }

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  @consume({ context: storeContext })
  @state()
  private store!: AppStore;

  @state()
  private email = '';

  @state()
  private emailError = '';

  @state()
  private isLoading = false;

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this.email = target.value;
    this.emailError = '';
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();

    // Validate email
    this.emailError = validateEmail(this.email) || '';
    if (this.emailError) {
      return;
    }

    this.isLoading = true;

    try {
      await this.api.sendInvitation(this.email);
      this.store.dispatch(addNotification(`Invitation sent to ${this.email}`, 'success'));
      this.email = '';
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Failed to send invitation',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  render() {
    return html`
      <div class="${backgroundColors.content} rounded-lg shadow-sm p-4">
        <h3 class="${textColors.primary} text-lg font-semibold mb-3">Invite Someone</h3>
        <p class="${textColors.secondary} text-sm mb-4">
          Invite a friend or colleague to join the community.
        </p>
        <form @submit=${this.handleSubmit} class="space-y-3">
          <div>
            <input
              type="email"
              .value=${this.email}
              @input=${this.handleInputChange}
              placeholder="Email address"
              class="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 ${this.emailError ? 'outline-red-500' : ''}"
              ?disabled=${this.isLoading}
            />
            ${this.emailError ? html`<p class="mt-1 text-xs text-red-600">${this.emailError}</p>` : ''}
          </div>
          <button
            type="submit"
            ?disabled=${this.isLoading}
            class="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ${this.isLoading
              ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
              : ''}
            Send Invitation
          </button>
        </form>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'invite-user-card': InviteUserCard;
  }
}
