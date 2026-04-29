# LaaS Mentoring Feature — Complete Implementation Plan

---

## 1. Feature Objectives and USP Positioning

**Core Objective**: Build a mentoring marketplace tightly integrated with the LaaS compute platform, enabling students to book 1-on-1 guidance sessions with mentors (faculty, TAs, senior students, external experts) — with video calls, wallet-based payments, and reviews.

**USP Differentiator**: Unlike Codementor, Topmate, or MentorCruise, LaaS mentoring is *compute-assisted* — a mentor can eventually observe/join a student's live lab session (GPU environment, Jupyter notebook, desktop) to provide real-time debugging help. No competitor (RunPod, Vast.ai, Lambda Cloud) offers this.

**Success Metrics**:
- Mentor adoption: 20+ active mentors within first quarter
- Booking rate: 2+ sessions/month per active student
- No-show rate: below 5% (industry average ~6%)
- Average mentor rating: above 4.0/5.0

---

## 2. User Roles in Mentoring

| Role | Can Be Mentor? | Can Book Mentor? | Payment Model |
|------|---------------|-----------------|---------------|
| Faculty | Yes (auto-approved) | No | Free (institutional) |
| Lab Instructor / TA | Yes (auto-approved) | No | Free (institutional) |
| Student | Yes (peer mentor, needs approval) | Yes | Wallet-based (paid for external, free for institutional) |
| External Student | No (MVP) | Yes | Wallet-based |
| Public User | No (MVP) | Yes (paid only) | Wallet-based |
| External Expert | Yes (admin-approved) | No | Paid, receives payout |

**Mentor Types**:
- **Internal (Free)**: Faculty, TAs, peer mentors — no charge, part of institutional offering
- **External (Paid)**: Industry experts, freelance mentors — set own hourly rate, platform takes configurable commission (default 20%)

---

## 3. User Journeys

### 3.1 Student Booking a Mentor (Happy Path)

```
1. Student navigates to /mentoring/browse
2. Filters by expertise (PyTorch, CUDA, ML, etc.), price range, availability, rating
3. Views mentor profile: bio, expertise, experience, hourly rate, avg rating, reviews
4. Clicks "Book Session" → sees calendar with available slots
5. Selects date/time slot + duration (30min or 60min)
6. Adds session notes (what help is needed)
7. System shows price breakdown:
   - Session cost: (rate x duration)
   - Platform fee: included
   - Wallet balance: current
8. Confirms booking → wallet hold created (amount reserved)
9. Receives confirmation notification (email + in-app)
10. 24hr before: reminder email
11. 2hr before: reminder email with meeting link
12. At session time: joins video call via meeting URL
13. Session happens (video + screen share)
14. Session ends → wallet hold captured → mentor credited
15. Prompted to leave review (1-5 stars + text)
```

### 3.2 Mentor Setting Up and Managing

```
1. User with Mentor role navigates to /mentoring/dashboard
2. Creates/edits mentor profile:
   - Headline, bio, expertise areas (tags)
   - Experience years
   - Hourly rate (in INR, stored as cents)
   - Profile photo (uses existing user profile)
3. Sets availability:
   - Recurring weekly slots (e.g., Mon/Wed/Fri 6-8pm)
   - One-off specific date slots
   - Buffer time between sessions (default 15min)
4. Receives booking notification when student books
5. Views upcoming sessions on /mentoring/dashboard
6. At session time: clicks meeting link to join video call
7. After session: booking auto-completes, payment released
8. Views earnings summary and payout history
9. Sees reviews left by students
```

### 3.3 Cancellation and Rescheduling

```
Cancellation Policy:
- 24+ hours before: Full refund (wallet hold released)
- 12-24 hours before: 50% refund
- < 12 hours or no-show: No refund (mentor compensated fully)

Rescheduling:
- Either party can request reschedule
- If 24+ hours before: free reschedule to any available slot
- If < 24 hours: treated as cancellation + new booking

Mentor Cancellation:
- Mentor cancels: always full refund to student
- Repeat mentor cancellations: flagged for admin review
```

---

## 4. Payment and Earnings Flow

### 4.1 Booking Payment (Student Side)

```
Student books session
  |
  v
System checks wallet balance >= session cost
  |
  v
WalletHold created (status: active, amount: session cost)
  |
  v
MentorBooking created (status: scheduled)
  |
  [Session happens]
  |
  v
Session completed → WalletHold captured → WalletTransaction(debit) created
  |
  v
BillingCharge created (chargeType: mentor_session)
```

### 4.2 Mentor Payout (Mentor Side)

For **internal mentors** (faculty/TA): No payment — sessions are free.

For **paid external mentors**:
```
Session completed
  |
  v
Platform commission deducted (configurable, default 20%)
  |
  v
Mentor's wallet credited with (sessionCost - commission)
  → WalletTransaction(credit, referenceType: mentor_payout, referenceId: bookingId)
  |
  v
Mentor can withdraw via payment gateway (Razorpay payout / manual bank transfer)
  → PaymentTransaction created (type: payout, status: processed)
```

**Example**: Student pays 500 INR for 1hr session. Platform takes 100 INR (20%). Mentor receives 400 INR credited to their wallet.

### 4.3 Subscription Integration

The existing `SubscriptionPlan` already has `mentorSessionsIncluded` and `Subscription` has `mentorSessionsRemaining`. For students with active subscriptions:
- If `mentorSessionsRemaining > 0`: session is "free" (covered by subscription), decrement counter
- If exhausted: fall back to wallet payment

---

## 5. Schema Enhancements Required

The existing 4 models (MentorProfile, MentorAvailabilitySlot, MentorBooking, MentorReview) in `backend/prisma/schema.prisma` are a solid foundation. The following enhancements are needed:

### 5.1 New Enum: MentorBookingStatus

```prisma
enum MentorBookingStatus {
  pending       @map("pending")        // Mentor hasn't confirmed yet (if approval mode)
  scheduled     @map("scheduled")      // Confirmed, upcoming
  in_progress   @map("in_progress")    // Session currently active
  completed     @map("completed")      // Session finished
  cancelled_by_student  @map("cancelled_by_student")
  cancelled_by_mentor   @map("cancelled_by_mentor")
  no_show_student       @map("no_show_student")
  no_show_mentor        @map("no_show_mentor")
  rescheduled           @map("rescheduled")
}
```

### 5.2 MentorProfile Enhancements

Add fields to existing model:
- `mentorType` (enum: internal_faculty, internal_ta, peer_mentor, external_expert)
- `commissionPercent` (Int, default 20 — per-mentor override)
- `maxSessionsPerWeek` (Int, optional — prevent overload)
- `languages` (String[] — spoken languages)
- `linkedinUrl` (String?, optional social proof)
- `isApproved` (Boolean, default false — admin approval gate)
- `approvedAt` (DateTime?)
- `approvedBy` (String? @db.Uuid)
- `bufferMinutes` (Int, default 15 — gap between sessions)
- `sessionDurations` (Int[] — allowed durations e.g. [30, 60])
- `totalEarningsCents` (Int, default 0 — running total)

### 5.3 MentorBooking Enhancements

Change `status` from `String` to the new `MentorBookingStatus` enum. Add fields:
- `walletHoldId` (String? @db.Uuid — FK to WalletHold for pre-auth)
- `cancelledAt` (DateTime?)
- `cancelledBy` (String? @db.Uuid)
- `cancellationReason` (String?)
- `refundAmountCents` (Int?)
- `platformFeeCents` (Int? — commission amount)
- `mentorPayoutCents` (Int? — amount credited to mentor)
- `rescheduledFromId` (String? @db.Uuid — self-referencing FK for reschedule chain)
- `reminderSentAt` (DateTime? — track reminder delivery)
- `sessionStartedAt` (DateTime? — actual start, may differ from scheduledAt)
- `sessionEndedAt` (DateTime? — actual end)

### 5.4 MentorAvailabilitySlot Enhancements

Add fields:
- `isActive` (Boolean, default true — soft toggle)
- `timezone` (String — e.g. "Asia/Kolkata")
- `bufferMinutes` (Int, default 15)

### 5.5 MentorReview Enhancements

Add fields:
- `wouldRebook` (Boolean? — "Would you book again?")
- `goalsMet` (Int? — 1-5 Likert scale)
- `mentorResponse` (String? — mentor can reply to review)
- `mentorRespondedAt` (DateTime?)

### 5.6 New Model: MentorNotificationPreference

```prisma
model MentorNotificationPreference {
  id              String   @id @default(uuid()) @db.Uuid
  mentorProfileId String   @unique @map("mentor_profile_id") @db.Uuid
  emailBooking    Boolean  @default(true) @map("email_booking")
  emailReminder   Boolean  @default(true) @map("email_reminder")
  emailReview     Boolean  @default(true) @map("email_review")

  mentorProfile   MentorProfile @relation(fields: [mentorProfileId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("mentor_notification_preferences")
}
```

---

## 6. Backend Implementation

### 6.1 Module Structure

Create `backend/src/mentoring/` with the standard NestJS pattern:

```
backend/src/mentoring/
  mentoring.module.ts
  mentoring.controller.ts
  mentoring.service.ts
  mentor-booking.service.ts
  mentor-availability.service.ts
  mentor-review.service.ts
  mentor-payout.service.ts
  dto/
    create-mentor-profile.dto.ts
    update-mentor-profile.dto.ts
    set-availability.dto.ts
    create-booking.dto.ts
    cancel-booking.dto.ts
    reschedule-booking.dto.ts
    create-review.dto.ts
    browse-mentors-query.dto.ts
  guards/
    mentor-role.guard.ts         (ensures user has Mentor role)
    booking-owner.guard.ts       (ensures user owns the booking)
```

### 6.2 API Endpoints

**Public/Student Endpoints** (all require `@UseGuards(JwtAuthGuard)`):

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/mentoring/mentors` | Browse/search mentors (filter by expertise, price, rating, availability) |
| GET | `/api/mentoring/mentors/:id` | Get mentor profile with recent reviews |
| GET | `/api/mentoring/mentors/:id/availability` | Get available slots for a date range |
| POST | `/api/mentoring/bookings` | Create a booking (triggers wallet hold) |
| GET | `/api/mentoring/bookings` | List my bookings (as student or mentor) |
| GET | `/api/mentoring/bookings/:id` | Get booking details |
| PATCH | `/api/mentoring/bookings/:id/cancel` | Cancel booking (applies refund policy) |
| PATCH | `/api/mentoring/bookings/:id/reschedule` | Reschedule to new slot |
| POST | `/api/mentoring/bookings/:id/review` | Submit review after completed session |

**Mentor-Only Endpoints** (require Mentor role guard):

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/mentoring/profile` | Create mentor profile |
| PUT | `/api/mentoring/profile` | Update mentor profile |
| GET | `/api/mentoring/profile` | Get own mentor profile |
| PUT | `/api/mentoring/availability` | Set/update availability slots (bulk replace) |
| GET | `/api/mentoring/dashboard` | Earnings summary, upcoming sessions, stats |
| GET | `/api/mentoring/earnings` | Detailed earnings history |
| POST | `/api/mentoring/reviews/:id/respond` | Respond to a review |

**Admin Endpoints**:

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/mentoring/pending-approvals` | List mentors awaiting approval |
| PATCH | `/api/admin/mentoring/mentors/:id/approve` | Approve mentor |
| PATCH | `/api/admin/mentoring/mentors/:id/reject` | Reject mentor application |
| GET | `/api/admin/mentoring/stats` | Platform-wide mentoring stats |

### 6.3 Key Business Logic

**Booking Creation** (`mentor-booking.service.ts`):
1. Validate slot is still available (no double-booking — atomic check)
2. Validate student has sufficient wallet balance
3. Create WalletHold for session amount
4. Create MentorBooking with status `scheduled`
5. Send confirmation notifications to both parties
6. Schedule reminder emails (24hr and 2hr before via `@nestjs/schedule`)

**Session Completion** (scheduled job or manual trigger):
1. Mark booking as `completed`
2. Capture wallet hold → create WalletTransaction (debit from student)
3. Calculate platform fee and mentor payout
4. Credit mentor's wallet → create WalletTransaction (credit to mentor)
5. Create BillingCharge record
6. Send "leave a review" notification to student

**Availability Conflict Detection**:
1. When student selects a slot, check no existing `scheduled` booking overlaps
2. Account for buffer time between sessions
3. For recurring slots, generate concrete available windows for the requested date range
4. Return only truly open windows (subtract existing bookings from availability)

### 6.4 Scheduled Jobs (via `@nestjs/schedule`)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `sendBookingReminders24h` | Every hour | Send 24hr reminder for tomorrow's bookings |
| `sendBookingReminders2h` | Every 30 min | Send 2hr reminder for upcoming bookings |
| `autoCompleteBookings` | Every 15 min | Mark past bookings as completed, capture holds |
| `handleNoShows` | Every 15 min | Mark no-shows (15min+ past scheduled time, not started) |
| `expireUnconfirmedBookings` | Every hour | Cancel bookings not confirmed within 24hrs (if approval mode) |

---

## 7. Frontend Implementation

### 7.1 New Routes

```
frontend/src/app/(console)/mentoring/
  page.tsx                          → /mentoring (browse mentors)
  [mentorId]/page.tsx               → /mentoring/:mentorId (mentor profile + book)
  bookings/page.tsx                 → /mentoring/bookings (my bookings)
  bookings/[bookingId]/page.tsx     → /mentoring/bookings/:bookingId (booking detail)
  dashboard/page.tsx                → /mentoring/dashboard (mentor's own dashboard)
  dashboard/availability/page.tsx   → /mentoring/dashboard/availability (manage slots)
  dashboard/earnings/page.tsx       → /mentoring/dashboard/earnings
  dashboard/profile/page.tsx        → /mentoring/dashboard/profile (edit mentor profile)
```

### 7.2 Key Pages and Components

**Browse Mentors Page** (`/mentoring`):
- Search bar with expertise tag filters
- Price range filter, rating filter, availability filter (available today/this week)
- Mentor cards: photo, name, headline, expertise badges, rating stars, price, "Book" button
- Sort by: rating, price (low/high), sessions completed, newest
- Component: `components/mentoring/mentor-card.tsx`

**Mentor Profile Page** (`/mentoring/:mentorId`):
- Full profile: bio, expertise, experience, languages
- Stats: avg rating, total sessions, total reviews
- Availability calendar: visual weekly grid showing open slots
- Recent reviews list with star ratings
- "Book Session" CTA → opens booking modal/drawer
- Component: `components/mentoring/mentor-profile.tsx`, `components/mentoring/availability-calendar.tsx`

**Booking Flow** (modal or inline on profile page):
- Step 1: Select duration (30min / 60min)
- Step 2: Pick date → see available slots for that date
- Step 3: Add session notes
- Step 4: Confirm + pay (shows wallet balance, cost breakdown)
- Component: `components/mentoring/booking-wizard.tsx`

**My Bookings Page** (`/mentoring/bookings`):
- Tabs: Upcoming | Past | Cancelled
- Each booking card: mentor info, date/time, status badge, action buttons (join/cancel/reschedule/review)
- Component: `components/mentoring/booking-card.tsx`

**Mentor Dashboard** (`/mentoring/dashboard`):
- Stats cards: total earnings, sessions this month, avg rating, upcoming sessions count
- Upcoming sessions list with student info and notes
- Recent reviews
- Quick actions: edit profile, manage availability
- Component: `components/mentoring/dashboard-stats.tsx`

**Availability Manager** (`/mentoring/dashboard/availability`):
- Weekly grid view (Mon-Sun, hourly blocks)
- Click to toggle slots on/off
- Toggle recurring vs one-off date
- Set buffer time between sessions
- Component: `components/mentoring/availability-grid.tsx`

### 7.3 Sidebar Navigation Update

Add to `frontend/src/components/sidebar-nav.tsx`:
```
Mentoring (icon: GraduationCap or Users)
  ├── Browse Mentors    → /mentoring
  ├── My Bookings       → /mentoring/bookings
  └── Mentor Dashboard  → /mentoring/dashboard  (only if user has Mentor role)
```

### 7.4 API Client Updates

Add to `frontend/src/lib/api.ts`:
- `getMentors(filters)` — browse mentors with query params
- `getMentorProfile(id)` — single mentor detail
- `getMentorAvailability(id, dateRange)` — available slots
- `createBooking(data)` — book a session
- `getMyBookings(filters)` — list bookings
- `cancelBooking(id)` — cancel
- `rescheduleBooking(id, newSlot)` — reschedule
- `submitReview(bookingId, data)` — post-session review
- `getMyMentorProfile()` — mentor's own profile
- `updateMentorProfile(data)` — edit profile
- `updateAvailability(slots)` — set availability
- `getMentorDashboard()` — stats and upcoming
- `getMentorEarnings(dateRange)` — earnings history

---

## 8. Video Call Integration

### 8.1 Recommended Approach: Jitsi Meet (Self-Hosted)

**Why Jitsi**: Aligns with the on-premises philosophy of LaaS. Open-source, free, no per-minute costs, supports recording, screen sharing, and can be deployed on the existing infrastructure.

**Setup**: Deploy Jitsi Meet via Docker Compose on one of the management nodes (or a dedicated lightweight VM).

**Integration Pattern**:
- When a booking is created, generate a unique Jitsi room name: `laas-mentor-{bookingId}`
- Store as `meetingUrl` in MentorBooking: `https://meet.laas.local/laas-mentor-{bookingId}`
- Embed Jitsi in an iframe on the booking detail page, or open as a new tab
- JWT-based room authentication: only the booked student and mentor can join

**Alternative (if self-hosting is too heavy for MVP)**: Use a simple approach where the mentor provides their own meeting link (Google Meet, Zoom) and it's stored in `meetingUrl`. The platform just coordinates scheduling and payments.

### 8.2 Screen Sharing for Code Assistance

- Jitsi has built-in screen sharing
- For MVP, this is sufficient — mentor sees student's screen
- Phase 3 will add direct lab session access (compute-assisted mentoring)

---

## 9. Notification System

### 9.1 Email Notifications (MVP)

Use the existing `backend/src/mail/` module (Nodemailer) with new templates in `backend/templates/`:

| Event | Recipient | Template |
|-------|-----------|----------|
| Booking confirmed | Student + Mentor | `mentor-booking-confirmed.hbs` |
| Booking cancelled | Both parties | `mentor-booking-cancelled.hbs` |
| Booking rescheduled | Both parties | `mentor-booking-rescheduled.hbs` |
| 24hr reminder | Both parties | `mentor-session-reminder.hbs` |
| 2hr reminder with meeting link | Both parties | `mentor-session-starting.hbs` |
| Session completed — leave review | Student | `mentor-leave-review.hbs` |
| New review received | Mentor | `mentor-new-review.hbs` |
| Mentor approved | Mentor | `mentor-approved.hbs` |
| Payout credited | Mentor | `mentor-payout.hbs` |

### 9.2 In-App Notifications

Use the existing `Notification` and `NotificationTemplate` models in the DB. Create notification records for each event above so they appear in the user's notification center.

---

## 10. Phased Delivery Plan

### Phase 1 — MVP Core (Target: ~3-4 weeks)

| Task | Scope | Dependencies |
|------|-------|--------------|
| T1: Schema enhancements | Add enums, new fields to existing models, migrate | None |
| T2: Backend — Mentor profile CRUD | Create mentoring module, profile service, DTOs | T1 |
| T3: Backend — Availability management | Availability service, slot generation logic | T1 |
| T4: Backend — Booking flow | Booking service, wallet hold integration, conflict detection | T1, T2, T3 |
| T5: Backend — Review system | Review service, rating aggregation | T1 |
| T6: Backend — Scheduled jobs | Reminders, auto-complete, no-show detection | T4 |
| T7: Backend — Mentor payout logic | Commission calculation, wallet credit | T4 |
| T8: Backend — Admin endpoints | Mentor approval, platform stats | T2 |
| T9: Frontend — Browse mentors page | Mentor cards, search/filter, sorting | T2, T3 |
| T10: Frontend — Mentor profile page | Full profile, reviews, availability calendar | T2, T3, T5 |
| T11: Frontend — Booking wizard | Date picker, slot selection, payment confirmation | T4 |
| T12: Frontend — My bookings page | Booking list, status tracking, cancel/reschedule actions | T4 |
| T13: Frontend — Mentor dashboard | Stats, upcoming sessions, reviews, earnings | T7, T8 |
| T14: Frontend — Availability manager | Weekly grid, recurring/one-off toggle | T3 |
| T15: Frontend — Sidebar nav + API client | Navigation entries, all API functions | T2 |
| T16: Email templates | All notification templates | T6 |
| T17: Integration testing | End-to-end booking flow, payment, reviews | All above |

### Phase 2 — Enhanced Experience (~2-3 weeks after MVP)

- **Video call embed**: Jitsi Meet deployment + iframe embed on booking page
- **In-app chat**: Socket.io gateway for pre-session messaging between mentor and student
- **Calendar export**: ICS file download for bookings (add to Google Calendar / Outlook)
- **Mentor search improvements**: Full-text search on bio/expertise, "recommended for you" based on student's course enrollment
- **Dispute resolution**: Admin panel for handling booking disputes, refund overrides
- **Mentor analytics**: Session history charts, earning trends (using Recharts)

### Phase 3 — Compute-Assisted Mentoring (~3-4 weeks after Phase 2)

- **"Help Now" button**: Student in an active lab session can request instant mentor help
- **Shared session access**: Mentor gets read-only access to student's Selkies desktop or Jupyter environment via a temporary auth token
- **Joint GPU environment**: Both mentor and student see the same running environment
- **Session recording**: Opt-in recording with consent capture, encrypted storage, auto-expiry
- **Workshop mode**: 1-to-many mentor sessions (group mentoring / live demos)
- **Mentor-in-lab audit trail**: Full logging of mentor access to student environments

---

## 11. Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Video calls | Jitsi Meet (self-hosted) | Free, on-prem, supports recording/screen share, aligns with LaaS infra philosophy |
| Real-time chat | Socket.io (Phase 2) | Already NestJS-compatible, full control, no vendor lock-in |
| Payment | Existing wallet system | Wallet holds already built, Razorpay already integrated |
| Mentor payout | Wallet credit + manual bank transfer | MVP simplicity; Razorpay Payouts API can automate later |
| Calendar | Custom calendar UI (Day.js + grid) | No external API dependency for MVP; ICS export in Phase 2 |
| Scheduling | `@nestjs/schedule` cron jobs | Already installed, sufficient for reminder/completion jobs |
| Commission model | Per-mentor configurable, default 20% | Flexibility for internal (0%) vs external (20%) mentors |
| Mentor approval | Admin gate for external, auto-approve for faculty/TA | Quality control without friction for institutional mentors |
| Meeting URL | Auto-generated Jitsi room URL per booking | Zero-config for users, unique per session |

---

## 12. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Double-booking (race condition) | Use Prisma transaction with SELECT FOR UPDATE on availability check |
| Wallet insufficient at session time | Hold is created at booking time; if hold fails, booking rejected |
| Mentor quality variance | Admin approval gate + review system + flag low-rated mentors |
| No-shows | Pre-payment via wallet hold + multi-reminder emails + clear cancellation policy |
| Timezone confusion | Store all times in UTC, display in user's local timezone (from UserProfile.timezone) |
| Meeting link abuse | JWT-authenticated Jitsi rooms; only booked parties can join |

---

## 13. Files to Create / Modify

**New Files** (Backend):
- `backend/src/mentoring/mentoring.module.ts`
- `backend/src/mentoring/mentoring.controller.ts`
- `backend/src/mentoring/mentoring.service.ts`
- `backend/src/mentoring/mentor-booking.service.ts`
- `backend/src/mentoring/mentor-availability.service.ts`
- `backend/src/mentoring/mentor-review.service.ts`
- `backend/src/mentoring/mentor-payout.service.ts`
- `backend/src/mentoring/dto/*.dto.ts` (8-10 DTO files)
- `backend/src/mentoring/guards/mentor-role.guard.ts`
- `backend/templates/mentor-booking-confirmed.hbs` (+ 8 more templates)

**New Files** (Frontend):
- `frontend/src/app/(console)/mentoring/page.tsx` (+ 6 more route pages)
- `frontend/src/components/mentoring/mentor-card.tsx`
- `frontend/src/components/mentoring/mentor-profile.tsx`
- `frontend/src/components/mentoring/availability-calendar.tsx`
- `frontend/src/components/mentoring/booking-wizard.tsx`
- `frontend/src/components/mentoring/booking-card.tsx`
- `frontend/src/components/mentoring/dashboard-stats.tsx`
- `frontend/src/components/mentoring/availability-grid.tsx`

**Modified Files**:
- `backend/prisma/schema.prisma` — enum + field additions
- `backend/src/app.module.ts` — register MentoringModule
- `frontend/src/lib/api.ts` — add mentoring API functions
- `frontend/src/components/sidebar-nav.tsx` — add mentoring nav entries
- `frontend/src/lib/validations.ts` — add booking/review Zod schemas
