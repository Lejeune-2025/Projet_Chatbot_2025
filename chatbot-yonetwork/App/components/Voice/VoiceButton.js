import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Text
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceConfig } from '../../Services/Voice/VoiceConfig';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Bouton vocal avec animation et indicateurs d'état
 */
const VoiceButton = ({
  onPress,
  isListening = false,
  isSpeaking = false,
  isError = false,
  size = 60,
  style,
  showTooltip = true
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showHint, setShowHint] = useState(false);

  // Animation de pulsation pour l'écoute
  useEffect(() => {
    if (isListening) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: Platform.OS !== 'web'
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: Platform.OS !== 'web'
          })
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web'
      }).start();
    }
  }, [isListening, pulseAnim]);

  // Animation de rotation pour la parole
  useEffect(() => {
    if (isSpeaking) {
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: Platform.OS !== 'web'
        })
      );
      rotateAnimation.start();
      return () => rotateAnimation.stop();
    } else {
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web'
      }).start();
    }
  }, [isSpeaking, rotateAnim]);

  // Gérer l'appui sur le bouton
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: Platform.OS !== 'web'
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: Platform.OS !== 'web'
    }).start();
  };

  // Déterminer l'état et les couleurs
  const getStateConfig = () => {
    if (isError) {
      return {
        color: VoiceConfig.UI.COLORS.ERROR,
        icon: 'mic-off',
        hint: 'Erreur microphone'
      };
    }
    if (isListening) {
      return {
        color: VoiceConfig.UI.COLORS.LISTENING,
        icon: 'mic',
        hint: 'Je vous écoute...'
      };
    }
    if (isSpeaking) {
      return {
        color: VoiceConfig.UI.COLORS.SPEAKING,
        icon: 'volume-high',
        hint: 'Je parle...'
      };
    }
    return {
      color: theme.secondaryText,
      icon: 'mic-outline',
      hint: 'Appuyez pour parler'
    };
  };

  const stateConfig = getStateConfig();

  // Animation de rotation
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={() => {
          handlePressOut();
          setShowHint(false);
        }}
        onLongPress={() => setShowHint(true)}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.button,
            {
              width: size,
              height: size,
              backgroundColor: theme.card,
              borderColor: stateConfig.color,
              transform: [
                { scale: Animated.multiply(scaleAnim, pulseAnim) },
                { rotate: spin }
              ]
            }
          ]}
        >
          <Ionicons
            name={stateConfig.icon}
            size={size * 0.5}
            color={stateConfig.color}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Indicateur d'état */}
      {(isListening || isSpeaking) && (
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: stateConfig.color }
            ]}
          />
        </View>
      )}

      {/* Tooltip */}
      {showTooltip && (showHint || isListening || isSpeaking) && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              backgroundColor: theme.card,
              opacity: showHint || isListening || isSpeaking ? 1 : 0
            }
          ]}
        >
          <Text style={[styles.tooltipText, { color: theme.text }]}>
            {stateConfig.hint}
          </Text>
        </Animated.View>
      )}

      {/* Ondes sonores animées */}
      {isListening && VoiceConfig.UI.SHOW_WAVEFORM && (
        <View style={styles.waveContainer}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.wave,
                {
                  backgroundColor: stateConfig.color,
                  opacity: 0.3,
                  transform: [{
                    scale: pulseAnim.interpolate({
                      inputRange: [1, 1.2],
                      outputRange: [1 + index * 0.3, 1.5 + index * 0.3]
                    })
                  }]
                }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
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
        boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.25)',
      }
    })
  },
  statusIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tooltip: {
    position: 'absolute',
    bottom: -35,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
      }
    })
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  waveContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  }
});

export default VoiceButton; 