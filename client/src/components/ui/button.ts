import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { buttonStyles } from '../../utilities/design-tokens.js';
import './ui-spinner.js';

/**
 * A reusable button component with consistent styling and loading states.
 *
 * Features:
 * - Multiple variants (primary, secondary, outline, danger, ghost)
 * - Size options (sm, md, lg)
 * - Loading state with spinner
 * - Form association support
 * - Full width option
 * - Slot support for custom content
 *
 * @example
 * // Basic usage
 * html`<ui-button label="Click me"></ui-button>`
 *
 * // With variant and size
 * html`<ui-button variant="primary" size="lg" label="Submit"></ui-button>`
 *
 * // With loading state
 * html`<ui-button .loading=${this.isLoading} label="Save"></ui-button>`
 *
 * // As form submit button
 * html`<ui-button type="submit" label="Submit Form"></ui-button>`
 *
 * // Full width
 * html`<ui-button fullWidth label="Full Width Button"></ui-button>`
 *
 * // With slot content
 * html`<ui-button><span>Custom Content</span></ui-button>`
 */
@customElement('ui-button')
export class UIButton extends LitElement {
  static formAssociated = true;

  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @property({ type: String }) variant: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' = 'primary';
  @property({ type: String }) size: 'sm' | 'md' | 'lg' = 'md';
  @property({ type: String }) type: 'button' | 'submit' | 'reset' = 'button';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) fullWidth = false;
  @property({ type: String }) label = '';

  private handleClick() {
    if (this.type === 'submit') {
      // Find the containing form and submit it
      const form = this.closest('form');
      if (form) {
        // If the form has a submit event listener, trigger it
        // Otherwise submit the form
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
  }

  private getButtonClasses(): string {
    const classes: string[] = [
      buttonStyles.base,
      buttonStyles.sizes[this.size],
      buttonStyles.variants[this.variant],
    ];

    if (this.fullWidth) {
      classes.push(buttonStyles.fullWidth);
    }

    return classes.join(' ');
  }

  render() {
    // Use white spinner for filled buttons, current color for outline/ghost
    const spinnerColor = this.variant === 'outline' || this.variant === 'ghost' ? 'current' : 'white';

    return html`
      <button
        type=${this.type}
        class=${this.getButtonClasses()}
        ?disabled=${this.disabled || this.loading}
        @click=${this.handleClick}
      >
        ${this.loading
          ? html`<ui-spinner size="sm" color="${spinnerColor}" class="mr-2"></ui-spinner>`
          : ''}
        ${this.label || html`<slot></slot>`}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-button': UIButton;
  }
}
