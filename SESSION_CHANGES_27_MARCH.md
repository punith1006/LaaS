# Session Changes — 27 March 2026

## 1. Runway Auto-Termination Feature
**What:** Server-side cron job (every 5 min) that auto-terminates compute instances when credit runway reaches 0.

- **Files changed:** `compute.service.ts`, `mail.service.ts`, `schema.prisma`
- **New files:** `templates/runway-warning.hbs`, `templates/runway-termination.hbs`
- **Schema:** Added `credit_exhausted` to `SessionTerminationReason` enum, `runwayWarning1HourSent` to Wallet model
- **Cron:** `checkAndEnforceRunwayLimit()` runs every 5 min, checks ALL users with running sessions server-side
- At runway <= 1hr: sends warning email, sets wallet flag
- At runway <= 0: terminates all compute sessions (not storage), sends termination email, audit logs
- At runway > 1hr with flag set: resets flag (user added credits)
- **Frontend:** Orange "LOW RUNWAY" banner on home page, orange/red MetricCard states on billing page
- **Dark theme:** Fixed hardcoded light-theme colors to use rgba() for theme compatibility

**Pending action:** Run `npx prisma db push` from backend/ to sync the new schema fields to the database.

---

## 2. Domain-Based Institution Recognition (Signup Flow)
**What:** Students signing up with university email domains (e.g., @ksrc.in) are auto-detected as institution students.

- **Files changed:** `auth.service.ts` (verifyOtp + checkEmail), `auth.controller.ts`, `seed.ts`
- **Frontend:** `sign-up-form.tsx` (green recognition badge), `onboarding-form.tsx` (pre-fill student/IN), `lib/api.ts`, `stores/signup-store.ts`
- `verifyOtp` now queries `University.domainSuffixes` to detect institution emails
- If matched: authType='institution_local', org=matched university org, role='student', 10GB free storage provisioned
- If not matched: unchanged public_local flow
- `checkEmail` endpoint now returns `{ available: true, institution?: { name, shortName, slug } }`
- Frontend shows green "Recognized as KSRCE student" badge on signup
- Onboarding pre-fills profession='student', country='IN' for institution users
- Storage is FREE (price_per_gb_cents_month=0, excluded from billing)

**Pending actions:**
1. Run `npx prisma db push` to sync schema
2. Run `npx prisma db seed` to create KSRCE university and organization records
3. Test signup with any @ksrc.in email

---

## 3. Free Storage Billing Fix
**What:** Institution signup storage excluded from billing (same as SSO students).

- `auth.service.ts`: price_per_gb_cents_month set to 0
- `billing.service.ts`: Added 'institution_signup' to notIn filter for hourly billing
- `compute.service.ts`: Fixed bug — was filtering by storageUid instead of allocationType (never worked for SSO either). Now uses allocationType notIn ['sso_default', 'institution_signup']
- `dashboard.service.ts`: Excluded 'institution_signup' from burn rate calculation

---

## 4. Email Template Upgrades (from earlier in session)
- Upgraded `templates/otp.hbs` and `templates/welcome.hbs` from plain text to styled HTML
- Design: Utilitarian Minimalism, matching spend-limit templates

---

## Files Modified (Complete List)

### Backend
| File | Changes |
|------|---------|
| `backend/prisma/schema.prisma` | credit_exhausted enum, runwayWarning1HourSent field |
| `backend/prisma/seed.ts` | KSRCE university + organization seeding |
| `backend/src/auth/auth.service.ts` | Domain detection in verifyOtp + checkEmail |
| `backend/src/auth/auth.controller.ts` | check-email returns 200 with JSON |
| `backend/src/compute/compute.service.ts` | Runway enforcement cron + billing fix |
| `backend/src/mail/mail.service.ts` | 2 new email methods |
| `backend/src/billing/billing.service.ts` | institution_signup billing exclusion |
| `backend/src/dashboard/dashboard.service.ts` | institution_signup burn rate exclusion |
| `backend/templates/runway-warning.hbs` | NEW |
| `backend/templates/runway-termination.hbs` | NEW |
| `backend/templates/otp.hbs` | Upgraded to HTML |
| `backend/templates/welcome.hbs` | Upgraded to HTML |

### Frontend
| File | Changes |
|------|---------|
| `frontend/src/components/home/home-tab-content.tsx` | Low runway banner + dark theme fix |
| `frontend/src/components/home/billing-tab-content.tsx` | MetricCard warning states + dark theme fix |
| `frontend/src/components/auth/sign-up-form.tsx` | Institution recognition badge |
| `frontend/src/components/auth/onboarding-form.tsx` | Student pre-fill |
| `frontend/src/lib/api.ts` | checkEmail return type |
| `frontend/src/stores/signup-store.ts` | Institution state |

---

## Deployment Checklist

```bash
# 1. Sync schema
cd backend && npx prisma db push

# 2. Seed KSRCE data
cd backend && npx prisma db seed

# 3. Rebuild backend
cd backend && npm run build

# 4. Rebuild frontend
cd frontend && npm run build

# 5. Restart backend server
```

---

## Architecture Notes for Future Agents

### Runway Enforcement
- Runs server-side via `@Cron(CronExpression.EVERY_5_MINUTES)` in compute.service.ts
- Checks ALL users with running sessions, not just the current user
- Uses wallet flag `runwayWarning1HourSent` to prevent duplicate emails
- Termination reason: `credit_exhausted` (new enum value)

### Institution Detection
- Domain matching happens in both `checkEmail()` (for UI badge) and `verifyOtp()` (for actual signup)
- Uses `University.domainSuffixes` array with `@domain` format
- Creates `UserStorageVolume` with `allocationType='institution_signup'`
- Auto-creates `UserProfile` with collegeName set

### Billing Exclusions
- `allocationType` values excluded from billing: `['sso_default', 'institution_signup']`
- This is the canonical way to mark free storage — do NOT use storageUid checks
