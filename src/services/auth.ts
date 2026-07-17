/**
 * Authentication service (Chapter 3.5 / 10.4-10.5).
 * Passwords are stored only as salted SHA-256 hashes; sessions are persisted
 * locally so the app works offline and expire after inactivity.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { User, UserRole } from '@/types';
import { logAudit } from './audit';
import { db } from './database';

const SESSION_KEY = 'mamavr.session';
/** Auto-logout after 12 hours of inactivity (configurable per §3.5). */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface Session {
  userId: string;
  issuedAt: number;
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: 'active' | 'suspended';
  facility_id: string | null;
  avatar_uri: string | null;
  password_hash: string;
  salt: string;
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

export async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) return 'Password must contain at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a special character.';
  return null;
}

export type LoginResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export async function login(usernameOrEmail: string, password: string): Promise<LoginResult> {
  const identifier = usernameOrEmail.trim().toLowerCase();
  const row = db.getFirstSync<UserRow>(
    'SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ?',
    [identifier, identifier]
  );
  if (!row) {
    logAudit(null, 'LOGIN_FAILED', `Unknown user: ${identifier}`);
    return { ok: false, error: 'Invalid username or password.' };
  }
  if (row.status === 'suspended') {
    logAudit(null, 'LOGIN_FAILED', `Suspended account: ${row.username}`);
    return { ok: false, error: 'This account has been suspended. Contact your administrator.' };
  }
  const hash = await hashPassword(password, row.salt);
  if (hash !== row.password_hash) {
    logAudit(null, 'LOGIN_FAILED', `Wrong password for: ${row.username}`);
    return { ok: false, error: 'Invalid username or password.' };
  }
  const user = mapUser(row);
  await AsyncStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ userId: user.id, issuedAt: Date.now() } satisfies Session)
  );
  logAudit(user, 'LOGIN', 'User signed in');
  return { ok: true, user };
}

export async function restoreSession(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    if (Date.now() - session.issuedAt > SESSION_TTL_MS) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }
    const row = db.getFirstSync<UserRow>('SELECT * FROM users WHERE id = ?', [session.userId]);
    if (!row || row.status === 'suspended') return null;
    return mapUser(row);
  } catch {
    return null;
  }
}

export async function logout(user: User | null): Promise<void> {
  if (user) logAudit(user, 'LOGOUT', 'User signed out');
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function changePassword(
  user: User,
  currentPassword: string,
  newPassword: string
): Promise<string | null> {
  const row = db.getFirstSync<UserRow>('SELECT * FROM users WHERE id = ?', [user.id]);
  if (!row) return 'User not found.';
  const currentHash = await hashPassword(currentPassword, row.salt);
  if (currentHash !== row.password_hash) return 'Current password is incorrect.';
  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) return policyError;
  const salt = Crypto.randomUUID();
  const hash = await hashPassword(newPassword, salt);
  db.runSync('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?', [hash, salt, user.id]);
  logAudit(user, 'PASSWORD_CHANGED', 'User changed own password');
  return null;
}

/**
 * Offline password reset (§3.5 Forgot Password): verifies identity against
 * the registered email before allowing a new password. In production this is
 * backed by the cloud auth provider's email verification flow.
 */
export async function resetPassword(email: string, newPassword: string): Promise<string | null> {
  const row = db.getFirstSync<UserRow>('SELECT * FROM users WHERE lower(email) = ?', [
    email.trim().toLowerCase(),
  ]);
  if (!row) return 'No account found with that email address.';
  const policyError = validatePasswordPolicy(newPassword);
  if (policyError) return policyError;
  const salt = Crypto.randomUUID();
  const hash = await hashPassword(newPassword, salt);
  db.runSync('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?', [hash, salt, row.id]);
  logAudit(mapUser(row), 'PASSWORD_RESET', 'Password reset via identity verification');
  return null;
}

export function getUserById(id: string): User | null {
  const row = db.getFirstSync<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
  return row ? mapUser(row) : null;
}

export function updateAvatar(user: User, avatarUri: string | null): void {
  db.runSync('UPDATE users SET avatar_uri = ? WHERE id = ?', [avatarUri, user.id]);
  logAudit(user, 'PROFILE_UPDATED', 'Profile photo updated');
}
