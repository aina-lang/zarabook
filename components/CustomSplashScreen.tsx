import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  withSequence,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useTheme } from '@/core/context/ThemeContext';

const { width } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
  isDataReady: boolean;
}

export function CustomSplashScreen({ onFinish, isDataReady }: Props) {
  const { colors } = useTheme();
  
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const containerOpacity = useSharedValue(1);
  const [animationPhase1Done, setAnimationPhase1Done] = React.useState(false);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  // Phase 1: Logo appears
  useEffect(() => {
    logoOpacity.value = withTiming(1, { 
      duration: 1000, 
      easing: Easing.out(Easing.exp) 
    });
    logoScale.value = withTiming(1, { 
      duration: 1500, 
      easing: Easing.out(Easing.back(1.5)) 
    }, (finished) => {
      if (finished) {
        runOnJS(setAnimationPhase1Done)(true);
      }
    });
  }, []);

  // Phase 2: Fade out when data is ready AND Phase 1 is done
  useEffect(() => {
    if (isDataReady && animationPhase1Done) {
      logoOpacity.value = withTiming(0, { duration: 500 });
      containerOpacity.value = withDelay(300, withTiming(0, { 
        duration: 500 
      }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      }));
    }
  }, [isDataReady, animationPhase1Done]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background }, containerStyle]}>
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Image 
          source={require('@/assets/images/splash-icon.png')} 
          style={styles.logoImage}
          contentFit="contain"
        />
        <Animated.Text style={[styles.title, { color: colors.text }]}>ZaraBook</Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
});
