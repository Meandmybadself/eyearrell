/**
 * UI constants and configuration values
 */

// Timing constants (in milliseconds)
export const SEARCH_DEBOUNCE_MS = 300;

// Routes
export const ROUTES = {
  ACHIEVEMENTS: '/achievements',
  ADMIN_INTERESTS: '/admin/interests',
  ADMIN_LOGS: '/admin/logs',
  ADMIN_SYSTEM: '/admin/system',
  ADMIN_USERS: '/admin/users',
  GROUPS_CREATE: '/groups/create',
  GROUPS_DETAIL: '/groups/:id',
  GROUPS_EDIT: '/groups/:id/edit',
  GROUPS: '/groups',
  HOME: '/home',
  INVITE: '/invite',
  LOGIN: '/login',
  NOT_FOUND: '/*',
  ONBOARDING: '/onboarding',
  PERSONS_CREATE: '/persons/create',
  PERSONS_DETAIL: '/persons/:id',
  PERSONS_EDIT: '/persons/:id/edit',
  PERSONS: '/persons',
  REGISTER: '/register',
  SECURITY: '/security',
  VERIFY_EMAIL_CHANGE: '/verify-email-change',
  VERIFY_EMAIL: '/verify-email',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  CONTACT_INFO_REQUIRED: 'Label and value are required',
  CONTACT_INFO_CREATE_FAILED: 'Failed to create contact information',
  CONTACT_INFO_UPDATE_FAILED: 'Failed to update contact information',
  CONTACT_INFO_DELETE_FAILED: 'Failed to delete contact information',
  NETWORK_ERROR: 'Network error occurred',
  UNKNOWN_ERROR: 'An unknown error occurred',
  SESSION_EXPIRED: 'Your session has expired',
  UNAUTHORIZED: 'You are not authorized to perform this action',
} as const;

/**
 * Re-export standardized text and background colors for easy access
 * These utilities ensure consistent theming across the application
 * and handle both light and dark modes automatically.
 * 
 * @example
 * import { textColors, backgroundColors, textStyles } from './constants.js';
 * 
 * // Use in templates:
 * html`<div class="${backgroundColors.page}">`
 * html`<h1 class="${textStyles.heading.h1}">`
 */
export { textColors, textStyles, backgroundColors } from './utilities/text-colors.js';
