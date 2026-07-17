/**
 * Project Team (§11.16): the multidisciplinary team behind MamaVR AI.
 * Profiles are seeded from the design book; administrators upload each
 * member's professional passport photograph through the Media Manager,
 * replacing the "[Insert Photo Here]" placeholders from the document.
 */
import { TeamMember, User } from '@/types';
import { logAudit } from './audit';
import { db } from './database';

const TEAM: TeamMember[] = [
  {
    id: 'team-abdul-wahab-ibrahim',
    name: 'Abdul Wahab Ibrahim',
    role: 'Team Lead',
    qualification: 'BSc Nursing',
    responsibilities: [
      'Overall project leadership and coordination.',
      'Clinical oversight of maternal health workflows.',
      'Product vision and strategy.',
      'Stakeholder engagement and partnerships.',
      'AI clinical rule validation.',
      'Monitoring project implementation and quality assurance.',
    ],
    photoUri: null,
    isLead: true,
    displayOrder: 1,
  },
  {
    id: 'team-osman-abdul-wahab',
    name: 'Osman Abdul-Wahab',
    role: 'Technical Lead',
    qualification: 'AWS Cloud Architect / Software Engineer',
    responsibilities: [
      'Software architecture design.',
      'Mobile application development.',
      'Backend API development.',
      'Cloud infrastructure and deployment.',
      'Database architecture.',
      'Security implementation.',
      'System integration and maintenance.',
    ],
    photoUri: null,
    isLead: false,
    displayOrder: 2,
  },
  {
    id: 'team-adams-rashida',
    name: 'Adams Rashida',
    role: 'Communications & Outreach Officer',
    qualification: 'BSc Public Health Nursing',
    responsibilities: [
      'Community engagement.',
      'User education and awareness.',
      'Stakeholder communication.',
      'Health promotion content development.',
      'Feedback collection during pilot implementation.',
      'Coordination of outreach and dissemination activities.',
    ],
    photoUri: null,
    isLead: false,
    displayOrder: 3,
  },
];

/** Idempotent: inserts profiles once, never overwrites uploaded photos. */
export function seedTeamMembers(): void {
  for (const member of TEAM) {
    db.runSync(
      `INSERT OR IGNORE INTO team_members (id, name, role, qualification, responsibilities, photo_uri, is_lead, display_order)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
      [
        member.id,
        member.name,
        member.role,
        member.qualification,
        JSON.stringify(member.responsibilities),
        member.isLead ? 1 : 0,
        member.displayOrder,
      ]
    );
  }
}

interface TeamRow {
  id: string;
  name: string;
  role: string;
  qualification: string;
  responsibilities: string;
  photo_uri: string | null;
  is_lead: number;
  display_order: number;
}

function mapMember(row: TeamRow): TeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    qualification: row.qualification,
    responsibilities: JSON.parse(row.responsibilities) as string[],
    photoUri: row.photo_uri,
    isLead: row.is_lead === 1,
    displayOrder: row.display_order,
  };
}

export function listTeamMembers(): TeamMember[] {
  return db
    .getAllSync<TeamRow>('SELECT * FROM team_members ORDER BY display_order')
    .map(mapMember);
}

/** Admin: attach or replace a member's professional passport photograph. */
export function updateTeamMemberPhoto(admin: User, memberId: string, photoUri: string | null): void {
  db.runSync('UPDATE team_members SET photo_uri = ? WHERE id = ?', [photoUri, memberId]);
  logAudit(admin, 'TEAM_UPDATED', `Photo ${photoUri ? 'uploaded' : 'removed'} for team member ${memberId}`);
}
