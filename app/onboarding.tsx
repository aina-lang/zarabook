import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  ViewToken 
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/core/context/ThemeContext';
import { useTranslation } from '@/core/i18n/I18nContext';
import { 
  Library, 
  Share2, 
  Cloud, 
  ArrowRight,
  Moon,
  Sun
} from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    type: 'feature',
    title: 'onboarding.slide1.title',
    desc: 'onboarding.slide1.desc',
    icon: Library,
    color: '#0ea5e9',
  },
  {
    id: '2',
    type: 'feature',
    title: 'onboarding.slide2.title',
    desc: 'onboarding.slide2.desc',
    icon: Share2,
    color: '#10b981',
  },
  {
    id: '3',
    type: 'feature',
    title: 'onboarding.slide3.title',
    desc: 'onboarding.slide3.desc',
    icon: Cloud,
    color: '#f97316',
  },
  {
    id: 'setup',
    type: 'setup',
    title: 'onboarding.setup.title',
    desc: 'onboarding.setup.desc',
    color: '#8b5cf6',
  },
];

const Slide = ({ item, index, scrollX }: any) => {
  const { colors, toggleTheme, isDark } = useTheme();
  const { t, setLocale, locale } = useTranslation();
  const Icon = item.icon;

  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const iconStyle = useAnimatedStyle(() => {
    const translateX = interpolate(scrollX.value, inputRange, [-width * 0.6, 0, width * 0.6], Extrapolation.CLAMP);
    const scale = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);

    return { opacity, transform: [{ translateX }, { scale }] };
  });

  const textStyle = useAnimatedStyle(() => {
    const translateX = interpolate(scrollX.value, inputRange, [width * 0.3, 0, -width * 0.3], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [-0.5, 1, -0.5], Extrapolation.CLAMP);

    return { opacity, transform: [{ translateX }] };
  });

  return (
    <View style={[styles.slide, { width }]}>
      <View style={styles.content}>
        {item.type === 'setup' ? (
          <View style={styles.setupContainer}>
            
            <Text style={[styles.title, { color: colors.text, marginBottom: 8 }]}>
              {t(item.title)}
            </Text>

            <Text style={[styles.desc, { color: colors.textDim, marginBottom: 30 }]}>
              {t(item.desc)}
            </Text>

            <View style={styles.setupOptions}>

              {/* LANG */}
              <View style={[styles.optionBox, { backgroundColor: colors.card }]}>
                <Text style={[styles.optionLabel, { color: colors.textMuted }]}>
                  {t('settings.language').toUpperCase()}
                </Text>

                <View style={styles.langGrid}>
                  {[
                    { code: 'fr', flag: '🇫🇷' },
                    { code: 'en', flag: '🇬🇧' },
                    { code: 'mg', flag: '🇲🇬' },
                    { code: 'de', flag: '🇩🇪' }
                  ].map((lang) => (
                    <TouchableOpacity 
                      key={lang.code}
                      onPress={() => setLocale(lang.code as any)}
                      activeOpacity={0.8}
                      style={[
                        styles.langButton,
                        {
                          backgroundColor: locale === lang.code
                            ? colors.primary + '20'
                            : colors.background,
                          borderColor: locale === lang.code
                            ? colors.primary
                            : 'rgba(255,255,255,0.08)',
                        }
                      ]}
                    >
                      <Text style={{ fontSize: 26 }}>{lang.flag}</Text>
                      <Text style={{ 
                        fontSize: 12, 
                        marginTop: 4, 
                        color: colors.text,
                        fontWeight: '700'
                      }}>
                        {lang.code.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* THEME */}
              <TouchableOpacity 
                onPress={toggleTheme}
                activeOpacity={0.8}
                style={[
                  styles.optionBox, 
                  { 
                    backgroundColor: colors.card, 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }
                ]}
              >
                <View>
                  <Text style={[styles.optionLabel, { color: colors.textMuted }]}>
                    {t('settings.appearance').toUpperCase()}
                  </Text>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>
                    {isDark ? t('settings.darkMode') : 'Light Mode'}
                  </Text>
                </View>

                <View style={[
                  styles.themeIconWrapper, 
                  { backgroundColor: colors.primary + '20' }
                ]}>
                  {isDark 
                    ? <Moon color={colors.primary} size={22} /> 
                    : <Sun color={colors.primary} size={22} />
                  }
                </View>
              </TouchableOpacity>

            </View>
          </View>
        ) : (
          <>
            <Animated.View style={[
              styles.iconContainer, 
              { backgroundColor: item.color + '40' }, 
              iconStyle
            ]}>
              <Icon size={120} color={item.color} strokeWidth={1.5} />
            </Animated.View>

            <Animated.View style={[styles.textContainer, textStyle]}>
              <Text style={[styles.title, { color: colors.text }]}>
                {t(item.title)}
              </Text>
              <Text style={[styles.desc, { color: colors.textDim }]}>
                {t(item.desc)}
              </Text>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
};

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const flatListRef = useRef<any>(null);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }).current;

  const onFinish = async () => {
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    router.replace('/(tabs)');
  };

  const nextSlide = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      onFinish();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item, index }) => (
          <Slide item={item} index={index} scrollX={scrollX} />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, i) => {
            const dotStyle = useAnimatedStyle(() => {
              const dotWidth = interpolate(scrollX.value,
                [(i - 1) * width, i * width, (i + 1) * width],
                [8, 24, 8],
                Extrapolation.CLAMP
              );

              const opacity = interpolate(scrollX.value,
                [(i - 1) * width, i * width, (i + 1) * width],
                [0.3, 1, 0.3],
                Extrapolation.CLAMP
              );

              return { width: dotWidth, opacity };
            });

            return (
              <Animated.View 
                key={i}
                style={[styles.dot, { backgroundColor: colors.primary }, dotStyle]}
              />
            );
          })}
        </View>

        <TouchableOpacity 
          onPress={nextSlide}
          activeOpacity={0.9}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.buttonText}>
            {activeIndex === SLIDES.length - 1 
              ? t('common.getStarted') 
              : t('common.next')}
          </Text>
          <ArrowRight size={22} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
    width: '100%',
  },

  iconContainer: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: (width * 0.6) / 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },

  textContainer: {
    alignItems: 'center',
  },

  setupContainer: {
    width: '100%',
    alignItems: 'center',
  },

  setupOptions: {
    width: '100%',
    gap: 16,
  },

  optionBox: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },

  optionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
  },

  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  langButton: {
    width: '48%',
    height: 70,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  themeIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },

  desc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },

  footer: {
    height: 160,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },

  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  dot: {
    height: 8,
    borderRadius: 4,
  },

  button: {
    height: 60,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
});