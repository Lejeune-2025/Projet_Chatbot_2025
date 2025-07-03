import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
  Modal,
  Slider
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { VoiceConfig } from '../../Services/Voice/VoiceConfig';
import VoiceAssistantService from '../../Services/Voice/VoiceAssistantService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Composant pour les paramètres de l'assistant vocal
 */
const VoiceSettings = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const [settings, setSettings] = useState({
    enabled: true,
    language: VoiceConfig.DEFAULT_LANGUAGE,
    speechRate: VoiceConfig.DEFAULT_SPEECH_RATE,
    pitch: VoiceConfig.DEFAULT_PITCH,
    volume: VoiceConfig.DEFAULT_VOLUME,
    conversationMode: false,
    showPartialResults: VoiceConfig.UI.SHOW_PARTIAL_RESULTS,
    soundEffects: VoiceConfig.SOUND_EFFECTS.ENABLED,
    waveform: VoiceConfig.UI.SHOW_WAVEFORM
  });
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  // Charger les paramètres sauvegardés
  useEffect(() => {
    loadSettings();
    loadAvailableVoices();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('@voice_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...settings, ...parsed });
        
        // Appliquer les paramètres au service
        if (parsed.language) {
          await VoiceAssistantService.setLanguage(parsed.language);
        }
        if (parsed.speechRate !== undefined) {
          await VoiceAssistantService.setSpeechRate(parsed.speechRate);
        }
        if (parsed.pitch !== undefined) {
          await VoiceAssistantService.setPitch(parsed.pitch);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  };

  const loadAvailableVoices = async () => {
    try {
      const voices = await VoiceAssistantService.getAvailableLanguages();
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Erreur lors du chargement des voix:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('@voice_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
    }
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    
    // Appliquer immédiatement les changements
    switch (key) {
      case 'language':
        await VoiceAssistantService.setLanguage(value);
        break;
      case 'speechRate':
        await VoiceAssistantService.setSpeechRate(value);
        break;
      case 'pitch':
        await VoiceAssistantService.setPitch(value);
        break;
      case 'conversationMode':
        VoiceAssistantService.setConversationMode(value);
        break;
    }
    
    await saveSettings(newSettings);
  };

  const testVoice = () => {
    VoiceAssistantService.speak(
      'Voici un exemple de ma voix avec les paramètres actuels.',
      {
        language: settings.language,
        rate: settings.speechRate,
        pitch: settings.pitch
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>
              Paramètres Vocaux
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Activation générale */}
            <View style={styles.section}>
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  Assistant vocal activé
                </Text>
                <Switch
                  value={settings.enabled}
                  onValueChange={(value) => updateSetting('enabled', value)}
                  trackColor={{ false: theme.secondaryText, true: theme.primary }}
                  thumbColor={Platform.OS === 'android' ? theme.card : '#fff'}
                />
              </View>
            </View>

            {/* Langue */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Langue et Voix
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {VoiceConfig.SUPPORTED_LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageButton,
                      {
                        backgroundColor: settings.language === lang.code
                          ? theme.primary
                          : theme.card,
                        borderColor: settings.language === lang.code
                          ? theme.primary
                          : theme.border
                      }
                    ]}
                    onPress={() => updateSetting('language', lang.code)}
                  >
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                    <Text
                      style={[
                        styles.languageName,
                        {
                          color: settings.language === lang.code
                            ? '#fff'
                            : theme.text
                        }
                      ]}
                    >
                      {lang.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Paramètres de voix */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Paramètres de Voix
              </Text>

              {/* Vitesse */}
              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderLabel, { color: theme.text }]}>
                  Vitesse: {settings.speechRate.toFixed(1)}x
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5}
                  maximumValue={2.0}
                  value={settings.speechRate}
                  onValueChange={(value) => updateSetting('speechRate', value)}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={theme.primary}
                />
              </View>

              {/* Ton */}
              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderLabel, { color: theme.text }]}>
                  Ton: {settings.pitch.toFixed(1)}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.5}
                  maximumValue={2.0}
                  value={settings.pitch}
                  onValueChange={(value) => updateSetting('pitch', value)}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={theme.primary}
                />
              </View>

              {/* Bouton de test */}
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: theme.primary }]}
                onPress={testVoice}
              >
                <Ionicons name="play-circle" size={20} color="#fff" />
                <Text style={styles.testButtonText}>Tester la voix</Text>
              </TouchableOpacity>
            </View>

            {/* Options avancées */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Options Avancées
              </Text>

              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  Mode conversation
                </Text>
                <Switch
                  value={settings.conversationMode}
                  onValueChange={(value) => updateSetting('conversationMode', value)}
                  trackColor={{ false: theme.secondaryText, true: theme.primary }}
                  thumbColor={Platform.OS === 'android' ? theme.card : '#fff'}
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  Résultats partiels
                </Text>
                <Switch
                  value={settings.showPartialResults}
                  onValueChange={(value) => updateSetting('showPartialResults', value)}
                  trackColor={{ false: theme.secondaryText, true: theme.primary }}
                  thumbColor={Platform.OS === 'android' ? theme.card : '#fff'}
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  Effets sonores
                </Text>
                <Switch
                  value={settings.soundEffects}
                  onValueChange={(value) => updateSetting('soundEffects', value)}
                  trackColor={{ false: theme.secondaryText, true: theme.primary }}
                  thumbColor={Platform.OS === 'android' ? theme.card : '#fff'}
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  Visualisation audio
                </Text>
                <Switch
                  value={settings.waveform}
                  onValueChange={(value) => updateSetting('waveform', value)}
                  trackColor={{ false: theme.secondaryText, true: theme.primary }}
                  thumbColor={Platform.OS === 'android' ? theme.card : '#fff'}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.25)',
      }
    })
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  settingLabel: {
    fontSize: 14,
    flex: 1,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  languageName: {
    fontSize: 14,
  },
  sliderContainer: {
    marginVertical: 10,
  },
  sliderLabel: {
    fontSize: 14,
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 10,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  }
});

export default VoiceSettings; 