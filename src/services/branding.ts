/**
 * Application branding (§8.20): administrators can upload the organisation's
 * logo, which appears on the splash screen, login screen and dashboards.
 */
import { User } from '@/types';
import { logAudit } from './audit';
import { getSetting, setSetting } from './database';

const LOGO_KEY = 'branding.logoUri';
const NAME_KEY = 'branding.appName';

export function getBrandLogoUri(): string | null {
  return getSetting(LOGO_KEY) || null;
}

export function setBrandLogoUri(admin: User, uri: string | null): void {
  setSetting(LOGO_KEY, uri ?? '');
  logAudit(admin, 'BRANDING_UPDATED', uri ? 'Application logo uploaded' : 'Application logo removed');
}

export function getBrandName(): string {
  return getSetting(NAME_KEY) || 'MamaVR AI';
}
