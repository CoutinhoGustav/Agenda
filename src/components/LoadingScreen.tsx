import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeColors } from '../theme';
import { CalendarAppIcon } from './CalendarAppIcon';

interface LoadingScreenProps {
  theme: ThemeColors;
  message?: string;
}

const { width } = Dimensions.get('window');

export function LoadingScreen({ theme, message = 'Organizando sua rotina...' }: LoadingScreenProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const progressAnim = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    // Breathing / pulsing icon animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1200,
            useNativeDriver: true
          }),
          Animated.timing(glowAnim, {
            toValue: 0.85,
            duration: 1200,
            useNativeDriver: true
          })
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1200,
            useNativeDriver: true
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true
          })
        ])
      ])
    );

    // Continuous progress bar animation
    const progressLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 0.88,
          duration: 1800,
          useNativeDriver: false
        }),
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: false
        }),
        Animated.timing(progressAnim, {
          toValue: 0.15,
          duration: 0,
          useNativeDriver: false
        })
      ])
    );

    pulseLoop.start();
    progressLoop.start();

    return () => {
      pulseLoop.stop();
      progressLoop.stop();
    };
  }, [pulseAnim, glowAnim, progressAnim]);

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      {/* Background Decorative Glass Circles */}
      <View
        style={[
          s.glowBlob,
          s.blob1,
          {
            backgroundColor: theme.isDark ? 'rgba(37, 99, 235, 0.18)' : 'rgba(37, 99, 235, 0.14)'
          }
        ]}
      />
      <View
        style={[
          s.glowBlob,
          s.blob2,
          {
            backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(147, 197, 253, 0.25)'
          }
        ]}
      />

      {/* Main Glassmorphic Card Container */}
      <View
        style={[
          s.glassCard,
          {
            backgroundColor: theme.glassBg,
            borderColor: theme.glassBorder
          }
        ]}
      >
        {/* Pulsing Aura Behind Icon */}
        <Animated.View
          style={[
            s.iconAura,
            {
              opacity: glowAnim,
              transform: [{ scale: pulseAnim }],
              backgroundColor: theme.primaryLight
            }
          ]}
        />

        {/* Central 3D Glass Calendar App Icon */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <CalendarAppIcon size={96} isDark={theme.isDark} />
        </Animated.View>

        {/* App Title & Modern Branding */}
        <Text style={[s.brandTitle, { color: theme.text }]}>Agenda Inteligente</Text>
        <Text style={[s.brandSub, { color: theme.textMuted }]}>{message}</Text>

        {/* Glass Animated Progress Bar */}
        <View
          style={[
            s.progressTrack,
            {
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              borderColor: theme.border
            }
          ]}
        >
          <Animated.View
            style={[
              s.progressBar,
              {
                width: progressBarWidth,
                backgroundColor: theme.primary
              }
            ]}
          />
        </View>

        {/* Badge status */}
        <View
          style={[
            s.badge,
            {
              backgroundColor: theme.isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.85)',
              borderColor: theme.border
            }
          ]}
        >
          <Text style={[s.badgeText, { color: theme.textMuted }]}>Design Glassmorphic · SQLite Offline</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    position: 'relative'
  },
  glowBlob: {
    position: 'absolute',
    borderRadius: 999
  },
  blob1: {
    width: 260,
    height: 260,
    top: '18%',
    right: -40
  },
  blob2: {
    width: 280,
    height: 280,
    bottom: '18%',
    left: -50
  },
  glassCard: {
    width: Math.min(width - 48, 340),
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 26,
    borderRadius: 28,
    borderWidth: 1.5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    position: 'relative'
  },
  iconAura: {
    position: 'absolute',
    top: 24,
    width: 120,
    height: 120,
    borderRadius: 60
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 22,
    letterSpacing: -0.5,
    textAlign: 'center'
  },
  brandSub: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    marginBottom: 24
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    borderRadius: 3
  },
  badge: {
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3
  }
});
