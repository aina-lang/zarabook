import { Platform } from 'react-native';

// BookMesh — YGG-style dark tracker palette
export const Colors = {
  light: {
    text: '#e2e8f0',
    background: '#0d0f14',
    tint: '#f97316',
    icon: '#94a3b8',
    tabIconDefault: '#64748b',
    tabIconSelected: '#f97316',
    card: '#161b27',
    border: '#1e2535',
    muted: '#64748b',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
  },
  dark: {
    text: '#e2e8f0',
    background: '#0d0f14',
    tint: '#f97316',
    icon: '#94a3b8',
    tabIconDefault: '#64748b',
    tabIconSelected: '#f97316',
    card: '#161b27',
    border: '#1e2535',
    muted: '#64748b',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
  },
};

// Category accent colors
export const CategoryColors: Record<string, string> = {
  'Roman':       '#818cf8',
  'Science-Fiction': '#22d3ee',
  'Policier':    '#f472b6',
  'Fantasy':     '#a78bfa',
  'Manga':       '#fb923c',
  'BD':          '#facc15',
  'Biographie':  '#34d399',
  'Histoire':    '#f87171',
  'Informatique':'#38bdf8',
  'Sciences':    '#4ade80',
  'Art':         '#c084fc',
  'Autre':       '#94a3b8',
};

export const CATEGORIES = Object.keys(CategoryColors);

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
