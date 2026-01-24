import { html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import type { Person, Group, ContactInformation } from '@irl/shared';
import { ContactType, PrivacyLevel } from '@irl/shared';
import { textStyles, backgroundColors, textColors } from '../../utilities/text-colors.js';
import { BaseList, SortableColumn } from './base-list.js';
import { renderIcon } from '../../utilities/icons.js';
import { apiContext } from '../../contexts/api-context.js';
import type { ApiClient } from '../../services/api-client.js';

// Union type for items that can be either Person or Group
type SearchItem =
  | { type: 'person'; data: Person }
  | { type: 'group'; data: Group };

@customElement('unified-search-list')
export class UnifiedSearchList extends BaseList<SearchItem> {
  @property({ type: Array })
  persons: Person[] = [];

  @property({ type: Array })
  groups: Group[] = [];

  @property({ attribute: false })
  personContacts: Map<number, ContactInformation[]> = new Map();

  @property({ attribute: false })
  groupContacts: Map<number, ContactInformation[]> = new Map();

  @property({ type: Boolean })
  showPrivateContacts = false;

  @property({ type: Boolean })
  showPersons = true;

  @property({ type: Boolean })
  showGroups = true;

  @consume({ context: apiContext })
  @state()
  private api!: ApiClient;

  // Cache original data for restoring when search is cleared
  @state()
  private originalPersons: Person[] = [];

  @state()
  private originalGroups: Group[] = [];

  @state()
  private originalShowPersons = true;

  @state()
  private originalShowGroups = true;

  @state()
  private hasActiveSearch = false;

  constructor() {
    super();
    // Enable async search for this component
    this.asyncSearchEnabled = true;
  }

  // Combine persons and groups into unified items array
  get items(): SearchItem[] {
    const personItems: SearchItem[] = this.showPersons
      ? this.persons.map(person => ({
          type: 'person',
          data: person
        }))
      : [];

    const groupItems: SearchItem[] = this.showGroups
      ? this.groups.map(group => ({
          type: 'group',
          data: group
        }))
      : [];

    return [...personItems, ...groupItems];
  }

  protected getColumnCount(): number {
    return 2; // Type/Name + Contact Information
  }

  protected getColumns(): SortableColumn<SearchItem>[] {
    return [
      {
        id: 'name',
        label: 'Name',
        sortable: true,
        getSortValue: (item) => {
          if (item.type === 'person') {
            return `${item.data.firstName} ${item.data.lastName}`.toLowerCase();
          } else {
            return item.data.name.toLowerCase();
          }
        },
      },
      {
        id: 'contact',
        label: 'Contact Information',
        sortable: false,
      },
    ];
  }

  protected getSearchableText(item: SearchItem): string {
    const contactTexts: string[] = [];

    if (item.type === 'person') {
      const contacts = this.getVisiblePersonContacts(item.data.id);
      contacts.forEach(contact => {
        if (contact.value) {
          contactTexts.push(contact.value);
          if (contact.label) {
            contactTexts.push(contact.label);
          }
        }
      });

      return [
        item.data.firstName,
        item.data.lastName,
        item.data.displayId,
        'person',
        ...contactTexts,
      ].filter(Boolean).join(' ');
    } else {
      const contacts = this.getVisibleGroupContacts(item.data.id);
      contacts.forEach(contact => {
        if (contact.value) {
          contactTexts.push(contact.value);
          if (contact.label) {
            contactTexts.push(contact.label);
          }
        }
      });

      return [
        item.data.name,
        item.data.displayId,
        item.data.description || '',
        'group',
        ...contactTexts,
      ].filter(Boolean).join(' ');
    }
  }

  protected getEmptyStateMessage(): string {
    return 'No people or groups found.';
  }

  /**
   * Perform async search via API
   * Searches both persons and groups, auto-enables filters based on results
   */
  protected async performAsyncSearch(query: string, signal: AbortSignal): Promise<void> {
    // If query is empty, restore original data
    if (!query.trim()) {
      if (this.hasActiveSearch) {
        this.persons = this.originalPersons;
        this.groups = this.originalGroups;
        this.showPersons = this.originalShowPersons;
        this.showGroups = this.originalShowGroups;
        this.hasActiveSearch = false;
      }
      return;
    }

    // Save original data on first search
    if (!this.hasActiveSearch) {
      this.originalPersons = this.persons;
      this.originalGroups = this.groups;
      this.originalShowPersons = this.showPersons;
      this.originalShowGroups = this.showGroups;
      this.hasActiveSearch = true;
    }

    try {
      // Search both persons and groups in parallel
      const [personsResponse, groupsResponse] = await Promise.all([
        this.api.getPersons({ page: 1, limit: 50, search: query }, signal),
        this.api.getGroups({ page: 1, limit: 50, search: query }, signal)
      ]);

      // Update persons array with search results
      if (personsResponse.success && personsResponse.data) {
        this.persons = personsResponse.data;

        // Load contact information for search results
        const personContactPromises = this.persons.map(async (person) => {
          try {
            const contactsResponse = await this.api.getPersonContactInformations(person.displayId);
            if (contactsResponse.success && contactsResponse.data) {
              this.personContacts.set(person.id, contactsResponse.data);
            }
          } catch (error) {
            // Silently fail for individual contact fetches
            console.error(`Failed to load contacts for person ${person.displayId}:`, error);
          }
        });

        await Promise.all(personContactPromises);
      } else {
        this.persons = [];
      }

      // Update groups array with search results
      if (groupsResponse.success && groupsResponse.data) {
        this.groups = groupsResponse.data;

        // Load contact information for search results
        const groupContactPromises = this.groups.map(async (group) => {
          try {
            const contactsResponse = await this.api.getGroupContactInformations(group.displayId);
            if (contactsResponse.success && contactsResponse.data) {
              this.groupContacts.set(group.id, contactsResponse.data);
            }
          } catch (error) {
            // Silently fail for individual contact fetches
            console.error(`Failed to load contacts for group ${group.displayId}:`, error);
          }
        });

        await Promise.all(groupContactPromises);
      } else {
        this.groups = [];
      }

      // Auto-enable filters based on what we found
      const hasPersonResults = this.persons.length > 0;
      const hasGroupResults = this.groups.length > 0;

      if (hasPersonResults) {
        this.showPersons = true;
      }
      if (hasGroupResults) {
        this.showGroups = true;
      }

      // Trigger re-render with updated maps
      this.requestUpdate();
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        return;
      }

      console.error('Search failed:', error);
      // On error, restore original data
      this.persons = this.originalPersons;
      this.groups = this.originalGroups;
      this.showPersons = this.originalShowPersons;
      this.showGroups = this.originalShowGroups;
    }
  }

  private getVisiblePersonContacts(personId: number): ContactInformation[] {
    const contacts = this.personContacts.get(personId) ?? [];
    return this.showPrivateContacts
      ? contacts
      : contacts.filter(contact => contact.privacy === PrivacyLevel.PUBLIC);
  }

  private getVisibleGroupContacts(groupId: number): ContactInformation[] {
    const contacts = this.groupContacts.get(groupId) ?? [];
    return this.showPrivateContacts
      ? contacts
      : contacts.filter(contact => contact.privacy === PrivacyLevel.PUBLIC);
  }

  private getContactTypeLabel(type: ContactType): string {
    switch (type) {
      case ContactType.EMAIL:
        return 'Email';
      case ContactType.PHONE:
        return 'Phone';
      case ContactType.ADDRESS:
        return 'Address';
      case ContactType.URL:
        return 'Website';
      default:
        return 'Contact';
    }
  }

  private getContactTypeIcon(type: ContactType): string {
    switch (type) {
      case ContactType.EMAIL:
        return 'Mail';
      case ContactType.PHONE:
        return 'Phone';
      case ContactType.ADDRESS:
        return 'MapPin';
      case ContactType.URL:
        return 'Globe';
      default:
        return 'Mail';
    }
  }

  private renderContactValue(item: ContactInformation) {
    const value = item.value ?? '';

    switch (item.type) {
      case ContactType.EMAIL:
        return html`<a
          href="mailto:${value}"
          class="${textColors.link} ${textColors.linkHover}"
          @click=${(e: Event) => e.stopPropagation()}
        >
          ${value}
        </a>`;
      case ContactType.PHONE:
        return html`<a
          href="tel:${value}"
          class="${textColors.link} ${textColors.linkHover}"
          @click=${(e: Event) => e.stopPropagation()}
        >
          ${value}
        </a>`;
      case ContactType.URL:
        return html`<a
          href="${value}"
          target="_blank"
          rel="noopener noreferrer"
          class="${textColors.link} ${textColors.linkHover}"
          @click=${(e: Event) => e.stopPropagation()}
        >
          ${value}
        </a>`;
      case ContactType.ADDRESS:
        return html`<a
          href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}"
          target="_blank"
          rel="noopener noreferrer"
          class="${textColors.link} ${textColors.linkHover}"
          @click=${(e: Event) => e.stopPropagation()}
        >
          ${value}
        </a>`;
      default:
        return html`${value}`;
    }
  }

  private renderContactColumn(item: SearchItem) {
    const contacts = item.type === 'person'
      ? this.getVisiblePersonContacts(item.data.id).filter(c => !!c.value)
      : this.getVisibleGroupContacts(item.data.id).filter(c => !!c.value);

    if (contacts.length === 0) {
      return html`<span class="${textStyles.body.xs} opacity-60">No contact info</span>`;
    }

    return html`
      <div class="space-y-1">
        ${contacts.slice(0, 3).map(
          contact => html`
            <div class="flex items-center gap-1.5">
              <span
                class="inline-flex ${textStyles.table.cellPrimary}"
                title="${contact.label || this.getContactTypeLabel(contact.type)}"
              >
                ${renderIcon(this.getContactTypeIcon(contact.type), 'w-3.5 h-3.5')}
              </span>
              <span class="truncate ${textStyles.table.cellSecondary} text-xs">
                ${this.renderContactValue(contact)}
              </span>
            </div>
          `
        )}
        ${contacts.length > 3
          ? html`<span class="${textStyles.body.xs} opacity-60">+${contacts.length - 3} more</span>`
          : ''}
      </div>
    `;
  }

  private getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  private handleItemClick(item: SearchItem) {
    if (item.type === 'person') {
      window.history.pushState({}, '', `/persons/${item.data.displayId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      window.history.pushState({}, '', `/groups/${item.data.displayId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  private togglePersonsFilter() {
    this.showPersons = !this.showPersons;
  }

  private toggleGroupsFilter() {
    this.showGroups = !this.showGroups;
  }

  private renderTypeFilters(): TemplateResult {
    const buttonBaseClasses = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors';
    const activeClasses = 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500';
    const inactiveClasses = 'border-gray-300 bg-white text-gray-700 opacity-40 hover:opacity-60 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';

    return html`
      <div class="flex items-center gap-2 mb-4">
        <span class="${textStyles.body.small} text-gray-500 dark:text-gray-400">Show:</span>
        <button
          type="button"
          class="${buttonBaseClasses} ${this.showPersons ? activeClasses : inactiveClasses}"
          @click=${this.togglePersonsFilter}
        >
          <span class="inline-flex items-center rounded-md bg-blue-100 p-1 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
            ${renderIcon('User', 'w-3 h-3')}
          </span>
          <span>People</span>
        </button>
        <button
          type="button"
          class="${buttonBaseClasses} ${this.showGroups ? activeClasses : inactiveClasses}"
          @click=${this.toggleGroupsFilter}
        >
          <span class="inline-flex items-center rounded-md bg-green-100 p-1 text-green-800 dark:bg-green-500/20 dark:text-green-300">
            ${renderIcon('Users', 'w-3 h-3')}
          </span>
          <span>Groups</span>
        </button>
      </div>
    `;
  }

  protected renderRow(item: SearchItem): TemplateResult {
    if (item.type === 'person') {
      return this.renderPersonRow(item.data);
    } else {
      return this.renderGroupRow(item.data);
    }
  }

  private renderPersonRow(person: Person): TemplateResult {
    const rowClasses = `cursor-pointer ${backgroundColors.contentHover} transition-colors`;
    const item: SearchItem = { type: 'person', data: person };

    return html`
      <tr class="${rowClasses}" @click=${() => this.handleItemClick(item)}>
        <td class="py-3 pr-3 pl-3 md:pr-8 md:pl-8 text-sm ${textStyles.table.cellPrimary}">
          <div class="flex items-center">
            <div class="size-8 shrink-0">
              ${person.imageURL
                ? html`
                    <img
                      src="${person.imageURL}"
                      alt="${person.firstName} ${person.lastName}"
                      class="size-8 rounded-full dark:outline dark:outline-white/10"
                    />
                  `
                : html`
                    <div
                      class="size-8 rounded-full bg-indigo-600 flex items-center justify-center ${textStyles.button.primary} font-medium text-xs"
                    >
                      ${this.getInitials(person.firstName, person.lastName)}
                    </div>
                  `}
            </div>
            <div class="ml-3 md:ml-4 min-w-0">
              <div class="font-medium ${textStyles.table.cellPrimary} flex items-center gap-2 flex-wrap">
                <span class="truncate">${person.firstName} ${person.lastName}</span>
                <span class="inline-flex items-center rounded-md bg-blue-100 p-1 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                  ${renderIcon('User', 'w-3 h-3')}
                </span>
              </div>
              <!-- Show contacts inline on mobile -->
              <div class="md:hidden mt-1">
                ${this.renderContactColumn(item)}
              </div>
            </div>
          </div>
        </td>
        <td class="hidden md:table-cell px-3 md:px-8 py-3 text-sm ${textStyles.table.cellSecondary}">
          ${this.renderContactColumn(item)}
        </td>
      </tr>
    `;
  }

  private renderGroupRow(group: Group): TemplateResult {
    const rowClasses = `cursor-pointer ${backgroundColors.contentHover} transition-colors`;
    const item: SearchItem = { type: 'group', data: group };

    return html`
      <tr class="${rowClasses}" @click=${() => this.handleItemClick(item)}>
        <td class="py-3 pr-3 pl-3 md:pr-8 md:pl-8 text-sm ${textStyles.table.cellPrimary}">
          <div class="flex items-center">
            <div class="size-8 shrink-0">
              <div class="size-8 rounded-full bg-green-600 flex items-center justify-center ${textStyles.button.primary} font-medium text-xs">
                📂
              </div>
            </div>
            <div class="ml-3 md:ml-4 min-w-0">
              <div class="font-medium ${textStyles.table.cellPrimary} flex items-center gap-2 flex-wrap">
                <span class="truncate">${group.name}</span>
                <span class="inline-flex items-center rounded-md bg-green-100 p-1 text-green-800 dark:bg-green-500/20 dark:text-green-300">
                  ${renderIcon('Users', 'w-3 h-3')}
                </span>
              </div>
              <!-- Show contacts inline on mobile -->
              <div class="md:hidden mt-1">
                ${this.renderContactColumn(item)}
              </div>
            </div>
          </div>
        </td>
        <td class="hidden md:table-cell px-3 md:px-8 py-3 text-sm ${textStyles.table.cellSecondary}">
          ${this.renderContactColumn(item)}
        </td>
      </tr>
    `;
  }

  protected renderHeader(): TemplateResult {
    if (!this.showHeader) {
      return html``;
    }

    return html`
      <thead class="hidden md:table-header-group">
        <tr>
          ${this.renderSortableHeader('name', 'Name', true)}
          ${this.renderSortableHeader('contact', 'Contact Information', false)}
        </tr>
      </thead>
    `;
  }

  render(): TemplateResult {
    return html`
      <div>
        ${this.renderSearchInput()}
        ${this.renderTypeFilters()}
        <table class="relative min-w-full divide-y ${backgroundColors.divideStrong}">
          ${this.renderHeader()}
          <tbody class="divide-y ${backgroundColors.divide}">
            ${this.renderBody()}
          </tbody>
        </table>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'unified-search-list': UnifiedSearchList;
  }
}
