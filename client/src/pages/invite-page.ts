import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { pageStyles } from '../utilities/design-tokens.js';
import '../components/ui/invite-user-card.js';

@customElement('invite-page')
export class InvitePage extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div class="${pageStyles.container}">
        <div class="${pageStyles.content}">
          <div class="max-w-md mx-auto">
            <invite-user-card></invite-user-card>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'invite-page': InvitePage;
  }
}
