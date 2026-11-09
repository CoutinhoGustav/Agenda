export type ThemeMode = 'claro' | 'escuro' | 'sistema';

export interface ThemeColors {
  isDark: boolean;
  bg: string;
  cardBg: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  subText: string;
  border: string;
  glassBg: string;
  glassBorder: string;
  navBg: string;
  navBorder: string;
  navItemActive: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
  primary: string;
  primaryLight: string;
  danger: string;
  success: string;
  warning: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  modalBackdrop: string;
  modalBg: string;
  statTodayBg: string;
  statDoneBg: string;
  statOverdueBg: string;
  eventItemBg: string;
  eventCheckBg: string;
}

export const lightTheme: ThemeColors = {
  isDark: false,
  bg: '#F4F7FC',
  cardBg: 'rgba(255, 255, 255, 0.85)',
  cardBorder: 'rgba(255, 255, 255, 0.95)',
  text: '#172033',
  textMuted: '#64748B',
  subText: '#8290A3',
  border: '#E8EDF4',
  glassBg: 'rgba(255, 255, 255, 0.82)',
  glassBorder: 'rgba(255, 255, 255, 0.95)',
  navBg: 'rgba(255, 255, 255, 0.90)',
  navBorder: 'rgba(255, 255, 255, 0.98)',
  navItemActive: 'rgba(37, 99, 235, 0.12)',
  chipBg: 'rgba(255, 255, 255, 0.78)',
  chipBorder: 'rgba(255, 255, 255, 0.95)',
  chipText: '#667085',
  primary: '#2563EB',
  primaryLight: '#EAF1FF',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  inputBg: 'rgba(255, 255, 255, 0.9)',
  inputBorder: '#E2E8F0',
  inputText: '#172033',
  modalBackdrop: 'rgba(15, 23, 42, 0.45)',
  modalBg: 'rgba(255, 255, 255, 0.96)',
  statTodayBg: 'rgba(234, 241, 255, 0.85)',
  statDoneBg: 'rgba(232, 247, 239, 0.85)',
  statOverdueBg: 'rgba(255, 241, 240, 0.85)',
  eventItemBg: 'rgba(255, 255, 255, 0.85)',
  eventCheckBg: '#F1F5F9'
};

export const darkTheme: ThemeColors = {
  isDark: true,
  bg: '#0B0F19',
  cardBg: 'rgba(24, 32, 47, 0.85)',
  cardBorder: 'rgba(255, 255, 255, 0.12)',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  subText: '#64748B',
  border: 'rgba(255, 255, 255, 0.10)',
  glassBg: 'rgba(24, 32, 47, 0.82)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
  navBg: 'rgba(18, 26, 40, 0.92)',
  navBorder: 'rgba(255, 255, 255, 0.16)',
  navItemActive: 'rgba(59, 130, 246, 0.20)',
  chipBg: 'rgba(30, 41, 59, 0.85)',
  chipBorder: 'rgba(255, 255, 255, 0.12)',
  chipText: '#CBD5E1',
  primary: '#3B82F6',
  primaryLight: 'rgba(59, 130, 246, 0.18)',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  inputBg: 'rgba(30, 41, 59, 0.9)',
  inputBorder: 'rgba(255, 255, 255, 0.14)',
  inputText: '#F8FAFC',
  modalBackdrop: 'rgba(0, 0, 0, 0.70)',
  modalBg: 'rgba(24, 32, 47, 0.98)',
  statTodayBg: 'rgba(30, 58, 138, 0.35)',
  statDoneBg: 'rgba(20, 83, 45, 0.35)',
  statOverdueBg: 'rgba(127, 29, 29, 0.35)',
  eventItemBg: 'rgba(24, 32, 47, 0.85)',
  eventCheckBg: 'rgba(30, 41, 59, 0.8)'
};
