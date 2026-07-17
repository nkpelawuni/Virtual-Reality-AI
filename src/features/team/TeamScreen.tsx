/**
 * Project Team (§11.16): profiles of the multidisciplinary team behind
 * MamaVR AI, with the team structure chart from the design book.
 * Administrators upload each member's professional passport photograph
 * in place of the document's "[Insert Photo Here]" placeholders.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { MediaPicker } from '@/components/MediaPicker';
import { Button, Card, Screen, ScreenTitle, SectionHeading } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { listTeamMembers, updateTeamMemberPhoto } from '@/services/team';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing, typography } from '@/theme/theme';
import { TeamMember } from '@/types';

function StructureNode({ member, compact }: { member: TeamMember; compact?: boolean }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.node,
        {
          backgroundColor: member.isLead ? theme.colors.primary : theme.colors.surface,
          borderColor: member.isLead ? theme.colors.primary : theme.colors.border,
          flex: compact ? 1 : undefined,
        },
      ]}
    >
      {member.photoUri ? (
        <Image source={{ uri: member.photoUri }} style={styles.nodePhoto} />
      ) : (
        <View style={[styles.nodePhoto, styles.nodePhotoFallback, { backgroundColor: member.isLead ? 'rgba(255,255,255,0.2)' : theme.colors.surfaceAlt }]}>
          <Ionicons name="person" size={18} color={member.isLead ? '#fff' : theme.colors.textSecondary} />
        </View>
      )}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          textAlign: 'center',
          color: member.isLead ? theme.colors.onPrimary : theme.colors.text,
        }}
        numberOfLines={2}
      >
        {member.name}
      </Text>
      <Text
        style={{
          fontSize: 11,
          textAlign: 'center',
          color: member.isLead ? 'rgba(255,255,255,0.85)' : theme.colors.textSecondary,
        }}
        numberOfLines={2}
      >
        {member.role}
      </Text>
    </View>
  );
}

export function TeamScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [editingPhotoFor, setEditingPhotoFor] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';

  const refresh = useCallback(() => setMembers(listTeamMembers()), []);
  useFocusEffect(refresh);

  const lead = members.find((member) => member.isLead);
  const others = members.filter((member) => !member.isLead);

  return (
    <Screen>
      <ScreenTitle subtitle="A multidisciplinary team combining expertise in healthcare, software engineering, cloud computing, and community engagement to deliver a practical, user-centred solution for maternal and child healthcare.">
        Project Team
      </ScreenTitle>

      {lead ? (
        <>
          <SectionHeading>Team Structure</SectionHeading>
          <Card style={{ alignItems: 'center' }}>
            <StructureNode member={lead} />
            <View style={[styles.connectorVertical, { backgroundColor: theme.colors.border }]} />
            <View style={[styles.connectorHorizontal, { backgroundColor: theme.colors.border }]} />
            <View style={styles.branchRow}>
              {others.map((member) => (
                <StructureNode key={member.id} member={member} compact />
              ))}
            </View>
          </Card>
        </>
      ) : null}

      <SectionHeading>Profiles</SectionHeading>
      {members.map((member) => (
        <Card key={member.id}>
          <View style={styles.profileRow}>
            {member.photoUri ? (
              <Image source={{ uri: member.photoUri }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profilePhoto, styles.profilePhotoFallback, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
                <Ionicons name="person" size={30} color={theme.colors.textSecondary} />
                <Text style={{ fontSize: 9, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 2 }}>
                  Photo pending
                </Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontSize: typography.cardTitle, fontWeight: '700', color: theme.colors.text }}>
                {member.name}
              </Text>
              <Text style={{ fontSize: typography.caption, fontWeight: '600', color: theme.colors.primary, marginTop: 2 }}>
                {member.role}
              </Text>
              <Text style={{ fontSize: typography.caption, color: theme.colors.textSecondary, marginTop: 2 }}>
                {member.qualification}
              </Text>
            </View>
          </View>

          <Text style={[styles.responsibilitiesLabel, { color: theme.colors.textSecondary }]}>
            Responsibilities
          </Text>
          {member.responsibilities.map((item) => (
            <View key={item} style={styles.responsibilityRow}>
              <Ionicons name="checkmark-circle-outline" size={15} color={theme.colors.success} />
              <Text style={{ marginLeft: 6, flex: 1, fontSize: typography.caption, color: theme.colors.text, lineHeight: 19 }}>
                {item}
              </Text>
            </View>
          ))}

          {isAdmin ? (
            editingPhotoFor === member.id ? (
              <View style={{ marginTop: spacing.md }}>
                <MediaPicker
                  label="Professional Passport Photograph"
                  kind="image"
                  ownerType="team_photo"
                  ownerId={member.id}
                  value={member.photoUri}
                  onChange={(uri) => {
                    if (user) updateTeamMemberPhoto(user, member.id, uri);
                    setEditingPhotoFor(null);
                    refresh();
                  }}
                  shape="circle"
                  allowCamera
                  helper="Passport-style headshot, square crop recommended."
                />
                <Button title="Done" variant="secondary" onPress={() => setEditingPhotoFor(null)} />
              </View>
            ) : (
              <Button
                title={member.photoUri ? 'Change Photo' : 'Upload Photo'}
                variant="secondary"
                icon="camera-outline"
                onPress={() => setEditingPhotoFor(member.id)}
                style={{ marginTop: spacing.sm }}
              />
            )
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  node: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minWidth: 140,
  },
  nodePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: spacing.xs,
  },
  nodePhotoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorVertical: {
    width: 2,
    height: 16,
  },
  connectorHorizontal: {
    height: 2,
    alignSelf: 'stretch',
    marginHorizontal: '18%',
  },
  branchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  profilePhotoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  responsibilitiesLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  responsibilityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
});
