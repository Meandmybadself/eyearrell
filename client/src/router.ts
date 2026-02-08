import { html, type TemplateResult } from 'lit';
import type { AppStore } from './store/index.js';
import { selectIsAuthenticated, selectNeedsPersonOnboarding } from './store/selectors.js';
import { setAttemptedPath } from './store/slices/auth.js';

// Import pages
import './pages/register-page.js';
import './pages/login-page.js';
import './pages/verify-email-page.js';
import './pages/verify-email-change-page.js';
import './pages/profile-page.js';
import './pages/home-page.js';
import './pages/system-admin-page.js';
import './pages/audit-logs-page.js';
import './pages/admin-users-page.js';
import './pages/person-form-page.js';
import './pages/person-detail-page.js';
import './pages/persons-page.js';
import './pages/group-form-page.js';
import './pages/group-detail-page.js';
import './pages/groups-page.js';
import './pages/achievements-page.js';
import './pages/invite-page.js';
import './pages/admin-interests-page.js';
import './pages/onboarding-page.js';

export interface RouteConfig {
  path: string;
  render: () => TemplateResult;
}

// Helper to check if user needs onboarding and render onboarding page if so
const checkOnboarding = (store: AppStore, requestedPath: string): TemplateResult | null => {
  const state = store.getState();
  const needsOnboarding = selectNeedsPersonOnboarding(state);

  if (needsOnboarding) {
    // Store the path they were trying to access
    store.dispatch(setAttemptedPath(requestedPath));
    return html`<onboarding-page></onboarding-page>`;
  }

  return null;
};

export const createRoutes = (store: AppStore): RouteConfig[] => {
  return [
    {
      path: '/',
      render: () => {
        // Render login or home based on auth status
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (isAuthenticated) {
          // Check if user needs to complete onboarding
          const onboarding = checkOnboarding(store, '/');
          if (onboarding) return onboarding;

          return html`<home-page></home-page>`;
        }
        return html`<login-page></login-page>`;
      }
    },
    {
      path: '/register',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (isAuthenticated) {
          return html`<home-page></home-page>`;
        }
        return html`<register-page></register-page>`;
      }
    },
    {
      path: '/login',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (isAuthenticated) {
          return html`<home-page></home-page>`;
        }
        return html`<login-page></login-page>`;
      }
    },
    {
      path: '/verify-email',
      render: () => {
        return html`<verify-email-page></verify-email-page>`;
      }
    },
    {
      path: '/verify-email-change',
      render: () => {
        return html`<verify-email-change-page></verify-email-change-page>`;
      }
    },
    {
      path: '/onboarding',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          return html`<login-page></login-page>`;
        }

        return html`<onboarding-page></onboarding-page>`;
      }
    },
    {
      path: '/profile',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/profile'));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, '/profile');
        if (onboarding) return onboarding;

        return html`<profile-page></profile-page>`;
      }
    },
    {
      path: '/home',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          // Store attempted path for redirect after login
          store.dispatch(setAttemptedPath('/home'));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, '/home');
        if (onboarding) return onboarding;

        return html`<home-page></home-page>`;
      }
    },
    {
      path: '/admin/system',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/admin/system'));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, '/admin/system');
        if (onboarding) return onboarding;

        return html`<system-admin-page></system-admin-page>`;
      }
    },
    {
      path: '/admin/logs',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/admin/logs'));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, '/admin/logs');
        if (onboarding) return onboarding;

        return html`<audit-logs-page></audit-logs-page>`;
      }
    },
    {
      path: '/admin/users',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/admin/users'));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, '/admin/users');
        if (onboarding) return onboarding;

        return html`<admin-users-page></admin-users-page>`;
      }
    },
    {
      path: '/admin/interests',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/admin/interests'));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, '/admin/interests');
        if (onboarding) return onboarding;

        return html`<admin-interests-page></admin-interests-page>`;
      }
    },
    {
      path: '/persons',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/persons'));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, '/persons');
        if (onboarding) return onboarding;

        return html`<persons-page></persons-page>`;
      }
    },
    {
      path: '/persons/me',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/persons/me'));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, '/persons/me');
        if (onboarding) return onboarding;

        return html`<person-detail-page></person-detail-page>`;
      }
    },
    {
      path: '/persons/create',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/persons/create'));
          return html`<login-page></login-page>`;
        }
        return html`<person-form-page></person-form-page>`;
      }
    },
    {
      path: '/persons/:id/edit',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath(window.location.pathname));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, window.location.pathname);
        if (onboarding) return onboarding;

        return html`<person-form-page></person-form-page>`;
      }
    },
    {
      path: '/persons/:id',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath(window.location.pathname));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, window.location.pathname);
        if (onboarding) return onboarding;

        return html`<person-detail-page></person-detail-page>`;
      }
    },
    {
      path: '/groups',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/groups'));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, '/groups');
        if (onboarding) return onboarding;

        return html`<groups-page></groups-page>`;
      }
    },
    {
      path: '/groups/create',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/groups/create'));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, '/groups/create');
        if (onboarding) return onboarding;

        return html`<group-form-page></group-form-page>`;
      }
    },
    {
      path: '/groups/:id/edit',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath(window.location.pathname));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, window.location.pathname);
        if (onboarding) return onboarding;

        return html`<group-form-page></group-form-page>`;
      }
    },
    {
      path: '/groups/:id',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath(window.location.pathname));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, window.location.pathname);
        if (onboarding) return onboarding;

        return html`<group-detail-page></group-detail-page>`;
      }
    },
    {
      path: '/invite',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/invite'));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, '/invite');
        if (onboarding) return onboarding;

        return html`<invite-page></invite-page>`;
      }
    },
    {
      path: '/achievements',
      render: () => {
        const state = store.getState();
        const isAuthenticated = selectIsAuthenticated(state);

        if (!isAuthenticated) {
          store.dispatch(setAttemptedPath('/achievements'));
          return html`<login-page></login-page>`;
        }

        // Check if user needs to complete onboarding
        const onboarding = checkOnboarding(store, '/achievements');
        if (onboarding) return onboarding;

        return html`<achievements-page></achievements-page>`;
      }
    },
    {
      path: '/*',
      render: () => {
        return html`
          <div style="padding: 2rem; text-align: center;">
            <h1>404 - Page Not Found</h1>
            <p><a href="/">Go Home</a></p>
          </div>
        `;
      }
    }
  ];
};
