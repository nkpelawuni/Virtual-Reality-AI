/** Shared design-system components implementing the Chapter 8 design language. */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing, typography } from '@/theme/theme';
import { RiskLevel } from '@/types';

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.screenContent, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, { flex: 1 }, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['bottom']}>
      {content}
    </SafeAreaView>
  );
}

export function ScreenTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ fontSize: typography.screenTitle, fontWeight: '700', color: theme.colors.text }}>
        {children}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary, marginTop: spacing.xs }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Text
      style={{
        fontSize: typography.sectionHeading,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  const cardStyle = [
    styles.card,
    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [cardStyle, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const backgrounds: Record<ButtonVariant, string> = {
    primary: theme.colors.primary,
    secondary: 'transparent',
    danger: theme.colors.danger,
    success: theme.colors.success,
  };
  const textColor = variant === 'secondary' ? theme.colors.primary : theme.colors.onPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: backgrounds[variant],
          borderColor: variant === 'secondary' ? theme.colors.primary : 'transparent',
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={textColor} style={{ marginRight: spacing.sm }} /> : null}
          <Text style={{ color: textColor, fontSize: typography.button, fontWeight: '600' }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  multiline,
  autoCapitalize,
  helper,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  helper?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.inputBg,
            borderColor: theme.colors.border,
            color: theme.colors.text,
            minHeight: multiline ? 88 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
      {helper ? (
        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: spacing.xs }}>{helper}</Text>
      ) : null}
    </View>
  );
}

export function CheckboxRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onToggle} style={styles.checkboxRow}>
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={24}
        color={checked ? theme.colors.primary : theme.colors.textSecondary}
      />
      <Text style={{ fontSize: typography.body, color: theme.colors.text, marginLeft: spacing.sm, flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Segmented selector for small enumerations (presentation, test results…). */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: Array<{ value: T; label: string }>;
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{label}</Text> : null}
      <View style={styles.segmentRow}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[
                styles.segment,
                {
                  backgroundColor: selected ? theme.colors.primary : theme.colors.inputBg,
                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? theme.colors.onPrimary : theme.colors.text,
                  fontSize: typography.caption,
                  fontWeight: selected ? '600' : '400',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function RiskBadge({ risk, large }: { risk: RiskLevel; large?: boolean }) {
  const { theme } = useTheme();
  const config: Record<RiskLevel, { bg: string; fg: string; label: string }> = {
    low: { bg: theme.colors.successBg, fg: theme.colors.success, label: 'LOW RISK' },
    moderate: { bg: theme.colors.warningBg, fg: theme.colors.warning, label: 'MODERATE RISK' },
    high: { bg: theme.colors.dangerBg, fg: theme.colors.danger, label: 'HIGH RISK' },
  };
  const { bg, fg, label } = config[risk];
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: large ? spacing.md : spacing.sm,
        paddingVertical: large ? spacing.sm : spacing.xs,
        borderRadius: radius.pill,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: fg, fontWeight: '700', fontSize: large ? 18 : 12 }}>{label}</Text>
    </View>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'primary',
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const { theme } = useTheme();
  const toneColor = {
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
  }[tone];
  return (
    <Card style={styles.statCard}>
      <Ionicons name={icon} size={22} color={toneColor} />
      <Text style={{ fontSize: 26, fontWeight: '700', color: theme.colors.text, marginTop: spacing.xs }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{label}</Text>
    </Card>
  );
}

/** Friendly empty state (§8.18) instead of a blank screen. */
export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={48} color={theme.colors.textSecondary} />
      <Text style={{ fontSize: typography.cardTitle, fontWeight: '600', color: theme.colors.text, marginTop: spacing.md }}>
        {title}
      </Text>
      <Text
        style={{
          fontSize: typography.caption,
          color: theme.colors.textSecondary,
          textAlign: 'center',
          marginTop: spacing.xs,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

export function KeyValueRow({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.kvRow}>
      <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: typography.caption, color: theme.colors.text, fontWeight: '600', flex: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    minHeight: 48,
  },
  fieldLabel: {
    fontSize: typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: typography.body,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    alignItems: 'flex-start',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  kvRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
});
