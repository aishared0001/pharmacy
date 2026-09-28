// Central design tokens for MediGo. Kept small and flat so screens can import
// exactly what they need.

export const colors = {
  primary: '#0B9E7A', // MediGo green
  primaryDark: '#087a5e',
  primaryLight: '#E3F5EF',
  accent: '#F2994A',
  danger: '#E0503A',
  warning: '#C97A00',
  success: '#2E9E5B',

  text: '#12211D',
  textMuted: '#5C6B66',
  textInverse: '#FFFFFF',

  background: '#F6F8F7',
  surface: '#FFFFFF',
  border: '#E4E9E7',

  rxBadge: '#B24592',
  otcBadge: '#2E9E5B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const font = {
  h1: 26,
  h2: 20,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};

// Flat delivery fee (INR). Free above the threshold.
export const DELIVERY_FEE = 40;
export const FREE_DELIVERY_ABOVE = 500;
