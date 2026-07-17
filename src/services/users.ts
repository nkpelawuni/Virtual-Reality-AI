/** Administrator user management (Chapter 3.3). */
import * as Crypto from 'expo-crypto';

import { User, UserRole } from '@/types';
import { hashPassword, validatePasswordPolicy } from './auth';
import { logAudit } from './audit';
import { db, nowIso } from './database';

interface UserRow {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: 'active' | 'suspended';
  facility_id: string | null;
  avatar_uri: string | null;
  created_at: string;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    facilityId: row.facility_id,
    avatarUri: row.avatar_uri,
    createdAt: row.created_at,
  };
}

export function listUsers(): User[] {
  const rows = db.getAllSync<UserRow>(
    'SELECT id, username, email, full_name, role, status, facility_id, avatar_uri, created_at FROM users ORDER BY full_name'
  );
  return rows.map(mapUser);
}

export interface CreateUserInput {
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  facilityId: string | null;
  password: string;
  avatarUri?: string | null;
}

export async function createUser(admin: User, input: CreateUserInput): Promise<string | null> {
  const policyError = validatePasswordPolicy(input.password);
  if (policyError) return policyError;
  const existing = db.getFirstSync<{ id: string }>(
    'SELECT id FROM users WHERE lower(username) = ? OR lower(email) = ?',
    [input.username.trim().toLowerCase(), input.email.trim().toLowerCase()]
  );
  if (existing) return 'A user with that username or email already exists.';

  const salt = Crypto.randomUUID();
  const hash = await hashPassword(input.password, salt);
  db.runSync(
    `INSERT INTO users (id, username, email, full_name, role, status, facility_id, avatar_uri, password_hash, salt, created_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
    [
      Crypto.randomUUID(),
      input.username.trim(),
      input.email.trim(),
      input.fullName.trim(),
      input.role,
      input.facilityId,
      input.avatarUri ?? null,
      hash,
      salt,
      nowIso(),
    ]
  );
  logAudit(admin, 'USER_CREATED', `Created ${input.role} account: ${input.username}`);
  return null;
}

export function setUserStatus(admin: User, userId: string, status: 'active' | 'suspended'): void {
  db.runSync('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
  logAudit(admin, status === 'suspended' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', `User ${userId}`);
}

export async function adminResetPassword(
  admin: User,
  userId: string,
  newPassword: string
): Promise<string | null> {
  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) return policyError;
  const salt = Crypto.randomUUID();
  const hash = await hashPassword(newPassword, salt);
  db.runSync('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?', [hash, salt, userId]);
  logAudit(admin, 'PASSWORD_RESET_BY_ADMIN', `Password reset for user ${userId}`);
  return null;
}
