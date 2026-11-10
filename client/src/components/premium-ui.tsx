import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';

import { PremiumPalette } from '@/constants/theme';

const P = PremiumPalette;

export const statusTones = {
  success: { bg: '#E6F6EE', fg: '#13734A', dot: '#1FA971' },
  warning: { bg: '#FFF4DD', fg: '#8A5A00', dot: '#D6AD60' },
  danger: { bg: '#FDECEC', fg: '#A32727', dot: '#DC4C4C' },
  info: { bg: P.cloud, fg: P.navy, dot: P.sky },
  neutral: { bg: '#EEF2F6', fg: '#526C80', dot: '#8496A5' },
} as const;

export type StatusTone = keyof typeof statusTones;

/** Thẻ nền trắng bo góc, viền xanh nhạt — khối cơ bản của mọi màn hình. */
export function PremiumCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusPill({ label, tone = 'info' }: { label: string; tone?: StatusTone }) {
  const t = statusTones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <View style={[styles.pillDot, { backgroundColor: t.dot }]} />
      <Text style={[styles.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, onPress, loading, disabled, style }: ButtonProps) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        styles.btnPrimary,
        pressed && { opacity: 0.88 },
        off && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnPrimaryText}>{label}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        styles.btnSecondary,
        pressed && { backgroundColor: P.cloud },
        disabled && { opacity: 0.55 },
        style,
      ]}
    >
      <Text style={styles.btnSecondaryText}>{label}</Text>
    </Pressable>
  );
}

export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8} style={styles.linkWrap}>
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

/** Màn trạng thái: tải / lỗi / thành công / rỗng — có icon tròn hoặc illustration local. */
export function StateHero({
  glyph,
  tone = 'info',
  image,
  title,
  body,
  children,
}: {
  glyph?: string;
  tone?: StatusTone;
  /** Kết quả của require('...') cho ảnh local */
  image?: number;
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  const t = statusTones[tone];
  return (
    <View style={styles.stateWrap}>
      {image ? (
        <Image source={image} style={styles.stateImage} contentFit="contain" transition={150} />
      ) : (
        <View style={[styles.stateBadge, { backgroundColor: t.bg }]}>
          <Text style={[styles.stateGlyph, { color: t.fg }]}>{glyph}</Text>
        </View>
      )}
      <Text style={styles.stateTitle}>{title}</Text>
      {body ? <Text style={styles.stateBody}>{body}</Text> : null}
      {children}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/** Dòng hành trình: mã sân bay lớn, đường bay có máy bay ở giữa. */
export function RouteLine({
  from,
  to,
  fromCity,
  toCity,
}: {
  from?: string;
  to?: string;
  fromCity?: string;
  toCity?: string;
}) {
  return (
    <View style={styles.route}>
      <View style={styles.routeEnd}>
        <Text style={styles.routeCode}>{from || '--'}</Text>
        {fromCity ? <Text style={styles.routeCity}>{fromCity}</Text> : null}
      </View>
      <View style={styles.routeMid}>
        <View style={styles.routeDot} />
        <View style={styles.routeRule} />
        <Text style={styles.routePlane}>✈</Text>
        <View style={styles.routeRule} />
        <View style={[styles.routeDot, { backgroundColor: P.gold }]} />
      </View>
      <View style={[styles.routeEnd, { alignItems: 'flex-end' }]}>
        <Text style={styles.routeCode}>{to || '--'}</Text>
        {toCity ? <Text style={[styles.routeCity, { textAlign: 'right' }]}>{toCity}</Text> : null}
      </View>
    </View>
  );
}

/** Đường cắt vé (răng cưa) giữa phần hành trình và phần giá. */
export function TicketDivider() {
  return (
    <View style={styles.divider}>
      <View style={[styles.notch, { left: -30 }]} />
      <View style={styles.dash} />
      <View style={[styles.notch, { right: -30 }]} />
    </View>
  );
}

export const screenPadding = { padding: 16, paddingBottom: 40 } as const;

const styles = StyleSheet.create({
  card: {
    backgroundColor: P.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: P.navy,
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  btn: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, width: '100%' },
  btnPrimary: { backgroundColor: P.navy },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  btnSecondary: { backgroundColor: P.surface, borderWidth: 1, borderColor: P.border },
  btnSecondaryText: { color: P.navy, fontSize: 14, fontWeight: '800' },
  linkWrap: { alignSelf: 'center', paddingVertical: 10 },
  linkText: { color: P.sky, fontSize: 13, fontWeight: '800' },
  stateWrap: { alignItems: 'center', width: '100%' },
  stateImage: { width: 260, height: 173, marginBottom: 6 },
  stateBadge: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  stateGlyph: { fontSize: 38, fontWeight: '900' },
  stateTitle: { color: P.navy, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  stateBody: { color: P.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 420 },
  sectionLabel: { color: P.sky, fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginBottom: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingVertical: 7 },
  infoLabel: { color: P.muted, fontSize: 13 },
  infoValue: { color: P.navy, fontSize: 13, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  route: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  routeEnd: { minWidth: 72 },
  routeCode: { color: P.navy, fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  routeCity: { color: P.muted, fontSize: 12, marginTop: 2 },
  routeMid: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  routeRule: { flex: 1, height: 1.5, backgroundColor: P.border },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: P.navy },
  routePlane: { color: P.sky, fontSize: 16, marginHorizontal: 6 },
  divider: { height: 1, marginVertical: 18, justifyContent: 'center' },
  dash: { borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: P.border },
  notch: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: P.canvas, top: -11, borderWidth: 1, borderColor: P.border },
});
