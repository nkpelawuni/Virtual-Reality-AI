/**
 * First-run seeding: demo facility, demo accounts and the built-in VR module
 * library from §7.4. Runs once; guarded by the `seed_version` setting.
 */
import * as Crypto from 'expo-crypto';

import { hashPassword } from './auth';
import { db, getSetting, nowIso, setSetting } from './database';
import { seedTeamMembers } from './team';

const SEED_VERSION = '1';

const VR_MODULES: Array<{
  id: string;
  title: string;
  purpose: string;
  keyMessages: string[];
  durationMinutes: number;
}> = [
  {
    id: 'healthy-pregnancy',
    title: 'Healthy Pregnancy Journey',
    purpose: 'Introduce routine antenatal care and healthy pregnancy practices.',
    keyMessages: [
      'Attend all eight WHO-recommended antenatal contacts.',
      'Eat a balanced diet and take your iron and folic acid supplements.',
      'Sleep under an insecticide-treated net.',
      'Discuss any concerns with your midwife or nurse.',
    ],
    durationMinutes: 5,
  },
  {
    id: 'pre-eclampsia',
    title: 'Understanding Pre-eclampsia',
    purpose: 'Explain warning signs and the importance of urgent care.',
    keyMessages: [
      'Attend all antenatal appointments.',
      'Report severe headaches immediately.',
      'Seek urgent care if you experience blurred vision or swelling.',
      'Do not ignore warning signs.',
    ],
    durationMinutes: 6,
  },
  {
    id: 'danger-signs',
    title: 'Pregnancy Danger Signs',
    purpose: 'Teach recognition of symptoms requiring immediate medical attention.',
    keyMessages: [
      'Bleeding, severe headache, fits or fever need urgent care.',
      'Go to the nearest health facility immediately — do not wait.',
      'Reduced baby movements must be reported the same day.',
    ],
    durationMinutes: 5,
  },
  {
    id: 'nutrition-anaemia',
    title: 'Nutrition During Pregnancy',
    purpose: 'Promote balanced nutrition and iron supplementation.',
    keyMessages: [
      'Take iron and folic acid every day as prescribed.',
      'Eat dark green leafy vegetables, beans, eggs and fish.',
      'Attend follow-up visits to check your blood level.',
    ],
    durationMinutes: 5,
  },
  {
    id: 'birth-preparedness',
    title: 'Preparing for Safe Delivery',
    purpose: 'Encourage planning for delivery and emergency situations.',
    keyMessages: [
      'Plan to deliver at a health facility with a skilled attendant.',
      'Arrange transport and save for emergencies in advance.',
      'Pack your delivery items early.',
      'Know the danger signs of labour.',
    ],
    durationMinutes: 7,
  },
  {
    id: 'postpartum-care',
    title: 'Postpartum Care and Newborn Health',
    purpose: 'Introduce essential care after childbirth for mother and baby.',
    keyMessages: [
      'Attend postnatal check-ups for you and your baby.',
      'Breastfeed exclusively for the first six months.',
      'Report heavy bleeding after delivery immediately.',
      'Keep the baby warm and the cord clean and dry.',
    ],
    durationMinutes: 6,
  },
  {
    id: 'malaria-prevention',
    title: 'Malaria Prevention in Pregnancy',
    purpose: 'Promote insecticide-treated nets and preventive treatment.',
    keyMessages: [
      'Sleep under an insecticide-treated net every night.',
      'Take the preventive malaria doses given at the clinic.',
      'Seek care quickly if you develop fever.',
    ],
    durationMinutes: 4,
  },
];

export async function seedIfNeeded(): Promise<void> {
  // Team profiles use idempotent inserts, so they run on every start and
  // reach existing installations without a version bump.
  seedTeamMembers();

  if (getSetting('seed_version') === SEED_VERSION) return;
  const now = nowIso();

  const facilityId = Crypto.randomUUID();
  db.runSync(
    `INSERT OR IGNORE INTO facilities (id, name, type, district, region, logo_uri, created_at)
     VALUES (?, 'Demo CHPS Compound', 'chps_compound', 'Tamale Metropolitan', 'Northern Region', NULL, ?)`,
    [facilityId, now]
  );

  const seedUser = async (
    username: string,
    email: string,
    fullName: string,
    role: 'admin' | 'healthcare_worker',
    password: string
  ) => {
    const salt = Crypto.randomUUID();
    const hash = await hashPassword(password, salt);
    db.runSync(
      `INSERT OR IGNORE INTO users (id, username, email, full_name, role, status, facility_id, avatar_uri, password_hash, salt, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, NULL, ?, ?, ?)`,
      [Crypto.randomUUID(), username, email, fullName, role, facilityId, hash, salt, now]
    );
  };

  // Demo credentials for the hackathon MVP — replace before any real deployment.
  await seedUser('admin', 'admin@mamavr.org', 'System Administrator', 'admin', 'Admin@2026');
  await seedUser('midwife', 'midwife@mamavr.org', 'Asana Mohammed (Midwife)', 'healthcare_worker', 'Midwife@2026');

  for (const module of VR_MODULES) {
    db.runSync(
      `INSERT OR IGNORE INTO vr_modules (id, title, purpose, key_messages, duration_minutes, video_uri, thumbnail_uri, languages, is_builtin, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, NULL, '["en","dag"]', 1, ?)`,
      [module.id, module.title, module.purpose, JSON.stringify(module.keyMessages), module.durationMinutes, now]
    );
  }

  setSetting('seed_version', SEED_VERSION);
}
