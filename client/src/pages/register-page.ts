import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { register } from '../store/slices/auth.js';
import { addNotification } from '../store/slices/ui.js';
import { selectSystemName, selectSystemDescription, selectSystemContactInformation } from '../store/selectors.js';
import type { ContactInformation } from '@irl/shared';
import { ContactType } from '@irl/shared';
import { validateEmail } from '../utilities/validation.js';
import { pageStyles } from '../utilities/design-tokens.js';
import type { AppStore } from '../store/index.js';

@customElement('register-page')
export class RegisterPage extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @consume({ context: storeContext })
  @state()
  private store!: AppStore;

  @state()
  private email = '';

  @state()
  private emailError = '';

  @state()
  private isLoading = false;

  @state()
  private emailSent = false;

  connectedCallback() {
    super.connectedCallback();

    // Check for email in URL query parameter (from invitation)
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');

    // Only pre-fill if it's a valid email format
    if (emailParam && !validateEmail(emailParam)) {
      this.email = emailParam;
    }
  }

  private get systemName(): string | null {
    return selectSystemName(this.store.getState());
  }

  private get systemDescription(): string | null {
    return selectSystemDescription(this.store.getState());
  }

  private get systemContactInformation(): ContactInformation[] {
    return selectSystemContactInformation(this.store.getState());
  }

  private renderContactIcon(type: ContactType) {
    switch (type) {
      case ContactType.EMAIL:
        return html`<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>`;
      case ContactType.PHONE:
        return html`<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>`;
      case ContactType.ADDRESS:
        return html`<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>`;
      case ContactType.URL:
        return html`<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>`;
    }
  }

  private renderContactValue(item: ContactInformation) {
    if (!item.value || item.value.trim() === '') {
      return html`<span class="text-gray-400 italic">No value</span>`;
    }

    switch (item.type) {
      case ContactType.EMAIL:
        return html`<a href="mailto:${item.value}" class="text-indigo-600 hover:text-indigo-500">${item.value}</a>`;
      case ContactType.PHONE:
        return html`<a href="tel:${item.value}" class="text-indigo-600 hover:text-indigo-500">${item.value}</a>`;
      case ContactType.URL:
        return html`<a href="${item.value}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-500">${item.value}</a>`;
      default:
        return html`<span class="text-gray-600">${item.value}</span>`;
    }
  }

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.name === 'email') {
      this.email = target.value;
      this.emailError = '';
    }
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();

    // Validate
    this.emailError = validateEmail(this.email) || '';

    if (this.emailError) {
      return;
    }

    this.isLoading = true;

    try {
      const result = await this.store.dispatch(register(this.email));

      // Check if this was the first user (auto-logged in)
      const isFirstUser = result.message === 'Account created successfully';

      if (isFirstUser) {
        this.store.dispatch(addNotification('Account created successfully!', 'success'));
        window.history.pushState({}, '', '/home');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        this.emailSent = true;
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(
          error instanceof Error ? error.message : 'Registration failed. Please try again.',
          'error'
        )
      );
    } finally {
      this.isLoading = false;
    }
  }

  render() {
    if (this.emailSent) {
      return html`
        <div class="${pageStyles.container} flex flex-col justify-center">
          <div class="${pageStyles.content}">
            <div class="max-w-md mx-auto bg-white px-6 py-12 shadow-sm sm:rounded-lg sm:px-12 text-center">
              <div class="text-5xl mb-4">&#x2709;&#xFE0F;</div>
              <h2 class="text-2xl/9 font-bold tracking-tight text-gray-900 mb-4">
                Check your email
              </h2>
              <p class="text-gray-600 mb-2">
                We've sent a sign-in link to
              </p>
              <p class="font-semibold text-gray-900 mb-4">${this.email}</p>
              <p class="text-sm text-gray-500 mb-6">
                Click the link in the email to sign in. The link will expire in 15 minutes.
              </p>
              <button
                @click=${() => { this.emailSent = false; }}
                class="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Use a different email
              </button>
            </div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="${pageStyles.container} flex flex-col justify-center">
        <div class="${pageStyles.content}">
          <div class="flex flex-col md:flex-row md:gap-12 lg:gap-16 items-center md:items-center">
            <!-- Left Column: System Description -->
            <div class="w-full md:w-1/2 md:flex md:flex-col md:justify-center">
              ${this.systemName ? html`
                <h1 class="text-center md:text-left text-3xl/10 font-bold tracking-tight text-gray-900 mb-2">
                  ${this.systemName}
                </h1>
              ` : ''}
              ${this.systemDescription ? html`
                <p class="text-center md:text-left text-base text-gray-600 mt-4">
                  ${this.systemDescription}
                </p>
              ` : ''}
              ${this.systemContactInformation.length > 0 ? html`
                <div class="mt-6 space-y-2">
                  ${this.systemContactInformation.map(item => html`
                    <div class="flex items-center gap-2 text-sm text-gray-500 justify-center md:justify-start">
                      ${this.renderContactIcon(item.type)}
                      ${this.renderContactValue(item)}
                    </div>
                  `)}
                </div>
              ` : ''}
            </div>

            <!-- Right Column: Form -->
            <div class="w-full md:w-1/2 mt-10 md:mt-0">
              <div class="bg-white px-6 py-12 shadow-sm sm:rounded-lg sm:px-12">
                <h2 class="text-center text-2xl/9 font-bold tracking-tight text-gray-900 mb-6">
                  Create your account
                </h2>
            <form @submit=${this.handleSubmit} class="space-y-6">
              <div>
                <label for="email" class="block text-sm/6 font-medium text-gray-900">
                  Email address
                </label>
                <div class="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    .value=${this.email}
                    required
                    autocomplete="email"
                    autofocus
                    class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.emailError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                  />
                  ${this.emailError ? html`<p class="mt-1 text-sm text-red-600">${this.emailError}</p>` : ''}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  ?disabled=${this.isLoading}
                  class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ${this.isLoading
                    ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                    : ''}
                  Create Account
                </button>
              </div>
            </form>

            <p class="mt-4 text-center text-xs text-gray-500">
              We'll email you a link to sign in. No password needed.
            </p>

            <div>
              <div class="mt-10 flex items-center gap-x-6">
                <div class="w-full flex-1 border-t border-gray-200"></div>
                <p class="text-sm/6 font-medium text-nowrap text-gray-900">Or</p>
                <div class="w-full flex-1 border-t border-gray-200"></div>
              </div>

              <div class="mt-6">
                <a
                  href="/login"
                  class="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 no-underline"
                >
                  Sign in to existing account
                </a>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'register-page': RegisterPage;
  }
}
