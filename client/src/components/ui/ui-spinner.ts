import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { spinnerStyles } from '../../utilities/design-tokens.js';

/**
 * A reusable loading spinner component with consistent styling.
 *
 * @example
 * // Basic usage
 * html`<ui-spinner></ui-spinner>`
 *
 * // With size variant
 * html`<ui-spinner size="lg"></ui-spinner>`
 *
 * // With color variant
 * html`<ui-spinner color="white"></ui-spinner>`
 *
 * // As overlay (full container)
 * html`<ui-spinner overlay></ui-spinner>`
 *
 * // With label
 * html`<ui-spinner label="Loading..."></ui-spinner>`
 */
@customElement('ui-spinner')
export class UISpinner extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  /**
   * Size of the spinner: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
   */
  @property({ type: String })
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';

  /**
   * Color variant: 'primary' | 'white' | 'current' | 'muted'
   */
  @property({ type: String })
  color: 'primary' | 'white' | 'current' | 'muted' = 'primary';

  /**
   * Whether to display as full-container overlay
   */
  @property({ type: Boolean })
  overlay = false;

  /**
   * Optional label text to display below spinner
   */
  @property({ type: String })
  label = '';

  private getSpinnerClasses(): string {
    return `${spinnerStyles.base} ${spinnerStyles.colors[this.color]} ${spinnerStyles.sizes[this.size]}`;
  }

  render() {
    const spinner = html`
      <div class="${this.getSpinnerClasses()}" role="status" aria-label="${this.label || 'Loading'}">
        <span class="sr-only">${this.label || 'Loading...'}</span>
      </div>
    `;

    // If overlay, center in container
    if (this.overlay) {
      return html`
        <div class="flex flex-col items-center justify-center py-12 gap-3">
          ${spinner}
          ${this.label ? html`<span class="text-sm text-gray-600 dark:text-gray-400">${this.label}</span>` : ''}
        </div>
      `;
    }

    // If label but no overlay, show inline with label
    if (this.label) {
      return html`
        <span class="inline-flex items-center gap-2">
          ${spinner}
          <span class="text-sm text-gray-600 dark:text-gray-400">${this.label}</span>
        </span>
      `;
    }

    // Just the spinner
    return spinner;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-spinner': UISpinner;
  }
}
