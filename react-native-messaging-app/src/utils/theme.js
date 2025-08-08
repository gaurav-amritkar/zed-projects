export const theme = {
  colors: {
    primary: '#2196F3',
    primaryVariant: '#1976D2',
    secondary: '#03DAC6',
    secondaryVariant: '#018786',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    error: '#B00020',
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onBackground: '#000000',
    onSurface: '#000000',
    onError: '#FFFFFF',
    accent: '#03DAC6',
    text: '#000000',
    disabled: '#9E9E9E',
    placeholder: '#757575',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#FF6B6B',
    chatBubble: {
      sent: '#2196F3',
      received: '#E3F2FD',
      ai: '#E8F5E8',
    },
    textOnBubble: {
      sent: '#FFFFFF',
      received: '#000000',
      ai: '#2E7D32',
    },
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
  },
  roundness: 8,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
};

export const darkTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    primary: '#BB86FC',
    primaryVariant: '#3700B3',
    secondary: '#03DAC6',
    background: '#121212',
    surface: '#1E1E1E',
    onPrimary: '#000000',
    onSecondary: '#000000',
    onBackground: '#FFFFFF',
    onSurface: '#FFFFFF',
    text: '#FFFFFF',
    chatBubble: {
      sent: '#BB86FC',
      received: '#2C2C2C',
      ai: '#1B4D1B',
    },
    textOnBubble: {
      sent: '#000000',
      received: '#FFFFFF',
      ai: '#81C784',
    },
  },
};
