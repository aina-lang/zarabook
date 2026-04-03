import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '@/core/context/ThemeContext';

interface TransitionOverlayProps {
  watch: any[];
  children: React.ReactNode;
}

/**
 * A subtle, premium fade transition that triggers whenever "watch" values change.
 * This covers up the momentary "jump" when theme or language changes occur.
 */
export function TransitionOverlay({ watch, children }: TransitionOverlayProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [displayChildren, setDisplayChildren] = useState(children);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    // High-end flash transition
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    // Small delay before updating children to allow the fade to cover the "jump"
    const timer = setTimeout(() => {
      setDisplayChildren(children);
    }, 150);

    return () => clearTimeout(timer);
  }, watch);

  return (
    <View style={{ flex: 1 }}>
      {displayChildren}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.overlay,
          {
            backgroundColor: colors.background,
            opacity: fadeAnim,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
