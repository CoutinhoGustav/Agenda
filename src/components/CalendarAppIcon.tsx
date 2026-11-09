import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CalendarAppIconProps {
  size?: number;
  day?: number;
  month?: string;
  isDark?: boolean;
}

export function CalendarAppIcon({
  size = 80,
  day = new Date().getDate(),
  month = new Date().toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
  isDark = false
}: CalendarAppIconProps) {
  const cornerRadius = size * 0.24;
  const headerHeight = size * 0.30;
  const ringSize = Math.max(size * 0.08, 4);

  return (
    <View
      style={[
        s.container,
        {
          width: size,
          height: size,
          borderRadius: cornerRadius,
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255, 255, 255, 0.95)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.95)',
          shadowColor: '#2563EB',
          shadowOpacity: isDark ? 0.45 : 0.25,
          shadowRadius: size * 0.2,
          elevation: 10
        }
      ]}
    >
      {/* Specular glass reflection layer */}
      <View
        style={[
          s.glassGloss,
          {
            width: size * 0.9,
            height: size * 0.38,
            borderRadius: cornerRadius * 0.7,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)'
          }
        ]}
      />

      {/* Top Header Bar of the Calendar */}
      <View
        style={[
          s.headerBar,
          {
            height: headerHeight,
            borderTopLeftRadius: cornerRadius - 1.5,
            borderTopRightRadius: cornerRadius - 1.5,
            backgroundColor: '#2563EB'
          }
        ]}
      >
        {/* Binder pegs / rings */}
        <View style={s.pegRow}>
          <View style={[s.peg, { width: ringSize, height: ringSize * 1.5, top: -ringSize * 0.4 }]} />
          <View style={[s.peg, { width: ringSize, height: ringSize * 1.5, top: -ringSize * 0.4 }]} />
        </View>

        <Text style={[s.monthText, { fontSize: Math.max(size * 0.12, 9) }]}>
          {month}
        </Text>
      </View>

      {/* Main Body of the Calendar with Day Number */}
      <View style={s.body}>
        <Text
          style={[
            s.dayText,
            {
              fontSize: size * 0.42,
              color: isDark ? '#F8FAFC' : '#1E293B'
            }
          ]}
        >
          {day}
        </Text>

        {/* Mini dot indicators simulating active events */}
        <View style={s.eventDots}>
          <View style={[s.dot, { backgroundColor: '#3B82F6' }]} />
          <View style={[s.dot, { backgroundColor: '#10B981' }]} />
          <View style={[s.dot, { backgroundColor: '#F59E0B' }]} />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 6 }
  },
  glassGloss: {
    position: 'absolute',
    top: 2,
    left: '5%',
    zIndex: 10,
    opacity: 0.9,
    transform: [{ skewX: '-20deg' }]
  },
  headerBar: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  pegRow: {
    position: 'absolute',
    top: 0,
    width: '56%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 12
  },
  peg: {
    backgroundColor: '#93C5FD',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#1D4ED8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  monthText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 2
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4
  },
  dayText: {
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: undefined
  },
  eventDots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2
  }
});
