# MamaVR AI

**An AI-Powered Clinical Decision Support and Virtual Reality Platform for Maternal and Child Health**

MamaVR AI is an offline-first digital maternal healthcare platform that supports Community Health
Officers, nurses, midwives and doctors throughout routine antenatal care (ANC). It combines
explainable, rule-based clinical decision support built on WHO antenatal care recommendations,
automated antenatal calculations, immersive VR patient education, and secure offline storage with
cloud synchronization.

> Decision support only — healthcare professionals retain full responsibility for every clinical
> decision. The platform never provides a definitive diagnosis.

## Feature Overview

| Area | Capabilities |
|---|---|
| **Authentication** | Salted-hash passwords, role-based access control (Administrator / Healthcare Worker), session timeout, forgot-password flow, full audit trail |
| **Patient Management** | Registration with **photo upload**, multi-key search (name, phone, ID, NHIS), pregnancy & medical history, ANC visit records |
| **Clinical Calculations** | Automatic gestational age, EDD (Naegele's rule), BMI, maternal age, WHO eight-contact review scheduling |
| **AI Decision Support** | Deterministic, explainable rule engine (pre-eclampsia, eclampsia, anaemia, bleeding, fever/malaria, fetal compromise, gestational diabetes, obstetric history, maternal age, BMI). Every alert lists evidence, explanation, recommended actions, guideline source and a data-completeness confidence indicator |
| **VR Education** | Seven built-in modules (§7.4) with **admin-uploaded lesson videos and thumbnails**, immersive full-screen player, play/pause/replay, subtitles, language switching (English/Dagbani), progress tracking, guided-narration fallback when no video is uploaded yet |
| **Referrals & Follow-up** | Auto-populated referral forms from AI assessments, WHO-schedule follow-up generation, overdue alerts |
| **Administration** | User management (create/suspend/reactivate/reset password, **avatar upload**), facility management (**logo upload**), VR content manager (**video/thumbnail upload**, publish new modules), analytics dashboard, audit logs, **branding logo upload** |
| **Offline-First Sync** | All records and media stored locally in SQLite first, flagged `pending`, pushed to Supabase (REST + Storage) when configured and online |

## Media Upload Design

All images, logos and videos flow through one pipeline:

```
Camera / Library picker  →  Media Manager (services/media.ts)
                             • copies file into private app storage
                             • registers it in the media_assets table
                             • queues it for cloud upload (uploaded = 0)
                          →  MediaPicker component (components/MediaPicker.tsx)
                             • consistent UI: preview, upload, camera, remove
                          →  Sync Manager (services/sync.ts)
                             • uploads pending files to cloud storage when online
```

Upload points:

- **Patient photo** — registration form and patient record (camera or library)
- **Facility logo** — facility management; shown on dashboards and referral forms
- **Application logo** — administrator branding; shown on splash, login and dashboards
- **Staff avatar** — profile screen and admin user creation
- **VR lesson video + thumbnail** — VR Content Manager; plays fully offline once uploaded

## Technology Stack

| Component | Technology |
|---|---|
| Mobile app | React Native (Expo SDK 53) |
| Language | TypeScript (strict) |
| Local database | SQLite (`expo-sqlite`) |
| Media | `expo-image-picker`, `expo-file-system`, `expo-av` |
| Security | `expo-crypto` (salted SHA-256 password hashing), role-based access control, audit logging |
| Navigation | React Navigation (native stack + bottom tabs) |
| Cloud sync (optional) | Supabase REST + Storage via `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

## Project Structure

```
src/
├── ai/               # Explainable rule engine (Chapter 6)
├── components/       # Design system (Chapter 8) + MediaPicker
├── features/
│   ├── authentication/   # Splash, Login, Forgot Password
│   ├── dashboard/        # Healthcare worker dashboard
│   ├── patients/         # Search, registration, record, high-risk, follow-ups
│   ├── anc/              # ANC consultation (vitals/symptoms/fetal/labs) + summary
│   ├── ai/               # AI assessment screen (risk meter, evidence, actions)
│   ├── vr/               # VR library + immersive player
│   ├── referrals/        # Referral form
│   ├── notifications/    # Colour-coded alerts
│   ├── profile/          # Profile, avatar upload, dark mode, password
│   └── admin/            # Users, facilities, VR content, audit logs, branding
├── hooks/            # Auth context
├── navigation/       # Role-based navigators
├── services/         # SQLite, auth, patients, visits, assessments, referrals,
│                     # vr, media (uploads), sync, audit, facilities, users,
│                     # branding, seed
├── theme/            # Palette, typography, light/dark themes
├── types/            # Shared domain models
└── utils/            # Clinical calculations (GA, EDD, BMI, WHO review dates)
```

## Getting Started

```bash
npm install
npm start          # Expo dev server — press "a" for Android
npm run typecheck  # TypeScript validation
```

**Demo accounts** (seeded on first run — replace before any real deployment):

| Role | Username | Password |
|---|---|---|
| Healthcare Worker | `midwife` | `Midwife@2026` |
| Administrator | `admin` | `Admin@2026` |

### Enabling cloud synchronization

Create a `.env` file (not committed):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Without configuration the app runs fully offline; records queue locally and the sync status is
reported on the dashboard.

## Clinical Safety & Governance

- Rule logic is derived from the WHO Recommendations on Antenatal Care (2016), WHO danger-sign
  guidance and Ghana Health Service protocols; each finding cites its source.
- Confidence values indicate **data completeness only**, never diagnostic probability.
- Assessments with missing data are clearly flagged (§6.8).
- Every AI assessment, referral, VR launch, login and record change is written to the audit log
  with user, facility, device and timestamp (§10.8).
- Educational VR content should be reviewed by obstetric and public-health experts before
  publication (§7.11).

## Compliance Notes

Designed with the Ghana Data Protection Act, 2012 (Act 843) in mind: minimum-necessary data
collection, role-restricted access, salted password hashing, local-first storage and complete audit
trails. Production deployments should additionally enable OS-level database encryption (e.g.
SQLCipher) and TLS-only cloud endpoints.
