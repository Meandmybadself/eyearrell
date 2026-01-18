/**
 * Comprehensive Design Tokens for IRL Application
 *
 * This file contains all design tokens used across the application.
 * It serves as the single source of truth for colors, spacing, typography, and component styles.
 *
 * All components should import from this file to ensure consistency.
 *
 * @example
 * import { buttonStyles, inputStyles, spinnerStyles } from '../utilities/design-tokens.js';
 *
 * // Use in templates:
 * html`<button class="${buttonStyles.base} ${buttonStyles.variants.primary}">`
 */

// Re-export existing text-colors utilities for backward compatibility
export { textColors, backgroundColors, textStyles, getTextColor } from './text-colors.js';

/**
 * Primary brand colors
 */
export const colors = {
  primary: 'indigo-600',
  primaryHover: 'indigo-700',
  primaryLight: 'indigo-500',
  primaryLighter: 'indigo-50',
  primaryDark: 'indigo-400',

  secondary: 'gray-600',
  secondaryHover: 'gray-700',
  secondaryLight: 'gray-500',

  danger: 'red-600',
  dangerHover: 'red-700',
  dangerLight: 'red-500',

  success: 'green-600',
  successHover: 'green-700',
  successLight: 'green-500',

  warning: 'yellow-600',
  warningLight: 'yellow-500',
} as const;

/**
 * Button style utilities
 *
 * @example
 * html`<button class="${buttonStyles.base} ${buttonStyles.variants.primary}">`
 */
export const buttonStyles = {
  // Base classes applied to all buttons
  base: 'inline-flex items-center justify-center rounded-md text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2',

  // Size variants
  sizes: {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  },

  // Color/style variants
  variants: {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus-visible:outline-indigo-600 disabled:hover:bg-indigo-600 dark:disabled:hover:bg-indigo-500',
    secondary: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-gray-600',
    outline: 'bg-transparent text-indigo-600 dark:text-indigo-400 border border-indigo-600 dark:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 focus-visible:outline-indigo-600 disabled:hover:bg-transparent',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 focus-visible:outline-red-600 disabled:hover:bg-red-600 dark:disabled:hover:bg-red-500',
    ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-gray-600',
  },

  // Full width variant
  fullWidth: 'w-full',
} as const;

/**
 * Input style utilities
 *
 * @example
 * html`<input class="${inputStyles.base} ${inputStyles.states.default}">`
 */
export const inputStyles = {
  // Base classes applied to all inputs
  base: 'block w-full rounded-md px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed',

  // State variants
  states: {
    default: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-opacity-50 focus:border-indigo-500 dark:focus:border-indigo-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400',
    error: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-red-500 dark:border-red-400 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:ring-opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700',
  },

  // Label styling
  label: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2',

  // Error message styling
  errorText: 'mt-1 text-sm text-red-600 dark:text-red-400',

  // Helper text styling
  helperText: 'mt-1 text-xs text-gray-500 dark:text-gray-400',
} as const;

/**
 * Select input style utilities
 */
export const selectStyles = {
  base: 'block w-full rounded-md px-3 py-2 text-sm transition-colors border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-opacity-50 focus:border-indigo-500 dark:focus:border-indigo-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed',
} as const;

/**
 * Spinner/loading indicator style utilities
 *
 * @example
 * html`<div class="${spinnerStyles.base} ${spinnerStyles.sizes.md}">`
 */
export const spinnerStyles = {
  // Base spinner classes
  base: 'inline-block border-2 rounded-full animate-spin',

  // Color variants
  colors: {
    primary: 'border-indigo-600 dark:border-indigo-400 border-r-transparent',
    white: 'border-white border-r-transparent',
    current: 'border-current border-r-transparent',
    muted: 'border-gray-300 dark:border-gray-600 border-t-indigo-600 dark:border-t-indigo-400',
  },

  // Size variants
  sizes: {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12 border-4',
  },
} as const;

/**
 * Card style utilities
 *
 * @example
 * html`<div class="${cardStyles.base}">`
 */
export const cardStyles = {
  // Base card styling
  base: 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700',

  // Padding variants
  padding: {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  },

  // Interactive card (hoverable)
  interactive: 'transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer',

  // Card header
  header: 'px-6 py-4 border-b border-gray-200 dark:border-gray-700',

  // Card body
  body: 'px-6 py-4',

  // Card footer
  footer: 'px-6 py-4 border-t border-gray-200 dark:border-gray-700',
} as const;

/**
 * Page layout style utilities
 *
 * @example
 * html`<div class="${pageStyles.container}"><div class="${pageStyles.content}">`
 */
export const pageStyles = {
  // Full page container with background and edge padding
  container: 'min-h-screen bg-gray-50 dark:bg-gray-950 px-4 sm:px-6 lg:px-8 py-6',

  // Centered content container
  content: 'max-w-7xl mx-auto',

  // Wide content container (for admin pages with tables)
  contentWide: 'max-w-6xl mx-auto',

  // Narrower content container (for forms, detail pages)
  contentNarrow: 'max-w-4xl mx-auto',

  // Centered content (for login, etc.)
  centered: 'min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8',

  // Page header section
  header: 'mb-8',

  // Page title
  title: 'text-3xl font-bold text-gray-900 dark:text-white mb-2',

  // Page description
  description: 'text-gray-600 dark:text-gray-400',
} as const;

/**
 * Badge/tag style utilities
 */
export const badgeStyles = {
  base: 'inline-flex items-center rounded-full text-xs font-medium',

  sizes: {
    sm: 'px-2 py-0.5',
    md: 'px-2.5 py-1',
    lg: 'px-3 py-1.5',
  },

  variants: {
    primary: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
    secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    success: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
    warning: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
    danger: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
    info: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
  },
} as const;

/**
 * Achievement/gamification specific styles
 */
export const achievementStyles = {
  card: {
    completed: {
      border: 'border-green-500 dark:border-green-400',
      bg: 'bg-green-50 dark:bg-green-950',
      icon: 'bg-green-500 dark:bg-green-600 text-white',
      text: 'text-green-700 dark:text-green-400',
      badge: 'bg-green-500 dark:bg-green-600 text-white',
    },
    locked: {
      border: 'border-gray-200 dark:border-gray-700',
      bg: 'bg-white dark:bg-gray-800',
      icon: 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
      text: 'text-gray-500 dark:text-gray-400',
    },
  },
  points: 'text-indigo-600 dark:text-indigo-400 font-semibold',
  category: {
    base: 'text-xs px-3 py-1 rounded-full uppercase tracking-wider',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
  },
} as const;

/**
 * Level progress specific styles
 */
export const levelStyles = {
  container: 'p-6 bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 rounded-xl text-white',
  icon: 'w-14 h-14 flex items-center justify-center bg-white/20 rounded-full',
  progressBar: {
    container: 'w-full h-4 bg-white/20 rounded-full overflow-hidden',
    fill: 'h-full bg-green-400 rounded-full transition-all duration-500',
  },
  maxLevelMessage: 'text-center p-4 bg-white/10 rounded-lg text-sm mt-4',
} as const;

/**
 * Notification toast styles
 */
export const notificationStyles = {
  base: 'mb-3 p-4 rounded-lg shadow-lg flex items-start justify-between gap-3 animate-slide-in',
  variants: {
    success: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
    error: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
    info: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200',
    warning: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
  },
} as const;

/**
 * Filter/tab button styles (for achievements page, etc.)
 */
export const filterButtonStyles = {
  base: 'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
  active: 'bg-indigo-600 dark:bg-indigo-500 text-white',
  inactive: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700',
} as const;

/**
 * Link styles
 */
export const linkStyles = {
  default: 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors',
  muted: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors',
} as const;

/**
 * Table styles
 */
export const tableStyles = {
  container: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700',
  headerRow: 'bg-gray-50 dark:bg-gray-800',
  headerCell: 'py-3.5 px-6 text-left text-sm font-semibold text-gray-900 dark:text-white',
  bodyRow: 'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
  bodyCell: 'py-4 px-6 text-sm text-gray-700 dark:text-gray-300',
} as const;

/**
 * Content state styles for loading, error, and empty states
 *
 * These styles standardize how loading spinners, error messages, and empty states
 * are displayed across the application.
 *
 * @example
 * html`<div class="${contentStateStyles.container}">${contentStateStyles.errorText}</div>`
 */
export const contentStateStyles = {
  /** Container for centered content states */
  container: 'flex flex-col items-center justify-center py-12 gap-3',

  /** Container with minimum height for full-page loading */
  containerFullHeight: 'flex flex-col items-center justify-center min-h-[50vh] gap-3',

  /** Error text styling */
  errorText: 'text-red-600 dark:text-red-400 text-base text-center',

  /** Muted/empty state text */
  emptyText: 'text-gray-500 dark:text-gray-400 text-sm text-center',

  /** Loading label text */
  loadingText: 'text-gray-600 dark:text-gray-400 text-sm',
} as const;
