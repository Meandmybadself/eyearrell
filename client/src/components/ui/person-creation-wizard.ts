import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../../contexts/store-context.js';
import { apiContext } from '../../contexts/api-context.js';
import { addNotification } from '../../store/slices/ui.js';
import { checkSession } from '../../store/slices/auth.js';
import { selectCurrentUser } from '../../store/selectors.js';
import { toDisplayId } from '../../utilities/string.js';
import { textColors, backgroundColors } from '../../utilities/text-colors.js';
import { buttonStyles, inputStyles, cardStyles } from '../../utilities/design-tokens.js';
import '../ui/contact-info-form.js';
import '../ui/interests-form.js';
import type { InterestsForm } from '../ui/interests-form.js';
import type { AppStore } from '../../store/index.js';
import type { ApiClient } from '../../services/api-client.js';
import type { ContactInformation } from '@irl/shared';

const STEP_LABELS = ['Profile', 'Contact', 'Interests'] as const;

const STEP_DESCRIPTIONS = [
  'This is how you\'ll be represented to others in the community. You can create multiple profiles to represent family members, and transfer ownership later.',
  'Share your contact details so community members can connect with you. Each item can be set as Public (visible to all) or Private (only visible to you and admins). When you add a physical address and set it to private, others can still see who is within a 3-mile radius without seeing your exact location.',
  'Your interests help us find similar people and suggest like-minded individuals. They are not displayed on your profile \u2014 they\'re used behind the scenes to power recommendations.',
] as const;

@customElement('person-creation-wizard')
export class PersonCreationWizard extends LitElement {
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
  private currentStep = 1;

  @state()
  private personId: number | null = null;

  @state()
  private personDisplayId: string | null = null;

  @state()
  private firstName = '';

  @state()
  private lastName = '';

  @state()
  private displayId = '';

  @state()
  private pronouns = '';

  @state()
  private firstNameError = '';

  @state()
  private lastNameError = '';

  @state()
  private displayIdError = '';

  @state()
  private isSaving = false;

  @state()
  private contactInformations: ContactInformation[] = [];

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;

    if (name === 'firstName') {
      this.firstName = value;
      this.firstNameError = '';
    } else if (name === 'lastName') {
      this.lastName = value;
      this.lastNameError = '';
    } else if (name === 'displayId') {
      this.displayId = value;
      this.displayIdError = '';
    } else if (name === 'pronouns') {
      this.pronouns = value;
    }
  }

  private handleFirstOrLastNameBlur() {
    if (!this.displayId && this.firstName && this.lastName) {
      const baseId = `${this.firstName}-${this.lastName}`;
      this.displayId = toDisplayId(baseId);
    }
  }

  private async handleStep1Submit() {
    this.firstNameError = '';
    this.lastNameError = '';
    this.displayIdError = '';

    if (!this.firstName.trim()) {
      this.firstNameError = 'First name is required';
    }
    if (!this.lastName.trim()) {
      this.lastNameError = 'Last name is required';
    }
    if (!this.displayId.trim()) {
      this.displayIdError = 'Display ID is required';
    }

    if (this.firstNameError || this.lastNameError || this.displayIdError) {
      return;
    }

    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser) {
      this.store.dispatch(addNotification('You must be logged in to create a profile', 'error'));
      return;
    }

    this.isSaving = true;
    try {
      const response = await this.api.createPerson({
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        displayId: this.displayId.trim(),
        pronouns: this.pronouns.trim() || null,
        imageURL: null,
        userId: currentUser.id,
      });

      if (response.success && response.data) {
        this.personId = response.data.id;
        this.personDisplayId = response.data.displayId;

        // Update session so currentPersonId is set
        await this.store.dispatch(checkSession());

        this.store.dispatch(addNotification('Profile created successfully', 'success'));
        this.currentStep = 2;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('already exists')) {
        this.displayIdError = 'This Display ID is already taken. Please choose a different one.';
      } else {
        this.store.dispatch(
          addNotification(`Failed to create profile: ${message}`, 'error')
        );
      }
    } finally {
      this.isSaving = false;
    }
  }

  private handleBack() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  private handleStep2Next() {
    this.currentStep = 3;
  }

  private async handleStep3Finish() {
    const interestsForm = this.querySelector('interests-form') as InterestsForm | null;
    if (interestsForm && this.personDisplayId) {
      this.isSaving = true;
      try {
        const saved = await interestsForm.saveInterests(this.personDisplayId);
        if (!saved) {
          this.store.dispatch(
            addNotification('Interests could not be saved right now. You can add them anytime by editing your profile.', 'info')
          );
        }
      } catch (error) {
        console.error('Failed to save interests:', error);
        this.store.dispatch(
          addNotification('Interests could not be saved right now. You can add them anytime by editing your profile.', 'info')
        );
      } finally {
        this.isSaving = false;
      }
    }

    this.navigateToHome();
  }

  private handleSkip() {
    if (this.currentStep === 2) {
      this.currentStep = 3;
    } else if (this.currentStep === 3) {
      this.navigateToHome();
    }
  }

  private navigateToHome() {
    window.history.pushState({}, '', '/home');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private renderStepIndicator() {
    return html`
      <nav aria-label="Progress" class="mb-8">
        <ol class="flex items-center">
          ${STEP_LABELS.map((label, i) => {
            const step = i + 1;
            const isComplete = step < this.currentStep;
            const isCurrent = step === this.currentStep;
            const isLast = step === STEP_LABELS.length;

            return html`
              <li class="flex items-center ${!isLast ? 'flex-1' : ''}">
                <div class="flex flex-col items-center">
                  <div class="flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-semibold
                    ${isCurrent
                      ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                      : isComplete
                        ? 'border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 ' + textColors.tertiary}">
                    ${isComplete
                      ? html`<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>`
                      : step}
                  </div>
                  <span class="mt-2 text-xs font-medium ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : textColors.tertiary}">
                    ${label}
                  </span>
                </div>
                ${!isLast ? html`
                  <div class="flex-1 h-0.5 mx-4 ${isComplete ? 'bg-green-600 dark:bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}"></div>
                ` : ''}
              </li>
            `;
          })}
        </ol>
      </nav>
    `;
  }

  private renderStepDescription() {
    return html`
      <div class="${backgroundColors.pageAlt} rounded-lg p-4 mb-6 border ${backgroundColors.border}">
        <p class="text-sm ${textColors.secondary}">
          ${STEP_DESCRIPTIONS[this.currentStep - 1]}
        </p>
      </div>
    `;
  }

  private renderStep1() {
    return html`
      <div class="space-y-6">
        <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
          <div>
            <label for="wiz-first-name" class="${inputStyles.label}">
              First name
            </label>
            <input
              id="wiz-first-name"
              type="text"
              name="firstName"
              .value=${this.firstName}
              required
              autocomplete="given-name"
              class="${inputStyles.base} ${this.firstNameError ? inputStyles.states.error : inputStyles.states.default}"
              @input=${this.handleInputChange}
              @blur=${this.handleFirstOrLastNameBlur}
            />
            ${this.firstNameError ? html`<p class="${inputStyles.errorText}">${this.firstNameError}</p>` : ''}
          </div>

          <div>
            <label for="wiz-last-name" class="${inputStyles.label}">
              Last name
            </label>
            <input
              id="wiz-last-name"
              type="text"
              name="lastName"
              .value=${this.lastName}
              required
              autocomplete="family-name"
              class="${inputStyles.base} ${this.lastNameError ? inputStyles.states.error : inputStyles.states.default}"
              @input=${this.handleInputChange}
              @blur=${this.handleFirstOrLastNameBlur}
            />
            ${this.lastNameError ? html`<p class="${inputStyles.errorText}">${this.lastNameError}</p>` : ''}
          </div>
        </div>

        <div>
          <label for="wiz-display-id" class="${inputStyles.label}">
            Display ID
          </label>
          <input
            id="wiz-display-id"
            type="text"
            name="displayId"
            .value=${this.displayId}
            required
            placeholder="john-doe"
            class="${inputStyles.base} ${this.displayIdError ? inputStyles.states.error : inputStyles.states.default}"
            @input=${this.handleInputChange}
          />
          <p class="${inputStyles.helperText}">
            A unique, web-safe identifier for your profile URL
          </p>
          ${this.displayIdError ? html`<p class="${inputStyles.errorText}">${this.displayIdError}</p>` : ''}
        </div>

        <div>
          <label for="wiz-pronouns" class="${inputStyles.label}">
            Pronouns (optional)
          </label>
          <input
            id="wiz-pronouns"
            type="text"
            name="pronouns"
            .value=${this.pronouns}
            placeholder="he/him, she/her, they/them"
            class="${inputStyles.base} ${inputStyles.states.default}"
            @input=${this.handleInputChange}
          />
        </div>

        <div class="flex justify-end">
          <button
            type="button"
            @click=${this.handleStep1Submit}
            ?disabled=${this.isSaving}
            class="${buttonStyles.base} ${buttonStyles.sizes.md} ${buttonStyles.variants.primary}"
          >
            ${this.isSaving
              ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
              : ''}
            Next
          </button>
        </div>
      </div>
    `;
  }

  private renderStep2() {
    if (!this.personId) {
      return html`<p class="${inputStyles.errorText}">Error: Profile must be created before adding contact information.</p>`;
    }

    return html`
      <div class="space-y-6">
        <contact-info-form
          entityType="person"
          .entityId=${this.personId!}
          .contactInformations=${this.contactInformations}
          @contact-info-changed=${(e: CustomEvent) => {
            this.contactInformations = e.detail.items;
          }}
          @contact-error=${(e: CustomEvent) => {
            this.store.dispatch(addNotification(e.detail.error, 'error'));
          }}
        ></contact-info-form>

        <div class="flex justify-between">
          <div class="flex gap-2">
            <button
              type="button"
              @click=${this.handleBack}
              class="${buttonStyles.base} ${buttonStyles.sizes.md} ${buttonStyles.variants.secondary}"
            >
              Back
            </button>
            <button
              type="button"
              @click=${this.handleSkip}
              class="${buttonStyles.base} ${buttonStyles.sizes.md} ${buttonStyles.variants.ghost}"
            >
              Skip
            </button>
          </div>
          <button
            type="button"
            @click=${this.handleStep2Next}
            class="${buttonStyles.base} ${buttonStyles.sizes.md} ${buttonStyles.variants.primary}"
          >
            Next
          </button>
        </div>
      </div>
    `;
  }

  private renderStep3() {
    return html`
      <div class="space-y-6">
        <interests-form
          .personDisplayId=${this.personDisplayId || ''}
          .hideSaveButton=${true}
          @interest-error=${(e: CustomEvent) => {
            this.store.dispatch(addNotification(e.detail.error, 'error'));
          }}
        ></interests-form>

        <div class="flex justify-between">
          <div class="flex gap-2">
            <button
              type="button"
              @click=${this.handleBack}
              class="${buttonStyles.base} ${buttonStyles.sizes.md} ${buttonStyles.variants.secondary}"
            >
              Back
            </button>
            <button
              type="button"
              @click=${this.handleSkip}
              class="${buttonStyles.base} ${buttonStyles.sizes.md} ${buttonStyles.variants.ghost}"
            >
              Skip
            </button>
          </div>
          <button
            type="button"
            @click=${this.handleStep3Finish}
            ?disabled=${this.isSaving}
            class="${buttonStyles.base} ${buttonStyles.sizes.md} ${buttonStyles.variants.primary}"
          >
            ${this.isSaving
              ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
              : ''}
            Finish
          </button>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div class="w-full max-w-2xl mx-auto">
        ${this.renderStepIndicator()}

        <div class="${cardStyles.base} ${cardStyles.padding.lg}">
          <h2 class="text-xl font-semibold ${textColors.primary} mb-2">
            Step ${this.currentStep}: ${STEP_LABELS[this.currentStep - 1]}
          </h2>

          ${this.renderStepDescription()}

          ${this.currentStep === 1 ? this.renderStep1() : ''}
          ${this.currentStep === 2 ? this.renderStep2() : ''}
          ${this.currentStep === 3 ? this.renderStep3() : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'person-creation-wizard': PersonCreationWizard;
  }
}
