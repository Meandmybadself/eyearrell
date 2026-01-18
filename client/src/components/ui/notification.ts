import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { storeContext } from '../../contexts/store-context.js';
import { removeNotification } from '../../store/slices/ui.js';
import { selectNotifications } from '../../store/selectors.js';
import { notificationStyles } from '../../utilities/design-tokens.js';
import type { AppStore } from '../../store/index.js';

@customElement('ui-notifications')
export class UINotifications extends LitElement {
  // Remove Shadow DOM to use Tailwind classes
  createRenderRoot() {
    return this;
  }

  @consume({ context: storeContext, subscribe: true })
  @state()
  private store!: AppStore;

  @state()
  private notifications: ReturnType<typeof selectNotifications> = [];

  private unsubscribe?: () => void;

  /** Track auto-dismiss timers by notification ID to prevent memory leaks */
  private dismissTimers = new Map<string, number>();

  connectedCallback() {
    super.connectedCallback();
    if (this.store) {
      this.updateNotifications();
      this.unsubscribe = this.store.subscribe(() => {
        this.updateNotifications();
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
    // Clean up all timers on disconnect
    for (const timerId of this.dismissTimers.values()) {
      clearTimeout(timerId);
    }
    this.dismissTimers.clear();
  }

  private updateNotifications() {
    const newNotifications = selectNotifications(this.store.getState());

    // Clear timers for notifications that no longer exist
    const newIds = new Set(newNotifications.map(n => n.id));
    for (const [id, timerId] of this.dismissTimers.entries()) {
      if (!newIds.has(id)) {
        clearTimeout(timerId);
        this.dismissTimers.delete(id);
      }
    }

    // Set timers only for new notifications (not already tracked)
    newNotifications.forEach(notification => {
      if (!this.dismissTimers.has(notification.id)) {
        const timerId = window.setTimeout(() => {
          this.store.dispatch(removeNotification(notification.id));
          this.dismissTimers.delete(notification.id);
        }, 5000);
        this.dismissTimers.set(notification.id, timerId);
      }
    });

    this.notifications = newNotifications;
  }

  private handleClose(id: string) {
    this.store.dispatch(removeNotification(id));
  }

  private getNotificationClasses(type: string) {
    const variant = notificationStyles.variants[type as keyof typeof notificationStyles.variants] || notificationStyles.variants.info;
    return `${notificationStyles.base} ${variant}`;
  }

  render() {
    return html`
      <div class="fixed top-4 right-4 z-[9999] max-w-sm">
        ${this.notifications.map(
          notification => html`
            <div class=${this.getNotificationClasses(notification.type)}>
              <div class="flex-1 text-sm">${notification.message}</div>
              <button
                class="bg-transparent border-none cursor-pointer p-0 text-xl leading-none opacity-60 hover:opacity-100 transition-opacity"
                @click=${() => this.handleClose(notification.id)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-notifications': UINotifications;
  }
}
