# Mentorship Feature Implementation Plan

## 1. Feature Objectives

**Core USP:** Enable students to book 1:1 AI mentorship sessions with verified experts, seamlessly integrated into the LaaS platform with built-in scheduling, video calls, and payment handling.

### Key Outcomes
- Mentors can monetize their expertise with automated booking/payouts
- Students discover and book mentors based on expertise/rating/price
- Video sessions happen entirely within the platform
- Platform retains commission from each booking
- Admin oversight for verification and dispute resolution

---

## 2. Existing Schema Assets

The following models are already defined in `backend/prisma/schema.prisma`:
- **MentorProfile** - Core mentor profile with pricing, rating, expertise
- **MentorAvailabilitySlot** - Recurring/specific availability slots
- **MentorBooking** - Session booking with payment link
- **MentorReview** - Post-session reviews

---

## 3. User Journeys

### 3.1 Mentor Flow
```
Become a Mentor → Profile Setup → Set Availability → Manage Bookings → Conduct Sessions → Receive Payouts
```

### 3.2 Student Flow
```
Browse Mentors → View Profile/Reviews → Check Availability → Book Session → Pay → Join Video Call → Leave Review
```

---

## 4. Feature Modules

### 4.1 Mentor Onboarding & Profile
**Backend:** `backend/src/mentorship/mentor.module.ts`, `mentor.service.ts`, `mentor.controller.ts`

**Schema Extensions:**
```prisma
model MentorProfile {
  // ... existing fields ...
  stripeConnectAccountId String?  @map("stripe_connect_account_id")
  avatarUrl              String?  @map("avatar_url")
  linkedinUrl            String?  @map("linkedin_url")
  verificationStatus     MentorVerificationStatus @default(PENDING)
  maxSessionsPerDay     Int      @default(5) @map("max_sessions_per_day")
}

model MentorSessionCredit {
  id                String   @id @default(uuid()) @db.Uuid
  mentorProfileId   String   @map("mentor_profile_id") @db.Uuid
  creditsEarned     Int      @default(0) @map("credits_earned")
  creditsWithdrawn  Int      @default(0) @map("credits_withdrawn")
  pendingCredits    Int      @default(0) @map("pending_credits")
  lastPayoutAt      DateTime? @map("last_payout_at")
  updatedAt         DateTime @updatedAt
}
```

**Features:**
- "Become a Mentor" application form (bio, expertise areas, hourly rate)
- Profile editing (headline, bio, expertise tags, pricing)
- Availability management (weekly recurring slots + specific date overrides)
- Dashboard showing upcoming sessions, earnings, reviews
- Stripe Connect onboarding for payout receiving

### 4.2 Mentor Discovery & Search
**Frontend:** `frontend/src/app/(dashboard)/mentors/page.tsx`, `components/mentor-card.tsx`, `components/mentor-filters.tsx`

**Features:**
- Mentor listing page with cards (photo, name, headline, rating, price)
- Filter by: expertise area, price range, rating, availability
- Sort by: rating, price, sessions count
- Mentor detail page with full bio, reviews, availability calendar
- Search by name/expertise

### 4.3 Booking System
**Backend:** `backend/src/mentorship/booking.service.ts`, `booking.controller.ts`

**Schema Extensions:**
```prisma
model MentorBooking {
  // ... existing fields ...
  meetingRoomId     String?  @map("meeting_room_id")
  jitsiRoomName    String?  @map("jitsi_room_name")
  preparationNotes String?  @map("preparation_notes") // mentor's notes to student
  cancellationReason String? @map("cancellation_reason")
  cancelledBy      String?  @map("cancelled_by") @db.Uuid
  cancelledAt      DateTime? @map("cancelled_at")
  
  mentorPayoutId   String?  @map("mentor_payout_id") @db.Uuid
  platformFeeCents Int      @default(0) @map("platform_fee_cents")
  
  // Extend status enum to include: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
}

model MentorPayout {
  id                String   @id @default(uuid()) @db.Uuid
  mentorProfileId   String   @map("mentor_profile_id") @db.Uuid
  mentorBookingId   String?  @map("mentor_booking_id") @db.Uuid
  amountCents       Int      @map("amount_cents")
  stripeTransferId  String?  @map("stripe_transfer_id")
  status            PayoutStatus
  processedAt       DateTime? @map("processed_at")
  createdAt         DateTime @default(now())
}
```

**Features:**
- Real-time availability check (query available slots)
- Booking request with optional notes
- Instant confirmation if payment succeeds
- Wallet-based payment (deduct from student's wallet)
- 24-hour cancellation policy (refund calculation)
- Automatic slot blocking on booking

### 4.4 Video Session Integration
**Backend:** `backend/src/mentorship/session.service.ts`

**Jitsi Meet Integration:**
```typescript
// Generate unique room name per booking
generateJitsiRoom(bookingId: string): string {
  return `laas-mentorship-${bookingId}-${Date.now()}`;
}

// Embed URL format
const jitsiUrl = `https://meet.lambdacloud.in/{roomName}?jwt={token}`;
```

**Features:**
- Auto-generate Jitsi room when booking is confirmed
- Join button visible 10 minutes before session start
- Session timer showing remaining time
- End session button (mentor or student)
- Session recording option (opt-in)
- Post-session redirect to review form

### 4.5 Messaging & Communication
**Schema Extensions:**
```prisma
model MentorConversation {
  id                String   @id @default(uuid()) @db.Uuid
  mentorBookingId   String?  @unique @map("mentor_booking_id") @db.Uuid
  mentorId          String   @map("mentor_id") @db.Uuid
  studentId        String   @map("student_id") @db.Uuid
  lastMessageAt    DateTime @default(now()) @map("last_message_at")
  createdAt         DateTime @default(now())
}

model MentorMessage {
  id                String   @id @default(uuid()) @db.Uuid
  conversationId   String   @map("conversation_id") @db.Uuid
  senderId         String   @map("sender_id") @db.Uuid
  messageType      MessageType @default(TEXT)
  content          String
  attachmentUrl    String?  @map("attachment_url")
  readAt           DateTime? @map("read_at")
  createdAt        DateTime @default(now())
}
```

**Features:**
- In-app messaging between mentor and student (per booking)
- Pre-session prep notes from mentor
- Post-session summary/follow-up
- Unread message indicators
- Email notifications for new messages

### 4.6 Reviews & Ratings
**Backend:** `backend/src/mentorship/review.service.ts`

**Features:**
- Star rating (1-5) + written review
- Review only unlocked after session completion
- Mentor can respond to review (1:1)
- Display reviews on mentor profile
- Update mentor avgRating/totalReviews on new review
- Flag inappropriate reviews (admin)

### 4.7 Payments & Payouts
**Backend:** `backend/src/mentorship/payment.service.ts`

**Payment Flow:**
```
Student books → Wallet deduction → Payment held by platform
               → Session completed → Mentor receives (amount - platform fee)
                                    → Platform fee retained
```

**Platform Fee Structure:**
- Default: 20% platform commission
- Configurable per mentor tier

**Stripe Connect Integration:**
```typescript
interface PayoutFlow {
  // On booking confirmation
  platformFee = amountCents * 0.20;
  mentorShare = amountCents - platformFee;
  
  // On session completion
  Create Stripe Transfer to mentor's Connect account
  Record MentorPayout
}
```

**Features:**
- Wallet-based payment (existing infrastructure)
- Automatic commission calculation
- Weekly/monthly payout automation via cron
- Manual payout request option
- Payout history for mentors

### 4.8 Notifications
**Notification Templates:**
| Template Slug | Trigger | Channels |
|---|---|---|
| mentor_booking_requested | Student books mentor | Email, In-app |
| mentor_booking_confirmed | Payment confirmed | Email, In-app |
| mentor_booking_reminder_1h | 1 hour before session | Email, In-app |
| mentor_booking_reminder_24h | 24 hours before session | Email, In-app |
| mentor_session_started | Session joinable | Email, In-app |
| mentor_session_ended | Session completed | Email |
| mentor_review_received | Student leaves review | Email |
| mentor_payout_processed | Payout transferred | Email |

---

## 5. Frontend Pages

| Route | Component | Purpose |
|---|---|---|
| `/mentors` | `mentors/page.tsx` | Browse & search mentors |
| `/mentors/[id]` | `mentor-detail/page.tsx` | Mentor profile & booking |
| `/dashboard/mentors/bookings` | `bookings/page.tsx` | View upcoming/past bookings |
| `/dashboard/mentor/profile` | `profile/page.tsx` | Edit mentor profile |
| `/dashboard/mentor/availability` | `availability/page.tsx` | Manage availability |
| `/dashboard/mentor/earnings` | `earnings/page.tsx` | View earnings & payouts |
| `/dashboard/mentor/reviews` | `reviews/page.tsx` | View received reviews |
| `/session/mentorship/[id]` | `mentorship-session/page.tsx` | Video call page |

---

## 6. Backend Module Structure

```
backend/src/mentorship/
├── mentorship.module.ts      # Root module
├── mentorship.service.ts    # Core business logic
├── mentor.service.ts        # Mentor profile/availability
├── booking.service.ts       # Booking lifecycle
├── session.service.ts       # Video session management
├── payment.service.ts       # Payment/payout handling
├── review.service.ts        # Reviews & ratings
├── messaging.service.ts     # In-app messaging
├── dto/
│   ├── create-mentor-profile.dto.ts
│   ├── update-availability.dto.ts
│   ├── create-booking.dto.ts
│   └── create-review.dto.ts
└── controllers/
    ├── mentor.controller.ts
    ├── booking.controller.ts
    ├── session.controller.ts
    └── review.controller.ts
```

---

## 7. Cron Jobs & Background Tasks

| Job | Schedule | Purpose |
|---|---|---|
| `ProcessMentorPayouts` | Daily 00:00 | Execute pending Stripe transfers |
| `BlockExpiredSlots` | Every 15 min | Block slots where booking expired |
| `CompleteStaleSessions` | Every 5 min | Mark sessions as COMPLETED if ended |
| `SendSessionReminders` | Every 15 min | Send 24h/1h reminders |

---

## 8. API Endpoints

### Mentor Management
- `GET /api/mentors` - List mentors (filterable)
- `GET /api/mentors/:id` - Get mentor profile
- `POST /api/mentors/profile` - Create/update profile
- `GET /api/mentors/:id/availability` - Get available slots
- `POST /api/mentors/availability` - Add availability slot
- `DELETE /api/mentors/availability/:slotId` - Remove slot

### Booking
- `GET /api/mentor-bookings` - List user's bookings
- `POST /api/mentor-bookings` - Create booking
- `GET /api/mentor-bookings/:id` - Get booking details
- `PATCH /api/mentor-bookings/:id/cancel` - Cancel booking
- `PATCH /api/mentor-bookings/:id/complete` - Mark completed (mentor only)

### Sessions
- `GET /api/mentor-bookings/:id/session` - Get Jitsi room info
- `POST /api/mentor-bookings/:id/session/start` - Start session
- `POST /api/mentor-bookings/:id/session/end` - End session

### Reviews
- `POST /api/mentor-bookings/:id/review` - Submit review
- `GET /api/mentors/:id/reviews` - Get mentor reviews

### Messaging
- `GET /api/mentor-conversations/:bookingId/messages` - Get messages
- `POST /api/mentor-conversations/:bookingId/messages` - Send message

---

## 9. Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Extend Prisma schema (MentorSessionCredit, MentorPayout, messaging)
- [ ] Create MentorshipModule scaffold
- [ ] Implement mentor profile CRUD
- [ ] Implement availability management
- [ ] Basic booking flow (wallet payment)

### Phase 2: Session & Communication
- [ ] Jitsi Meet integration
- [ ] Video session lifecycle
- [ ] In-app messaging
- [ ] Email notifications

### Phase 3: Payments & Payouts
- [ ] Stripe Connect onboarding
- [ ] Commission calculation
- [ ] Automated payout cron
- [ ] Payout history page

### Phase 4: Reviews & Polish
- [ ] Review submission flow
- [ ] Rating calculation
- [ ] Mentor response to reviews
- [ ] Frontend UI polish

### Phase 5: Admin & Verification
- [ ] Mentor verification workflow
- [ ] Admin dashboard
- [ ] Dispute resolution
- [ ] Analytics

---

## 10. Key Dependencies

- **Jitsi Meet** - Self-hosted video conferencing (free, no per-minute cost)
- **Stripe Connect** - Mentor payouts (platform fee retained)
- **Existing Wallet System** - Student payment
- **Existing Notification System** - Email/in-app alerts
