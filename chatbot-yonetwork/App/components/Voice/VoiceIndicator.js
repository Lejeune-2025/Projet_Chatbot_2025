import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { VoiceConfig } from '../../Services/Voice/VoiceConfig';

/**
 * Indicateur vocal pour afficher la transcription et l'état
 */
const VoiceIndicator = ({
  isListening,
  isSpeaking,
  transcript,
  partialTranscript,
  error,
  style
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Animation d'apparition/disparition
  useEffect(() => {
    const shouldShow = isListening || isSpeaking || transcript || error;
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: shouldShow ? 1 : 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web'
      }),
      Animated.timing(slideAnim, {
        toValue: shouldShow ? 0 : 50,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web'
      })
    ]).start();
  }, [isListening, isSpeaking, transcript, error, fadeAnim, slideAnim]);

  // Déterminer le contenu à afficher
  const getContent = () => {
    if (error) {
      return {
        text: error,
        color: VoiceConfig.UI.COLORS.ERROR,
        icon: '❌'
      };
    }

    if (isListening) {
      if (partialTranscript && VoiceConfig.UI.SHOW_PARTIAL_RESULTS) {
        return {
          text: partialTranscript,
          color: VoiceConfig.UI.COLORS.LISTENING,
          icon: '🎤',
          showLoader: false
        };
      }
      return {
        text: VoiceConfig.SYSTEM_MESSAGES.LISTENING_STARTED,
        color: VoiceConfig.UI.COLORS.LISTENING,
        icon: '🎤',
        showLoader: true
      };
    }

    if (isSpeaking) {
      return {
        text: transcript || 'Je parle...',
        color: VoiceConfig.UI.COLORS.SPEAKING,
        icon: '🔊',
        showLoader: false
      };
    }

    if (transcript) {
      return {
        text: transcript,
        color: theme.text,
        icon: '💬',
        showLoader: false
      };
    }

    return null;
  };

  const content = getContent();
  
  if (!content) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          backgroundColor: theme.card,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{content.icon}</Text>
        {content.showLoader && (
          <ActivityIndicator
            size="small"
            color={content.color}
            style={styles.loader}
          />
        )}
      </View>

      <Text
        style={[
          styles.text,
          {
            color: content.color || theme.text
          }
        ]}
        numberOfLines={3}
        ellipsizeMode="tail"
      >
        {content.text}
      </Text>

      {/* Indicateur de niveau audio (optionnel) */}
      {isListening && VoiceConfig.UI.SHOW_WAVEFORM && (
        <View style={styles.audioLevel}>
          <AudioWaveform color={content.color} />
        </View>
      )}
    </Animated.View>
  );
};

/**
 * Composant pour afficher une forme d'onde audio simple
 */
const AudioWaveform = ({ color }) => {
  const bars = useRef([...Array(5)].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const animations = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: Math.random() * 0.7 + 0.3,
            duration: 200 + index * 50,
            useNativeDriver: Platform.OS !== 'web'
          }),
          Animated.timing(bar, {
            toValue: 0.3,
            duration: 200 + index * 50,
            useNativeDriver: Platform.OS !== 'web'
          })
        ])
      )
    );

    animations.forEach(anim => anim.start());

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [bars]);

  return (
    <View style={styles.waveform}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.waveBar,
            {
              backgroundColor: color,
              transform: [{ scaleY: bar }]
            }
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    minHeight: 80,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      }
    })
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  loader: {
    marginLeft: 8,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  audioLevel: {
    marginTop: 12,
    height: 30,
    justifyContent: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
  },
  waveBar: {
    width: 3,
    height: 20,
    marginHorizontal: 2,
    borderRadius: 1.5,
  }
});

export default VoiceIndicator; 