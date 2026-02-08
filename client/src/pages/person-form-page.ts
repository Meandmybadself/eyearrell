import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../contexts/store-context.js';
import { apiContext } from '../contexts/api-context.js';
import { addNotification } from '../store/slices/ui.js';
import { checkSession } from '../store/slices/auth.js';
import { selectCurrentUser } from '../store/selectors.js';
import { toDisplayId } from '../utilities/string.js';
import {
  textColors,
  backgroundColors,
  pageStyles,
  contentStateStyles,
  buttonStyles,
  inputStyles,
  cardStyles,
} from '../utilities/design-tokens.js';
import '../components/ui/contact-info-form.js';
import '../components/ui/image-cropper-modal.js';
import '../components/ui/interests-form.js';
import type { InterestsForm } from '../components/ui/interests-form.js';
import type { AppStore } from '../store/index.js';
import type { ApiClient } from '../services/api-client.js';
import type { ContactInformation } from '@irl/shared';

type EditTab = 'profile' | 'contact' | 'interests';

const TABS: { key: EditTab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'contact', label: 'Contact' },
  { key: 'interests', label: 'Interests' },
];

@customElement('person-form-page')
export class PersonFormPage extends LitElement {
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
  private imageURL = '';

  @state()
  private firstNameError = '';

  @state()
  private lastNameError = '';

  @state()
  private displayIdError = '';

  @state()
  private isSaving = false;

  @state()
  private isLoading = false;

  @state()
  private contactInformations: ContactInformation[] = [];

  @state()
  private selectedImageUrl = '';

  @state()
  private showCropperModal = false;

  @state()
  private isUploadingAvatar = false;

  @state()
  private activeTab: EditTab = 'profile';

  private get isEditMode(): boolean {
    return !!this.personDisplayId;
  }

  async connectedCallback() {
    super.connectedCallback();

    // Check if user is authenticated
    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    // Check if we're editing an existing person
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] === 'persons' && pathParts[2] && pathParts[2] !== 'create' && pathParts[3] === 'edit') {
      this.personDisplayId = pathParts[2];
      await this.loadPerson();
    }
  }

  private async loadPerson() {
    if (!this.personDisplayId) return;

    this.isLoading = true;
    try {
      const personResponse = await this.api.getPerson(this.personDisplayId);

      if (personResponse.success && personResponse.data) {
        const person = personResponse.data;
        this.personId = person.id;
        this.firstName = person.firstName;
        this.lastName = person.lastName;
        this.displayId = person.displayId;
        this.pronouns = person.pronouns || '';
        this.imageURL = person.imageURL || '';

        // Load contact information
        const contactsResponse = await this.api.getPersonContactInformations(person.displayId);
        if (contactsResponse.success && contactsResponse.data) {
          this.contactInformations = contactsResponse.data;
        }
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(`Failed to load person: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      );
      window.history.pushState({}, '', '/persons');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } finally {
      this.isLoading = false;
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

  private generateDisplayId() {
    if (this.firstName && this.lastName) {
      const baseId = `${this.firstName}-${this.lastName}`;
      this.displayId = toDisplayId(baseId);
    }
  }

  private handleFirstOrLastNameBlur() {
    if (!this.displayId && this.firstName && this.lastName) {
      this.generateDisplayId();
    }
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();

    // Validate
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
      // If we're in edit mode on a different tab, switch to profile tab to show errors
      if (this.isEditMode && this.activeTab !== 'profile') {
        this.activeTab = 'profile';
      }
      return;
    }

    const currentUser = selectCurrentUser(this.store.getState());
    if (!currentUser && !this.personDisplayId) {
      this.store.dispatch(addNotification('You must be logged in to create a person', 'error'));
      return;
    }

    this.isSaving = true;

    try {
      const data = {
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        displayId: this.displayId.trim(),
        pronouns: this.pronouns.trim() || null,
        imageURL: this.imageURL || null,
        ...(currentUser && !this.personDisplayId && { userId: currentUser.id })
      };

      let response;
      let savedDisplayId: string;

      if (this.personDisplayId) {
        // Update existing person
        response = await this.api.patchPerson(this.personDisplayId, data);
        savedDisplayId = response.data?.displayId || this.personDisplayId;
      } else {
        // Create new person
        response = await this.api.createPerson({ ...data, userId: currentUser!.id });
        savedDisplayId = response.data?.displayId || this.displayId.trim();
      }

      if (response.success) {
        // Save interests
        const interestsForm = this.querySelector('interests-form') as InterestsForm | null;
        if (interestsForm) {
          const interestsSaved = await interestsForm.saveInterests(savedDisplayId);
          if (!interestsSaved) {
            this.store.dispatch(addNotification(
              `Person ${this.personDisplayId ? 'updated' : 'created'} but interests could not be saved. You can edit them later.`,
              'info'
            ));
          } else {
            this.store.dispatch(addNotification(
              `Person ${this.personDisplayId ? 'updated' : 'created'} successfully`,
              'success'
            ));
          }
        } else {
          this.store.dispatch(addNotification(
            `Person ${this.personDisplayId ? 'updated' : 'created'} successfully`,
            'success'
          ));
        }

        // If this was a new person creation, refresh the session to update currentPersonId
        if (!this.personDisplayId) {
          await this.store.dispatch(checkSession());
        }

        // Navigate to person detail page
        window.history.pushState({}, '', `/persons/${savedDisplayId}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (error) {
      this.store.dispatch(
        addNotification(`Failed to ${this.personDisplayId ? 'update' : 'create'} person: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      );
    } finally {
      this.isSaving = false;
    }
  }

  private handleCancel() {
    if (this.personDisplayId) {
      window.history.pushState({}, '', `/persons/${this.personDisplayId}`);
    } else {
      window.history.pushState({}, '', '/persons');
    }
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.store.dispatch(addNotification('Please select a valid image file (JPG, PNG, or WebP)', 'error'));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      this.store.dispatch(addNotification('Image file must be less than 5MB', 'error'));
      return;
    }

    // Create object URL for preview
    this.selectedImageUrl = URL.createObjectURL(file);
    this.showCropperModal = true;

    // Clear the input so the same file can be selected again
    input.value = '';
  }

  private handleCropperCancel() {
    this.showCropperModal = false;
    if (this.selectedImageUrl) {
      URL.revokeObjectURL(this.selectedImageUrl);
      this.selectedImageUrl = '';
    }
  }

  private async handleCropperSave(e: CustomEvent) {
    const { blob } = e.detail;

    // Close the modal
    this.showCropperModal = false;
    if (this.selectedImageUrl) {
      URL.revokeObjectURL(this.selectedImageUrl);
      this.selectedImageUrl = '';
    }

    // If editing an existing person, upload immediately
    if (this.personDisplayId) {
      this.isUploadingAvatar = true;
      try {
        const response = await this.api.uploadPersonAvatar(this.personDisplayId, blob);
        if (response.success && response.data) {
          this.imageURL = response.data.imageURL || '';
          this.store.dispatch(addNotification('Profile photo updated successfully', 'success'));
        }
      } catch (error) {
        this.store.dispatch(
          addNotification(`Failed to upload profile photo: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
        );
      } finally {
        this.isUploadingAvatar = false;
      }
    } else {
      // For new persons, store the blob for later upload
      this.store.dispatch(addNotification('Profile photo will be uploaded after creating the person', 'info'));
      // Create temporary preview URL
      this.imageURL = URL.createObjectURL(blob);
    }
  }

  private handleCropperError(e: CustomEvent) {
    this.store.dispatch(addNotification(e.detail.error, 'error'));
  }

  private handleUploadButtonClick() {
    const fileInput = this.querySelector('#avatar-upload') as HTMLInputElement;
    if (fileInput && !this.isUploadingAvatar) {
      fileInput.click();
    }
  }

  // --- Tab rendering for edit mode ---

  private renderTabs() {
    return html`
      <div class="border-b ${backgroundColors.border} mb-6">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          ${TABS.map(tab => html`
            <button
              type="button"
              @click=${() => { this.activeTab = tab.key; }}
              class="py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                ${this.activeTab === tab.key
                  ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent ' + textColors.tertiary + ' hover:border-gray-300 dark:hover:border-gray-600 hover:' + textColors.secondary}"
            >
              ${tab.label}
            </button>
          `)}
        </nav>
      </div>
    `;
  }

  private renderProfileTab() {
    return html`
      <div class="space-y-6">
        <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
          <div>
            <label for="first-name" class="${inputStyles.label}">
              First name
            </label>
            <input
              id="first-name"
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
            <label for="last-name" class="${inputStyles.label}">
              Last name
            </label>
            <input
              id="last-name"
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
          <label for="display-id" class="${inputStyles.label}">
            Display ID
          </label>
          <input
            id="display-id"
            type="text"
            name="displayId"
            .value=${this.displayId}
            required
            placeholder="john-doe"
            class="${inputStyles.base} ${this.displayIdError ? inputStyles.states.error : inputStyles.states.default}"
            @input=${this.handleInputChange}
          />
          <p class="${inputStyles.helperText}">
            A unique, web-safe identifier for this person
          </p>
          ${this.displayIdError ? html`<p class="${inputStyles.errorText}">${this.displayIdError}</p>` : ''}
        </div>

        <div>
          <label for="pronouns" class="${inputStyles.label}">
            Pronouns (optional)
          </label>
          <input
            id="pronouns"
            type="text"
            name="pronouns"
            .value=${this.pronouns}
            placeholder="he/him, she/her, they/them"
            class="${inputStyles.base} ${inputStyles.states.default}"
            @input=${this.handleInputChange}
          />
        </div>

        ${this.personId ? html`
          <div>
            <label class="${inputStyles.label}">
              Profile Photo
            </label>
            <div class="flex items-center gap-4">
              ${this.imageURL ? html`
                <img
                  src=${this.imageURL}
                  alt="Profile preview"
                  class="w-20 h-20 rounded-full object-cover border-2 ${backgroundColors.border}"
                />
              ` : html`
                <div class="w-20 h-20 rounded-full ${backgroundColors.pageAlt} flex items-center justify-center border-2 ${backgroundColors.border}">
                  <span class="text-2xl ${textColors.tertiary}">?</span>
                </div>
              `}
              <div>
                <button
                  type="button"
                  @click=${this.handleUploadButtonClick}
                  ?disabled=${this.isUploadingAvatar}
                  class="${buttonStyles.base} ${buttonStyles.sizes.md} ${buttonStyles.variants.secondary} disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ${this.isUploadingAvatar ? html`
                    <span class="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin mr-2"></span>
                    Uploading...
                  ` : html`
                    ${this.imageURL ? 'Change Photo' : 'Upload Photo'}
                  `}
                </button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  class="hidden"
                  @change=${this.handleFileSelect}
                  ?disabled=${this.isUploadingAvatar}
                />
                <p class="mt-1 text-xs ${textColors.tertiary}">
                  JPG, PNG, or WebP. Max 5MB.
                </p>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderContactTab() {
    return html`
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
    `;
  }

  private renderInterestsTab() {
    return html`
      <interests-form
        .personDisplayId=${this.personDisplayId || ''}
        .hideSaveButton=${true}
        @interest-error=${(e: CustomEvent) => {
          this.store.dispatch(addNotification(e.detail.error, 'error'));
        }}
      ></interests-form>
    `;
  }

  private renderEditMode() {
    return html`
      <div class="${pageStyles.container}">
        <div class="${pageStyles.content}">
          <h2 class="text-2xl/9 font-bold tracking-tight ${textColors.primary} mb-6">
            Edit Person
          </h2>

          <div class="${cardStyles.base} ${cardStyles.padding.lg}">
            <form @submit=${this.handleSubmit}>
              ${this.renderTabs()}

              <div class="${this.activeTab === 'profile' ? '' : 'hidden'}">
                ${this.renderProfileTab()}
              </div>
              <div class="${this.activeTab === 'contact' ? '' : 'hidden'}">
                ${this.renderContactTab()}
              </div>
              <div class="${this.activeTab === 'interests' ? '' : 'hidden'}">
                ${this.renderInterestsTab()}
              </div>

              <div class="flex items-center justify-between gap-x-4 mt-8 pt-6 border-t ${backgroundColors.border}">
                <button
                  type="button"
                  @click=${this.handleCancel}
                  class="text-sm/6 font-semibold ${textColors.primary}"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  ?disabled=${this.isSaving}
                  class="${buttonStyles.base} ${buttonStyles.sizes.md} ${buttonStyles.variants.primary} disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ${this.isSaving
                    ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                    : ''}
                  Save All Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        <image-cropper-modal
          .imageUrl=${this.selectedImageUrl}
          .open=${this.showCropperModal}
          @cancel=${this.handleCropperCancel}
          @save=${this.handleCropperSave}
          @error=${this.handleCropperError}
        ></image-cropper-modal>
      </div>
    `;
  }

  private renderCreateMode() {
    return html`
      <div class="${pageStyles.container}">
        <div class="${pageStyles.content}">
          <h2 class="text-2xl/9 font-bold tracking-tight ${textColors.primary} mb-6">
            Create Person
          </h2>

          <div class="${backgroundColors.content} px-6 py-8 shadow-sm sm:rounded-lg sm:px-12">
            <form @submit=${this.handleSubmit} class="space-y-6">
              <div class="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                <div>
                  <label for="first-name" class="block text-sm/6 font-medium ${textColors.primary}">
                    First name
                  </label>
                  <div class="mt-2">
                    <input
                      id="first-name"
                      type="text"
                      name="firstName"
                      .value=${this.firstName}
                      required
                      autocomplete="given-name"
                      class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.firstNameError ? 'outline-red-500 focus:outline-red-600' : ''}"
                      @input=${this.handleInputChange}
                      @blur=${this.handleFirstOrLastNameBlur}
                    />
                    ${this.firstNameError ? html`<p class="mt-1 text-sm ${textColors.error}">${this.firstNameError}</p>` : ''}
                  </div>
                </div>

                <div>
                  <label for="last-name" class="block text-sm/6 font-medium ${textColors.primary}">
                    Last name
                  </label>
                  <div class="mt-2">
                    <input
                      id="last-name"
                      type="text"
                      name="lastName"
                      .value=${this.lastName}
                      required
                      autocomplete="family-name"
                      class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.lastNameError ? 'outline-red-500 focus:outline-red-600' : ''}"
                      @input=${this.handleInputChange}
                      @blur=${this.handleFirstOrLastNameBlur}
                    />
                    ${this.lastNameError ? html`<p class="mt-1 text-sm ${textColors.error}">${this.lastNameError}</p>` : ''}
                  </div>
                </div>
              </div>

              <div>
                <label for="display-id" class="block text-sm/6 font-medium ${textColors.primary}">
                  Display ID
                </label>
                <div class="mt-2">
                  <input
                    id="display-id"
                    type="text"
                    name="displayId"
                    .value=${this.displayId}
                    required
                    placeholder="john-doe"
                    class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 ${this.displayIdError ? 'outline-red-500 focus:outline-red-600' : ''}"
                    @input=${this.handleInputChange}
                  />
                  <p class="mt-1 text-sm ${textColors.tertiary}">
                    A unique, web-safe identifier for this person
                  </p>
                  ${this.displayIdError ? html`<p class="mt-1 text-sm ${textColors.error}">${this.displayIdError}</p>` : ''}
                </div>
              </div>

              <div>
                <label for="pronouns" class="block text-sm/6 font-medium ${textColors.primary}">
                  Pronouns (optional)
                </label>
                <div class="mt-2">
                  <input
                    id="pronouns"
                    type="text"
                    name="pronouns"
                    .value=${this.pronouns}
                    placeholder="he/him, she/her, they/them"
                    class="block w-full rounded-md ${backgroundColors.content} px-3 py-1.5 text-base ${textColors.primary} outline-1 -outline-offset-1 ${backgroundColors.border} placeholder:${textColors.muted} focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                    @input=${this.handleInputChange}
                  />
                </div>
              </div>

              <div class="pt-6 border-t ${backgroundColors.border}">
                <interests-form
                  .personDisplayId=${this.personDisplayId || ''}
                  .hideSaveButton=${true}
                  @interest-error=${(e: CustomEvent) => {
                    this.store.dispatch(addNotification(e.detail.error, 'error'));
                  }}
                ></interests-form>
              </div>

              <div class="flex items-center justify-between gap-x-4">
                <button
                  type="button"
                  @click=${this.handleCancel}
                  class="text-sm/6 font-semibold ${textColors.primary}"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  ?disabled=${this.isSaving}
                  class="flex justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ${this.isSaving
                    ? html`<span class="inline-block w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin mr-2"></span>`
                    : ''}
                  Create Person
                </button>
              </div>
            </form>
          </div>
        </div>

        <image-cropper-modal
          .imageUrl=${this.selectedImageUrl}
          .open=${this.showCropperModal}
          @cancel=${this.handleCropperCancel}
          @save=${this.handleCropperSave}
          @error=${this.handleCropperError}
        ></image-cropper-modal>
      </div>
    `;
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="${contentStateStyles.containerFullHeight}">
          <div class="inline-block w-8 h-8 border-4 border-indigo-600 border-r-transparent rounded-full animate-spin"></div>
        </div>
      `;
    }

    return this.isEditMode ? this.renderEditMode() : this.renderCreateMode();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'person-form-page': PersonFormPage;
  }
}
