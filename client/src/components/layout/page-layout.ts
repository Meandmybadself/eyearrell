import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { pageStyles, contentStateStyles } from '../../utilities/design-tokens.js';
import '../ui/ui-spinner.js';

/**
 * A standardized page layout wrapper component.
 *
 * Provides consistent page structure with:
 * - Standard container sizing and padding
 * - Optional page title and description
 * - Loading state handling
 * - Error state handling
 * - Centered layout variant for auth pages
 *
 * @example
 * // Basic usage
 * html`<page-layout title="Dashboard" description="View your stats">
 *   <div>Page content here</div>
 * </page-layout>`
 *
 * // With loading state
 * html`<page-layout title="Groups" .loading=${this.isLoading}>
 *   <group-list></group-list>
 * </page-layout>`
 *
 * // Centered layout for auth pages
 * html`<page-layout centered>
 *   <login-form></login-form>
 * </page-layout>`
 *
 * // Narrow content width
 * html`<page-layout title="Security Settings" narrow>
 *   <profile-form></profile-form>
 * </page-layout>`
 */
@customElement('page-layout')
export class PageLayout extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  /**
   * Page title displayed in the header
   */
  @property({ type: String })
  title = '';

  /**
   * Page description displayed below the title
   */
  @property({ type: String })
  description = '';

  /**
   * Whether the page is in a loading state
   */
  @property({ type: Boolean })
  loading = false;

  /**
   * Error message to display (if any)
   */
  @property({ type: String })
  error = '';

  /**
   * Whether to use centered layout (for auth pages)
   */
  @property({ type: Boolean })
  centered = false;

  render() {
    // Centered layout (for login, register pages)
    if (this.centered) {
      return html`
        <div class="${pageStyles.centered}">
          ${this.loading
            ? html`<ui-spinner size="xl" overlay label="Loading..."></ui-spinner>`
            : this.error
            ? html`<div class="${contentStateStyles.container} ${contentStateStyles.errorText}">${this.error}</div>`
            : html`<slot></slot>`}
        </div>
      `;
    }

    // Standard page layout - always uses max-w-7xl for consistency
    return html`
      <div class="${pageStyles.container}">
        <div class="${pageStyles.content}">
          ${this.title || this.description
            ? html`
                <div class="${pageStyles.header}">
                  ${this.title ? html`<h1 class="${pageStyles.title}">${this.title}</h1>` : ''}
                  ${this.description ? html`<p class="${pageStyles.description}">${this.description}</p>` : ''}
                </div>
              `
            : ''}

          ${this.loading
            ? html`<ui-spinner size="xl" overlay label="Loading..."></ui-spinner>`
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
    'page-layout': PageLayout;
  }
}
