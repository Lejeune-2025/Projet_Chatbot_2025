const lightTheme = {
  name: 'light',
  colors: {
    primary: '#4CAF50',
    secondary: '#2196F3',
    background: '#FFFFFF',
    card: '#F5F5F5',
    text: '#212121',
    border: '#E0E0E0',
    notification: '#FF9800',
    error: '#F44336',
    success: '#4CAF50',
    info: '#2196F3',
    warning: '#FF9800',
    userMessage: '#E3F2FD',
    botMessage: '#F1F8E9',
    inputBackground: '#F5F5F5',
    placeholder: '#9E9E9E',
    shadow: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    divider: '#EEEEEE',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  roundness: {
    small: 4,
    medium: 8,
    large: 16,
  },
  animation: {
    scale: 1,
    duration: {
      short: 150,
      medium: 300,
      long: 500,
    },
  },
};

const darkTheme = {
  name: 'dark',
  colors: {
    primary: '#81C784',
    secondary: '#64B5F6',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    border: '#333333',
    notification: '#FFB74D',
    error: '#E57373',
    success: '#81C784',
    info: '#64B5F6',
    warning: '#FFB74D',
    userMessage: '#1A237E',
    botMessage: '#1B5E20',
    inputBackground: '#333333',
    placeholder: '#9E9E9E',
    shadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.7)',
    divider: '#333333',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  roundness: {
    small: 4,
    medium: 8,
    large: 16,
  },
  animation: {
    scale: 1,
    duration: {
      short: 150,
      medium: 300,
      long: 500,
    },
  },
};

export { lightTheme, darkTheme };