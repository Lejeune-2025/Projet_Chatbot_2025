import { Animated, Easing, Platform } from 'react-native';

class AnimationService {
  // Animation de pression de bouton
  static buttonPress(scaleValue, callback) {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.inOut(Easing.ease),
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.inOut(Easing.ease),
      }),
    ]).start(callback);
  }

  // Animation de fondu
  static fade(fadeValue, toValue, duration = 300, callback) {
    Animated.timing(fadeValue, {
      toValue,
      duration,
      useNativeDriver: Platform.OS !== 'web',
    }).start(callback);
  }

  // Animation de glissement
  static slide(slideValue, toValue, duration = 300, callback) {
    Animated.timing(slideValue, {
      toValue,
      duration,
      useNativeDriver: Platform.OS !== 'web',
      easing: Easing.inOut(Easing.ease),
    }).start(callback);
  }

  // Animation de bulle de message
  static messageBubble(scaleValue, callback) {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(callback);
  }

  // Animation de pulsation
  static pulse(scaleValue, iterations = 1, callback) {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(({ finished }) => {
      if (finished && iterations > 1) {
        this.pulse(scaleValue, iterations - 1, callback);
      } else if (callback) {
        callback({ finished });
      }
    });
  }

  // Animation de rebond
  static bounce(translateValue, height = 10, callback) {
    Animated.sequence([
      Animated.timing(translateValue, {
        toValue: -height,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(translateValue, {
        toValue: 0,
        friction: 4,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(callback);
  }

  // Animation de rotation
  static rotate(rotateValue, duration = 1000, callback) {
    Animated.timing(rotateValue, {
      toValue: 1,
      duration,
      useNativeDriver: Platform.OS !== 'web',
      easing: Easing.linear,
    }).start(({ finished }) => {
      if (finished) {
        rotateValue.setValue(0);
        if (callback) callback({ finished });
      }
    });
  }
}

export default AnimationService;