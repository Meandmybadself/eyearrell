import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { inputStyles } from '../../utilities/design-tokens.js';

/**
 * A reusable input component with validation and accessibility support.
 *
 * Features:
 * - Label and placeholder support
 * - Error state with accessible error messages
 * - Helper text for additional guidance
 * - ARIA attributes for accessibility
 * - Custom input-change event for value updates
 * - Autocomplete support
 * - Dark mode support
 *
 * @example
 * // Basic usage
 * html`<ui-input label="Email" name="email" type="email"></ui-input>`
 *
 * // With validation error
 * html`<ui-input label="Name" name="name" required .error=${this.nameError}></ui-input>`
 *
 * // With helper text
 * html`<ui-input label="Username" helperText="Enter a unique username"></ui-input>`
 *
 * // Listening to changes
 * html`<ui-input
 *   label="Search"
 *   name="search"
 *   @input-change=${this.handleSearch}
 * ></ui-input>`
 */
@customElement('ui-input')
export class UIInput extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @property({ type: String }) label = '';
  @property({ type: String }) name = '';
  @property({ type: String }) type = 'text';
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) error = '';
  @property({ type: String }) helperText = '';
  @property({ type: Boolean }) required = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) autocomplete = '';

  private handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.value = target.value;
    this.dispatchEvent(
      new CustomEvent('input-change', {
        detail: { name: this.name, value: this.value },
        bubbles: true,
        composed: true
      })
    );
  }

  private getInputClasses(): string {
    return `${inputStyles.base} ${this.error ? inputStyles.states.error : inputStyles.states.default}`;
  }

  render() {
    const errorId = this.error ? `${this.name}-error` : undefined;

    return html`
      <div class="flex flex-col gap-2">
        ${this.label
          ? html`<label for=${this.name} class="${inputStyles.label}">${this.label}${this.required ? ' *' : ''}</label>`
          : ''}
        <input
          id=${this.name}
          name=${this.name}
          type=${this.type}
          .value=${this.value}
          placeholder=${this.placeholder}
          ?required=${this.required}
          ?disabled=${this.disabled}
          autocomplete=${this.autocomplete}
          class=${this.getInputClasses()}
          aria-describedby=${errorId || ''}
          aria-invalid=${this.error ? 'true' : 'false'}
          @input=${this.handleInput}
        />
        ${this.error ? html`<span id=${errorId} class="${inputStyles.errorText}">${this.error}</span>` : ''}
        ${this.helperText && !this.error ? html`<span class="${inputStyles.helperText}">${this.helperText}</span>` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-input': UIInput;
  }
}
