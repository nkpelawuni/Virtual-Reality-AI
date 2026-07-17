import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, RiskBadge, Screen, ScreenTitle } from '@/components/ui';
import { confidenceLabel } from '@/ai/engine';
import { getAssessment } from '@/services/assessments';
import { getVrModule } from '@/services/vr';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing, typography } from '@/theme/theme';
import { RiskLevel } from '@/types';
import { MainStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type Route = RouteProp<MainStackParamList, 'Assessment'>;

/** Risk meter (§8.12): three segments with the active level highlighted. */
function RiskMeter({ risk }: { risk: RiskLevel }) {
  const { theme } = useTheme();
  const levels: Array<{ key: RiskLevel; label: string; color: string }> = [
    { key: 'low', label: 'Low', color: theme.colors.success },
    { key: 'moderate', label: 'Moderate', color: theme.colors.warning },
    { key: 'high', label: 'High', color: theme.colors.danger },
  ];
  return (
    <View style={styles.meterRow}>
      {levels.map((level) => {
        const active = level.key === risk;
        return (
          <View
            key={level.key}
            style={[
              styles.meterSegment,
              {
                backgroundColor: active ? level.color : theme.colors.surfaceAlt,
                borderColor: active ? level.color : theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: active ? '#fff' : theme.colors.textSecondary,
                fontWeight: active ? '700' : '500',
                fontSize: 13,
              }}
            >
              {level.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function AssessmentScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const assessment = getAssessment(route.params.assessmentId);

  if (!assessment) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Assessment Not Found" message="Please generate the assessment again." />
      </Screen>
    );
  }

  const vrModule = getVrModule(assessment.recommendedVrModuleId);
  const primaryFinding = assessment.findings[0] ?? null;

  return (
    <Screen>
      <ScreenTitle subtitle="Decision support only — the healthcare provider makes the final clinical decision.">
        AI Risk Assessment
      </ScreenTitle>

      <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary, marginBottom: spacing.sm }}>
          Overall Assessment
        </Text>
        <RiskBadge risk={assessment.overallRisk} large />
        <View style={{ width: '100%', marginTop: spacing.md }}>
          <RiskMeter risk={assessment.overallRisk} />
        </View>
        <View style={styles.confidenceRow}>
          <Ionicons name="analytics-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginLeft: 6 }}>
            Confidence: {assessment.confidence}% ({confidenceLabel(assessment.confidence)}) — reflects data
            completeness, not diagnostic probability.
          </Text>
        </View>
      </Card>

      {assessment.findings.length === 0 ? (
        <Card>
          <Text style={{ fontSize: typography.cardTitle, fontWeight: '600', color: theme.colors.success }}>
            No significant danger signs detected
          </Text>
          <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary, marginTop: spacing.xs }}>
            Continue routine antenatal care and health education according to the WHO ANC schedule.
          </Text>
        </Card>
      ) : (
        assessment.findings.map((finding) => (
          <Card key={finding.ruleId}>
            <View style={styles.findingHeader}>
              <Text style={{ flex: 1, fontSize: typography.cardTitle, fontWeight: '700', color: theme.colors.text }}>
                {finding.title}
              </Text>
              <RiskBadge risk={finding.risk} />
            </View>

            <Text style={[styles.findingLabel, { color: theme.colors.textSecondary }]}>Evidence</Text>
            {finding.evidence.map((item) => (
              <View key={item} style={styles.evidenceRow}>
                <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                <Text style={{ marginLeft: 6, color: theme.colors.text, fontSize: typography.caption, flex: 1 }}>
                  {item}
                </Text>
              </View>
            ))}

            <Text style={[styles.findingLabel, { color: theme.colors.textSecondary }]}>Explanation</Text>
            <Text style={{ color: theme.colors.text, fontSize: typography.caption, lineHeight: 20 }}>
              {finding.explanation}
            </Text>

            <Text style={[styles.findingLabel, { color: theme.colors.textSecondary }]}>Recommended Action</Text>
            {finding.actions.map((action) => (
              <View key={action} style={styles.evidenceRow}>
                <Ionicons name="arrow-forward" size={14} color={theme.colors.warning} />
                <Text style={{ marginLeft: 6, color: theme.colors.text, fontSize: typography.caption, flex: 1 }}>
                  {action}
                </Text>
              </View>
            ))}

            <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' }}>
              Source: {finding.source}
            </Text>
          </Card>
        ))
      )}

      {assessment.missingData.length > 0 ? (
        <Card style={{ backgroundColor: theme.colors.warningBg, borderColor: theme.colors.warning }}>
          <Text style={{ fontSize: typography.caption, fontWeight: '700', color: theme.colors.warning }}>
            Recorded data was incomplete
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.text, marginTop: 4 }}>
            Missing: {assessment.missingData.join(', ')}. Recommendations are based on the available information
            only — complete these fields for a fuller assessment.
          </Text>
        </Card>
      ) : null}

      {vrModule ? (
        <Card>
          <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary }}>
            Recommended VR Education
          </Text>
          <Text style={{ fontSize: typography.cardTitle, fontWeight: '700', color: theme.colors.text, marginTop: 2 }}>
            {vrModule.title}
          </Text>
          <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary, marginTop: 2 }}>
            {vrModule.purpose} (~{vrModule.durationMinutes} min)
          </Text>
          <Button
            title="Launch VR Education"
            icon="glasses-outline"
            style={{ marginTop: spacing.sm }}
            onPress={() =>
              navigation.navigate('VrPlayer', {
                moduleId: vrModule.id,
                language: 'en',
                patientId: assessment.patientId,
                visitId: assessment.visitId,
              })
            }
          />
        </Card>
      ) : null}

      {assessment.overallRisk !== 'low' ? (
        <Button
          title="Refer Patient"
          icon="git-branch-outline"
          variant={assessment.overallRisk === 'high' ? 'danger' : 'primary'}
          onPress={() =>
            navigation.navigate('Referral', {
              patientId: assessment.patientId,
              visitId: assessment.visitId,
              assessmentId: assessment.id,
              suggestedReason: primaryFinding?.title,
            })
          }
        />
      ) : null}

      <Button
        title="Complete Consultation"
        icon="checkmark-done-outline"
        variant="success"
        onPress={() =>
          navigation.navigate('ConsultationSummary', {
            visitId: assessment.visitId,
            assessmentId: assessment.id,
          })
        }
      />
      <Button title="Back" variant="secondary" onPress={() => navigation.goBack()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  meterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  meterSegment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  findingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  findingLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
});
