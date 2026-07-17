/**
 * MamaVR AI design language (Chapter 8).
 * Healthcare palette: primary blue for navigation and actions, green for
 * healthy/success, amber for moderate risk, red for high risk / emergencies.
 */
export const palette = {
  primary: '#1565C0',
  primaryDark: '#0D47A1',
  primaryLight: '#E3F2FD',
  green: '#2E7D32',
  greenLight: '#E8F5E9',
  amber: '#F9A825',
  amberDark: '#B26A00',
  amberLight: '#FFF8E1',
  red: '#C62828',
  redLight: '#FFEBEE',
  white: '#FFFFFF',
  greyLight: '#F4F6F8',
  greyBorder: '#E0E4E8',
  greyMid: '#8A94A0',
  greyDark: '#2F3B45',
  black: '#141A1F',
};

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
  onPrimary: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  inputBg: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

export const lightTheme: Theme = {
  dark: false,
  colors: {
    background: palette.greyLight,
    surface: palette.white,
    surfaceAlt: '#FBFCFD',
    border: palette.greyBorder,
    text: palette.greyDark,
    textSecondary: palette.greyMid,
    primary: palette.primary,
    onPrimary: palette.white,
    success: palette.green,
    successBg: palette.greenLight,
    warning: palette.amberDark,
    warningBg: palette.amberLight,
    danger: palette.red,
    dangerBg: palette.redLight,
    inputBg: palette.white,
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    background: '#10161C',
    surface: '#1B242D',
    surfaceAlt: '#212C37',
    border: '#31404E',
    text: '#EAF0F5',
    textSecondary: '#94A3B1',
    primary: '#5B9BE6',
    onPrimary: '#0C1116',
    success: '#66BB6A',
    successBg: '#1D3322',
    warning: '#FFCA5F',
    warningBg: '#3A2F14',
    danger: '#EF5350',
    dangerBg: '#3A1B1D',
    inputBg: '#141C24',
  },
};

/** Typography scale from section 8.5 of the design book. */
export const typography = {
  screenTitle: 24,
  sectionHeading: 20,
  cardTitle: 18,
  body: 16,
  caption: 14,
  button: 16,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
