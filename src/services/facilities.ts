/** Facility management (Chapter 3.3): hospitals, health centres, CHPS compounds. */
import * as Crypto from 'expo-crypto';

import { Facility, FacilityType, User } from '@/types';
import { logAudit } from './audit';
import { db, nowIso } from './database';

interface FacilityRow {
  id: string;
  name: string;
  type: FacilityType;
  district: string;
  region: string;
  logo_uri: string | null;
  created_at: string;
}

function mapFacility(row: FacilityRow): Facility {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    district: row.district,
    region: row.region,
    logoUri: row.logo_uri,
    createdAt: row.created_at,
  };
}

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  hospital: 'Hospital',
  health_centre: 'Health Centre',
  chps_compound: 'CHPS Compound',
};

export function listFacilities(): Facility[] {
  return db
    .getAllSync<FacilityRow>('SELECT * FROM facilities ORDER BY name')
    .map(mapFacility);
}

export function getFacility(id: string | null): Facility | null {
  if (!id) return null;
  const row = db.getFirstSync<FacilityRow>('SELECT * FROM facilities WHERE id = ?', [id]);
  return row ? mapFacility(row) : null;
}

export interface FacilityInput {
  name: string;
  type: FacilityType;
  district: string;
  region: string;
  logoUri: string | null;
}

export function createFacility(admin: User, input: FacilityInput): Facility {
  const facility: Facility = {
    id: Crypto.randomUUID(),
    name: input.name.trim(),
    type: input.type,
    district: input.district.trim(),
    region: input.region.trim(),
    logoUri: input.logoUri,
    createdAt: nowIso(),
  };
  db.runSync(
    'INSERT INTO facilities (id, name, type, district, region, logo_uri, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [facility.id, facility.name, facility.type, facility.district, facility.region, facility.logoUri, facility.createdAt]
  );
  logAudit(admin, 'FACILITY_CREATED', `${FACILITY_TYPE_LABELS[input.type]}: ${facility.name}`);
  return facility;
}

export function updateFacilityLogo(admin: User, facilityId: string, logoUri: string | null): void {
  db.runSync('UPDATE facilities SET logo_uri = ? WHERE id = ?', [logoUri, facilityId]);
  logAudit(admin, 'FACILITY_UPDATED', `Logo updated for facility ${facilityId}`);
}
