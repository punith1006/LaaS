# LaaS Mentoring Feature — Complete Implementation Plan

---

## 1. Feature Objectives and USP Positioning

**Core Objective**: Build a mentoring marketplace tightly integrated with the LaaS compute platform, enabling students to book 1-on-1 guidance sessions with mentors (faculty, TAs, senior students, external experts) — with shared desktop collaboration, wallet-based payments, and reviews.

**USP Differentiator**: Unlike Codementor, Topmate, or MentorCruise, LaaS mentoring is *compute-assisted from day one* — a mentor joins the student's live Selkies desktop session via a second authenticated WebRTC stream, enabling **shared desktop control** where both parties can type, click, and collaborate simultaneously in the same GPU environment. No competitor (RunPod, Vast.ai, Lambda Cloud) offers this.

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
4. Clicks "Book Session" -> sees calendar with available slots
5. Selects date/time slot + duration (30min or 60min)
6. Chooses session mode:
   a) "Shared Desktop" — mentor joins student's active Selkies session (recommended for code/GPU help)
   b) "Video Only" — standalone Jitsi video call (for conceptual discussions)
7. Adds session notes (what help is needed)
8. System shows price breakdown:
   - Session cost: (rate x duration)
   - Platform fee: included
   - Wallet balance: current
9. Confirms booking -> wallet hold created (amount reserved)
10. Receives confirmation notification (email + in-app)
11. 24hr before: reminder email
12. 2hr before: reminder email with session join instructions
13. At session time:
    - If Shared Desktop: student launches/reconnects compute session, clicks "Invite Mentor"
      -> mentor receives join link -> mentor's browser opens second WebRTC stream to same container
      -> both can type/click/interact simultaneously
      -> student sees "Mentor Connected" indicator + can revoke input control anytime
    - If Video Only: both join Jitsi room via meeting URL
14. Collaborative work happens (shared desktop + voice, or video + screen share)
15. Session ends -> wallet hold captured -> mentor credited
16. Prompted to leave review (1-5 stars + text)
```

### 3.2 Mentor Setting Up and Managing

```
1. User with Mentor role navigates to /mentoring/dashboard
2. Creates/edits mentor profile:
   - Headline, bio, expertise areas (tags)
   - Experience years
   - Hourly rate (in INR, stored as cents)
   - Profile photo (uses existing user profile)
   - Supported session modes (shared desktop, video only, or both)
3. Sets availability:
   - Recurring weekly slots (e.g., Mon/Wed/Fri 6-8pm)
   - One-off specific date slots
   - Buffer time between sessions (default 15min)
4. Receives booking notification when student books
5. Views upcoming sessions on /mentoring/dashboard
6. At session time:
   - Shared Desktop mode: receives join link -> opens student's Selkies session in browser
     -> full input control (type, click, navigate) alongside student
   - Video Only mode: clicks Jitsi meeting link
7. After session: booking auto-completes, payment released
8. Views earnings summary and payout history
9. Sees reviews left by students
```

### 3.3 Collaborative Session Flow (Shared Desktop)

```
PREREQUISITE: Student has an active compute session (Selkies desktop running)

1. Student clicks "Start Mentoring Session" on their booking card
   -> Backend generates a time-limited mentor access token (JWT, 90-min TTL)
   -> Token grants the mentor a second WebRTC connection to the same Selkies container
   -> Token stored in MentorBooking.mentorAccessToken

2. Mentor receives notification with a "Join Session" link
   -> Link opens: /mentoring/session/{bookingId}
   -> Frontend authenticates mentor, retrieves access token
   -> Initiates WebRTC connection to student's Selkies container using the token

3. DURING SESSION:
   - Both see the same desktop in real-time (shared framebuffer via WebRTC)
   - Both can type and click (dual input channels to the container)
   - Student has a control panel:
     [Revoke Mentor Input] — instantly disables mentor's keyboard/mouse
     [End Session] — disconnects mentor and ends the mentoring booking
   - Mentor has an overlay indicator showing they are connected
   - Built-in voice chat via Selkies audio channel (or fallback to Jitsi for video)
   - All mentor actions logged (audit trail: keystrokes meta, mouse regions, timestamps)

4. SESSION END:
   - Either party clicks "End Session", or timer expires
   - Mentor's WebRTC connection terminated, access token revoked
   - Student's compute session continues unaffected
   - Booking marked as completed, payment processed
```

### 3.4 Cancellation and Rescheduling

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
Session completed -> WalletHold captured -> WalletTransaction(debit) created
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
  -> WalletTransaction(credit, referenceType: mentor_payout, referenceId: bookingId)
  |
  v
Mentor can withdraw via payment gateway (Razorpay payout / manual bank transfer)
  -> PaymentTransaction created (type: payout, status: processed)
```

**Example**: Student pays 500 INR for 1hr session. Platform takes 100 INR (20%). Mentor receives 400 INR credited to their wallet.

### 4.3 Subscription Integration

The existing `SubscriptionPlan` already has `mentorSessionsIncluded` and `Subscription` has `mentorSessionsRemaining`. For students with active subscriptions:
- If `mentorSessionsRemaining > 0`: session is "free" (covered by subscription), decrement counter
- If exhausted: fall back to wallet payment

---

## 5. Schema Enhancements Required

The existing 4 models (MentorProfile, MentorAvailabilitySlot, MentorBooking, MentorReview) in `backend/prisma/schema.prisma` are a solid foundation. The following enhancements are needed:

### 5.1 New Enums

```prisma
enum MentorBookingStatus {
  pending                @map("pending")
  scheduled              @map("scheduled")
  in_progress            @map("in_progress")
  completed              @map("completed")
  cancelled_by_student   @map("cancelled_by_student")
  cancelled_by_mentor    @map("cancelled_by_mentor")
  no_show_student        @map("no_show_student")
  no_show_mentor         @map("no_show_mentor")
  rescheduled            @map("rescheduled")
}

enum MentorSessionMode {
  shared_desktop   @map("shared_desktop")   // Mentor joins student's Selkies session
  video_only       @map("video_only")       // Standalone Jitsi video call
}

enum MentorType {
  internal_faculty   @map("internal_faculty")
  internal_ta        @map("internal_ta")
  peer_mentor        @map("peer_mentor")
  external_expert    @map("external_expert")
}
```

### 5.2 MentorProfile Enhancements

Add fields to existing model:
- `mentorType` (MentorType enum)
- `commissionPercent` (Int, default 20 — per-mentor override)
- `maxSessionsPerWeek` (Int, optional — prevent overload)
- `languages` (String[] — spoken languages)
- `linkedinUrl` (String?, optional social proof)
- `isApproved` (Boolean, default false — admin approval gate)
- `approvedAt` (DateTime?)
- `approvedBy` (String? @db.Uuid)
- `bufferMinutes` (Int, default 15 — gap between sessions)
- `sessionDurations` (Int[] — allowed durations e.g. [30, 60])
- `supportedModes` (MentorSessionMode[] — which session modes the mentor supports)
- `totalEarningsCents` (Int, default 0 — running total)

### 5.3 MentorBooking Enhancements

Change `status` from `String` to the new `MentorBookingStatus` enum. Add fields:
- `sessionMode` (MentorSessionMode — shared_desktop or video_only)
- `computeSessionId` (String? @db.Uuid — FK to Session, links to the student's active compute session when shared_desktop mode)
- `mentorAccessToken` (String? — time-limited JWT for mentor's Selkies WebRTC connection)
- `mentorAccessGrantedAt` (DateTime? — when student invited mentor)
- `mentorAccessRevokedAt` (DateTime? — when access was revoked/session ended)
- `walletHoldId` (String? @db.Uuid — FK to WalletHold for pre-auth)
- `cancelledAt` (DateTime?)
- `cancelledBy` (String? @db.Uuid)
- `cancellationReason` (String?)
- `refundAmountCents` (Int?)
- `platformFeeCents` (Int? — commission amount)
- `mentorPayoutCents` (Int? — amount credited to mentor)
- `rescheduledFromId` (String? @db.Uuid — self-referencing FK for reschedule chain)
- `reminderSentAt` (DateTime? — track reminder delivery)
- `sessionStartedAt` (DateTime? — actual start)
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

### 5.6 New Model: MentorSessionAuditLog (Append-Only)

Tracks all mentor actions during shared desktop sessions for academic integrity and security.

```prisma
model MentorSessionAuditLog {
  id              String   @id @default(uuid()) @db.Uuid
  mentorBookingId String   @map("mentor_booking_id") @db.Uuid
  mentorUserId    String   @map("mentor_user_id") @db.Uuid
  eventType       String   @map("event_type") @db.VarChar(64)
    // Values: connected, disconnected, input_granted, input_revoked,
    //         mouse_active, keyboard_active, file_accessed
  metadata        Json?    @map("metadata")
  clientIp        String?  @map("client_ip") @db.VarChar(45)
  createdAt       DateTime @default(now()) @map("created_at")

  mentorBooking   MentorBooking @relation(fields: [mentorBookingId], references: [id])
  mentorUser      User          @relation("MentorSessionAuditor", fields: [mentorUserId], references: [id])

  @@index([mentorBookingId])
  @@index([mentorUserId])
  @@map("mentor_session_audit_logs")
}
```

### 5.7 New Model: MentorNotificationPreference

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

```
backend/src/mentoring/
  mentoring.module.ts
  mentoring.controller.ts
  mentoring.service.ts
  mentor-booking.service.ts
  mentor-availability.service.ts
  mentor-review.service.ts
  mentor-payout.service.ts
  mentor-session.service.ts          # NEW: Handles shared desktop access token generation, Selkies integration
  dto/
    create-mentor-profile.dto.ts
    update-mentor-profile.dto.ts
    set-availability.dto.ts
    create-booking.dto.ts
    cancel-booking.dto.ts
    reschedule-booking.dto.ts
    create-review.dto.ts
    browse-mentors-query.dto.ts
    grant-session-access.dto.ts      # NEW: For shared desktop token generation
  guards/
    mentor-role.guard.ts
    booking-owner.guard.ts
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

**Collaborative Session Endpoints** (for shared desktop):

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/mentoring/bookings/:id/grant-access` | Student invites mentor — generates time-limited Selkies access token |
| DELETE | `/api/mentoring/bookings/:id/revoke-access` | Student revokes mentor input control (keeps view, kills input) |
| GET | `/api/mentoring/bookings/:id/session-info` | Mentor fetches Selkies connection details (WebRTC endpoint, token) |
| POST | `/api/mentoring/bookings/:id/end-session` | Either party ends the collaborative session |

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
1. Validate slot is still available (no double-booking -- atomic check)
2. Validate student has sufficient wallet balance
3. Create WalletHold for session amount
4. Create MentorBooking with status `scheduled` and chosen `sessionMode`
5. Send confirmation notifications to both parties
6. Schedule reminder emails (24hr and 2hr before via `@nestjs/schedule`)

**Shared Desktop Access Grant** (`mentor-session.service.ts`):
1. Validate booking is `scheduled` or `in_progress` and session time is now (within grace window)
2. Validate student has an active compute session (`Session` with status `running`)
3. Generate a time-limited JWT (90-min TTL) containing: `bookingId`, `mentorUserId`, `computeSessionId`, `containerName`, `selkiesPort`
4. Store token in MentorBooking.mentorAccessToken
5. The mentor's frontend uses this token to establish a second WebRTC connection to the same Selkies container
6. Log `connected` event in MentorSessionAuditLog
7. Update booking status to `in_progress`

**Selkies Multi-User Access**:
- Selkies-GStreamer supports multiple WebRTC connections to the same container
- The session orchestrator (Python FastAPI) needs a thin endpoint that accepts the mentor's JWT and proxies the WebRTC signaling to the correct container
- Mentor's input events (keyboard/mouse) are forwarded to the container alongside the student's
- Input revocation = stop forwarding the mentor's input channel (server-side filter)

**Session Completion** (scheduled job or manual trigger):
1. Revoke mentor access token, disconnect mentor's WebRTC stream
2. Mark booking as `completed`
3. Capture wallet hold -> create WalletTransaction (debit from student)
4. Calculate platform fee and mentor payout
5. Credit mentor's wallet -> create WalletTransaction (credit to mentor)
6. Create BillingCharge record
7. Send "leave a review" notification to student

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
| `revokeExpiredAccessTokens` | Every 5 min | Clean up expired mentor access tokens, disconnect stale sessions |

---

## 7. Frontend Implementation

### 7.1 New Routes

```
frontend/src/app/(console)/mentoring/
  page.tsx                          -> /mentoring (browse mentors)
  [mentorId]/page.tsx               -> /mentoring/:mentorId (mentor profile + book)
  bookings/page.tsx                 -> /mentoring/bookings (my bookings)
  bookings/[bookingId]/page.tsx     -> /mentoring/bookings/:bookingId (booking detail + session join)
  session/[bookingId]/page.tsx      -> /mentoring/session/:bookingId (collaborative session view)
  dashboard/page.tsx                -> /mentoring/dashboard (mentor's own dashboard)
  dashboard/availability/page.tsx   -> /mentoring/dashboard/availability (manage slots)
  dashboard/earnings/page.tsx       -> /mentoring/dashboard/earnings
  dashboard/profile/page.tsx        -> /mentoring/dashboard/profile (edit mentor profile)
```

### 7.2 Key Pages and Components

**Browse Mentors Page** (`/mentoring`):
- Search bar with expertise tag filters
- Price range filter, rating filter, availability filter (available today/this week)
- Session mode badges on mentor cards (supports "Shared Desktop", "Video Only", or both)
- Mentor cards: photo, name, headline, expertise badges, rating stars, price, "Book" button
- Sort by: rating, price (low/high), sessions completed, newest
- Component: `components/mentoring/mentor-card.tsx`

**Mentor Profile Page** (`/mentoring/:mentorId`):
- Full profile: bio, expertise, experience, languages, supported session modes
- Stats: avg rating, total sessions, total reviews
- Availability calendar: visual weekly grid showing open slots
- Recent reviews list with star ratings
- "Book Session" CTA -> opens booking modal/drawer
- Component: `components/mentoring/mentor-profile.tsx`, `components/mentoring/availability-calendar.tsx`

**Booking Flow** (modal or inline on profile page):
- Step 1: Select session mode (Shared Desktop / Video Only)
- Step 2: Select duration (30min / 60min)
- Step 3: Pick date -> see available slots for that date
- Step 4: Add session notes
- Step 5: Confirm + pay (shows wallet balance, cost breakdown)
- Component: `components/mentoring/booking-wizard.tsx`

**Collaborative Session Page** (`/mentoring/session/:bookingId`) -- KEY NEW PAGE:
- **Student View**:
  - Embedded Selkies WebRTC stream of their own session (or uses existing instance tab)
  - "Invite Mentor" button -> calls grant-access API -> shows "Waiting for mentor..."
  - Once mentor connects: "Mentor Connected" indicator (green dot + name)
  - Control panel: [Revoke Input] [End Mentoring Session]
  - Session timer showing elapsed time
  - Optional: side-panel voice/video via Jitsi for face-to-face overlay
- **Mentor View**:
  - "Join Session" button -> fetches session-info -> establishes WebRTC connection
  - Sees and controls the student's desktop in real-time
  - Indicator: "Connected to [Student Name]'s session"
  - Control panel: [End Session] [Request Input] (if input was revoked)
  - Optional: voice/video sidebar via Jitsi
- Component: `components/mentoring/collaborative-session.tsx`, `components/mentoring/session-controls.tsx`

**My Bookings Page** (`/mentoring/bookings`):
- Tabs: Upcoming | Past | Cancelled
- Each booking card: mentor info, date/time, status badge, session mode badge, action buttons (join/cancel/reschedule/review)
- For Shared Desktop bookings: "Start Session" button appears when compute session is running
- Component: `components/mentoring/booking-card.tsx`

**Mentor Dashboard** (`/mentoring/dashboard`):
- Stats cards: total earnings, sessions this month, avg rating, upcoming sessions count
- Upcoming sessions list with student info, notes, and session mode
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
  |-- Browse Mentors    -> /mentoring
  |-- My Bookings       -> /mentoring/bookings
  +-- Mentor Dashboard  -> /mentoring/dashboard  (only if user has Mentor role)
```

### 7.4 API Client Updates

Add to `frontend/src/lib/api.ts`:
- `getMentors(filters)` -- browse mentors with query params
- `getMentorProfile(id)` -- single mentor detail
- `getMentorAvailability(id, dateRange)` -- available slots
- `createBooking(data)` -- book a session (includes sessionMode)
- `getMyBookings(filters)` -- list bookings
- `cancelBooking(id)` -- cancel
- `rescheduleBooking(id, newSlot)` -- reschedule
- `submitReview(bookingId, data)` -- post-session review
- `grantMentorAccess(bookingId)` -- generate Selkies access token for mentor
- `revokeMentorAccess(bookingId)` -- revoke mentor's input
- `getMentorSessionInfo(bookingId)` -- mentor fetches WebRTC connection details
- `endMentoringSession(bookingId)` -- end collaborative session
- `getMyMentorProfile()` -- mentor's own profile
- `updateMentorProfile(data)` -- edit profile
- `updateAvailability(slots)` -- set availability
- `getMentorDashboard()` -- stats and upcoming
- `getMentorEarnings(dateRange)` -- earnings history

---

## 8. Communication Infrastructure

### 8.1 Primary: Selkies Shared Desktop (Compute-Assisted Sessions)

The student's compute session already uses Selkies-GStreamer for WebRTC desktop streaming. For mentor collaboration:

**Architecture**:
```
Student Browser  -->  [WebRTC]  -->  Selkies-GStreamer  -->  Container
Mentor Browser   -->  [WebRTC]  -->  Selkies-GStreamer  -->  (same Container)
```

**How it works**:
- Selkies-GStreamer supports multiple concurrent WebRTC peer connections
- The session orchestrator (Python FastAPI at `host-services/session-orchestration/`) manages the signaling
- When student grants access, backend generates a mentor-specific auth token
- Mentor's browser connects to the same Selkies signaling endpoint with the token
- Both receive the same video stream (shared framebuffer)
- Both can send input events (keyboard/mouse) to the container

**Input Control**:
- Default: both student and mentor have simultaneous input
- Student can revoke mentor input via API call -> server stops forwarding mentor's input events
- This is a server-side filter on the input channel, not a client-side toggle

**Session Orchestrator Changes** (`host-services/session-orchestration/`):
- Add endpoint: `POST /mentor-connect` — validates mentor token, sets up second WebRTC peer
- Add endpoint: `POST /mentor-disconnect` — tears down mentor's WebRTC connection
- Add endpoint: `POST /mentor-input-toggle` — enable/disable mentor's input forwarding
- Add WebRTC signaling relay for mentor's connection

### 8.2 Secondary: Jitsi Meet (Video-Only Mode + Voice Overlay)

For sessions where shared desktop isn't needed, or as a voice/video overlay during shared desktop:

**Setup**: Deploy Jitsi Meet via Docker Compose on management infrastructure.

**Integration**:
- Auto-generate room: `laas-mentor-{bookingId}`
- Store as `meetingUrl` in MentorBooking
- JWT-authenticated rooms (only booked parties can join)
- Embed via iframe or open in new tab

### 8.3 Voice During Shared Desktop

During shared desktop sessions, voice communication options (in priority order):
1. **Selkies audio channel**: Selkies supports audio forwarding — use the same WebRTC connection for voice
2. **Jitsi overlay**: Open a small Jitsi video/voice panel alongside the shared desktop view
3. **Browser-native**: Use the Web Audio API for a simple peer-to-peer voice channel

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
| 2hr reminder with session instructions | Both parties | `mentor-session-starting.hbs` |
| Mentor invited to session | Mentor | `mentor-session-invite.hbs` |
| Session completed — leave review | Student | `mentor-leave-review.hbs` |
| New review received | Mentor | `mentor-new-review.hbs` |
| Mentor approved | Mentor | `mentor-approved.hbs` |
| Payout credited | Mentor | `mentor-payout.hbs` |

### 9.2 In-App Notifications

Use the existing `Notification` and `NotificationTemplate` models in the DB.

---

## 10. Phased Delivery Plan

### Phase 1 -- MVP Core with Shared Desktop (Target: ~4-5 weeks)

| Task | Scope | Dependencies |
|------|-------|--------------|
| T1: Schema enhancements | Add enums, new fields, new models (MentorSessionAuditLog, MentorNotificationPreference), migrate | None |
| T2: Backend -- Mentor profile CRUD | Create mentoring module, profile service, DTOs | T1 |
| T3: Backend -- Availability management | Availability service, slot generation logic | T1 |
| T4: Backend -- Booking flow | Booking service, wallet hold integration, conflict detection, session mode support | T1, T2, T3 |
| T5: Backend -- Review system | Review service, rating aggregation | T1 |
| T6: Backend -- Scheduled jobs | Reminders, auto-complete, no-show detection, token cleanup | T4 |
| T7: Backend -- Mentor payout logic | Commission calculation, wallet credit | T4 |
| T8: Backend -- Admin endpoints | Mentor approval, platform stats | T2 |
| T9: Backend -- Shared desktop access service | Token generation, revocation, session-info endpoint, audit logging | T1, T4 |
| T10: Session orchestrator -- Mentor WebRTC relay | Add mentor-connect/disconnect/input-toggle endpoints to Python FastAPI service | T9 |
| T11: Frontend -- Browse mentors page | Mentor cards, search/filter, sorting, session mode badges | T2, T3 |
| T12: Frontend -- Mentor profile page | Full profile, reviews, availability calendar | T2, T3, T5 |
| T13: Frontend -- Booking wizard | Mode selection, date picker, slot selection, payment confirmation | T4 |
| T14: Frontend -- My bookings page | Booking list, status tracking, cancel/reschedule, "Start Session" for shared desktop | T4 |
| T15: Frontend -- Collaborative session page | Selkies WebRTC embed for mentor, student control panel, connection status, session timer | T9, T10 |
| T16: Frontend -- Mentor dashboard | Stats, upcoming sessions, reviews, earnings | T7, T8 |
| T17: Frontend -- Availability manager | Weekly grid, recurring/one-off toggle | T3 |
| T18: Frontend -- Sidebar nav + API client | Navigation entries, all API functions | T2 |
| T19: Email templates | All notification templates | T6 |
| T20: Integration testing | End-to-end: booking -> shared desktop -> payment -> review | All above |

### Phase 2 -- Enhanced Experience (~2-3 weeks after MVP)

- **Jitsi deployment**: Self-hosted Jitsi for video-only sessions and voice overlay during shared desktop
- **In-app chat**: Socket.io gateway for pre-session messaging between mentor and student
- **Calendar export**: ICS file download for bookings (add to Google Calendar / Outlook)
- **Mentor search improvements**: Full-text search on bio/expertise, "recommended for you" based on student's course enrollment
- **Dispute resolution**: Admin panel for handling booking disputes, refund overrides
- **Mentor analytics**: Session history charts, earning trends (using Recharts)
- **"Help Now" button**: Student in an active lab session can request instant mentor help (available mentors notified in real-time)

### Phase 3 -- Advanced Features (~3-4 weeks after Phase 2)

- **Session recording**: Opt-in recording with consent capture, encrypted storage, auto-expiry
- **Workshop mode**: 1-to-many mentor sessions (group mentoring / live demos)
- **Group mentoring rooms**: Multiple students + mentor in shared environment
- **Mentor verification tiers**: LinkedIn/GitHub verification badges, certificate upload
- **AI session summaries**: Auto-generate session summary and action items from activity logs
- **Mentor leaderboard**: Gamification for top mentors (most sessions, highest rated)

---

## 11. Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Collaborative sessions | Selkies multi-user WebRTC | Already the session delivery mechanism; adding a second peer is natural and free |
| Video-only fallback | Jitsi Meet (self-hosted, Phase 2) | Free, on-prem, supports recording/screen share |
| Voice during shared desktop | Selkies audio channel (primary) | Same WebRTC connection, no extra infra |
| Real-time chat | Socket.io (Phase 2) | Already NestJS-compatible, full control |
| Payment | Existing wallet system | Wallet holds already built, Razorpay integrated |
| Mentor payout | Wallet credit + manual bank transfer | MVP simplicity; Razorpay Payouts API later |
| Calendar | Custom calendar UI (Day.js + grid) | No external API dependency for MVP |
| Scheduling | `@nestjs/schedule` cron jobs | Already installed, sufficient for reminders |
| Commission model | Per-mentor configurable, default 20% | Flexibility for internal (0%) vs external (20%) |
| Mentor approval | Admin gate for external, auto-approve for faculty/TA | Quality control without friction |
| Input control | Server-side input filtering | Student can instantly revoke mentor input; secure by default |
| Audit logging | Append-only MentorSessionAuditLog | Academic integrity; track all mentor actions in student environments |

---

## 12. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Double-booking (race condition) | Use Prisma transaction with SELECT FOR UPDATE on availability check |
| Wallet insufficient at session time | Hold is created at booking time; if hold fails, booking rejected |
| Mentor quality variance | Admin approval gate + review system + flag low-rated mentors |
| No-shows | Pre-payment via wallet hold + multi-reminder emails + clear cancellation policy |
| Timezone confusion | Store all times in UTC, display in user's local timezone (from UserProfile.timezone) |
| Mentor accessing student data outside session | Time-limited JWT tokens (90-min TTL) + auto-revocation on session end + server-side access control |
| Mentor taking destructive actions in student env | Student can instantly revoke input; all actions audit-logged; student retains primary control |
| Selkies multi-user WebRTC stability | Test concurrent connections thoroughly; implement reconnection logic; fallback to video-only |
| Session orchestrator integration complexity | Keep the mentor relay lightweight; reuse existing Selkies signaling infra |
| Academic integrity concerns | Full audit trail of mentor's session access; admin can review logs |

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
- `backend/src/mentoring/mentor-session.service.ts` (shared desktop access management)
- `backend/src/mentoring/dto/*.dto.ts` (9-10 DTO files)
- `backend/src/mentoring/guards/mentor-role.guard.ts`
- `backend/templates/mentor-*.hbs` (10 email templates)

**New Files** (Frontend):
- `frontend/src/app/(console)/mentoring/page.tsx` (+ 7 more route pages)
- `frontend/src/components/mentoring/mentor-card.tsx`
- `frontend/src/components/mentoring/mentor-profile.tsx`
- `frontend/src/components/mentoring/availability-calendar.tsx`
- `frontend/src/components/mentoring/booking-wizard.tsx`
- `frontend/src/components/mentoring/booking-card.tsx`
- `frontend/src/components/mentoring/collaborative-session.tsx` (Selkies WebRTC embed + controls)
- `frontend/src/components/mentoring/session-controls.tsx` (invite/revoke/end controls)
- `frontend/src/components/mentoring/dashboard-stats.tsx`
- `frontend/src/components/mentoring/availability-grid.tsx`

**Modified Files**:
- `backend/prisma/schema.prisma` -- enums + field additions + new models
- `backend/src/app.module.ts` -- register MentoringModule
- `frontend/src/lib/api.ts` -- add mentoring API functions
- `frontend/src/components/sidebar-nav.tsx` -- add mentoring nav entries
- `frontend/src/lib/validations.ts` -- add booking/review Zod schemas
- `host-services/session-orchestration/` -- add mentor WebRTC relay endpoints
