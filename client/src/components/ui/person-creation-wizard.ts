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
import { buttonStyles, inputStyles, cardStyles, spinnerStyles } from '../../utilities/design-tokens.js';
import { SEARCH_DEBOUNCE_MS } from '../../constants.js';
import '../ui/contact-info-form.js';
import '../ui/interests-form.js';
import type { InterestsForm } from '../ui/interests-form.js';
import type { AppStore } from '../../store/index.js';
import type { ApiClient } from '../../services/api-client.js';
import type { ContactInformation, Group } from '@irl/shared';

const STEP_LABELS = ['Profile', 'Contact', 'Interests', 'Groups'] as const;

const STEP_DESCRIPTIONS = [
  'This is how you\'ll be represented to others in the community. You can create multiple profiles to represent family members, and transfer ownership later.',
  'Share your contact details so community members can connect with you. Each item can be set as Public (visible to all) or Private (only visible to you and admins). When you add a physical address and set it to private, others can still see who is within a 3-mile radius without seeing your exact location.',
  'Your interests help us find similar people and suggest like-minded individuals. They are not displayed on your profile \u2014 they\'re used behind the scenes to power recommendations.',
  'Groups help organize people into households, classrooms, teams, or any other meaningful collection. Search for an existing group to join, or create a new one.',
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

  // Step 4: Groups state
  @state()
  private groupSearchQuery = '';

  @state()
  private groupSearchResults: Group[] = [];

  @state()
  private isSearchingGroups = false;

  @state()
  private showGroupDropdown = false;

  @state()
  private joinedGroups: Group[] = [];

  @state()
  private newGroupName = '';

  @state()
  private isCreatingGroup = false;

  @state()
  private isJoiningGroup = false;

  private groupSearchTimer: number | null = null;

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.groupSearchTimer !== null) {
      window.clearTimeout(this.groupSearchTimer);
    }
  }

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

  private async handleStep3Next() {
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

    this.currentStep = 4;
  }

  private handleStep4Finish() {
    this.navigateToHome();
  }

  // Step 4: Group search
  private async performGroupSearch(query: string) {
    if (!query.trim()) {
      this.groupSearchResults = [];
      this.showGroupDropdown = false;
      return;
    }

    this.isSearchingGroups = true;
    try {
      const response = await this.api.getGroups({ page: 1, limit: 10, search: query });
      if (response.success && response.data) {
        // Filter out groups the user has already joined in this session
        const joinedIds = new Set(this.joinedGroups.map(g => g.id));
        this.groupSearchResults = response.data.filter(g => !joinedIds.has(g.id));
        this.showGroupDropdown = this.groupSearchResults.length > 0;
      }
    } catch (error) {
      console.error('Failed to search groups:', error);
      this.groupSearchResults = [];
      this.showGroupDropdown = false;
    } finally {
      this.isSearchingGroups = false;
    }
  }

  private handleGroupSearchInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.groupSearchQuery = target.value;

    if (this.groupSearchTimer !== null) {
      window.clearTimeout(this.groupSearchTimer);
    }

    this.groupSearchTimer = window.setTimeout(() => {
      this.performGroupSearch(this.groupSearchQuery);
    }, SEARCH_DEBOUNCE_MS);
  }

  private handleGroupSearchFocus() {
    if (this.groupSearchQuery && this.groupSearchResults.length > 0) {
      this.showGroupDropdown = true;
    }
  }

  private handleGroupSearchBlur() {
    setTimeout(() => {
      this.showGroupDropdown = false;
    }, 200);
  }

  private async handleJoinGroup(group: Group) {
    this.isJoiningGroup = true;
    try {
      const response = await this.api.joinGroup(group.displayId);
      if (response.success) {
        this.joinedGroups = [...this.joinedGroups, group];
        this.groupSearchQuery = '';
        this.groupSearchResults = [];
        this.showGroupDropdown = false;
        this.store.dispatch(addNotification(`Joined ${group.name}`, 'success'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.store.dispatch(addNotification(`Failed to join group: ${message}`, 'error'));
    } finally {
      this.isJoiningGroup = false;
    }
  }

  private async handleLeaveGroup(group: Group) {
    try {
      const response = await this.api.leaveGroup(group.displayId);
      if (response.success) {
        this.joinedGroups = this.joinedGroups.filter(g => g.id !== group.id);
        this.store.dispatch(addNotification(`Left ${group.name}`, 'success'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.store.dispatch(addNotification(`Failed to leave group: ${message}`, 'error'));
    }
  }

  private async handleCreateGroup() {
    if (!this.newGroupName.trim()) return;

    this.isCreatingGroup = true;
    try {
      const response = await this.api.createGroup({
        name: this.newGroupName.trim(),
        displayId: toDisplayId(this.newGroupName.trim()),
      });
      if (response.success && response.data) {
        this.joinedGroups = [...this.joinedGroups, response.data];
        this.newGroupName = '';
        this.store.dispatch(addNotification(`Created group "${response.data.name}"`, 'success'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('already exists')) {
        this.store.dispatch(addNotification('A group with that name already exists. Try searching for it instead.', 'error'));
      } else {
        this.store.dispatch(addNotification(`Failed to create group: ${message}`, 'error'));
      }
    } finally {
      this.isCreatingGroup = false;
    }
  }

  private handleSkip() {
    if (this.currentStep === 2) {
      this.currentStep = 3;
    } else if (this.currentStep === 3) {
      this.currentStep = 4;
    } else if (this.currentStep === 4) {
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
            @click=${this.handleStep3Next}
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

  private renderStep4() {
    return html`
      <div class="space-y-6">
        <!-- Group Search -->
        <div>
          <label class="${inputStyles.label}">
            Search for a group to join
          </label>
          <div class="relative mt-2">
            <input
              type="text"
              .value=${this.groupSearchQuery}
              placeholder="Search by group name..."
              class="${inputStyles.base} ${inputStyles.states.default} pr-10"
              @input=${this.handleGroupSearchInput}
              @focus=${this.handleGroupSearchFocus}
              @blur=${this.handleGroupSearchBlur}
            />
            ${this.isSearchingGroups
              ? html`
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div class="inline-block w-4 h-4 border-2 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
                  </div>
                `
              : ''}

            ${this.showGroupDropdown
              ? html`
                  <div class="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black/5 dark:ring-white/10 overflow-auto sm:text-sm">
                    ${this.groupSearchResults.map(
                      group => html`
                        <div class="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                          <div class="flex items-center justify-between">
                            <div class="min-w-0 flex-1">
                              <div class="font-medium ${textColors.primary}">${group.name}</div>
                              <div class="text-sm ${textColors.tertiary}">${group.displayId}</div>
                              ${group.description
                                ? html`<div class="text-xs ${textColors.muted} mt-1 truncate">${group.description}</div>`
                                : ''}
                            </div>
                            <div class="ml-3 flex-shrink-0">
                              ${group.allowsJoins
                                ? html`
                                    <button
                                      type="button"
                                      @click=${() => this.handleJoinGroup(group)}
                                      ?disabled=${this.isJoiningGroup}
                                      class="${buttonStyles.base} ${buttonStyles.sizes.sm} ${buttonStyles.variants.primary}"
                                    >
                                      Join
                                    </button>
                                  `
                                : html`
                                    <span class="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium ${textColors.tertiary}">
                                      Invitation required
                                    </span>
                                  `}
                            </div>
                          </div>
                        </div>
                      `
                    )}
                  </div>
                `
              : ''}
          </div>
        </div>

        <!-- Create New Group -->
        <div class="${backgroundColors.pageAlt} rounded-lg p-4 border ${backgroundColors.border}">
          <label class="${inputStyles.label}">
            Or create a new group
          </label>
          <div class="mt-2 flex gap-2">
            <input
              type="text"
              .value=${this.newGroupName}
              placeholder="Group name"
              class="${inputStyles.base} ${inputStyles.states.default} flex-1"
              @input=${(e: Event) => {
                this.newGroupName = (e.target as HTMLInputElement).value;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  this.handleCreateGroup();
                }
              }}
            />
            <button
              type="button"
              @click=${this.handleCreateGroup}
              ?disabled=${this.isCreatingGroup || !this.newGroupName.trim()}
              class="${buttonStyles.base} ${buttonStyles.sizes.md} ${buttonStyles.variants.secondary}"
            >
              ${this.isCreatingGroup
                ? html`<span class="${spinnerStyles.base} ${spinnerStyles.sizes.sm} ${spinnerStyles.colors.primary} mr-2"></span>`
                : ''}
              Create
            </button>
          </div>
        </div>

        <!-- Joined Groups List -->
        ${this.joinedGroups.length > 0
          ? html`
              <div>
                <h3 class="text-sm font-medium ${textColors.primary} mb-3">Your groups</h3>
                <ul class="divide-y ${backgroundColors.divide} border ${backgroundColors.border} rounded-lg overflow-hidden">
                  ${this.joinedGroups.map(
                    group => html`
                      <li class="flex items-center justify-between px-4 py-3 ${backgroundColors.content}">
                        <div>
                          <div class="font-medium text-sm ${textColors.primary}">${group.name}</div>
                          <div class="text-xs ${textColors.tertiary}">${group.displayId}</div>
                        </div>
                        <button
                          type="button"
                          @click=${() => this.handleLeaveGroup(group)}
                          class="text-sm ${textColors.error} hover:underline"
                        >
                          Remove
                        </button>
                      </li>
                    `
                  )}
                </ul>
              </div>
            `
          : ''}

        <!-- Navigation -->
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
            @click=${this.handleStep4Finish}
            class="${buttonStyles.base} ${buttonStyles.sizes.md} ${buttonStyles.variants.primary}"
          >
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
          ${this.currentStep === 4 ? this.renderStep4() : ''}
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
