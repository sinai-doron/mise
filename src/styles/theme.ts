/**
 * Duckbook Design System — "Editorial Culinary Excellence"
 *
 * Based on the Stitch design system with tri-font typography
 * and tonal surface layering.
 *
 * Fonts:
 *   - Epilogue: headlines & display
 *   - Manrope: body text
 *   - Work Sans: labels & metadata
 *   - Nunito: logo only
 */

export const colors = {
  // Primary
  primary: '#2C3E50',
  primaryDark: '#1a252f',
  primaryContainer: '#354759',

  // Secondary (amber — the "Duck" personality accent)
  secondary: '#865300',
  secondaryContainer: '#fea520',

  // Background & surfaces (tonal layering)
  background: '#f8f9fa',
  surfaceDim: '#d9dadb',
  surface: '#ffffff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f3f4f5',
  surfaceContainer: '#edeeef',
  surfaceContainerHigh: '#e7e8e9',
  surfaceContainerHighest: '#e1e3e4',

  // Text
  onPrimary: '#ffffff',
  onBackground: '#191c1d',
  onSurface: '#191c1d',
  onSurfaceVariant: '#43474d',
  textMain: '#191c1d',
  textMuted: '#43474d',
  textLight: '#73777d',

  // Outline
  outline: '#73777d',
  outlineVariant: '#c3c7cd',

  // Status
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  success: '#22c55e',

  // Inverse
  inverseSurface: '#2e3132',
  inverseOnSurface: '#f0f1f2',
  inversePrimary: '#b5c8df',
} as const;

export const fonts = {
  display: "'Epilogue', sans-serif",
  body: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
  label: "'Work Sans', sans-serif",
  logo: "'Nunito', sans-serif",
} as const;

export const radii = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  full: '9999px',
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
} as const;
