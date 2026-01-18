import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { contentStateStyles, pageStyles } from '../../utilities/design-tokens.js';
import '../ui/ui-spinner.js';

/**
 * A layout wrapper component for the main application content area.
 *
 * Provides:
 * - Consistent background and padding
 * - Loading state with centered spinner
 * - Error state display
 * - Content slot
 *
 * @example
 * html`<app-layout .loading=${this.isLoading} .error=${this.error}>
 *   <div>Content here</div>
 * </app-layout>`
 */
@customElement('app-layout')
export class AppLayout extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @property({ type: Boolean }) loading = false;
  @property({ type: String }) error = '';

  render() {
    return html`
      <div class="${pageStyles.container}">
        <div class="${pageStyles.content}">
          ${this.loading
            ? html`
                <div class="${contentStateStyles.containerFullHeight}">
                  <ui-spinner size="xl" color="primary"></ui-spinner>
                </div>
              `
            : this.error
            ? html`
                <div class="${contentStateStyles.containerFullHeight} ${contentStateStyles.errorText}">
                  ${this.error}
                </div>
              `
            : html`<slot></slot>`}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-layout': AppLayout;
  }
}
