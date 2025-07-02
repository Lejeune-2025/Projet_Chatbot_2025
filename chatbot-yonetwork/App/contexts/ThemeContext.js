import React, { createContext, useState, useEffect, useContext } from 'react';
import { lightTheme, darkTheme } from '../config/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

const THEME_PREFERENCE_KEY = '@theme_preference';

export const ThemeProvider = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [theme, setTheme] = useState(lightTheme);
  const [isLoading, setIsLoading] = useState(true);

  // Charger la préférence de thème au démarrage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (savedTheme !== null) {
          setTheme(savedTheme === 'dark' ? darkTheme : lightTheme);
        } else {
          // Utiliser le thème du système par défaut
          setTheme(deviceTheme === 'dark' ? darkTheme : lightTheme);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du thème:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, [deviceTheme]);

  // Sauvegarder la préférence de thème
  const saveThemePreference = async (themeName) => {
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, themeName);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du thème:', error);
    }
  };

  // Basculer entre les thèmes
  const toggleTheme = () => {
    const newTheme = theme.name === 'light' ? darkTheme : lightTheme;
    setTheme(newTheme);
    saveThemePreference(newTheme.name);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);