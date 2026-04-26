--
-- PostgreSQL database dump
--

\restrict 4FrPnYuGM2IJbSuen1UBcUxUffEwQm8CKbPF1Bjfct20HNmiOqFKG5FJjwt3tNT

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-04-26 21:54:15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 118019)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 6071 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 959 (class 1247 OID 118233)
-- Name: AuthType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AuthType" AS ENUM (
    'university_sso',
    'public_local',
    'public_oauth'
);


ALTER TYPE public."AuthType" OWNER TO postgres;

--
-- TOC entry 974 (class 1247 OID 118292)
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'scheduled',
    'launched',
    'completed',
    'cancelled',
    'no_show',
    'expired'
);


ALTER TYPE public."BookingStatus" OWNER TO postgres;

--
-- TOC entry 980 (class 1247 OID 118316)
-- Name: NodeStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NodeStatus" AS ENUM (
    'healthy',
    'degraded',
    'offline',
    'maintenance',
    'draining'
);


ALTER TYPE public."NodeStatus" OWNER TO postgres;

--
-- TOC entry 962 (class 1247 OID 118240)
-- Name: OrgType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrgType" AS ENUM (
    'university',
    'partner_college',
    'enterprise',
    'public_'
);


ALTER TYPE public."OrgType" OWNER TO postgres;

--
-- TOC entry 1175 (class 1247 OID 124564)
-- Name: ReferralConversionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReferralConversionStatus" AS ENUM (
    'SIGNUP_COMPLETED',
    'PAYMENT_PENDING',
    'QUALIFIED',
    'REWARD_CREDITED',
    'REWARD_VOIDED',
    'EXPIRED'
);


ALTER TYPE public."ReferralConversionStatus" OWNER TO postgres;

--
-- TOC entry 1178 (class 1247 OID 124578)
-- Name: ReferralRewardStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReferralRewardStatus" AS ENUM (
    'PENDING',
    'CREDITED',
    'VOIDED'
);


ALTER TYPE public."ReferralRewardStatus" OWNER TO postgres;

--
-- TOC entry 965 (class 1247 OID 118250)
-- Name: SessionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SessionStatus" AS ENUM (
    'pending',
    'starting',
    'running',
    'reconnecting',
    'stopping',
    'ended',
    'failed',
    'terminated_idle',
    'terminated_overuse'
);


ALTER TYPE public."SessionStatus" OWNER TO postgres;

--
-- TOC entry 1169 (class 1247 OID 120138)
-- Name: SessionTerminationReason; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SessionTerminationReason" AS ENUM (
    'user_requested',
    'idle_timeout',
    'resource_exhaustion',
    'spend_limit_exceeded',
    'node_failure',
    'node_maintenance',
    'admin_terminated',
    'session_expired',
    'booking_expired',
    'error_unrecoverable',
    'network_disconnect',
    'quota_exceeded',
    'credit_exhausted'
);


ALTER TYPE public."SessionTerminationReason" OWNER TO postgres;

--
-- TOC entry 968 (class 1247 OID 118270)
-- Name: SessionType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SessionType" AS ENUM (
    'stateful_desktop',
    'ephemeral_jupyter',
    'ephemeral_codeserver',
    'ephemeral_cli'
);


ALTER TYPE public."SessionType" OWNER TO postgres;

--
-- TOC entry 1196 (class 1247 OID 137625)
-- Name: StorageBackend; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StorageBackend" AS ENUM (
    'zfs_dataset',
    'zfs_zvol'
);


ALTER TYPE public."StorageBackend" OWNER TO postgres;

--
-- TOC entry 1166 (class 1247 OID 120132)
-- Name: StorageMode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StorageMode" AS ENUM (
    'stateful',
    'ephemeral'
);


ALTER TYPE public."StorageMode" OWNER TO postgres;

--
-- TOC entry 1199 (class 1247 OID 137630)
-- Name: StorageTransport; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StorageTransport" AS ENUM (
    'local_zfs',
    'nvmeof_tcp'
);


ALTER TYPE public."StorageTransport" OWNER TO postgres;

--
-- TOC entry 971 (class 1247 OID 118280)
-- Name: StorageVolumeStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StorageVolumeStatus" AS ENUM (
    'provisioning',
    'active',
    'wiping',
    'wiped',
    'error',
    'migrating'
);


ALTER TYPE public."StorageVolumeStatus" OWNER TO postgres;

--
-- TOC entry 983 (class 1247 OID 118328)
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'active',
    'past_due',
    'cancelled',
    'expired'
);


ALTER TYPE public."SubscriptionStatus" OWNER TO postgres;

--
-- TOC entry 989 (class 1247 OID 118350)
-- Name: TicketPriority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketPriority" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE public."TicketPriority" OWNER TO postgres;

--
-- TOC entry 986 (class 1247 OID 118338)
-- Name: TicketStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketStatus" AS ENUM (
    'open',
    'in_progress',
    'waiting_on_user',
    'resolved',
    'closed'
);


ALTER TYPE public."TicketStatus" OWNER TO postgres;

--
-- TOC entry 977 (class 1247 OID 118306)
-- Name: WalletHoldStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."WalletHoldStatus" AS ENUM (
    'active',
    'captured',
    'released',
    'expired'
);


ALTER TYPE public."WalletHoldStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 118020)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- TOC entry 275 (class 1259 OID 119155)
-- Name: achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.achievements (
    id uuid NOT NULL,
    slug character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    icon_url character varying(512),
    category character varying(64),
    criteria jsonb,
    points integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.achievements OWNER TO postgres;

--
-- TOC entry 283 (class 1259 OID 119269)
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id uuid NOT NULL,
    organization_id uuid,
    title character varying(255) NOT NULL,
    body text,
    severity character varying(32) NOT NULL,
    published_at timestamp(3) without time zone,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 119211)
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id uuid NOT NULL,
    actor_id uuid,
    actor_role character varying(64),
    org_id uuid,
    action character varying(64) NOT NULL,
    resource_type character varying(64) NOT NULL,
    resource_id uuid,
    old_data jsonb,
    new_data jsonb,
    client_ip text,
    user_agent text,
    action_reason text,
    request_id character varying(64),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 118573)
-- Name: base_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.base_images (
    id uuid NOT NULL,
    tag text NOT NULL,
    os_name text,
    description text,
    size_bytes bigint,
    software_manifest jsonb,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.base_images OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 118849)
-- Name: billing_charges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_charges (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    session_id uuid,
    compute_config_id uuid,
    duration_seconds integer NOT NULL,
    rate_cents_per_hour integer NOT NULL,
    amount_cents bigint NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    wallet_transaction_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid,
    charge_type text DEFAULT 'compute'::text NOT NULL,
    quota_gb integer,
    storage_volume_id uuid
);


ALTER TABLE public.billing_charges OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 118639)
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    compute_config_id uuid NOT NULL,
    node_id uuid,
    required_vcpu integer,
    required_memory_mb integer,
    required_gpu_vram_mb integer,
    scheduled_start_at timestamp(3) without time zone NOT NULL,
    scheduled_end_at timestamp(3) without time zone NOT NULL,
    status public."BookingStatus" NOT NULL,
    cancellation_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 118627)
-- Name: compute_config_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.compute_config_access (
    id uuid NOT NULL,
    compute_config_id uuid NOT NULL,
    organization_id uuid,
    role_id uuid,
    is_allowed boolean DEFAULT true NOT NULL,
    price_override_cents integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.compute_config_access OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 118600)
-- Name: compute_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.compute_configs (
    id uuid NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    session_type public."SessionType" NOT NULL,
    tier text,
    vcpu integer NOT NULL,
    memory_mb integer NOT NULL,
    gpu_vram_mb integer DEFAULT 0 NOT NULL,
    gpu_exclusive boolean DEFAULT false NOT NULL,
    hami_sm_percent integer,
    base_price_per_hour_cents integer NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    best_for text,
    gpu_model text,
    max_concurrent_per_node integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.compute_configs OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 118920)
-- Name: course_enrollments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.course_enrollments (
    id uuid NOT NULL,
    course_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status character varying(32) DEFAULT 'enrolled'::character varying NOT NULL,
    enrolled_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.course_enrollments OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 118904)
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    department_id uuid,
    instructor_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    code character varying(32),
    description text,
    semester character varying(32),
    academic_year character varying(16),
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    default_compute_config_id uuid,
    max_students integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 119012)
-- Name: coursework_content; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coursework_content (
    id uuid NOT NULL,
    organization_id uuid,
    category character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    content_url character varying(512),
    thumbnail_url character varying(512),
    difficulty_level character varying(32),
    tags text[],
    is_featured boolean DEFAULT false NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.coursework_content OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 118739)
-- Name: credit_packages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.credit_packages (
    id uuid NOT NULL,
    name text NOT NULL,
    amount_cents integer NOT NULL,
    credit_cents integer NOT NULL,
    bonus_cents integer DEFAULT 0 NOT NULL,
    validity_days integer,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.credit_packages OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 118433)
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id uuid NOT NULL,
    university_id uuid NOT NULL,
    parent_id uuid,
    name text NOT NULL,
    code text,
    slug text NOT NULL,
    head_user_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 119118)
-- Name: discussion_replies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discussion_replies (
    id uuid NOT NULL,
    discussion_id uuid NOT NULL,
    parent_reply_id uuid,
    author_id uuid NOT NULL,
    body text NOT NULL,
    is_accepted_answer boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.discussion_replies OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 119098)
-- Name: discussions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discussions (
    id uuid NOT NULL,
    organization_id uuid,
    course_id uuid,
    lab_id uuid,
    author_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    reply_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.discussions OWNER TO postgres;

--
-- TOC entry 282 (class 1259 OID 119253)
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.feature_flags (
    id uuid NOT NULL,
    key character varying(128) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    rollout_percent integer DEFAULT 100 NOT NULL,
    allowed_org_ids text[],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.feature_flags OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 118889)
-- Name: invoice_line_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_line_items (
    id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    description text NOT NULL,
    quantity integer NOT NULL,
    unit_price_cents integer NOT NULL,
    total_cents bigint NOT NULL,
    reference_type text,
    reference_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.invoice_line_items OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 118867)
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    invoice_number text NOT NULL,
    period_start timestamp(3) without time zone NOT NULL,
    period_end timestamp(3) without time zone NOT NULL,
    subtotal_cents bigint NOT NULL,
    tax_cents bigint DEFAULT 0 NOT NULL,
    total_cents bigint NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    status text NOT NULL,
    issued_at timestamp(3) without time zone,
    paid_at timestamp(3) without time zone,
    pdf_url text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 118961)
-- Name: lab_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_assignments (
    id uuid NOT NULL,
    lab_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    instructions text,
    due_at timestamp(3) without time zone,
    max_score numeric(6,2) DEFAULT 100,
    allow_late_submission boolean DEFAULT false NOT NULL,
    late_penalty_percent integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 1 NOT NULL,
    rubric jsonb,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.lab_assignments OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 118999)
-- Name: lab_grades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_grades (
    id uuid NOT NULL,
    submission_id uuid NOT NULL,
    graded_by uuid NOT NULL,
    score numeric(6,2),
    max_score numeric(6,2),
    feedback text,
    rubric_scores jsonb,
    graded_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.lab_grades OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 118949)
-- Name: lab_group_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_group_assignments (
    id uuid NOT NULL,
    lab_id uuid NOT NULL,
    user_group_id uuid NOT NULL,
    assigned_by uuid NOT NULL,
    available_from timestamp(3) without time zone,
    available_until timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.lab_group_assignments OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 118983)
-- Name: lab_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_submissions (
    id uuid NOT NULL,
    lab_assignment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    session_id uuid,
    attempt_number integer DEFAULT 1 NOT NULL,
    status character varying(32) NOT NULL,
    submitted_at timestamp(3) without time zone,
    file_ids text[],
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.lab_submissions OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 118933)
-- Name: labs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.labs (
    id uuid NOT NULL,
    course_id uuid,
    organization_id uuid NOT NULL,
    created_by_user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    instructions text,
    compute_config_id uuid,
    base_image_id uuid,
    preloaded_notebook_url character varying(512),
    preloaded_dataset_urls text[],
    max_duration_minutes integer,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.labs OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 118098)
-- Name: login_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_history (
    login_method text,
    ip_address text,
    user_agent text,
    "geoLocation" jsonb,
    success boolean NOT NULL,
    failure_reason text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid,
    id uuid NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.login_history OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 119051)
-- Name: mentor_availability_slots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_availability_slots (
    id uuid NOT NULL,
    mentor_profile_id uuid NOT NULL,
    day_of_week integer,
    specific_date date,
    start_time text NOT NULL,
    end_time text NOT NULL,
    is_recurring boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.mentor_availability_slots OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 119067)
-- Name: mentor_bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_bookings (
    id uuid NOT NULL,
    mentor_profile_id uuid NOT NULL,
    student_user_id uuid NOT NULL,
    scheduled_at timestamp(3) without time zone NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    status character varying(32) NOT NULL,
    meeting_url character varying(512),
    payment_transaction_id uuid,
    amount_cents integer,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.mentor_bookings OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 119029)
-- Name: mentor_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_profiles (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    headline character varying(255),
    bio text,
    expertise_areas text[],
    experience_years integer,
    price_per_hour_cents integer NOT NULL,
    currency character varying(3) DEFAULT 'INR'::character varying NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    avg_rating numeric(3,2) DEFAULT 0,
    total_reviews integer DEFAULT 0 NOT NULL,
    total_sessions integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.mentor_profiles OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 119084)
-- Name: mentor_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mentor_reviews (
    id uuid NOT NULL,
    mentor_booking_id uuid NOT NULL,
    reviewer_user_id uuid NOT NULL,
    rating integer NOT NULL,
    review_text text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.mentor_reviews OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 118587)
-- Name: node_base_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.node_base_images (
    node_id uuid NOT NULL,
    base_image_id uuid NOT NULL,
    status text NOT NULL,
    pulled_at timestamp(3) without time zone,
    error_message text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.node_base_images OWNER TO postgres;

--
-- TOC entry 288 (class 1259 OID 120169)
-- Name: node_resource_reservations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.node_resource_reservations (
    id uuid NOT NULL,
    node_id uuid NOT NULL,
    session_id uuid NOT NULL,
    reserved_vcpu integer NOT NULL,
    reserved_memory_mb integer NOT NULL,
    reserved_gpu_vram_mb integer NOT NULL,
    reserved_hami_sm_percent integer,
    reserved_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    released_at timestamp(3) without time zone,
    status text DEFAULT 'reserved'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.node_resource_reservations OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 118551)
-- Name: nodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nodes (
    id uuid NOT NULL,
    hostname text NOT NULL,
    display_name text,
    ip_management text,
    ip_compute text,
    ip_storage text,
    cpu_model text,
    total_vcpu integer NOT NULL,
    total_memory_mb integer NOT NULL,
    total_gpu_vram_mb integer NOT NULL,
    gpu_model text,
    nvme_total_gb integer,
    allocated_vcpu integer DEFAULT 0 NOT NULL,
    allocated_memory_mb integer DEFAULT 0 NOT NULL,
    allocated_gpu_vram_mb integer DEFAULT 0 NOT NULL,
    max_concurrent_sessions integer,
    status public."NodeStatus" NOT NULL,
    last_heartbeat_at timestamp(3) without time zone,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    current_session_count integer DEFAULT 0 NOT NULL,
    last_resource_sync_at timestamp(3) without time zone,
    session_orchestration_port integer DEFAULT 9998 NOT NULL,
    storage_provision_port integer DEFAULT 9999 NOT NULL,
    nvme_of_port integer DEFAULT 4420 NOT NULL,
    storage_headroom_gb integer DEFAULT 15 NOT NULL
);


ALTER TABLE public.nodes OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 119182)
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_templates (
    id uuid NOT NULL,
    slug character varying(128) NOT NULL,
    channel character varying(32) NOT NULL,
    subject_template character varying(512),
    body_template text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.notification_templates OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 119196)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    template_id uuid,
    channel character varying(32) NOT NULL,
    title character varying(255),
    body text,
    data jsonb,
    status character varying(32) NOT NULL,
    sent_at timestamp(3) without time zone,
    read_at timestamp(3) without time zone,
    delivery_attempts integer DEFAULT 0 NOT NULL,
    last_delivery_error character varying(512),
    delivery_confirmed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 118798)
-- Name: org_contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.org_contracts (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    contract_name text,
    starts_at timestamp(3) without time zone NOT NULL,
    ends_at timestamp(3) without time zone,
    max_seats integer,
    billing_model text,
    total_credits_cents bigint,
    used_credits_cents bigint DEFAULT 0 NOT NULL,
    status text NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.org_contracts OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 118814)
-- Name: org_resource_quotas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.org_resource_quotas (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    max_concurrent_sessions_per_org integer,
    max_concurrent_stateful_per_user integer DEFAULT 1 NOT NULL,
    max_concurrent_ephemeral_per_user integer DEFAULT 3 NOT NULL,
    max_registered_users integer,
    max_storage_per_user_mb integer DEFAULT 15360 NOT NULL,
    allowed_session_types text[],
    max_booking_hours_per_day integer,
    max_gpu_vram_mb_total integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.org_resource_quotas OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 118110)
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    billing_email text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid,
    id uuid NOT NULL,
    org_type public."OrgType" NOT NULL,
    university_id uuid
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 118523)
-- Name: os_switch_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.os_switch_history (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    old_os text,
    new_os text NOT NULL,
    old_volume_id uuid,
    new_volume_id uuid,
    confirmation_text text,
    ip_address text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid
);


ALTER TABLE public.os_switch_history OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 118056)
-- Name: otp_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otp_verifications (
    email text NOT NULL,
    code_hash text NOT NULL,
    purpose text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    used_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id uuid NOT NULL,
    user_id uuid
);


ALTER TABLE public.otp_verifications OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 118832)
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_transactions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    gateway text NOT NULL,
    gateway_txn_id text,
    gateway_order_id text,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    status text NOT NULL,
    gateway_response jsonb,
    refund_amount_cents integer,
    refunded_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.payment_transactions OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 118140)
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    code text NOT NULL,
    description text,
    module text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    id uuid NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 119134)
-- Name: project_showcases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_showcases (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    title character varying(255) NOT NULL,
    description text,
    project_url character varying(512),
    thumbnail_url character varying(512),
    tags text[],
    is_featured boolean DEFAULT false NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    like_count integer DEFAULT 0 NOT NULL,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.project_showcases OWNER TO postgres;

--
-- TOC entry 292 (class 1259 OID 124649)
-- Name: recommendation_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recommendation_sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    workload_description text,
    document_file_name text,
    document_extracted_text text,
    analysis_result jsonb,
    analysis_quality text,
    analysis_confidence double precision,
    detected_goal text,
    detected_vram_gb double precision,
    detected_intensity text,
    detected_frameworks text[] DEFAULT ARRAY[]::text[],
    selected_goal text,
    selected_dataset_size text,
    selected_intensity integer,
    selected_budget_type text,
    selected_budget_amount integer,
    selected_duration text,
    goal_auto_selected boolean DEFAULT false NOT NULL,
    dataset_auto_selected boolean DEFAULT false NOT NULL,
    intensity_auto_selected boolean DEFAULT false NOT NULL,
    recommendations jsonb,
    selected_config_slug text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    completed_at timestamp(3) without time zone
);


ALTER TABLE public.recommendation_sessions OWNER TO postgres;

--
-- TOC entry 290 (class 1259 OID 124613)
-- Name: referral_conversions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_conversions (
    id uuid NOT NULL,
    referral_id uuid NOT NULL,
    referrer_user_id uuid NOT NULL,
    referred_user_id uuid NOT NULL,
    status public."ReferralConversionStatus" DEFAULT 'SIGNUP_COMPLETED'::public."ReferralConversionStatus" NOT NULL,
    signup_method character varying(50) NOT NULL,
    signup_completed_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    first_payment_at timestamp(3) without time zone,
    first_payment_amount_cents bigint,
    first_payment_txn_id uuid,
    reward_amount_cents integer DEFAULT 5000 NOT NULL,
    reward_status public."ReferralRewardStatus" DEFAULT 'PENDING'::public."ReferralRewardStatus" NOT NULL,
    reward_credited_at timestamp(3) without time zone,
    reward_wallet_txn_id uuid,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.referral_conversions OWNER TO postgres;

--
-- TOC entry 291 (class 1259 OID 124636)
-- Name: referral_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_events (
    id uuid NOT NULL,
    referral_id uuid NOT NULL,
    referral_conversion_id uuid,
    event_type character varying(50) NOT NULL,
    previous_status character varying(50),
    new_status character varying(50),
    metadata jsonb,
    actor_type character varying(20) NOT NULL,
    actor_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.referral_events OWNER TO postgres;

--
-- TOC entry 289 (class 1259 OID 124591)
-- Name: referrals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referrals (
    id uuid NOT NULL,
    referrer_user_id uuid NOT NULL,
    referral_code character varying(20) NOT NULL,
    referral_url character varying(500) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    total_clicks integer DEFAULT 0 NOT NULL,
    total_signups integer DEFAULT 0 NOT NULL,
    total_rewards_cents bigint DEFAULT 0 NOT NULL,
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.referrals OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 118085)
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    token_hash text NOT NULL,
    "deviceInfo" jsonb,
    ip_address text,
    expires_at timestamp(3) without time zone NOT NULL,
    revoked_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    token_version integer DEFAULT 0 NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 118152)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 118126)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    name text NOT NULL,
    display_name text,
    description text,
    is_system boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    id uuid NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 118674)
-- Name: session_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session_events (
    id uuid NOT NULL,
    session_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb,
    client_ip text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.session_events OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 118655)
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    compute_config_id uuid NOT NULL,
    booking_id uuid,
    node_id uuid,
    session_type public."SessionType" NOT NULL,
    container_id text,
    container_name text,
    nginx_port integer,
    selkies_port integer,
    display_number integer,
    session_token_hash text,
    session_url text,
    status public."SessionStatus" NOT NULL,
    started_at timestamp(3) without time zone,
    ended_at timestamp(3) without time zone,
    scheduled_end_at timestamp(3) without time zone,
    last_activity_at timestamp(3) without time zone,
    nfs_mount_path text,
    base_image_id uuid,
    actual_gpu_vram_mb integer,
    actual_hami_sm_percent integer,
    reconnect_count integer DEFAULT 0 NOT NULL,
    last_reconnect_at timestamp(3) without time zone,
    auto_preserve_files boolean DEFAULT false NOT NULL,
    avg_rtt_ms integer,
    avg_packet_loss_ratio numeric(65,30),
    resource_snapshot jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    allocated_gpu_vram_mb integer,
    allocated_hami_sm_percent integer,
    allocated_memory_mb integer,
    allocated_vcpu integer,
    allocation_snapshot_at timestamp(3) without time zone,
    cost_last_updated_at timestamp(3) without time zone,
    cumulative_cost_cents bigint DEFAULT 0 NOT NULL,
    duration_seconds integer,
    instance_name character varying(256),
    storage_mode public."StorageMode" DEFAULT 'ephemeral'::public."StorageMode" NOT NULL,
    terminated_at timestamp(3) without time zone,
    terminated_by uuid,
    termination_details jsonb,
    termination_reason public."SessionTerminationReason",
    storage_node_id uuid,
    storage_transport public."StorageTransport",
    ephemeral_storage_path character varying(512),
    ephemeral_storage_size_mb integer
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- TOC entry 287 (class 1259 OID 120067)
-- Name: storage_extensions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.storage_extensions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    storage_volume_id uuid NOT NULL,
    extension_type text NOT NULL,
    previous_quota_bytes bigint NOT NULL,
    new_quota_bytes bigint NOT NULL,
    extension_bytes bigint NOT NULL,
    amount_cents integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    payment_transaction_id uuid,
    wallet_transaction_id uuid,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid
);


ALTER TABLE public.storage_extensions OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 118759)
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_plans (
    id uuid NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    price_cents integer NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    billing_period text,
    gpu_hours_included integer,
    mentor_sessions_included integer DEFAULT 0 NOT NULL,
    features jsonb,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.subscription_plans OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 118781)
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    organization_id uuid,
    status public."SubscriptionStatus" NOT NULL,
    starts_at timestamp(3) without time zone NOT NULL,
    ends_at timestamp(3) without time zone,
    gpu_hours_remaining numeric(65,30),
    mentor_sessions_remaining integer,
    auto_renew boolean DEFAULT true NOT NULL,
    cancellation_requested_at timestamp(3) without time zone,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    grace_period_until timestamp(3) without time zone,
    payment_transaction_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- TOC entry 284 (class 1259 OID 119282)
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_tickets (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    subject character varying(255) NOT NULL,
    description text NOT NULL,
    category character varying(64) NOT NULL,
    priority public."TicketPriority" DEFAULT 'medium'::public."TicketPriority" NOT NULL,
    status public."TicketStatus" NOT NULL,
    assigned_to uuid,
    related_session_id uuid,
    related_billing_id uuid,
    resolved_at timestamp(3) without time zone,
    resolution_notes text,
    satisfaction_rating integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.support_tickets OWNER TO postgres;

--
-- TOC entry 281 (class 1259 OID 119240)
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id uuid NOT NULL,
    key character varying(128) NOT NULL,
    value text NOT NULL,
    value_type character varying(32),
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- TOC entry 285 (class 1259 OID 119300)
-- Name: ticket_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_messages (
    id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    body text NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    attachments jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ticket_messages OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 118399)
-- Name: universities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.universities (
    id uuid NOT NULL,
    name text NOT NULL,
    short_name text,
    slug text NOT NULL,
    domain_suffixes text[],
    logo_url text,
    website_url text,
    contact_email text,
    contact_phone text,
    city text,
    state text,
    country text DEFAULT 'IN'::text,
    timezone text DEFAULT 'Asia/Kolkata'::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.universities OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 118416)
-- Name: university_idp_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.university_idp_configs (
    id uuid NOT NULL,
    university_id uuid NOT NULL,
    idp_type text NOT NULL,
    idp_entity_id text,
    idp_metadata_url text,
    idp_config jsonb,
    keycloak_idp_alias text,
    display_name text,
    is_primary boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.university_idp_configs OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 119170)
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_achievements (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    achievement_id uuid NOT NULL,
    earned_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.user_achievements OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 119223)
-- Name: user_deletion_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_deletion_requests (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    requested_at timestamp(3) without time zone NOT NULL,
    requested_by uuid,
    reason text,
    grace_period_days integer DEFAULT 30 NOT NULL,
    scheduled_deletion_at timestamp(3) without time zone NOT NULL,
    status character varying(32) NOT NULL,
    cancelled_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    completion_details jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.user_deletion_requests OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 118480)
-- Name: user_departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_departments (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    department_id uuid NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.user_departments OWNER TO postgres;

--
-- TOC entry 286 (class 1259 OID 119315)
-- Name: user_feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_feedback (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    session_id uuid,
    feedback_type character varying(64) NOT NULL,
    rating integer,
    subject character varying(255),
    body text,
    status character varying(32) DEFAULT 'submitted'::character varying NOT NULL,
    admin_response text,
    responded_by uuid,
    responded_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.user_feedback OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 118535)
-- Name: user_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_files (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size_bytes bigint,
    mime_type text,
    file_type text,
    session_id uuid,
    is_pinned boolean DEFAULT false NOT NULL,
    storage_backend text,
    retention_days integer,
    scheduled_deletion_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.user_files OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 118493)
-- Name: user_group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_group_members (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_group_id uuid NOT NULL,
    added_by uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.user_group_members OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 118449)
-- Name: user_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_groups (
    id uuid NOT NULL,
    organization_id uuid,
    department_id uuid,
    parent_id uuid,
    group_type text NOT NULL,
    name text NOT NULL,
    slug text,
    description text,
    keycloak_group_id text,
    max_members integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.user_groups OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 118161)
-- Name: user_org_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_org_roles (
    expires_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    role_id uuid NOT NULL,
    granted_by uuid
);


ALTER TABLE public.user_org_roles OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 118072)
-- Name: user_policy_consents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_policy_consents (
    policy_slug text NOT NULL,
    policy_version text,
    agreed_at timestamp(3) without time zone NOT NULL,
    ip_address text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid,
    id uuid NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.user_policy_consents OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 118464)
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    bio text,
    enrollment_number text,
    id_proof_url text,
    id_proof_verified_at timestamp(3) without time zone,
    id_proof_verified_by uuid,
    college_name text,
    graduation_year integer,
    github_url text,
    linkedin_url text,
    website_url text,
    skills text[],
    theme_preference text DEFAULT 'dark'::text NOT NULL,
    notification_preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    country text,
    expertise_level text,
    onboarding_complete boolean DEFAULT false NOT NULL,
    operational_domains text[],
    profession text,
    use_case_other text,
    use_case_purposes text[],
    years_of_experience integer,
    academic_year integer,
    course_name text,
    department_id uuid
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 118504)
-- Name: user_storage_volumes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_storage_volumes (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    storage_uid character varying(64) NOT NULL,
    zfs_dataset_path text,
    nfs_export_path text,
    container_mount_path text,
    os_choice character varying(32) NOT NULL,
    quota_bytes bigint NOT NULL,
    used_bytes bigint DEFAULT 0 NOT NULL,
    used_bytes_updated_at timestamp(3) without time zone,
    status public."StorageVolumeStatus" NOT NULL,
    provisioned_at timestamp(3) without time zone,
    wiped_at timestamp(3) without time zone,
    wipe_reason text,
    quota_warning_sent_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    allocation_type text NOT NULL,
    name character varying(128) NOT NULL,
    price_per_gb_cents_month integer DEFAULT 700 NOT NULL,
    node_id uuid,
    storage_backend public."StorageBackend" DEFAULT 'zfs_dataset'::public."StorageBackend" NOT NULL
);


ALTER TABLE public.user_storage_volumes OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 118034)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    email text NOT NULL,
    email_verified_at timestamp(3) without time zone,
    password_hash text,
    first_name text NOT NULL,
    last_name text NOT NULL,
    display_name text,
    avatar_url text,
    phone text,
    timezone text DEFAULT 'Asia/Kolkata'::text,
    keycloak_sub text,
    auth_type text NOT NULL,
    oauth_provider text,
    storage_uid text,
    token_version integer DEFAULT 0 NOT NULL,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    last_login_at timestamp(3) without time zone,
    last_login_ip text,
    onboarding_completed_at timestamp(3) without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone,
    storage_provisioned_at timestamp(3) without time zone,
    storage_provisioning_error text,
    storage_provisioning_status text,
    created_by uuid,
    keycloak_last_sync_at timestamp(3) without time zone,
    lock_expires_at timestamp(3) without time zone,
    lock_reason text,
    locked_at timestamp(3) without time zone,
    os_choice text,
    pending_email text,
    updated_by uuid,
    id uuid NOT NULL,
    default_org_id uuid,
    referred_by_code character varying(20)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 293 (class 1259 OID 129402)
-- Name: waitlist_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.waitlist_entries (
    id uuid NOT NULL,
    "userId" uuid,
    email text NOT NULL,
    "firstName" text,
    "lastName" text,
    "currentStatus" text,
    "organizationName" text,
    "jobTitle" text,
    "computeNeeds" text,
    "expectedDuration" text,
    urgency text,
    expectations text[],
    "primaryWorkload" text,
    "workloadDescription" text,
    "agreedToPolicy" boolean DEFAULT false NOT NULL,
    "policyAgreedAt" timestamp(3) without time zone,
    "agreedToComms" boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.waitlist_entries OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 118710)
-- Name: wallet_holds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_holds (
    id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount_cents bigint NOT NULL,
    hold_reason text,
    booking_id uuid,
    session_id uuid,
    status public."WalletHoldStatus" NOT NULL,
    expires_at timestamp(3) without time zone,
    released_at timestamp(3) without time zone,
    release_reason text,
    captured_amount bigint,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.wallet_holds OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 118724)
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_transactions (
    id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    txn_type text NOT NULL,
    amount_cents bigint NOT NULL,
    balance_after_cents bigint NOT NULL,
    reference_type text,
    reference_id uuid,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by uuid
);


ALTER TABLE public.wallet_transactions OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 118686)
-- Name: wallets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallets (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    balance_cents bigint DEFAULT 0 NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    lifetime_credits_cents bigint DEFAULT 0 NOT NULL,
    lifetime_spent_cents bigint DEFAULT 0 NOT NULL,
    low_balance_threshold_cents integer DEFAULT 10000 NOT NULL,
    is_frozen boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    created_by uuid,
    updated_by uuid,
    spend_limit_cents integer,
    spend_limit_enabled boolean DEFAULT false NOT NULL,
    spend_limit_period text,
    spend_limit_consented_at timestamp(3) without time zone,
    spend_limit_end_date timestamp(3) without time zone,
    spend_limit_start_date timestamp(3) without time zone,
    spend_limit_warning_85_sent boolean DEFAULT false NOT NULL,
    runway_warning_1hour_sent boolean DEFAULT false NOT NULL
);


ALTER TABLE public.wallets OWNER TO postgres;

--
-- TOC entry 5991 (class 0 OID 118020)
-- Dependencies: 219
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
43ab8b8f-5a00-4e68-9723-a8b407d0609f	f06a850ab2b4518fe5576c8daaea695a89f63021b086dfac513ba953b60c836c	2026-04-08 07:21:48.080551+05:30	20260316082629_init_auth_tables	\N	\N	2026-04-08 07:21:47.926859+05:30	1
20c3c9d1-1666-49ad-9eba-7c1ee662838b	d5bfdc1c1dafd47ef9685207c3f75a3c9ebe9c872f2d30b044466dc2220a0362	2026-04-08 07:21:48.090273+05:30	20260316184502_add_storage_provisioning_status	\N	\N	2026-04-08 07:21:48.083086+05:30	1
010b2722-1018-459d-9b40-63366f68dcb6	afbc1564c0e054c0091d387e63393e9408f4632bd675a74806dd176e9af8c866	2026-04-08 14:51:17.1213+05:30	20260408092116_add_student_academic_fields	\N	\N	2026-04-08 14:51:17.086803+05:30	1
0babe03a-3834-453f-8d6f-51cd739602f0	d31f04d058bcd80d585153a0774ed4f70e49567f3708a23c480ce9b509a65a56	2026-04-08 07:21:49.458962+05:30	20260319081325_full_enterprise_schema	\N	\N	2026-04-08 07:21:48.094113+05:30	1
e00c49c5-f00b-4042-8633-d55fa9800765	be1792b6204ecb99b7362135d4ecfedd6094fe4019cd7b724fb5cf530cb2e41b	2026-04-08 07:21:49.507099+05:30	20260319155518_add_storage_extensions	\N	\N	2026-04-08 07:21:49.46062+05:30	1
dbd33e5a-9347-4512-b2d9-ee7ecc019b3f	5d8d484c038d2bd29227fb057738c47004b332e275f80d506773b6cdaefeb6e6	2026-04-08 07:21:49.518134+05:30	20260319182951_add_billing_fields	\N	\N	2026-04-08 07:21:49.508916+05:30	1
e0f850a6-ac51-4362-ad27-b59e3f231bf9	1df438dac2a5fff9679ac77b87932e4f8ac1d9674480c666f6edf281fd81fed3	2026-04-26 12:13:39.703288+05:30	20260422000000_multi_node_support	\N	\N	2026-04-26 12:13:39.631664+05:30	1
b410a63a-34d0-44e4-bedc-e4fc5196731d	b1ac6a784a71996508124de03c1e46fad6f5644b37585f40907326177e4e45d7	2026-04-08 07:21:49.5281+05:30	20260319184508_add_wallet_spend_limit	\N	\N	2026-04-08 07:21:49.519994+05:30	1
a60e1766-e22a-47cd-8085-21e7bdcf768d	e6025c027621a247f732c9da16080467b9e0b0bd793f143a98b11612ea538433	2026-04-26 18:06:23.736829+05:30	20260426000000_add_migrating_status		\N	2026-04-26 18:06:23.736829+05:30	0
ea180aa2-33e4-4a4a-9261-fdf3afd97835	a91f16a99a8e8c08adb6eac868c767aa0b25cde3bab392e8d7498c58000ceba1	2026-04-08 07:21:49.539767+05:30	20260320065444_add_name_to_storage_volume	\N	\N	2026-04-08 07:21:49.529398+05:30	1
224f7ce4-0bc3-4a3d-8e7d-459d77799f71	e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	2026-04-26 21:37:28.092707+05:30	20260426100000_add_ephemeral_storage_fields		\N	2026-04-26 21:37:28.092707+05:30	0
e8e1ad47-c4a0-4a03-825f-527d71c0a2d7	1eab734f4dde2d7855bb00d5600928f75b13093bdbff56e06325b1044ccef655	2026-04-08 07:21:49.546677+05:30	20260320065614_file_system_update	\N	\N	2026-04-08 07:21:49.541215+05:30	1
d951ffb8-3cb3-4f93-ad78-da932da655f9	c42d41c38b1f4acebd4e725c962871f3b7fb3d827d90f2b31cca4199f9c52e53	2026-04-08 07:21:49.562304+05:30	20260322155218_add_storage_billing	\N	\N	2026-04-08 07:21:49.548156+05:30	1
9c657222-2b72-41e0-a024-4c77b2c47285	ec80fec54d49bbaec96a10050863b8cb60a4635cef15fe27df65d6e9ceb9c1fe	2026-04-08 07:21:49.572304+05:30	20260323053019_add_compute_config_fields	\N	\N	2026-04-08 07:21:49.564233+05:30	1
55537eaa-e1f6-46da-aaa9-147a343f8659	61db71d79d6debf195081ad538153979314a2fca64b7c8e241d6efe2d6e7fff9	2026-04-08 07:21:49.627632+05:30	20260323064506_add_compute_resource_tracking	\N	\N	2026-04-08 07:21:49.57395+05:30	1
a3ed7d32-c16b-4c35-b23e-c76e69b156d6	6bc0af65e162d6a104f2cc19b37f42159e123fa2c33ac0f22aaf0cfd18aa18ac	2026-04-08 07:21:49.636141+05:30	20260324083822_add_spend_limit_date_range	\N	\N	2026-04-08 07:21:49.629053+05:30	1
2c04a88e-9ed7-4693-b27a-de98f8332994	b228a0265feb2a3d7a355ebd300513a4744fdc4e36f7a5219f8f981fcda891a5	2026-04-08 07:22:39.383691+05:30	20260408015239_add_recommendation_session	\N	\N	2026-04-08 07:22:39.253981+05:30	1
\.


--
-- TOC entry 6047 (class 0 OID 119155)
-- Dependencies: 275
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.achievements (id, slug, name, description, icon_url, category, criteria, points, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6055 (class 0 OID 119269)
-- Dependencies: 283
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, organization_id, title, body, severity, published_at, expires_at, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6051 (class 0 OID 119211)
-- Dependencies: 279
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, actor_id, actor_role, org_id, action, resource_type, resource_id, old_data, new_data, client_ip, user_agent, action_reason, request_id, created_at) FROM stdin;
c4c23115-a251-4298-9cb1-ad50908b204c	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 08:59:48.119
04828819-1d84-4418-b836-575ce9574ea3	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 09:08:51.19
0354bec9-921e-41d1-8f16-cb7710affbac	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 09:21:31.699
e5e37aca-6961-4472-a529-51daef053065	79053f7d-41af-4651-ad54-6f792e94501e	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 09:36:27.014
3a45e8f6-5776-4b7b-8477-422c596e4097	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 09:44:23.721
6a97bad4-3f54-41ec-a19e-f8233b8c7179	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 10:01:07.429
3851a098-6f20-43d8-ab29-93836dd06234	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 10:08:55.033
ad8f79c5-870a-434f-ad63-f4feb10eb244	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 10:31:19.14
4561da1a-cb90-4c64-b32d-3b16b370a337	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.create	storage	\N	\N	{"name": "ef2", "quotaGb": 5, "storageUid": "u_b1115de086e0ca984be51c7b"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 10:31:30.755
840aef51-0456-42ee-a1e4-d70fee4ffe45	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.delete	storage	\N	\N	{"volumeId": "967ddeba-59d4-4ac7-9f7f-07cbeec8b3e1", "storageUid": "u_b1115de086e0ca984be51c7b"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 10:39:32.285
a1e5dd90-1876-4e8f-8971-ebc3858511c4	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 10:47:01.252
14ad1070-9db7-436c-94c2-6b3d19ea382b	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.create	storage	\N	\N	{"name": "ef3", "quotaGb": 5, "storageUid": "u_47f3b48d96b4fdefb816d22b"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 10:47:17.241
c486efbf-349c-4353-8497-1fad0b3108be	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.delete	storage	\N	\N	{"volumeId": "2fd5ece4-4338-41b5-b9d7-1a9b3f2cd048", "storageUid": "u_47f3b48d96b4fdefb816d22b"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 10:47:33.103
2d813389-7a65-4425-bd12-798b49133790	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.create	storage	\N	\N	{"name": "ef4", "quotaGb": 5, "storageUid": "u_ad1191a24d166c6e0fcc3f80"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 10:47:45.548
9abbd444-6d6a-4503-a244-f8380715bf08	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.delete	storage	\N	\N	{"volumeId": "448d8e4f-5e95-4e40-9870-0d0f564a2a35", "storageUid": "u_ad1191a24d166c6e0fcc3f80"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 10:56:19.979
2a11f9a7-7523-4047-81a6-a2195a218fa0	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.create	storage	\N	\N	{"name": "ef5", "quotaGb": 5, "storageUid": "u_61a2e98ce9e5c2393bc29a08"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 10:57:19.553
9ae2390e-bd81-4063-bdf8-dd086be9d3ae	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	file.mkdir	storage	\N	\N	{"path": "/", "folderName": "zenith"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 10:57:29.891
5090f4e4-5da4-4038-9cbd-f77ce0a68587	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	file.upload	storage	\N	\N	{"path": "/zenith", "fileName": "FortiClientInstaller_1.exe"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 10:57:36.563
06a88ed2-efea-4d6f-886e-d0147d1487f1	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.delete	storage	\N	\N	{"volumeId": "614732bc-6dcf-4af5-ae03-d82285d77fd2", "storageUid": "u_61a2e98ce9e5c2393bc29a08"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 10:58:22.493
4af50190-d07d-45af-994e-68df997cf8cd	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.create	storage	\N	\N	{"name": "efs5", "quotaGb": 5, "storageUid": "u_733d62e3d54cbfc7ae77555c"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 10:58:40.75
47b7463d-6462-4cf4-9472-a25a53a4f7e7	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.delete	storage	\N	\N	{"volumeId": "2130461d-cab4-41fd-b1ec-41807b97004e", "storageUid": "u_733d62e3d54cbfc7ae77555c"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 10:59:25.939
ecff812a-07a6-467f-a587-36e101456b79	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.create	storage	\N	\N	{"name": "efs1", "quotaGb": 8, "storageUid": "u_598e2807eab421ae4e8da461"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 11:06:22.67
59c88de1-4b21-434c-bcca-2fa520a24a5c	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	file.mkdir	storage	\N	\N	{"path": "/", "folderName": "test_Setup"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 11:10:03.303
ebc4142c-39ce-4dca-8390-8481f9e5c842	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	file.upload	storage	\N	\N	{"path": "/test_Setup", "fileName": "waitlist-bg.MP4"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 11:10:38.129
b3cadc78-0e9e-402d-8cd0-27fb27030ac4	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 11:12:28.788
4bbac53e-26b5-4a44-aeca-7e03b186b87b	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	\N	filestore.create	storage	\N	\N	{"name": "ef2", "quotaGb": 6, "storageUid": "u_209706bccc85af75055c42e1"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 11:13:12.449
af9124e3-e4ca-421c-a835-fd7a6eaeca3f	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	\N	filestore.delete	storage	\N	\N	{"volumeId": "9be56b9b-ccd5-4f54-9428-6cf8fd9438bc", "storageUid": "u_209706bccc85af75055c42e1"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 11:21:08.993
71275022-12ae-4d01-ac61-98bace564a9e	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 11:21:27.521
50eabf4e-3165-431a-8a73-d96cc5648d63	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	file.upload	storage	\N	\N	{"path": "/test_Setup", "fileName": "QoderUserSetup-x64.exe"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 11:22:48.265
88408da1-843f-4cb8-8591-7d5a307d3053	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 11:28:40.877
868fdec5-06c9-4016-8e6e-fb73b02f75e1	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	\N	filestore.create	storage	\N	\N	{"name": "ef10", "quotaGb": 7, "storageUid": "u_989a8c5339b3ebd95f6e1c42"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 11:28:56.063
ee9ddf77-ac4c-4960-b881-4210ed5e670f	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	billing.charge	billing	\N	\N	{"period": "hourly", "volumeCount": 1, "totalChargeCents": 8}	\N	\N	success	\N	2026-04-26 11:30:00.152
08619881-2492-431b-a707-9f3f62514beb	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	\N	billing.charge	billing	\N	\N	{"period": "hourly", "volumeCount": 1, "totalChargeCents": 7}	\N	\N	success	\N	2026-04-26 11:30:00.179
8a89e4d1-13a1-4831-961b-e33f9d75d465	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	\N	filestore.delete	storage	\N	\N	{"volumeId": "01f97c9c-e7a6-485a-89ab-b6606f550ad2", "storageUid": "u_989a8c5339b3ebd95f6e1c42"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 11:50:58.069
c6542793-a6c3-455a-b913-1e7ac8a4b977	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 11:51:22.865
7ecb881a-95c5-46a6-b0df-443ba134aa9d	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.delete	storage	\N	\N	{"volumeId": "7cd88ec0-0a37-4a8f-8241-72f78ae6aa4c", "storageUid": "u_598e2807eab421ae4e8da461"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 11:51:35.24
0235d132-3080-43b6-836d-0e830fc6504e	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.create	storage	\N	\N	{"name": "efs2", "quotaGb": 8, "storageUid": "u_18fed53bb2875483a59d2f60"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 11:51:56.693
167d35b7-d000-4728-8a6d-0b6b19715480	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	file.mkdir	storage	\N	\N	{"path": "/", "folderName": "test_setup"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 11:52:06.485
7e6198a8-d4ee-4775-884a-b56ce67af1e3	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	file.upload	storage	\N	\N	{"path": "/test_setup", "fileName": "QoderUserSetup-x64.exe"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 11:52:58.037
c81a74b6-01c9-46d0-8aec-79175fd5014f	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	billing.charge	billing	\N	\N	{"period": "hourly", "volumeCount": 1, "totalChargeCents": 8}	\N	\N	success	\N	2026-04-26 12:30:00.126
398f7eb1-2062-446a-85e2-d2d066872ecd	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 13:14:29.535
588f0f5a-b7d9-487f-a5e1-460e7e62908d	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	filestore.upgrade	storage	\N	\N	{"name": "efs2", "method": "in_place", "volumeId": "a6a4ee53-a077-4934-a21b-1134893cf490", "newQuotaGb": 9, "storageUid": "u_18fed53bb2875483a59d2f60", "previousQuotaGb": 8}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 OPR/130.0.0.0	success	\N	2026-04-26 13:14:45.417
b78f5aa5-d697-4b38-97cd-bd530a202857	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	billing.charge	billing	\N	\N	{"period": "hourly", "volumeCount": 1, "totalChargeCents": 9}	\N	\N	success	\N	2026-04-26 13:30:00.141
e29d7c55-8a86-4194-827d-24273421372c	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	billing.charge	billing	\N	\N	{"period": "hourly", "volumeCount": 1, "totalChargeCents": 9}	\N	\N	success	\N	2026-04-26 14:54:51.904
35141050-2e22-42de-9ebc-8f96399bca23	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	auth.login	auth	\N	\N	{"authType": "public_oauth", "loginMethod": "oauth", "oauthProvider": "keycloak"}	127.0.0.1	\N	success	\N	2026-04-26 15:22:30.785
b45aa1d5-d05d-4336-b207-5dc42456e4b4	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	billing.charge	billing	\N	\N	{"period": "hourly", "volumeCount": 1, "totalChargeCents": 9}	\N	\N	success	\N	2026-04-26 15:30:00.117
\.


--
-- TOC entry 6013 (class 0 OID 118573)
-- Dependencies: 241
-- Data for Name: base_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.base_images (id, tag, os_name, description, size_bytes, software_manifest, is_default, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6029 (class 0 OID 118849)
-- Dependencies: 257
-- Data for Name: billing_charges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billing_charges (id, user_id, session_id, compute_config_id, duration_seconds, rate_cents_per_hour, amount_cents, currency, wallet_transaction_id, created_at, created_by, charge_type, quota_gb, storage_volume_id) FROM stdin;
da2a07fa-5303-4d7a-a249-72bc08fd6625	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	3600	8	8	INR	5585b51f-1e0a-49a7-a355-a4762eba3168	2026-04-26 11:30:00	\N	storage	8	7cd88ec0-0a37-4a8f-8241-72f78ae6aa4c
3317f25f-88a6-4767-83c5-9da4d99756d3	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	\N	3600	7	7	INR	f7e3252a-110e-413e-8c0f-1a0b06668bae	2026-04-26 11:30:00	\N	storage	7	01f97c9c-e7a6-485a-89ab-b6606f550ad2
321cb90d-778c-492b-81d6-abd1553102d6	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	3600	8	8	INR	d3e8b49e-fea0-49cd-99c2-84c4fc7f4290	2026-04-26 12:30:00	\N	storage	8	a6a4ee53-a077-4934-a21b-1134893cf490
5ea48b76-820e-4c71-bd91-ea0ec732e796	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	ccb2e98a-d188-464b-9e5e-e14fe48897ea	73119ef1-e3eb-48a3-be9a-8e2f55c11ba8	3600	10500	10500	INR	e95e4044-6f6b-4bb0-8699-1a8fc11f4d5b	2026-04-26 13:24:10.128	\N	compute	\N	\N
6913532f-f318-4d3f-9f81-dd2a9b27d458	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	ccb2e98a-d188-464b-9e5e-e14fe48897ea	73119ef1-e3eb-48a3-be9a-8e2f55c11ba8	3600	10500	10500	INR	3b5c5164-bc2c-4701-87e8-45b53050d902	2026-04-26 13:30:00.058	\N	compute	\N	\N
56196199-d291-4f18-b852-b729fc6ec1dc	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	3600	9	9	INR	b784d632-3975-4a97-8ce7-d4a35d3b552a	2026-04-26 13:30:00	\N	storage	9	a6a4ee53-a077-4934-a21b-1134893cf490
1594e9c5-b364-4cc6-84f1-c08976214b55	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	3600	9	9	INR	563c5eaf-3577-4ff8-9d6d-3b0fd4e40cd2	2026-04-26 14:30:00	\N	storage	9	a6a4ee53-a077-4934-a21b-1134893cf490
3bd901e3-7fc1-43d7-9a53-a78fc2fb2d42	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	28a49cc2-a6c4-4387-a93f-9d48c153bb6e	3600	15500	15500	INR	f60383bf-7b7c-4446-b7fc-e81feb3921b7	2026-04-26 15:04:50.476	\N	compute	\N	\N
8500369d-a1a1-41b2-a204-7c29a9953241	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	bdbaa558-00ea-4d6e-98f6-013330fb4339	28a49cc2-a6c4-4387-a93f-9d48c153bb6e	3600	15500	15500	INR	93adadc2-9be4-4840-9fdf-6d77b658845c	2026-04-26 15:23:08.516	\N	compute	\N	\N
f8ce1c30-7bff-4afc-b4c5-4404efe5684c	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	3600	9	9	INR	f09d27a7-55fd-45e6-9dfd-eb664a4cef8c	2026-04-26 15:30:00	\N	storage	9	a6a4ee53-a077-4934-a21b-1134893cf490
30671833-def2-4dc6-bb29-0d6f3fb1c1bf	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	28a49cc2-a6c4-4387-a93f-9d48c153bb6e	3600	15500	15500	INR	d9e9863a-f766-4237-9cf9-4dfb2e190dfa	2026-04-26 15:30:00.094	\N	compute	\N	\N
087d99e4-7052-4029-a376-21d7f626937a	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	bdbaa558-00ea-4d6e-98f6-013330fb4339	28a49cc2-a6c4-4387-a93f-9d48c153bb6e	3600	15500	15500	INR	658aaab2-9ce9-4912-a526-334f042304d5	2026-04-26 15:30:00.225	\N	compute	\N	\N
\.


--
-- TOC entry 6017 (class 0 OID 118639)
-- Dependencies: 245
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (id, user_id, organization_id, compute_config_id, node_id, required_vcpu, required_memory_mb, required_gpu_vram_mb, scheduled_start_at, scheduled_end_at, status, cancellation_reason, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6016 (class 0 OID 118627)
-- Dependencies: 244
-- Data for Name: compute_config_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compute_config_access (id, compute_config_id, organization_id, role_id, is_allowed, price_override_cents, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6015 (class 0 OID 118600)
-- Dependencies: 243
-- Data for Name: compute_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.compute_configs (id, slug, name, description, session_type, tier, vcpu, memory_mb, gpu_vram_mb, gpu_exclusive, hami_sm_percent, base_price_per_hour_cents, currency, sort_order, is_active, created_at, updated_at, created_by, updated_by, best_for, gpu_model, max_concurrent_per_node) FROM stdin;
d2fb06af-8256-4105-812b-05a10cbe99a1	spark	Spark	Entry-level GPU compute for learning, light inference, and small experiments.	stateful_desktop	gpu	2	4096	2048	f	8	3500	INR	1	t	2026-04-08 01:52:11.975	2026-04-08 10:30:07.831	\N	\N	Small PyTorch inference, Jupyter notebooks with CUDA, educational projects	RTX 4090	8
46756643-41f5-4eb1-a161-d5b595b4e0c8	blaze	Blaze	Standard GPU compute for development, moderate ML training, and data science.	stateful_desktop	gpu	4	8192	4096	f	17	6500	INR	2	t	2026-04-08 01:52:11.994	2026-04-08 10:30:07.841	\N	\N	Model fine-tuning, GPU-accelerated rendering, professional development	RTX 4090	4
73119ef1-e3eb-48a3-be9a-8e2f55c11ba8	inferno	Inferno	Advanced GPU compute for heavy ML training, 3D rendering, and simulations.	stateful_desktop	gpu	8	16384	8192	f	33	10500	INR	3	t	2026-04-08 01:52:11.998	2026-04-08 10:30:07.846	\N	\N	Large model training, complex 3D rendering, GPU-intensive simulations	RTX 4090	2
28a49cc2-a6c4-4387-a93f-9d48c153bb6e	supernova	Supernova	Premium GPU compute with near-exclusive access for research and large-scale workloads.	stateful_desktop	gpu-exclusive	12	32768	16384	f	67	15500	INR	4	t	2026-04-08 01:52:12.005	2026-04-08 10:30:07.851	\N	\N	Large-scale deep learning, exclusive research sessions, production inference	RTX 4090	1
\.


--
-- TOC entry 6033 (class 0 OID 118920)
-- Dependencies: 261
-- Data for Name: course_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.course_enrollments (id, course_id, user_id, status, enrolled_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6032 (class 0 OID 118904)
-- Dependencies: 260
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.courses (id, organization_id, department_id, instructor_id, title, code, description, semester, academic_year, status, default_compute_config_id, max_students, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6039 (class 0 OID 119012)
-- Dependencies: 267
-- Data for Name: coursework_content; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.coursework_content (id, organization_id, category, title, description, content_url, thumbnail_url, difficulty_level, tags, is_featured, view_count, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6023 (class 0 OID 118739)
-- Dependencies: 251
-- Data for Name: credit_packages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.credit_packages (id, name, amount_cents, credit_cents, bonus_cents, validity_days, is_active, sort_order, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6004 (class 0 OID 118433)
-- Dependencies: 232
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, university_id, parent_id, name, code, slug, head_user_id, is_active, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6045 (class 0 OID 119118)
-- Dependencies: 273
-- Data for Name: discussion_replies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discussion_replies (id, discussion_id, parent_reply_id, author_id, body, is_accepted_answer, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6044 (class 0 OID 119098)
-- Dependencies: 272
-- Data for Name: discussions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discussions (id, organization_id, course_id, lab_id, author_id, title, body, is_pinned, is_locked, reply_count, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6054 (class 0 OID 119253)
-- Dependencies: 282
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.feature_flags (id, key, enabled, rollout_percent, allowed_org_ids, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6031 (class 0 OID 118889)
-- Dependencies: 259
-- Data for Name: invoice_line_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_line_items (id, invoice_id, description, quantity, unit_price_cents, total_cents, reference_type, reference_id, created_at) FROM stdin;
88c3ef2c-c9cb-46a5-8ed9-89751bdeff42	bc8832cd-107d-4fbb-b56a-b2224a8d4b68	Credit Recharge	1	50000	50000	payment_transaction	e1cd144f-4620-4cc5-9cc9-8a956297df47	2026-04-26 09:46:09.321
df15fa9c-e2e4-481d-94bc-5109796c312d	9568aa81-99fb-4315-af49-bf7267d56fde	Credit Recharge	1	25000	25000	payment_transaction	47355c4d-422a-4ca6-a143-294db0c720c7	2026-04-26 11:13:01.653
544b0154-afb8-4b7f-8558-64fa0b0f746b	e61c3c86-2fd5-457d-a833-aca45e58fc3d	Credit Recharge	1	100000	100000	payment_transaction	c7fa6295-7798-4c2c-96e2-13942d5eae26	2026-04-26 15:04:13.487
\.


--
-- TOC entry 6030 (class 0 OID 118867)
-- Dependencies: 258
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, user_id, organization_id, invoice_number, period_start, period_end, subtotal_cents, tax_cents, total_cents, currency, status, issued_at, paid_at, pdf_url, created_at, updated_at, created_by, updated_by) FROM stdin;
bc8832cd-107d-4fbb-b56a-b2224a8d4b68	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	INV-20260426-C50ED6	2026-04-26 09:46:09.296	2026-04-26 09:46:09.296	50000	0	50000	INR	paid	2026-04-26 09:46:09.296	2026-04-26 09:46:09.296	\N	2026-04-26 09:46:09.315	2026-04-26 09:46:09.315	\N	\N
9568aa81-99fb-4315-af49-bf7267d56fde	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	INV-20260426-D39B1C	2026-04-26 11:13:01.643	2026-04-26 11:13:01.643	25000	0	25000	INR	paid	2026-04-26 11:13:01.643	2026-04-26 11:13:01.643	\N	2026-04-26 11:13:01.651	2026-04-26 11:13:01.651	\N	\N
e61c3c86-2fd5-457d-a833-aca45e58fc3d	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	INV-20260426-AFB48A	2026-04-26 15:04:13.474	2026-04-26 15:04:13.474	100000	0	100000	INR	paid	2026-04-26 15:04:13.474	2026-04-26 15:04:13.474	\N	2026-04-26 15:04:13.483	2026-04-26 15:04:13.483	\N	\N
\.


--
-- TOC entry 6036 (class 0 OID 118961)
-- Dependencies: 264
-- Data for Name: lab_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_assignments (id, lab_id, title, description, instructions, due_at, max_score, allow_late_submission, late_penalty_percent, max_attempts, rubric, sort_order, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6038 (class 0 OID 118999)
-- Dependencies: 266
-- Data for Name: lab_grades; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_grades (id, submission_id, graded_by, score, max_score, feedback, rubric_scores, graded_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6035 (class 0 OID 118949)
-- Dependencies: 263
-- Data for Name: lab_group_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_group_assignments (id, lab_id, user_group_id, assigned_by, available_from, available_until, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6037 (class 0 OID 118983)
-- Dependencies: 265
-- Data for Name: lab_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_submissions (id, lab_assignment_id, user_id, session_id, attempt_number, status, submitted_at, file_ids, notes, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6034 (class 0 OID 118933)
-- Dependencies: 262
-- Data for Name: labs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.labs (id, course_id, organization_id, created_by_user_id, title, description, instructions, compute_config_id, base_image_id, preloaded_notebook_url, preloaded_dataset_urls, max_duration_minutes, status, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 5996 (class 0 OID 118098)
-- Dependencies: 224
-- Data for Name: login_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.login_history (login_method, ip_address, user_agent, "geoLocation", success, failure_reason, created_at, created_by, id, user_id) FROM stdin;
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 08:59:48.114	\N	6e51019f-828c-4074-a0ff-75a29bb0c5e7	4e4433d2-26f4-4fd6-979a-c21e0387d893
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 09:08:51.182	\N	616b3ac0-4109-404a-9721-91c59f1feb31	4e4433d2-26f4-4fd6-979a-c21e0387d893
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 09:21:31.685	\N	b8b0de2e-fad3-4318-aa3b-f542cc20e60c	4e4433d2-26f4-4fd6-979a-c21e0387d893
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 09:36:27.01	\N	80b97c34-5991-4e6c-8a66-f3b0f81092b7	79053f7d-41af-4651-ad54-6f792e94501e
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 09:44:23.717	\N	368d3daa-77a8-4f93-9dfe-e7d55af0ee91	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 10:01:07.423	\N	81b9f38b-6084-4c5b-9aa7-8930dd1d7ade	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 10:08:55.024	\N	4c1b60a7-f2ae-4f07-a12e-ee3ca2e76db4	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 10:31:19.134	\N	97c45523-bd54-4696-8a13-a8d76db2e8ba	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 10:47:01.246	\N	4fc39aba-734c-475d-a0cb-c6d7a81ddbc5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 11:12:28.782	\N	d4e586c2-c927-46ca-b829-368416704ef3	4e4433d2-26f4-4fd6-979a-c21e0387d893
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 11:21:27.517	\N	fa366b9f-0beb-412a-96e3-c88f5a124021	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 11:28:40.871	\N	6cc4898a-e6f1-4f2d-a70d-cf4b53ba9a49	4e4433d2-26f4-4fd6-979a-c21e0387d893
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 11:51:22.859	\N	edf1344d-58f4-47dc-9be3-4c672fcae233	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 13:14:29.52	\N	4c568d02-a310-43c2-93f6-8b713c1691bc	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
oauth	127.0.0.1	\N	\N	t	\N	2026-04-26 15:22:30.775	\N	a7515650-ed05-475a-ada7-2a656ac32399	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
\.


--
-- TOC entry 6041 (class 0 OID 119051)
-- Dependencies: 269
-- Data for Name: mentor_availability_slots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_availability_slots (id, mentor_profile_id, day_of_week, specific_date, start_time, end_time, is_recurring, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6042 (class 0 OID 119067)
-- Dependencies: 270
-- Data for Name: mentor_bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_bookings (id, mentor_profile_id, student_user_id, scheduled_at, duration_minutes, status, meeting_url, payment_transaction_id, amount_cents, notes, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6040 (class 0 OID 119029)
-- Dependencies: 268
-- Data for Name: mentor_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_profiles (id, user_id, headline, bio, expertise_areas, experience_years, price_per_hour_cents, currency, is_available, avg_rating, total_reviews, total_sessions, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6043 (class 0 OID 119084)
-- Dependencies: 271
-- Data for Name: mentor_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mentor_reviews (id, mentor_booking_id, reviewer_user_id, rating, review_text, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6014 (class 0 OID 118587)
-- Dependencies: 242
-- Data for Name: node_base_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.node_base_images (node_id, base_image_id, status, pulled_at, error_message, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6060 (class 0 OID 120169)
-- Dependencies: 288
-- Data for Name: node_resource_reservations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.node_resource_reservations (id, node_id, session_id, reserved_vcpu, reserved_memory_mb, reserved_gpu_vram_mb, reserved_hami_sm_percent, reserved_at, released_at, status, created_at, updated_at) FROM stdin;
d8eff17f-754e-49b8-93ec-57e581a83b1d	c9868115-ff99-403c-8e87-06124ba7df66	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	2	4096	2048	8	2026-04-26 11:11:33.34	2026-04-26 11:11:35.478	released	2026-04-26 11:11:33.34	2026-04-26 11:11:35.483
bff2ad38-2783-4e7a-b139-32e4d3ba16af	c9868115-ff99-403c-8e87-06124ba7df66	99dac3f5-676c-43e3-b163-0a46687e89b2	2	4096	2048	8	2026-04-26 13:15:56.336	2026-04-26 13:15:58.49	released	2026-04-26 13:15:56.336	2026-04-26 13:15:58.497
fe9c58f5-46e9-4e47-a116-b0469e50d3ee	c9868115-ff99-403c-8e87-06124ba7df66	ccb2e98a-d188-464b-9e5e-e14fe48897ea	8	16384	8192	33	2026-04-26 13:23:46.901	2026-04-26 13:34:09.708	released	2026-04-26 13:23:46.901	2026-04-26 13:34:09.712
e6193543-9424-41a5-861e-6d1254ad7b54	16a6c6a8-aca5-40b5-b0bd-a4f908f35bbf	3df69081-26f0-4b72-84fc-2cd5c1a2a78c	12	32768	16384	67	2026-04-26 15:06:58.999	2026-04-26 15:06:59.327	released	2026-04-26 15:06:58.999	2026-04-26 15:06:59.334
b5c9ab78-e778-4848-b92e-7dac75b234ed	c9868115-ff99-403c-8e87-06124ba7df66	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	12	32768	16384	67	2026-04-26 15:04:27.91	2026-04-26 15:39:00.875	released	2026-04-26 15:04:27.91	2026-04-26 15:39:00.882
08661f6a-9403-4363-bc04-6bdb7e8e9624	16a6c6a8-aca5-40b5-b0bd-a4f908f35bbf	bdbaa558-00ea-4d6e-98f6-013330fb4339	12	32768	16384	67	2026-04-26 15:22:49.048	2026-04-26 15:39:06.067	released	2026-04-26 15:22:49.048	2026-04-26 15:39:06.072
\.


--
-- TOC entry 6012 (class 0 OID 118551)
-- Dependencies: 240
-- Data for Name: nodes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nodes (id, hostname, display_name, ip_management, ip_compute, ip_storage, cpu_model, total_vcpu, total_memory_mb, total_gpu_vram_mb, gpu_model, nvme_total_gb, allocated_vcpu, allocated_memory_mb, allocated_gpu_vram_mb, max_concurrent_sessions, status, last_heartbeat_at, metadata, created_at, updated_at, created_by, updated_by, current_session_count, last_resource_sync_at, session_orchestration_port, storage_provision_port, nvme_of_port, storage_headroom_gb) FROM stdin;
c9868115-ff99-403c-8e87-06124ba7df66	laas-node-01	LaaS Node 01 — RTX 4090	100.88.57.107	100.88.57.107	10.10.100.99	AMD Ryzen 9 7950X3D	16	65536	24576	RTX 4090	2000	0	0	0	8	healthy	\N	{"smTotal": 128, "cudaArch": "sm_89", "reservedVcpu": 2, "driverVersion": "565.x", "allocatableVcpu": 14, "reservedMemoryMb": 10240, "reservedGpuVramMb": 1024, "allocatableMemoryMb": 55296, "allocatableGpuVramMb": 23552}	2026-04-08 01:52:12.012	2026-04-26 15:39:00.885	\N	\N	0	\N	9998	9999	4420	15
16a6c6a8-aca5-40b5-b0bd-a4f908f35bbf	laas-node-02	LaaS Node 02 — RTX 4090	100.94.157.114	100.94.157.114	10.10.100.88	AMD Ryzen 9 7950X3D	16	65536	24576	RTX 4090	2000	0	0	0	8	healthy	\N	{"smTotal": 128, "cudaArch": "sm_89", "reservedVcpu": 2, "driverVersion": "565.x", "allocatableVcpu": 14, "reservedMemoryMb": 10240, "reservedGpuVramMb": 1024, "allocatableMemoryMb": 55296, "allocatableGpuVramMb": 23552}	2026-04-26 12:53:44.426	2026-04-26 15:39:06.075	\N	\N	0	\N	9998	9999	4420	15
\.


--
-- TOC entry 6049 (class 0 OID 119182)
-- Dependencies: 277
-- Data for Name: notification_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_templates (id, slug, channel, subject_template, body_template, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6050 (class 0 OID 119196)
-- Dependencies: 278
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, template_id, channel, title, body, data, status, sent_at, read_at, delivery_attempts, last_delivery_error, delivery_confirmed_at, created_at) FROM stdin;
\.


--
-- TOC entry 6026 (class 0 OID 118798)
-- Dependencies: 254
-- Data for Name: org_contracts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.org_contracts (id, organization_id, contract_name, starts_at, ends_at, max_seats, billing_model, total_credits_cents, used_credits_cents, status, notes, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6027 (class 0 OID 118814)
-- Dependencies: 255
-- Data for Name: org_resource_quotas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.org_resource_quotas (id, organization_id, max_concurrent_sessions_per_org, max_concurrent_stateful_per_user, max_concurrent_ephemeral_per_user, max_registered_users, max_storage_per_user_mb, allowed_session_types, max_booking_hours_per_day, max_gpu_vram_mb_total, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 5997 (class 0 OID 118110)
-- Dependencies: 225
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (name, slug, logo_url, billing_email, is_active, created_at, updated_at, deleted_at, created_by, updated_by, id, org_type, university_id) FROM stdin;
Public	public	\N	\N	t	2026-04-08 01:52:11.915	2026-04-08 01:52:11.915	\N	\N	\N	07b07401-b326-4045-af3a-44a7c45e56d8	public_	\N
LaaS Academy	laas-academy	\N	\N	t	2026-04-08 01:52:11.93	2026-04-08 01:52:11.93	\N	\N	\N	0cdb29b2-5017-450d-97e4-71b80be8b535	university	\N
KSRCE	ksrce	\N	\N	t	2026-04-08 01:52:11.957	2026-04-08 01:52:11.957	\N	\N	\N	ab1a510d-296b-49d2-9faf-5fb7b5ac1332	university	f213bc95-2fe5-4401-94c1-39efeaa39a5a
\.


--
-- TOC entry 6010 (class 0 OID 118523)
-- Dependencies: 238
-- Data for Name: os_switch_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.os_switch_history (id, user_id, old_os, new_os, old_volume_id, new_volume_id, confirmation_text, ip_address, created_at, created_by) FROM stdin;
\.


--
-- TOC entry 5993 (class 0 OID 118056)
-- Dependencies: 221
-- Data for Name: otp_verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.otp_verifications (email, code_hash, purpose, attempts, expires_at, used_at, created_at, id, user_id) FROM stdin;
test-mail101@gmail.com	$2b$10$agT4/fPZG1CD/ox.E1z54.Xuy/rlm1HvBubbTCWNM.nNkIe399/fq	email_verification	0	2026-04-26 09:32:59.789	2026-04-26 09:23:17.214	2026-04-26 09:22:59.791	fa5be73e-9510-4178-ada1-bf54d6436850	\N
test-accn102@gmail.com	$2b$10$9Cl7yr0DjxFHPUo4uTN9Z.1sduSIkjrZ.wAjcqQiqLkTyZ2zDV7OW	email_verification	0	2026-04-26 09:39:04.668	2026-04-26 09:29:33.139	2026-04-26 09:29:04.669	ac57dbfe-64b5-40e5-95aa-8829b2618ef1	\N
\.


--
-- TOC entry 6028 (class 0 OID 118832)
-- Dependencies: 256
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_transactions (id, user_id, gateway, gateway_txn_id, gateway_order_id, amount_cents, currency, status, gateway_response, refund_amount_cents, refunded_at, created_at, updated_at, created_by, updated_by) FROM stdin;
e1cd144f-4620-4cc5-9cc9-8a956297df47	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	razorpay	pay_Si4oeh3ueLifZR	order_Si4oWNHAcKtbh3	50000	INR	completed	{"verified_at": "2026-04-26T09:46:09.296Z", "razorpay_order_id": "order_Si4oWNHAcKtbh3", "razorpay_signature": "2456a1c67e5d4b6c2e0cd388267085159d42c3c464369d06d03afb80a81f5793", "razorpay_payment_id": "pay_Si4oeh3ueLifZR"}	\N	\N	2026-04-26 09:45:43.198	2026-04-26 09:46:09.303	\N	\N
47355c4d-422a-4ca6-a143-294db0c720c7	4e4433d2-26f4-4fd6-979a-c21e0387d893	razorpay	pay_Si6IRGHxex09s2	order_Si6IJ2uHfv076e	25000	INR	completed	{"verified_at": "2026-04-26T11:13:01.643Z", "razorpay_order_id": "order_Si6IJ2uHfv076e", "razorpay_signature": "5b1dc87604813e0a5aafccc5e28154e148ccecf6ca5d94c5ec623e86ad17faed", "razorpay_payment_id": "pay_Si6IRGHxex09s2"}	\N	\N	2026-04-26 11:12:36.432	2026-04-26 11:13:01.645	\N	\N
c7fa6295-7798-4c2c-96e2-13942d5eae26	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	razorpay	pay_SiAEeZ9US2UpgI	order_SiAEXzJNQdieRy	100000	INR	completed	{"verified_at": "2026-04-26T15:04:13.474Z", "razorpay_order_id": "order_SiAEXzJNQdieRy", "razorpay_signature": "68fdf72728b76040e1db63c3dd7d16c05c7ae252f33e6af89e0c1299fff8eb1c", "razorpay_payment_id": "pay_SiAEeZ9US2UpgI"}	\N	\N	2026-04-26 15:03:49.111	2026-04-26 15:04:13.476	\N	\N
\.


--
-- TOC entry 5999 (class 0 OID 118140)
-- Dependencies: 227
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (code, description, module, created_at, updated_at, created_by, updated_by, id) FROM stdin;
\.


--
-- TOC entry 6046 (class 0 OID 119134)
-- Dependencies: 274
-- Data for Name: project_showcases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_showcases (id, user_id, organization_id, title, description, project_url, thumbnail_url, tags, is_featured, view_count, like_count, status, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6064 (class 0 OID 124649)
-- Dependencies: 292
-- Data for Name: recommendation_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recommendation_sessions (id, user_id, workload_description, document_file_name, document_extracted_text, analysis_result, analysis_quality, analysis_confidence, detected_goal, detected_vram_gb, detected_intensity, detected_frameworks, selected_goal, selected_dataset_size, selected_intensity, selected_budget_type, selected_budget_amount, selected_duration, goal_auto_selected, dataset_auto_selected, intensity_auto_selected, recommendations, selected_config_slug, created_at, updated_at, completed_at) FROM stdin;
\.


--
-- TOC entry 6062 (class 0 OID 124613)
-- Dependencies: 290
-- Data for Name: referral_conversions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.referral_conversions (id, referral_id, referrer_user_id, referred_user_id, status, signup_method, signup_completed_at, first_payment_at, first_payment_amount_cents, first_payment_txn_id, reward_amount_cents, reward_status, reward_credited_at, reward_wallet_txn_id, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 6063 (class 0 OID 124636)
-- Dependencies: 291
-- Data for Name: referral_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.referral_events (id, referral_id, referral_conversion_id, event_type, previous_status, new_status, metadata, actor_type, actor_id, created_at) FROM stdin;
\.


--
-- TOC entry 6061 (class 0 OID 124591)
-- Dependencies: 289
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.referrals (id, referrer_user_id, referral_code, referral_url, is_active, total_clicks, total_signups, total_rewards_cents, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5995 (class 0 OID 118085)
-- Dependencies: 223
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (token_hash, "deviceInfo", ip_address, expires_at, revoked_at, created_at, token_version, id, user_id) FROM stdin;
$2b$10$TrcKr3K6A6UBDl8QZfFbeOLglUhzQWDyzoEfU4btU8UUOJZqeG9ly	\N	\N	2026-05-03 08:59:48.212	\N	2026-04-26 08:59:48.214	0	b4d803ac-829b-4e36-836f-67d709685f2e	4e4433d2-26f4-4fd6-979a-c21e0387d893
$2b$10$fKYMmE2P7uA.tWVEMPejLuFtr4kkpJmovn8mZGSan6YrXxaeoPEHq	\N	\N	2026-05-03 09:08:51.41	\N	2026-04-26 09:08:51.412	0	912b5c3e-e58b-42be-975a-13ffdc531600	4e4433d2-26f4-4fd6-979a-c21e0387d893
$2b$10$lmHo4Yk4kGOB8PMC43pDDO78KdWoYY/N.jQ23BQMzbzQYD4WwauWa	\N	\N	2026-05-03 09:21:31.9	\N	2026-04-26 09:21:31.901	0	9edf37c9-3ae4-4925-b06d-290816287a95	4e4433d2-26f4-4fd6-979a-c21e0387d893
$2b$10$a2hs.ZPvVAvTUhGo/S7ptuL4H.WZs6AJqFVp5h9QjTgeauyGvkeRG	\N	\N	2026-05-03 09:23:40.109	\N	2026-04-26 09:23:40.111	0	947ecbff-4421-41d5-9986-d8762f797797	34d78d40-7462-46ae-9f62-9ad524fb1b46
$2b$10$faJDEcyKSwquX.YOAFQkOOD1rquPOkKIVmPUXunebEy6muc0AXlqC	\N	\N	2026-05-03 09:29:55.175	\N	2026-04-26 09:29:55.177	0	dfd23e81-8011-4ae6-af7b-2d506974fbf5	9dccf90c-52b2-4928-b726-fcc4675efe8b
$2b$10$tbHYi1pdjgt.nnNQodmMN.rDzKd8fe1gefjUGy9okcFIsJ9bPFmKm	\N	\N	2026-05-03 09:36:27.115	\N	2026-04-26 09:36:27.117	0	aedf2084-78e1-4edb-a775-d38b030af40c	79053f7d-41af-4651-ad54-6f792e94501e
$2b$10$GKKvXnvr0zepAkSsRflg/OsE9yq8Wx6pxZKgdfHVzzVzqkBA4ql8y	\N	\N	2026-05-03 09:44:23.837	\N	2026-04-26 09:44:23.838	0	1d81d446-485e-4ecc-9914-c95a32eed49d	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$Hg.JCbFp7dkix4YwOYPRhOZ.7V3qvuze7Yo1YqncfigWNT34ZIs0O	\N	\N	2026-05-03 10:01:07.593	\N	2026-04-26 10:01:07.594	0	3f402e32-86db-4c63-b387-9b5d92b20432	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$P3nbBLjkzkkcWLjimdgrRe.71r8n13Rx/tgSKdcLmnhPsAobIrK1y	\N	\N	2026-05-03 10:08:55.218	2026-04-26 10:21:56.303	2026-04-26 10:08:55.22	0	d4ff8ca2-f075-4122-9540-d430b8f23c94	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$AOLgyefuIPAPOlMbtxDJmerJByGlIIH.zSwSMz2P7WI5RHZD6mNTe	\N	\N	2026-05-03 10:21:56.38	\N	2026-04-26 10:21:56.381	0	2801d827-16ae-478c-9b30-18b1718be2ac	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$RO2Hy6VKMWojJrIRuXzvVeD/tQhmGivyrEd1K8EV77XevxIimAfSK	\N	\N	2026-05-03 10:31:19.306	2026-04-26 10:44:19.34	2026-04-26 10:31:19.308	0	e1810fd1-e464-4505-93db-2f19b2907346	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$3iWWU2IWdIBjpFmg6M6.ceN3AHLJXI1Fo10Cr9YFx5rzxfbmevXtK	\N	\N	2026-05-03 10:44:19.445	\N	2026-04-26 10:44:19.446	0	2ec4e6ab-e6bc-452a-84cd-c69451605a2c	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$JMtj8jZvJS6WLSD6UD7JmewE85PTa.NMrXeMQHxmWZeJ9eycbeifS	\N	\N	2026-05-03 10:47:01.414	2026-04-26 11:00:26.272	2026-04-26 10:47:01.416	0	00285d16-7849-4936-a144-f68be95ff11e	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$k33zxbdSCpeb2OuMalQgxukRMzFvYkRiNhXnuK.ZKRFvNOQM5ti.u	\N	\N	2026-05-03 11:00:26.367	\N	2026-04-26 11:00:26.368	0	8e343114-89a8-495e-8f31-c530175073d4	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$fVLvT1jFpgHgu2ilsFutF.DO65nAfwR2sFURBF45co76PSEGAt9Au	\N	\N	2026-05-03 11:12:28.965	\N	2026-04-26 11:12:28.967	0	426118dd-c0ba-4c31-9bc0-007fdff6c65d	4e4433d2-26f4-4fd6-979a-c21e0387d893
$2b$10$xO45r0fOZUAc1SHgBzl4I.HuDCPHj4H18Gft95471nsjrANV1GUbO	\N	\N	2026-05-03 11:21:27.681	\N	2026-04-26 11:21:27.682	0	96483046-563c-464f-9751-ed74bc9e7087	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$OtcGyW4xtKymg/fBSftiUup9MRRitB7TyxQUuTXavZOvv/kpjWRle	\N	\N	2026-05-03 11:28:41.067	2026-04-26 11:42:19.3	2026-04-26 11:28:41.069	0	e8e90c7e-e276-487f-8a2b-a859ef80ae97	4e4433d2-26f4-4fd6-979a-c21e0387d893
$2b$10$Ud0wbbZ8OmFGw7fjiCDtaeMfJUX7aaBaSFe4V/xIfh.w0ofi7JFF6	\N	\N	2026-05-03 11:42:19.381	\N	2026-04-26 11:42:19.383	0	b6930cfd-1a25-48b5-ba50-ba89c84609da	4e4433d2-26f4-4fd6-979a-c21e0387d893
$2b$10$pRGDXcRurGg/WSW1D0xQX.0xCJE3u7xRa.zG.pOlTmKm0HDutj92G	\N	\N	2026-05-03 11:51:23.03	2026-04-26 12:05:16.816	2026-04-26 11:51:23.031	0	cecfc888-31e5-4acf-956e-fd3910d440e8	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$ywdnvbiSNIpKQD/gwjUoUOtuxhm0cH3ikpT90FdAPfAjvOiCsQN2C	\N	\N	2026-05-03 12:05:16.978	2026-04-26 12:18:36.293	2026-04-26 12:05:16.979	0	54e4a6f9-a4ab-4eae-8099-1bd6d586d44e	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$1uirPrUg8wXlIGstaCqS0el6vZehf0bFAuW.IkRtb8/45h/HrlO7y	\N	\N	2026-05-03 12:18:36.387	2026-04-26 12:31:36.352	2026-04-26 12:18:36.388	0	672c24ca-3356-4f33-86bd-c680acf899d0	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$kxlO6P8OsueZewzP6uoqWOECnnYdyEWvVSmF.aXuaV.nxfQqmgqOC	\N	\N	2026-05-03 12:31:36.535	\N	2026-04-26 12:31:36.537	0	a976eb71-91e1-40a2-8f9c-673310dbe9e3	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$j6htvG8XSiDEGa9Bkj7aK.Sfpet7s4YyqsnyaOjF4BFR0ShGrKXt.	\N	\N	2026-05-03 13:14:29.748	2026-04-26 13:27:31.576	2026-04-26 13:14:29.75	0	dfe6863b-0bc0-464a-a44c-6e13c9ec8514	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$vU8ATxgvfjVvx6ejr7VV8elELGJ848QhDazin2zULCE16RLJoeLdm	\N	\N	2026-05-03 13:27:31.684	2026-04-26 13:40:47.658	2026-04-26 13:27:31.686	0	325643be-1066-4456-b1c3-779336ad8478	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$jiGOc81j6X.DrlF01SpXV.LUNr9JzfHCtv0dePVPHZWYbqI61M91u	\N	\N	2026-05-03 13:40:47.73	2026-04-26 13:54:19.273	2026-04-26 13:40:47.731	0	c3bce876-e5d9-4d70-b309-81f1f761ffea	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$VKQKhxCYoj6e0/M1ofxt0uV34pWOr499zDre2B2CH10KvJgKV5eCm	\N	\N	2026-05-03 15:22:30.994	2026-04-26 15:36:20.828	2026-04-26 15:22:30.995	0	e5278bfd-8cc5-42c5-b2b9-c1ea8887793e	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$ptyBMwsRX7X7PFLxhDXpweFC2Ydv.7XWK3/S.3jwq3o48ORe3ICoO	\N	\N	2026-05-03 13:54:19.343	2026-04-26 14:26:02.572	2026-04-26 13:54:19.344	0	056ce52f-1af9-4d01-b2bf-398a6d62723e	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$df7LG3/tsepzY7pcsFkmP..EEvhTWWvlSEh7ZsU295sl6/iCQgtDK	\N	\N	2026-05-03 14:26:02.587	\N	2026-04-26 14:26:02.588	0	8885ee3a-2f99-4bde-9f28-ab21f38e590b	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$6m7Ok9sOWujfPN6NCstcKuwigBMDM2zTezjF3drB.PHv7.3CzpYRS	\N	\N	2026-05-03 14:26:02.694	2026-04-26 14:54:54.899	2026-04-26 14:26:02.695	0	5869405c-3190-40f0-807a-6fb15238118d	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$wVVS1XSudzqbo6Ok/jTou.nG/pm3/DsXGgsDTrmJFBQvaOmrAVDIW	\N	\N	2026-05-03 14:54:55.014	\N	2026-04-26 14:54:55.016	0	d2afebfd-24cd-49ce-b670-47341bdc9aef	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$IcpgWYPixrr5Pi7DVcfmRel1FamYexGeZ1rr554ek1gZBF32ZBcZ2	\N	\N	2026-05-03 14:54:55.019	2026-04-26 15:08:19.28	2026-04-26 14:54:55.022	0	f5b5a143-47d9-453a-b89f-66831c5ed6f9	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$aj2wj.PRB56hWZ5.HQYQvuEjmZZwsGBSmB9IKWOjksrbVnBm7Iwty	\N	\N	2026-05-03 15:08:19.365	2026-04-26 15:21:48.381	2026-04-26 15:08:19.366	0	1c87f3af-7683-42df-b68b-880309fd671b	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$XyY/y30Fx4EpZL10LZPXMumyNME3SlwZORgIGQIF0NNmMEAueGQea	\N	\N	2026-05-03 15:21:48.482	\N	2026-04-26 15:21:48.483	0	f510edef-c438-4902-a3cc-4e89a7f630de	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$epFJbl1GhXQPWTI2gmtmdeW2Gs90CpNr/dKzA3Z6NS2h4gVFOUpvC	\N	\N	2026-05-03 15:36:21.026	2026-04-26 15:49:20.679	2026-04-26 15:36:21.027	0	916fff91-af8d-4069-baf3-2a3f23af681c	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$IRuytNPOXMtV4LAIr3vPvuaRASCzpvpZyMCHl5IMI.FCDExoG4rHO	\N	\N	2026-05-03 15:49:20.761	2026-04-26 16:02:21.744	2026-04-26 15:49:20.762	0	dc6dc68c-c7e3-4943-9d4f-0832ef0f44f7	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
$2b$10$mGG1bat1r7MPL413f5/xaOK2EMs7.nBcCwhiOLlU3v8loB7v9X7wO	\N	\N	2026-05-03 16:02:22.048	\N	2026-04-26 16:02:22.05	0	719a414c-ec9f-4c25-9012-4ee877a8874b	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934
\.


--
-- TOC entry 6000 (class 0 OID 118152)
-- Dependencies: 228
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_id, permission_id) FROM stdin;
\.


--
-- TOC entry 5998 (class 0 OID 118126)
-- Dependencies: 226
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (name, display_name, description, is_system, created_at, updated_at, created_by, updated_by, id) FROM stdin;
super_admin	super admin	\N	t	2026-04-08 01:52:11.823	2026-04-08 01:52:11.823	\N	\N	2bc0c1c5-fd1d-4b5d-aa30-b648a6604642
org_admin	org admin	\N	t	2026-04-08 01:52:11.848	2026-04-08 01:52:11.848	\N	\N	e9d7875e-a245-4d46-aa3d-a366bfdc75cf
billing_admin	billing admin	\N	t	2026-04-08 01:52:11.856	2026-04-08 01:52:11.856	\N	\N	6d11d58b-6d2b-4462-9ec0-550609b92586
faculty	faculty	\N	t	2026-04-08 01:52:11.863	2026-04-08 01:52:11.863	\N	\N	2775c6de-8e14-40a9-904f-6622d3950a08
lab_instructor	lab instructor	\N	t	2026-04-08 01:52:11.872	2026-04-08 01:52:11.872	\N	\N	460a57ea-17fc-4fdd-926b-b17348700f9f
mentor	mentor	\N	t	2026-04-08 01:52:11.88	2026-04-08 01:52:11.88	\N	\N	5704746a-6623-4b8b-a9fb-9fcef85fd237
student	student	\N	t	2026-04-08 01:52:11.888	2026-04-08 01:52:11.888	\N	\N	f231dfb8-cb4c-4942-bb56-852cf0884569
external_student	external student	\N	t	2026-04-08 01:52:11.896	2026-04-08 01:52:11.896	\N	\N	f870be4a-548d-4014-ab9b-19c286971ee4
public_user	public user	\N	t	2026-04-08 01:52:11.905	2026-04-08 01:52:11.905	\N	\N	42abadfe-edfa-4b0e-985d-adaa65091959
\.


--
-- TOC entry 6019 (class 0 OID 118674)
-- Dependencies: 247
-- Data for Name: session_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session_events (id, session_id, event_type, payload, client_ip, created_at) FROM stdin;
02723554-b79b-438c-aaab-cdd7e2a23083	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	session_created	{"configName": "Spark", "configSlug": "spark", "storageType": "stateful", "instanceName": "gpu-instance-cgy6", "interfaceMode": "gui"}	\N	2026-04-26 11:11:33.352
ac7327f2-75c3-42e7-9da3-560ba73d950a	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	launch_initiated	{"launchId": "f7a0df7d-6562-4f30-85d6-33739dbb8fbf", "containerName": "laas-95b6fb9e"}	\N	2026-04-26 11:11:33.432
b4a1cfab-d200-4f51-bda1-51938ab20925	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	launch_scheduling	{"ts": "2026-04-26T11:11:34.500997+00:00", "status": "in_progress", "message": "Validating launch parameters..."}	\N	2026-04-26 11:11:35.463
842a25d1-4560-46fc-bd92-4d8b887c80c3	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	launch_scheduling	{"ts": "2026-04-26T11:11:34.601186+00:00", "status": "completed", "message": "Parameters validated successfully"}	\N	2026-04-26 11:11:35.465
f56d0ed9-bc1c-4831-86a6-fced94a52d9b	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	launch_allocating_ports	{"ts": "2026-04-26T11:11:34.601307+00:00", "status": "in_progress", "message": "Finding available port triplet..."}	\N	2026-04-26 11:11:35.467
75f11740-1a0f-4166-a0f1-1ccfa9d83b45	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	launch_allocating_ports	{"ts": "2026-04-26T11:11:34.623241+00:00", "status": "completed", "message": "Allocated ports: nginx=8101, selkies=9101, metrics=19101, display=:20"}	\N	2026-04-26 11:11:35.468
1ddc8712-e6bc-4af8-ab0f-f56fa2bc6e02	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	launch_allocating_cpus	{"ts": "2026-04-26T11:11:34.623250+00:00", "status": "in_progress", "message": "Finding 2 contiguous CPU cores..."}	\N	2026-04-26 11:11:35.469
4e097bda-765c-4884-bfac-edd0a6158dcd	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	launch_allocating_cpus	{"ts": "2026-04-26T11:11:34.631934+00:00", "status": "completed", "message": "Allocated CPU cores: 2-3"}	\N	2026-04-26 11:11:35.471
05779d22-3b17-4729-b8a7-676b42f565d8	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	launch_validating_mount	{"ts": "2026-04-26T11:11:34.631948+00:00", "status": "in_progress", "message": "Verifying local ZFS zvol for u_598e2807eab421ae4e8da461..."}	\N	2026-04-26 11:11:35.472
b6b3373a-210e-4b82-bdab-147ec6a9319e	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	launch_validating_mount	{"ts": "2026-04-26T11:11:34.631993+00:00", "status": "failed", "message": "Local ZFS verification failed: [Errno 13] Permission denied: '/mnt/local-zvol'"}	\N	2026-04-26 11:11:35.473
6d419fcb-ddfc-40ed-a361-241f61ad1c4f	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	launch_failed	{"reason": "Local ZFS verification failed: [Errno 13] Permission denied: '/mnt/local-zvol'"}	\N	2026-04-26 11:11:35.492
89789c19-37bb-4cfa-b05c-2e1700b30c33	99dac3f5-676c-43e3-b163-0a46687e89b2	session_created	{"configName": "Spark", "configSlug": "spark", "storageType": "stateful", "instanceName": "gpu-instance-arli", "interfaceMode": "gui"}	\N	2026-04-26 13:15:56.348
672ac3c9-6b6d-4a5d-8ce7-2cd081dc4919	99dac3f5-676c-43e3-b163-0a46687e89b2	launch_initiated	{"launchId": "761605f7-c205-4f0f-8d83-a0dffa1a22a6", "containerName": "laas-99dac3f5"}	\N	2026-04-26 13:15:56.424
850ebdf9-d899-41db-b612-dc015156b554	99dac3f5-676c-43e3-b163-0a46687e89b2	launch_scheduling	{"ts": "2026-04-26T13:15:57.639245+00:00", "status": "in_progress", "message": "Validating launch parameters..."}	\N	2026-04-26 13:15:58.466
3139da75-ede5-4f96-a2b5-3ba1655a76c5	99dac3f5-676c-43e3-b163-0a46687e89b2	launch_scheduling	{"ts": "2026-04-26T13:15:57.739414+00:00", "status": "completed", "message": "Parameters validated successfully"}	\N	2026-04-26 13:15:58.468
fa1a5373-21b6-4ca7-8858-8cc6cf777a87	99dac3f5-676c-43e3-b163-0a46687e89b2	launch_allocating_ports	{"ts": "2026-04-26T13:15:57.739539+00:00", "status": "in_progress", "message": "Finding available port triplet..."}	\N	2026-04-26 13:15:58.47
1485c0f5-5c68-4ab7-a687-6ba0ee5a02b6	99dac3f5-676c-43e3-b163-0a46687e89b2	launch_allocating_ports	{"ts": "2026-04-26T13:15:57.761658+00:00", "status": "completed", "message": "Allocated ports: nginx=8101, selkies=9101, metrics=19101, display=:20"}	\N	2026-04-26 13:15:58.472
a98ce730-c70e-4b45-821d-6c31913285dd	99dac3f5-676c-43e3-b163-0a46687e89b2	launch_allocating_cpus	{"ts": "2026-04-26T13:15:57.761663+00:00", "status": "in_progress", "message": "Finding 2 contiguous CPU cores..."}	\N	2026-04-26 13:15:58.474
84eb9978-a4c4-4435-9860-6d46044fecf9	99dac3f5-676c-43e3-b163-0a46687e89b2	launch_allocating_cpus	{"ts": "2026-04-26T13:15:57.771011+00:00", "status": "completed", "message": "Allocated CPU cores: 2-3"}	\N	2026-04-26 13:15:58.475
6c53ae3c-ac04-44ea-bd48-17c15796ea52	99dac3f5-676c-43e3-b163-0a46687e89b2	launch_validating_mount	{"ts": "2026-04-26T13:15:57.771024+00:00", "status": "in_progress", "message": "Verifying local ZFS zvol for u_18fed53bb2875483a59d2f60..."}	\N	2026-04-26 13:15:58.478
925cd270-d51c-44f1-aa02-0afc80b080ae	99dac3f5-676c-43e3-b163-0a46687e89b2	launch_validating_mount	{"ts": "2026-04-26T13:15:57.771060+00:00", "status": "failed", "message": "Local ZFS verification failed: [Errno 13] Permission denied: '/mnt/local-zvol'"}	\N	2026-04-26 13:15:58.48
e9873551-e64a-4c6d-a5d1-df598362baf7	99dac3f5-676c-43e3-b163-0a46687e89b2	launch_failed	{"reason": "Local ZFS verification failed: [Errno 13] Permission denied: '/mnt/local-zvol'"}	\N	2026-04-26 13:15:58.512
ca2a2251-1bed-4b73-ba5b-7463fc6e6bed	ccb2e98a-d188-464b-9e5e-e14fe48897ea	session_created	{"configName": "Inferno", "configSlug": "inferno", "storageType": "stateful", "instanceName": "gpu-instance-cef7", "interfaceMode": "gui"}	\N	2026-04-26 13:23:46.908
5390f5af-9a0f-45f2-b642-8aef3d9c3673	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_initiated	{"launchId": "001fffb1-fc40-4dfc-bcbb-4cbe2d2683c6", "containerName": "laas-ccb2e98a"}	\N	2026-04-26 13:23:47.121
4a643028-b38a-410f-82f1-dd2b41c8689c	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_scheduling	{"ts": "2026-04-26T13:23:48.318222+00:00", "status": "in_progress", "message": "Validating launch parameters..."}	\N	2026-04-26 13:23:51.701
356d767e-02dc-4bc2-8a30-8fc14f76d6bd	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_scheduling	{"ts": "2026-04-26T13:23:48.418426+00:00", "status": "completed", "message": "Parameters validated successfully"}	\N	2026-04-26 13:23:51.703
647b9426-9ab6-4e20-bf8f-b5147fbaf542	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_allocating_ports	{"ts": "2026-04-26T13:23:48.418539+00:00", "status": "in_progress", "message": "Finding available port triplet..."}	\N	2026-04-26 13:23:51.705
14997bb1-5496-4350-bd7d-adbe5d96f79b	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_allocating_ports	{"ts": "2026-04-26T13:23:48.438077+00:00", "status": "completed", "message": "Allocated ports: nginx=8101, selkies=9101, metrics=19101, display=:20"}	\N	2026-04-26 13:23:51.707
85145978-8748-469e-accf-655953655c02	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_allocating_cpus	{"ts": "2026-04-26T13:23:48.438082+00:00", "status": "in_progress", "message": "Finding 8 contiguous CPU cores..."}	\N	2026-04-26 13:23:51.709
37dbfaf5-e2de-4a9a-adb3-20f758fc4aec	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_allocating_cpus	{"ts": "2026-04-26T13:23:48.447041+00:00", "status": "completed", "message": "Allocated CPU cores: 2-9"}	\N	2026-04-26 13:23:51.711
96db3af4-20f4-48ad-ae35-21b9932772f0	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_validating_mount	{"ts": "2026-04-26T13:23:48.447053+00:00", "status": "in_progress", "message": "Verifying local ZFS zvol for u_18fed53bb2875483a59d2f60..."}	\N	2026-04-26 13:23:51.712
f0a27e02-460c-43e5-a185-520fc255717e	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_validating_mount	{"ts": "2026-04-26T13:23:48.447195+00:00", "status": "completed", "message": "Local ZFS zvol verified: /datapool/users/u_18fed53bb2875483a59d2f60"}	\N	2026-04-26 13:23:51.713
cbda4e21-7f97-451a-80ad-5e478a39b7f5	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_creating	{"ts": "2026-04-26T13:23:48.447247+00:00", "status": "in_progress", "message": "Building Docker command and creating container..."}	\N	2026-04-26 13:23:51.714
eb2f54e0-37b8-40b7-9506-24a4f77a48fe	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_creating	{"ts": "2026-04-26T13:23:48.520206+00:00", "status": "completed", "message": "Container created: laas-ccb2e98a"}	\N	2026-04-26 13:23:51.716
4f79d57a-8225-4131-a015-2c0a37d88d39	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_starting	{"ts": "2026-04-26T13:23:48.520216+00:00", "status": "in_progress", "message": "Starting container..."}	\N	2026-04-26 13:23:51.717
9ec5f772-f028-4aff-84c3-92d60b77765d	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_starting	{"ts": "2026-04-26T13:23:48.856484+00:00", "status": "completed", "message": "Container started successfully"}	\N	2026-04-26 13:23:51.718
7a555437-a122-4f36-9a67-3ff9caa31141	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_waiting_desktop	{"ts": "2026-04-26T13:23:48.856500+00:00", "status": "in_progress", "message": "Waiting for desktop to initialize on port 8101..."}	\N	2026-04-26 13:23:51.719
73afda6b-c7b5-4623-ac15-e16f20b7524c	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_waiting_desktop	{"ts": "2026-04-26T13:24:09.049674+00:00", "status": "completed", "message": "Desktop responding on port 8101 (HTTP 401)"}	\N	2026-04-26 13:24:08.057
807e905d-db21-4bac-b477-15dd9fe2e07a	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_waiting_desktop	{"ts": "2026-04-26T13:24:09.049689+00:00", "status": "completed", "message": "Desktop responding on port 8101"}	\N	2026-04-26 13:24:08.06
a3f37660-bc4e-4680-9cb5-190a7b0f0e97	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_health_checking	{"ts": "2026-04-26T13:24:09.049692+00:00", "status": "in_progress", "message": "Verifying WebRTC stream accessibility..."}	\N	2026-04-26 13:24:08.061
211bed9c-baae-4d21-b7c3-1f850a394d72	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_health_checking	{"ts": "2026-04-26T13:24:11.058940+00:00", "status": "completed", "message": "WebRTC stream health check passed"}	\N	2026-04-26 13:24:10.111
635b6e3d-9fdf-4ae2-a721-8389e75cd184	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_ready	{"ts": "2026-04-26T13:24:11.058955+00:00", "status": "in_progress", "message": "Session is live and ready for connection"}	\N	2026-04-26 13:24:10.112
dab9552a-bc09-4c5a-98a0-b948e0b0c412	ccb2e98a-d188-464b-9e5e-e14fe48897ea	launch_ready	{"ts": "2026-04-26T13:24:11.058963+00:00", "status": "completed", "message": "Session ready for connection"}	\N	2026-04-26 13:24:10.113
80aae3eb-4326-4b64-b752-1f0f2145e735	ccb2e98a-d188-464b-9e5e-e14fe48897ea	session_ready	{"nginxPort": 8101, "sessionUrl": "http://100.88.57.107:8101/", "selkiesPort": 9101, "displayNumber": 20}	\N	2026-04-26 13:24:10.119
e599c822-ad4f-4725-9a17-03e180e5ad41	ccb2e98a-d188-464b-9e5e-e14fe48897ea	session_terminated	{"terminatedBy": "8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934", "totalCostCents": 10500, "durationSeconds": 599, "terminationReason": "user_requested", "alreadyBilledCents": 21000, "remainingChargeCents": 0}	\N	2026-04-26 13:34:09.726
750175b4-0f3c-47f1-8b6a-6b219f6c12ca	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	session_created	{"configName": "Supernova", "configSlug": "supernova", "storageType": "stateful", "instanceName": "gpu-instance-73qf", "interfaceMode": "gui"}	\N	2026-04-26 15:04:27.916
73f04625-0e51-4f5e-858a-3bbc006597cb	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_initiated	{"launchId": "0c520843-40b8-43a9-9271-7f374e3be3b0", "containerName": "laas-644a24d5"}	\N	2026-04-26 15:04:27.961
a95c5ab7-59f4-4faa-9d1b-35c3edba2785	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_scheduling	{"ts": "2026-04-26T15:04:29.301269+00:00", "status": "in_progress", "message": "Validating launch parameters..."}	\N	2026-04-26 15:04:30.049
984ab5aa-fec9-4815-bfe3-b6d50079caf4	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_scheduling	{"ts": "2026-04-26T15:04:29.401701+00:00", "status": "completed", "message": "Parameters validated successfully"}	\N	2026-04-26 15:04:30.051
974f6d32-360c-435e-bbc2-d06077877fbf	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_allocating_ports	{"ts": "2026-04-26T15:04:29.401818+00:00", "status": "in_progress", "message": "Finding available port triplet..."}	\N	2026-04-26 15:04:30.052
7878e56b-2d72-4aba-8f75-f18aad18b509	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_allocating_ports	{"ts": "2026-04-26T15:04:29.421868+00:00", "status": "completed", "message": "Allocated ports: nginx=8101, selkies=9101, metrics=19101, display=:20"}	\N	2026-04-26 15:04:30.054
ffbcb7cd-2597-4eb1-a2af-17079ef10b67	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_allocating_cpus	{"ts": "2026-04-26T15:04:29.421874+00:00", "status": "in_progress", "message": "Finding 12 contiguous CPU cores..."}	\N	2026-04-26 15:04:30.055
2d81222d-54fb-477d-b436-cafc9bab37b9	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_allocating_cpus	{"ts": "2026-04-26T15:04:29.431205+00:00", "status": "completed", "message": "Allocated CPU cores: 2-13"}	\N	2026-04-26 15:04:30.056
c9a33e75-7b86-40fa-8ca1-7118e47160a3	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_validating_mount	{"ts": "2026-04-26T15:04:29.431216+00:00", "status": "in_progress", "message": "Verifying local ZFS zvol for u_18fed53bb2875483a59d2f60..."}	\N	2026-04-26 15:04:30.057
273abc6b-d905-4473-a6ea-f41157de337b	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_validating_mount	{"ts": "2026-04-26T15:04:29.431328+00:00", "status": "completed", "message": "Local ZFS zvol verified: /datapool/users/u_18fed53bb2875483a59d2f60"}	\N	2026-04-26 15:04:30.059
2d9950e6-2964-45cc-9802-1a357b561117	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_creating	{"ts": "2026-04-26T15:04:29.431362+00:00", "status": "in_progress", "message": "Building Docker command and creating container..."}	\N	2026-04-26 15:04:30.06
e2155d5d-9e64-4e20-9467-23807f81925e	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_creating	{"ts": "2026-04-26T15:04:29.507052+00:00", "status": "completed", "message": "Container created: laas-644a24d5"}	\N	2026-04-26 15:04:30.061
bd3f6919-1b9f-4e5f-8730-82b3cc0472af	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_starting	{"ts": "2026-04-26T15:04:29.507059+00:00", "status": "in_progress", "message": "Starting container..."}	\N	2026-04-26 15:04:30.062
93fa44e7-58ff-406b-a994-3f3c3889fabe	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_starting	{"ts": "2026-04-26T15:04:29.813238+00:00", "status": "completed", "message": "Container started successfully"}	\N	2026-04-26 15:04:30.063
5eb8ea8f-adf2-4fce-8df9-c7df0eb21f7c	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_waiting_desktop	{"ts": "2026-04-26T15:04:29.813251+00:00", "status": "in_progress", "message": "Waiting for desktop to initialize on port 8101..."}	\N	2026-04-26 15:04:30.064
82a424c5-b34d-46f8-9318-9699df99477a	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_waiting_desktop	{"ts": "2026-04-26T15:04:47.991121+00:00", "status": "completed", "message": "Desktop responding on port 8101 (HTTP 401)"}	\N	2026-04-26 15:04:48.424
ed04ed40-31cd-497b-84c9-55026bc0ceb0	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_waiting_desktop	{"ts": "2026-04-26T15:04:47.991134+00:00", "status": "completed", "message": "Desktop responding on port 8101"}	\N	2026-04-26 15:04:48.426
6a7faa16-33a9-41da-b732-4cab15303a1c	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_health_checking	{"ts": "2026-04-26T15:04:47.991136+00:00", "status": "in_progress", "message": "Verifying WebRTC stream accessibility..."}	\N	2026-04-26 15:04:48.427
d694a06d-8549-4306-b609-1284e61056c2	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_health_checking	{"ts": "2026-04-26T15:04:49.999994+00:00", "status": "completed", "message": "WebRTC stream health check passed"}	\N	2026-04-26 15:04:50.457
93a1bf6a-5816-43e1-b19f-83a760e4eaa7	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_ready	{"ts": "2026-04-26T15:04:50.000009+00:00", "status": "in_progress", "message": "Session is live and ready for connection"}	\N	2026-04-26 15:04:50.459
ec22946e-435e-4211-ac95-3300baf89dd5	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	launch_ready	{"ts": "2026-04-26T15:04:50.000017+00:00", "status": "completed", "message": "Session ready for connection"}	\N	2026-04-26 15:04:50.46
9607c78c-ef4f-40a4-89db-a15f07e0e868	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	session_ready	{"nginxPort": 8101, "sessionUrl": "http://100.88.57.107:8101/", "selkiesPort": 9101, "displayNumber": 20}	\N	2026-04-26 15:04:50.465
d2b0fe93-e868-428e-b376-704b372dff72	3df69081-26f0-4b72-84fc-2cd5c1a2a78c	session_created	{"configName": "Supernova", "configSlug": "supernova", "storageType": "ephemeral", "instanceName": "gpu-instance-g154", "interfaceMode": "gui"}	\N	2026-04-26 15:06:59.016
21a62c9a-1fdc-4fa9-9f87-4ef8d5fcd435	bdbaa558-00ea-4d6e-98f6-013330fb4339	session_created	{"configName": "Supernova", "configSlug": "supernova", "storageType": "ephemeral", "instanceName": "gpu-instance-oek2", "interfaceMode": "gui"}	\N	2026-04-26 15:22:49.056
75b730d5-8b5c-4624-9786-dfac3383d455	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_initiated	{"launchId": "d1077606-2a5b-47fc-a1db-e4a4471f0937", "containerName": "laas-bdbaa558"}	\N	2026-04-26 15:22:49.136
8950ae1e-7ba8-428a-9392-cecbf7640e10	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_scheduling	{"ts": "2026-04-26T15:22:50.485904+00:00", "status": "in_progress", "message": "Validating launch parameters..."}	\N	2026-04-26 15:22:51.177
4ed3d547-614e-4ac5-8913-44205de3e285	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_scheduling	{"ts": "2026-04-26T15:22:50.586342+00:00", "status": "completed", "message": "Parameters validated successfully"}	\N	2026-04-26 15:22:51.179
ba1e498d-80f3-4677-bf11-57656a9aad14	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_allocating_ports	{"ts": "2026-04-26T15:22:50.586455+00:00", "status": "in_progress", "message": "Finding available port triplet..."}	\N	2026-04-26 15:22:51.18
ca75dded-ef03-487e-8587-7e11ccf058e4	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_allocating_ports	{"ts": "2026-04-26T15:22:50.604991+00:00", "status": "completed", "message": "Allocated ports: nginx=8101, selkies=9101, metrics=19101, display=:20"}	\N	2026-04-26 15:22:51.182
a7b9ae9f-786a-4b23-803e-c7e8551d6580	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_allocating_cpus	{"ts": "2026-04-26T15:22:50.605001+00:00", "status": "in_progress", "message": "Finding 12 contiguous CPU cores..."}	\N	2026-04-26 15:22:51.183
323acdbd-b3bf-4d02-a8fc-a3edacadc313	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_allocating_cpus	{"ts": "2026-04-26T15:22:50.614626+00:00", "status": "completed", "message": "Allocated CPU cores: 2-13"}	\N	2026-04-26 15:22:51.185
1fd593bf-4eb1-42df-85b1-76546f06daf9	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_validating_mount	{"ts": "2026-04-26T15:22:50.614638+00:00", "status": "in_progress", "message": "Ephemeral session - skipping mount validation"}	\N	2026-04-26 15:22:51.187
82a8fa88-2b6b-49d0-b3d1-229e37defea8	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_validating_mount	{"ts": "2026-04-26T15:22:50.614641+00:00", "status": "completed", "message": "Ephemeral session - no persistent storage"}	\N	2026-04-26 15:22:51.188
fa72666d-29b4-4cbe-8b57-face403ff83f	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_creating	{"ts": "2026-04-26T15:22:50.614679+00:00", "status": "in_progress", "message": "Building Docker command and creating container..."}	\N	2026-04-26 15:22:51.189
c12d711a-4ee0-4ae2-988a-a850d1119cdd	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_creating	{"ts": "2026-04-26T15:22:50.696187+00:00", "status": "completed", "message": "Container created: laas-bdbaa558"}	\N	2026-04-26 15:22:51.191
39173a4a-14cd-4662-a783-6fab37c93130	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_starting	{"ts": "2026-04-26T15:22:50.696192+00:00", "status": "in_progress", "message": "Starting container..."}	\N	2026-04-26 15:22:51.191
e4836e92-41bb-43fa-bffe-eac4209f159e	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_starting	{"ts": "2026-04-26T15:22:51.008322+00:00", "status": "completed", "message": "Container started successfully"}	\N	2026-04-26 15:22:51.192
00cd7c3c-e8a9-40c8-b6f1-2e4aaad444e1	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_waiting_desktop	{"ts": "2026-04-26T15:22:51.008339+00:00", "status": "in_progress", "message": "Waiting for desktop to initialize on port 8101..."}	\N	2026-04-26 15:22:51.193
be4fc925-4228-48e0-8e5f-35acd4197030	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_waiting_desktop	{"ts": "2026-04-26T15:23:07.171693+00:00", "status": "completed", "message": "Desktop responding on port 8101 (HTTP 401)"}	\N	2026-04-26 15:23:06.418
9a06c5cd-0ee2-4c85-9264-d3bb0d24ade5	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_waiting_desktop	{"ts": "2026-04-26T15:23:07.171708+00:00", "status": "completed", "message": "Desktop responding on port 8101"}	\N	2026-04-26 15:23:06.42
57270836-a446-43ab-adf9-30a713f4d272	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_health_checking	{"ts": "2026-04-26T15:23:07.171711+00:00", "status": "in_progress", "message": "Verifying WebRTC stream accessibility..."}	\N	2026-04-26 15:23:06.422
f45a111f-af28-420f-9cec-8136475ff8c2	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_health_checking	{"ts": "2026-04-26T15:23:09.180073+00:00", "status": "completed", "message": "WebRTC stream health check passed"}	\N	2026-04-26 15:23:08.493
f2507aa2-eebd-4adf-8ac8-85dd5c92c368	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_ready	{"ts": "2026-04-26T15:23:09.180088+00:00", "status": "in_progress", "message": "Session is live and ready for connection"}	\N	2026-04-26 15:23:08.494
7d78c459-14d9-4676-9e12-36423532702c	bdbaa558-00ea-4d6e-98f6-013330fb4339	launch_ready	{"ts": "2026-04-26T15:23:09.180097+00:00", "status": "completed", "message": "Session ready for connection"}	\N	2026-04-26 15:23:08.496
02fd99cb-bbf6-4547-a80a-872ac8dfd8b5	bdbaa558-00ea-4d6e-98f6-013330fb4339	session_ready	{"nginxPort": 8101, "sessionUrl": "http://100.94.157.114:8101/", "selkiesPort": 9101, "displayNumber": 20}	\N	2026-04-26 15:23:08.504
a66c83fd-80b0-454b-b480-a202e231c7e2	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	session_terminated	{"terminatedBy": "8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934", "totalCostCents": 15500, "durationSeconds": 2050, "terminationReason": "user_requested", "alreadyBilledCents": 31000, "remainingChargeCents": 0}	\N	2026-04-26 15:39:00.904
b5deeeaf-eba2-4c36-8033-3679fb9920e8	bdbaa558-00ea-4d6e-98f6-013330fb4339	session_terminated	{"terminatedBy": "8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934", "totalCostCents": 15500, "durationSeconds": 957, "terminationReason": "user_requested", "alreadyBilledCents": 31000, "remainingChargeCents": 0}	\N	2026-04-26 15:39:06.093
\.


--
-- TOC entry 6018 (class 0 OID 118655)
-- Dependencies: 246
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, organization_id, compute_config_id, booking_id, node_id, session_type, container_id, container_name, nginx_port, selkies_port, display_number, session_token_hash, session_url, status, started_at, ended_at, scheduled_end_at, last_activity_at, nfs_mount_path, base_image_id, actual_gpu_vram_mb, actual_hami_sm_percent, reconnect_count, last_reconnect_at, auto_preserve_files, avg_rtt_ms, avg_packet_loss_ratio, resource_snapshot, created_at, updated_at, created_by, updated_by, allocated_gpu_vram_mb, allocated_hami_sm_percent, allocated_memory_mb, allocated_vcpu, allocation_snapshot_at, cost_last_updated_at, cumulative_cost_cents, duration_seconds, instance_name, storage_mode, terminated_at, terminated_by, termination_details, termination_reason, storage_node_id, storage_transport, ephemeral_storage_path, ephemeral_storage_size_mb) FROM stdin;
95b6fb9e-14b6-4870-9174-f075a4e9a6e2	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	d2fb06af-8256-4105-812b-05a10cbe99a1	\N	c9868115-ff99-403c-8e87-06124ba7df66	stateful_desktop	\N	laas-95b6fb9e	\N	\N	\N	\N	\N	failed	\N	2026-04-26 11:11:35.478	\N	\N	/mnt/nfs/users/u_598e2807eab421ae4e8da461	\N	2048	8	0	\N	f	\N	\N	{"vcpu": 2, "gpuModel": "RTX 4090", "memoryMb": 4096, "gpuVramMb": 2048, "configName": "Spark", "configSlug": "spark", "storageType": "stateful", "nodeGpuModel": "RTX 4090", "nodeHostname": "laas-node-01", "hamiSmPercent": 8, "interfaceMode": "gui", "basePricePerHourCents": 3500}	2026-04-26 11:11:33.329	2026-04-26 11:11:35.48	\N	\N	2048	8	4096	2	2026-04-26 11:11:33.327	\N	0	\N	gpu-instance-cgy6	stateful	\N	\N	\N	error_unrecoverable	c9868115-ff99-403c-8e87-06124ba7df66	local_zfs	\N	\N
99dac3f5-676c-43e3-b163-0a46687e89b2	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	d2fb06af-8256-4105-812b-05a10cbe99a1	\N	c9868115-ff99-403c-8e87-06124ba7df66	stateful_desktop	\N	laas-99dac3f5	\N	\N	\N	\N	\N	failed	\N	2026-04-26 13:15:58.49	\N	\N	/mnt/nfs/users/u_18fed53bb2875483a59d2f60	\N	2048	8	0	\N	f	\N	\N	{"vcpu": 2, "gpuModel": "RTX 4090", "memoryMb": 4096, "gpuVramMb": 2048, "configName": "Spark", "configSlug": "spark", "storageType": "stateful", "nodeGpuModel": "RTX 4090", "nodeHostname": "laas-node-01", "hamiSmPercent": 8, "interfaceMode": "gui", "basePricePerHourCents": 3500}	2026-04-26 13:15:56.326	2026-04-26 13:15:58.491	\N	\N	2048	8	4096	2	2026-04-26 13:15:56.324	\N	0	\N	gpu-instance-arli	stateful	\N	\N	\N	error_unrecoverable	c9868115-ff99-403c-8e87-06124ba7df66	local_zfs	\N	\N
ccb2e98a-d188-464b-9e5e-e14fe48897ea	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	73119ef1-e3eb-48a3-be9a-8e2f55c11ba8	\N	c9868115-ff99-403c-8e87-06124ba7df66	stateful_desktop	\N	laas-ccb2e98a	8101	9101	20	\N	http://100.88.57.107:8101/	ended	2026-04-26 13:24:10.115	2026-04-26 13:34:09.708	\N	\N	/mnt/nfs/users/u_18fed53bb2875483a59d2f60	\N	8192	33	0	\N	f	\N	\N	{"vcpu": 8, "gpuModel": "RTX 4090", "memoryMb": 16384, "gpuVramMb": 8192, "configName": "Inferno", "configSlug": "inferno", "storageType": "stateful", "nodeGpuModel": "RTX 4090", "nodeHostname": "laas-node-01", "hamiSmPercent": 33, "interfaceMode": "gui", "encryptedPassword": "9b371b190f6162b4a424cf99e49db239", "encryptedPasswordIv": "7c475ef9947a2a71475e7404", "encryptedPasswordTag": "7686aa43ec22bf71a7b5473430ac7110", "basePricePerHourCents": 10500}	2026-04-26 13:23:46.896	2026-04-26 13:34:09.72	\N	\N	8192	33	16384	8	2026-04-26 13:23:46.894	2026-04-26 13:34:09.708	21000	599	gpu-instance-cef7	stateful	2026-04-26 13:34:09.708	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	user_requested	c9868115-ff99-403c-8e87-06124ba7df66	local_zfs	\N	\N
3df69081-26f0-4b72-84fc-2cd5c1a2a78c	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	28a49cc2-a6c4-4387-a93f-9d48c153bb6e	\N	16a6c6a8-aca5-40b5-b0bd-a4f908f35bbf	stateful_desktop	\N	\N	\N	\N	\N	\N	\N	failed	\N	2026-04-26 15:06:59.327	\N	\N	\N	\N	16384	67	0	\N	f	\N	\N	{"vcpu": 12, "gpuModel": "RTX 4090", "memoryMb": 32768, "gpuVramMb": 16384, "configName": "Supernova", "configSlug": "supernova", "storageType": "ephemeral", "nodeGpuModel": "RTX 4090", "nodeHostname": "laas-node-02", "hamiSmPercent": 67, "interfaceMode": "gui", "basePricePerHourCents": 15500}	2026-04-26 15:06:58.986	2026-04-26 15:06:59.328	\N	\N	16384	67	32768	12	2026-04-26 15:06:58.984	\N	0	\N	gpu-instance-g154	ephemeral	\N	\N	\N	error_unrecoverable	\N	\N	\N	\N
bdbaa558-00ea-4d6e-98f6-013330fb4339	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	28a49cc2-a6c4-4387-a93f-9d48c153bb6e	\N	16a6c6a8-aca5-40b5-b0bd-a4f908f35bbf	stateful_desktop	\N	laas-bdbaa558	8101	9101	20	\N	http://100.94.157.114:8101/	ended	2026-04-26 15:23:08.499	2026-04-26 15:39:06.067	\N	\N	\N	\N	16384	67	0	\N	f	\N	\N	{"vcpu": 12, "gpuModel": "RTX 4090", "memoryMb": 32768, "gpuVramMb": 16384, "configName": "Supernova", "configSlug": "supernova", "storageType": "ephemeral", "nodeGpuModel": "RTX 4090", "nodeHostname": "laas-node-02", "hamiSmPercent": 67, "interfaceMode": "gui", "encryptedPassword": "a1320335c20de825197cb16793eaf727", "encryptedPasswordIv": "4a508fad7df81ff4ce30ab0f", "encryptedPasswordTag": "eed7e51a9392ebb44b6978c8151ea66e", "basePricePerHourCents": 15500}	2026-04-26 15:22:49.043	2026-04-26 15:39:06.086	\N	\N	16384	67	32768	12	2026-04-26 15:22:49.042	2026-04-26 15:39:06.067	31000	957	gpu-instance-oek2	ephemeral	2026-04-26 15:39:06.067	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	user_requested	\N	\N	\N	\N
644a24d5-d991-44e1-bf8c-a69a5ce8ff28	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	28a49cc2-a6c4-4387-a93f-9d48c153bb6e	\N	c9868115-ff99-403c-8e87-06124ba7df66	stateful_desktop	\N	laas-644a24d5	8101	9101	20	\N	http://100.88.57.107:8101/	ended	2026-04-26 15:04:50.461	2026-04-26 15:39:00.875	\N	\N	/mnt/nfs/users/u_18fed53bb2875483a59d2f60	\N	16384	67	0	\N	f	\N	\N	{"vcpu": 12, "gpuModel": "RTX 4090", "memoryMb": 32768, "gpuVramMb": 16384, "configName": "Supernova", "configSlug": "supernova", "storageType": "stateful", "nodeGpuModel": "RTX 4090", "nodeHostname": "laas-node-01", "hamiSmPercent": 67, "interfaceMode": "gui", "encryptedPassword": "8319b71f4c577faf2edd1a7ccbb8285c", "encryptedPasswordIv": "2671247787a6694ceced706f", "encryptedPasswordTag": "ce7f286d5db23cc812816fb6e38df1a6", "basePricePerHourCents": 15500}	2026-04-26 15:04:27.906	2026-04-26 15:39:00.895	\N	\N	16384	67	32768	12	2026-04-26 15:04:27.905	2026-04-26 15:39:00.875	31000	2050	gpu-instance-73qf	stateful	2026-04-26 15:39:00.875	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	user_requested	c9868115-ff99-403c-8e87-06124ba7df66	local_zfs	\N	\N
\.


--
-- TOC entry 6059 (class 0 OID 120067)
-- Dependencies: 287
-- Data for Name: storage_extensions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.storage_extensions (id, user_id, storage_volume_id, extension_type, previous_quota_bytes, new_quota_bytes, extension_bytes, amount_cents, currency, payment_transaction_id, wallet_transaction_id, notes, created_at, created_by) FROM stdin;
912f2dd9-1095-41fc-916f-936d50a967df	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	a6a4ee53-a077-4934-a21b-1134893cf490	user_upgrade	8589934592	9663676416	1073741824	0	INR	\N	\N	\N	2026-04-26 18:44:45.389	\N
\.


--
-- TOC entry 6024 (class 0 OID 118759)
-- Dependencies: 252
-- Data for Name: subscription_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscription_plans (id, slug, name, description, price_cents, currency, billing_period, gpu_hours_included, mentor_sessions_included, features, is_active, sort_order, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6025 (class 0 OID 118781)
-- Dependencies: 253
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, user_id, plan_id, organization_id, status, starts_at, ends_at, gpu_hours_remaining, mentor_sessions_remaining, auto_renew, cancellation_requested_at, cancel_at_period_end, grace_period_until, payment_transaction_id, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6056 (class 0 OID 119282)
-- Dependencies: 284
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_tickets (id, user_id, organization_id, subject, description, category, priority, status, assigned_to, related_session_id, related_billing_id, resolved_at, resolution_notes, satisfaction_rating, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6053 (class 0 OID 119240)
-- Dependencies: 281
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, key, value, value_type, description, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6057 (class 0 OID 119300)
-- Dependencies: 285
-- Data for Name: ticket_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_messages (id, ticket_id, sender_id, body, is_internal, attachments, created_at) FROM stdin;
\.


--
-- TOC entry 6002 (class 0 OID 118399)
-- Dependencies: 230
-- Data for Name: universities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.universities (id, name, short_name, slug, domain_suffixes, logo_url, website_url, contact_email, contact_phone, city, state, country, timezone, is_active, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
f213bc95-2fe5-4401-94c1-39efeaa39a5a	K.S. Rangasamy College of Engineering	KSRCE	ksrce	{@ksrc.in}	\N	\N	\N	\N	\N	\N	IN	Asia/Kolkata	t	2026-04-08 01:52:11.94	2026-04-08 01:52:11.94	\N	\N	\N
\.


--
-- TOC entry 6003 (class 0 OID 118416)
-- Dependencies: 231
-- Data for Name: university_idp_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.university_idp_configs (id, university_id, idp_type, idp_entity_id, idp_metadata_url, idp_config, keycloak_idp_alias, display_name, is_primary, is_active, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6048 (class 0 OID 119170)
-- Dependencies: 276
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_achievements (id, user_id, achievement_id, earned_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6052 (class 0 OID 119223)
-- Dependencies: 280
-- Data for Name: user_deletion_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_deletion_requests (id, user_id, requested_at, requested_by, reason, grace_period_days, scheduled_deletion_at, status, cancelled_at, completed_at, completion_details, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6007 (class 0 OID 118480)
-- Dependencies: 235
-- Data for Name: user_departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_departments (id, user_id, department_id, is_primary, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6058 (class 0 OID 119315)
-- Dependencies: 286
-- Data for Name: user_feedback; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_feedback (id, user_id, session_id, feedback_type, rating, subject, body, status, admin_response, responded_by, responded_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6011 (class 0 OID 118535)
-- Dependencies: 239
-- Data for Name: user_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_files (id, user_id, file_name, file_path, file_size_bytes, mime_type, file_type, session_id, is_pinned, storage_backend, retention_days, scheduled_deletion_at, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6008 (class 0 OID 118493)
-- Dependencies: 236
-- Data for Name: user_group_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_group_members (id, user_id, user_group_id, added_by, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6005 (class 0 OID 118449)
-- Dependencies: 233
-- Data for Name: user_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_groups (id, organization_id, department_id, parent_id, group_type, name, slug, description, keycloak_group_id, max_members, is_active, created_at, updated_at, deleted_at, created_by, updated_by) FROM stdin;
\.


--
-- TOC entry 6001 (class 0 OID 118161)
-- Dependencies: 229
-- Data for Name: user_org_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_org_roles (expires_at, created_at, updated_at, created_by, updated_by, id, user_id, organization_id, role_id, granted_by) FROM stdin;
\N	2026-04-26 08:59:24.947	2026-04-26 08:59:24.947	\N	\N	651b89f8-a9cf-43e7-b32e-0e164548adbf	4e4433d2-26f4-4fd6-979a-c21e0387d893	07b07401-b326-4045-af3a-44a7c45e56d8	42abadfe-edfa-4b0e-985d-adaa65091959	\N
\N	2026-04-26 09:23:17.346	2026-04-26 09:23:17.346	\N	\N	cc6f826b-907b-42ed-bd03-e8484e1cc751	34d78d40-7462-46ae-9f62-9ad524fb1b46	07b07401-b326-4045-af3a-44a7c45e56d8	42abadfe-edfa-4b0e-985d-adaa65091959	\N
\N	2026-04-26 09:29:33.25	2026-04-26 09:29:33.25	\N	\N	3de3de95-1e6a-4e52-ae65-7257dedbfff2	9dccf90c-52b2-4928-b726-fcc4675efe8b	07b07401-b326-4045-af3a-44a7c45e56d8	42abadfe-edfa-4b0e-985d-adaa65091959	\N
\N	2026-04-26 09:36:25.586	2026-04-26 09:36:25.586	\N	\N	ca785bf0-210f-47b3-8c89-02e4cfcdf8b9	79053f7d-41af-4651-ad54-6f792e94501e	07b07401-b326-4045-af3a-44a7c45e56d8	42abadfe-edfa-4b0e-985d-adaa65091959	\N
\N	2026-04-26 09:44:21.986	2026-04-26 09:44:21.986	\N	\N	2d8c3340-8bbb-4122-8c07-09f55280f6b2	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	07b07401-b326-4045-af3a-44a7c45e56d8	42abadfe-edfa-4b0e-985d-adaa65091959	\N
\.


--
-- TOC entry 5994 (class 0 OID 118072)
-- Dependencies: 222
-- Data for Name: user_policy_consents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_policy_consents (policy_slug, policy_version, agreed_at, ip_address, created_at, created_by, id, user_id) FROM stdin;
acceptable_use	\N	2026-04-26 09:23:17.348	127.0.0.1	2026-04-26 09:23:17.35	\N	15378593-b826-4cdd-9698-6d7c1e23157d	34d78d40-7462-46ae-9f62-9ad524fb1b46
user_content_disclaimer	\N	2026-04-26 09:23:17.352	127.0.0.1	2026-04-26 09:23:17.353	\N	7ec814c8-3b3b-40e4-aea2-da6116036f9d	34d78d40-7462-46ae-9f62-9ad524fb1b46
console_tos	\N	2026-04-26 09:23:17.353	127.0.0.1	2026-04-26 09:23:17.355	\N	3e54760f-f3e0-497e-9051-c6caf1c4548e	34d78d40-7462-46ae-9f62-9ad524fb1b46
acceptable_use	\N	2026-04-26 09:29:33.252	127.0.0.1	2026-04-26 09:29:33.253	\N	551b6163-6c6b-430c-80f9-52e7a949ea9c	9dccf90c-52b2-4928-b726-fcc4675efe8b
user_content_disclaimer	\N	2026-04-26 09:29:33.254	127.0.0.1	2026-04-26 09:29:33.255	\N	f902272a-5051-4e11-9946-c1712d9ed50b	9dccf90c-52b2-4928-b726-fcc4675efe8b
console_tos	\N	2026-04-26 09:29:33.256	127.0.0.1	2026-04-26 09:29:33.257	\N	9dac7bb1-a663-43fb-b831-895ec584e24e	9dccf90c-52b2-4928-b726-fcc4675efe8b
\.


--
-- TOC entry 6006 (class 0 OID 118464)
-- Dependencies: 234
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_profiles (id, user_id, bio, enrollment_number, id_proof_url, id_proof_verified_at, id_proof_verified_by, college_name, graduation_year, github_url, linkedin_url, website_url, skills, theme_preference, notification_preferences, created_at, updated_at, created_by, updated_by, country, expertise_level, onboarding_complete, operational_domains, profession, use_case_other, use_case_purposes, years_of_experience, academic_year, course_name, department_id) FROM stdin;
e38d28dd-ef42-46c2-b84c-51a7b7f056e2	4e4433d2-26f4-4fd6-979a-c21e0387d893	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	dark	{}	2026-04-26 08:59:24.933	2026-04-26 08:59:24.933	\N	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N
cb25e73c-10a1-4cad-9447-ac8f5772db4c	9dccf90c-52b2-4928-b726-fcc4675efe8b	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	dark	{}	2026-04-26 09:30:36.342	2026-04-26 09:30:36.342	\N	\N	US	intermediate	t	{video_editing}	researcher	\N	{ai_ml_training,"After Effects"}	1	\N	\N	\N
fb4934ab-009b-46cd-b14b-5a58879ab75b	79053f7d-41af-4651-ad54-6f792e94501e	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	dark	{}	2026-04-26 09:36:25.579	2026-04-26 09:37:56.827	\N	\N	IN	beginner	t	{data_science}	data_scientist	\N	{data_processing,Jupyter}	2	\N	\N	\N
324bf805-737d-44e1-a9d0-0849811e2c79	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	dark	{}	2026-04-26 09:44:21.98	2026-04-26 09:44:38.291	\N	\N	IN	intermediate	t	{video_editing}	engineer	\N	{ai_ml_training,"After Effects"}	2	\N	\N	\N
\.


--
-- TOC entry 6009 (class 0 OID 118504)
-- Dependencies: 237
-- Data for Name: user_storage_volumes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_storage_volumes (id, user_id, storage_uid, zfs_dataset_path, nfs_export_path, container_mount_path, os_choice, quota_bytes, used_bytes, used_bytes_updated_at, status, provisioned_at, wiped_at, wipe_reason, quota_warning_sent_at, created_at, updated_at, created_by, updated_by, allocation_type, name, price_per_gb_cents_month, node_id, storage_backend) FROM stdin;
967ddeba-59d4-4ac7-9f7f-07cbeec8b3e1	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	u_b1115de086e0ca984be51c7b	datapool/users/u_b1115de086e0ca984be51c7b	/mnt/nfs/users/u_b1115de086e0ca984be51c7b	\N	ubuntu22	5368709120	0	\N	wiped	2026-04-26 16:01:30.746	2026-04-26 16:09:32.275	User requested deletion via API	\N	2026-04-26 16:01:30.746	2026-04-26 16:09:32.275	\N	\N	user_created	ef2	700	c9868115-ff99-403c-8e87-06124ba7df66	zfs_zvol
2fd5ece4-4338-41b5-b9d7-1a9b3f2cd048	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	u_47f3b48d96b4fdefb816d22b	datapool/users/u_47f3b48d96b4fdefb816d22b	/mnt/nfs/users/u_47f3b48d96b4fdefb816d22b	\N	ubuntu22	5368709120	0	\N	wiped	2026-04-26 16:17:17.235	2026-04-26 16:17:33.096	User requested deletion via API	\N	2026-04-26 16:17:17.235	2026-04-26 16:17:33.096	\N	\N	user_created	ef3	700	c9868115-ff99-403c-8e87-06124ba7df66	zfs_zvol
448d8e4f-5e95-4e40-9870-0d0f564a2a35	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	u_ad1191a24d166c6e0fcc3f80	datapool/users/u_ad1191a24d166c6e0fcc3f80	/mnt/nfs/users/u_ad1191a24d166c6e0fcc3f80	\N	ubuntu22	5368709120	0	\N	wiped	2026-04-26 16:17:45.542	2026-04-26 16:26:19.972	User requested deletion via API	\N	2026-04-26 16:17:45.542	2026-04-26 16:26:19.972	\N	\N	user_created	ef4	700	c9868115-ff99-403c-8e87-06124ba7df66	zfs_zvol
614732bc-6dcf-4af5-ae03-d82285d77fd2	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	u_61a2e98ce9e5c2393bc29a08	datapool/users/u_61a2e98ce9e5c2393bc29a08	/mnt/nfs/users/u_61a2e98ce9e5c2393bc29a08	\N	ubuntu22	5368709120	0	\N	wiped	2026-04-26 16:27:19.548	2026-04-26 16:28:22.486	User requested deletion via API	\N	2026-04-26 16:27:19.548	2026-04-26 16:28:22.486	\N	\N	user_created	ef5	700	c9868115-ff99-403c-8e87-06124ba7df66	zfs_zvol
2130461d-cab4-41fd-b1ec-41807b97004e	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	u_733d62e3d54cbfc7ae77555c	datapool/users/u_733d62e3d54cbfc7ae77555c	/mnt/nfs/users/u_733d62e3d54cbfc7ae77555c	\N	ubuntu22	5368709120	0	\N	wiped	2026-04-26 16:28:40.744	2026-04-26 16:29:25.933	User requested deletion via API	\N	2026-04-26 16:28:40.744	2026-04-26 16:29:25.933	\N	\N	user_created	efs5	700	c9868115-ff99-403c-8e87-06124ba7df66	zfs_zvol
9be56b9b-ccd5-4f54-9428-6cf8fd9438bc	4e4433d2-26f4-4fd6-979a-c21e0387d893	u_209706bccc85af75055c42e1	datapool/users/u_209706bccc85af75055c42e1	/mnt/nfs/users/u_209706bccc85af75055c42e1	\N	ubuntu22	6442450944	0	\N	wiped	2026-04-26 16:43:12.444	2026-04-26 16:51:08.985	User requested deletion via API	\N	2026-04-26 16:43:12.444	2026-04-26 16:51:08.985	\N	\N	user_created	ef2	700	c9868115-ff99-403c-8e87-06124ba7df66	zfs_zvol
01f97c9c-e7a6-485a-89ab-b6606f550ad2	4e4433d2-26f4-4fd6-979a-c21e0387d893	u_989a8c5339b3ebd95f6e1c42	datapool/users/u_989a8c5339b3ebd95f6e1c42	/mnt/nfs/users/u_989a8c5339b3ebd95f6e1c42	\N	ubuntu22	7516192768	0	\N	wiped	2026-04-26 16:58:56.058	2026-04-26 17:20:58.057	User requested deletion via API	\N	2026-04-26 16:58:56.058	2026-04-26 17:20:58.057	\N	\N	user_created	ef10	700	c9868115-ff99-403c-8e87-06124ba7df66	zfs_zvol
7cd88ec0-0a37-4a8f-8241-72f78ae6aa4c	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	u_598e2807eab421ae4e8da461	datapool/users/u_598e2807eab421ae4e8da461	/mnt/nfs/users/u_598e2807eab421ae4e8da461	\N	ubuntu22	8589934592	0	\N	wiped	2026-04-26 16:36:22.661	2026-04-26 17:21:35.233	User requested deletion via API	\N	2026-04-26 16:36:22.661	2026-04-26 17:21:35.233	\N	\N	user_created	efs1	700	c9868115-ff99-403c-8e87-06124ba7df66	zfs_zvol
a6a4ee53-a077-4934-a21b-1134893cf490	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	u_18fed53bb2875483a59d2f60	datapool/users/u_18fed53bb2875483a59d2f60	/mnt/nfs/users/u_18fed53bb2875483a59d2f60	\N	ubuntu22	9663676416	0	\N	active	2026-04-26 17:21:56.688	\N	\N	\N	2026-04-26 17:21:56.688	2026-04-26 18:44:45.389	\N	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	user_created	efs2	700	c9868115-ff99-403c-8e87-06124ba7df66	zfs_zvol
\.


--
-- TOC entry 5992 (class 0 OID 118034)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (email, email_verified_at, password_hash, first_name, last_name, display_name, avatar_url, phone, timezone, keycloak_sub, auth_type, oauth_provider, storage_uid, token_version, two_factor_enabled, last_login_at, last_login_ip, onboarding_completed_at, is_active, created_at, updated_at, deleted_at, storage_provisioned_at, storage_provisioning_error, storage_provisioning_status, created_by, keycloak_last_sync_at, lock_expires_at, lock_reason, locked_at, os_choice, pending_email, updated_by, id, default_org_id, referred_by_code) FROM stdin;
punith.vs74064@gmail.com	\N	\N	Punith	VS	\N	\N	\N	Asia/Kolkata	0fbe8ba9-74c2-4b3a-9d22-5cde9d40ee64	public_oauth	keycloak	\N	0	f	2026-04-26 11:28:40.864	127.0.0.1	\N	t	2026-04-26 08:59:24.908	2026-04-26 17:20:58.057	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	4e4433d2-26f4-4fd6-979a-c21e0387d893	07b07401-b326-4045-af3a-44a7c45e56d8	\N
test-mail101@gmail.com	2026-04-26 09:23:17.34	$2b$10$.a7I0zu7gsSGBQkAxe6Zbe0WqPE2MDf0rkAol1.MGKSg7e3RCTFbi	test-accn	101	\N	\N	\N	Asia/Kolkata	\N	public_local	\N	\N	0	f	\N	\N	\N	t	2026-04-26 09:23:17.342	2026-04-26 09:23:17.342	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	34d78d40-7462-46ae-9f62-9ad524fb1b46	07b07401-b326-4045-af3a-44a7c45e56d8	\N
test-accn102@gmail.com	2026-04-26 09:29:33.246	$2b$10$s3LNKeIaRg7fATE4C54j6.JVhuSxb77d6cjHp3Bkc3xw8KPc0eaDi	test-accn	102	\N	\N	\N	Asia/Kolkata	\N	public_local	\N	\N	0	f	\N	\N	\N	t	2026-04-26 09:29:33.247	2026-04-26 09:29:33.247	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	9dccf90c-52b2-4928-b726-fcc4675efe8b	07b07401-b326-4045-af3a-44a7c45e56d8	\N
viswanaths365@gmail.com	\N	\N	Punith	VS	\N	\N	\N	Asia/Kolkata	3fe2b6fe-6c48-47a7-ae6b-da52eef70660	public_oauth	keycloak	\N	0	f	2026-04-26 09:36:27.004	127.0.0.1	\N	t	2026-04-26 09:36:25.572	2026-04-26 09:36:27.006	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	79053f7d-41af-4651-ad54-6f792e94501e	07b07401-b326-4045-af3a-44a7c45e56d8	\N
kavyashreevs131@gmail.com	\N	\N	Kavya	shree	\N	\N	\N	Asia/Kolkata	93b569cc-f6e7-48ab-bb6d-e381bfabbedc	public_oauth	keycloak	u_18fed53bb2875483a59d2f60	0	f	2026-04-26 15:22:30.765	127.0.0.1	\N	t	2026-04-26 09:44:21.975	2026-04-26 15:22:30.767	\N	2026-04-26 17:21:56.691	\N	provisioned	\N	\N	\N	\N	\N	\N	\N	\N	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	07b07401-b326-4045-af3a-44a7c45e56d8	\N
\.


--
-- TOC entry 6065 (class 0 OID 129402)
-- Dependencies: 293
-- Data for Name: waitlist_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.waitlist_entries (id, "userId", email, "firstName", "lastName", "currentStatus", "organizationName", "jobTitle", "computeNeeds", "expectedDuration", urgency, expectations, "primaryWorkload", "workloadDescription", "agreedToPolicy", "policyAgreedAt", "agreedToComms", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 6021 (class 0 OID 118710)
-- Dependencies: 249
-- Data for Name: wallet_holds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallet_holds (id, wallet_id, user_id, amount_cents, hold_reason, booking_id, session_id, status, expires_at, released_at, release_reason, captured_amount, created_at) FROM stdin;
bcc41970-bae9-4401-b260-85f44f700f99	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	3500	compute_session_hold	\N	95b6fb9e-14b6-4870-9174-f075a4e9a6e2	released	2026-04-26 12:11:33.347	2026-04-26 11:11:35.478	session_failed	\N	2026-04-26 11:11:33.349
af89d48d-c0fd-489b-97b8-86effa1a2763	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	3500	compute_session_hold	\N	99dac3f5-676c-43e3-b163-0a46687e89b2	released	2026-04-26 14:15:56.343	2026-04-26 13:15:58.49	session_failed	\N	2026-04-26 13:15:56.345
f6968a8d-bf35-4bfc-becc-bc12c36d0975	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	10500	compute_session_hold	\N	ccb2e98a-d188-464b-9e5e-e14fe48897ea	captured	2026-04-26 14:23:46.905	2026-04-26 13:24:10.13	prepaid_hour_charged	10500	2026-04-26 13:23:46.906
85090787-a455-4d6b-9463-e1bc56ff3fa1	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	15500	compute_session_hold	\N	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	captured	2026-04-26 16:04:27.913	2026-04-26 15:04:50.481	prepaid_hour_charged	15500	2026-04-26 15:04:27.914
16ca87a7-3710-4936-969a-71655a8cb9f5	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	15500	compute_session_hold	\N	3df69081-26f0-4b72-84fc-2cd5c1a2a78c	released	2026-04-26 16:06:59.01	2026-04-26 15:06:59.327	session_failed	\N	2026-04-26 15:06:59.011
edd4e549-0712-445e-8665-da999de4e286	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	15500	compute_session_hold	\N	bdbaa558-00ea-4d6e-98f6-013330fb4339	captured	2026-04-26 16:22:49.052	2026-04-26 15:23:08.522	prepaid_hour_charged	15500	2026-04-26 15:22:49.054
\.


--
-- TOC entry 6022 (class 0 OID 118724)
-- Dependencies: 250
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallet_transactions (id, wallet_id, user_id, txn_type, amount_cents, balance_after_cents, reference_type, reference_id, description, created_at, created_by) FROM stdin;
44fcf4cd-4d16-4780-bddd-1ac78514b49c	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	credit	50000	50000	payment	e1cd144f-4620-4cc5-9cc9-8a956297df47	Credit recharge via Razorpay	2026-04-26 09:46:09.312	\N
f0921500-e3f1-4e60-902b-c08395d126d8	948dfc47-41dd-4ef4-8063-81e1b09099bf	4e4433d2-26f4-4fd6-979a-c21e0387d893	credit	25000	25000	payment	47355c4d-422a-4ca6-a143-294db0c720c7	Credit recharge via Razorpay	2026-04-26 11:13:01.65	\N
5585b51f-1e0a-49a7-a355-a4762eba3168	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	debit	8	49992	storage_billing	\N	Storage billing: 8GB for 2026-04-26T11:30:00.000Z	2026-04-26 11:30:00.132	\N
f7e3252a-110e-413e-8c0f-1a0b06668bae	948dfc47-41dd-4ef4-8063-81e1b09099bf	4e4433d2-26f4-4fd6-979a-c21e0387d893	debit	7	24993	storage_billing	\N	Storage billing: 7GB for 2026-04-26T11:30:00.000Z	2026-04-26 11:30:00.166	\N
d3e8b49e-fea0-49cd-99c2-84c4fc7f4290	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	debit	8	49984	storage_billing	\N	Storage billing: 8GB for 2026-04-26T12:30:00.000Z	2026-04-26 12:30:00.11	\N
e95e4044-6f6b-4bb0-8699-1a8fc11f4d5b	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	debit	10500	39484	compute_billing	ccb2e98a-d188-464b-9e5e-e14fe48897ea	Compute charge - session launch (prepaid hour 1)	2026-04-26 13:24:10.125	\N
3b5c5164-bc2c-4701-87e8-45b53050d902	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	debit	10500	28984	compute_billing	ccb2e98a-d188-464b-9e5e-e14fe48897ea	Prepaid compute - Hour 2: gpu-instance-cef7	2026-04-26 13:30:00.041	\N
b784d632-3975-4a97-8ce7-d4a35d3b552a	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	debit	9	28975	storage_billing	\N	Storage billing: 9GB for 2026-04-26T13:30:00.000Z	2026-04-26 13:30:00.128	\N
563c5eaf-3577-4ff8-9d6d-3b0fd4e40cd2	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	debit	9	28966	storage_billing	\N	Storage billing: 9GB for 2026-04-26T14:30:00.000Z	2026-04-26 14:54:51.816	\N
14afa92d-5c9d-4e66-89b2-89f9497b0cc5	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	credit	100000	128966	payment	c7fa6295-7798-4c2c-96e2-13942d5eae26	Credit recharge via Razorpay	2026-04-26 15:04:13.48	\N
f60383bf-7b7c-4446-b7fc-e81feb3921b7	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	debit	15500	113466	compute_billing	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	Compute charge - session launch (prepaid hour 1)	2026-04-26 15:04:50.473	\N
93adadc2-9be4-4840-9fdf-6d77b658845c	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	debit	15500	97966	compute_billing	bdbaa558-00ea-4d6e-98f6-013330fb4339	Compute charge - session launch (prepaid hour 1)	2026-04-26 15:23:08.511	\N
f09d27a7-55fd-45e6-9dfd-eb664a4cef8c	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	debit	9	97957	storage_billing	\N	Storage billing: 9GB for 2026-04-26T15:30:00.000Z	2026-04-26 15:30:00.079	\N
d9e9863a-f766-4237-9cf9-4dfb2e190dfa	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	debit	15500	82466	compute_billing	644a24d5-d991-44e1-bf8c-a69a5ce8ff28	Prepaid compute - Hour 2: gpu-instance-73qf	2026-04-26 15:30:00.082	\N
658aaab2-9ce9-4912-a526-334f042304d5	bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	debit	15500	82457	compute_billing	bdbaa558-00ea-4d6e-98f6-013330fb4339	Prepaid compute - Hour 2: gpu-instance-oek2	2026-04-26 15:30:00.217	\N
\.


--
-- TOC entry 6020 (class 0 OID 118686)
-- Dependencies: 248
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallets (id, user_id, balance_cents, currency, lifetime_credits_cents, lifetime_spent_cents, low_balance_threshold_cents, is_frozen, created_at, updated_at, created_by, updated_by, spend_limit_cents, spend_limit_enabled, spend_limit_period, spend_limit_consented_at, spend_limit_end_date, spend_limit_start_date, spend_limit_warning_85_sent, runway_warning_1hour_sent) FROM stdin;
948dfc47-41dd-4ef4-8063-81e1b09099bf	4e4433d2-26f4-4fd6-979a-c21e0387d893	24993	INR	25000	7	10000	f	2026-04-26 11:13:01.647	2026-04-26 11:30:00.171	\N	\N	\N	f	\N	\N	\N	\N	f	f
bfae3744-aded-4f74-bbc6-2e5e2adb93d5	8b25ae4d-2ef6-4f1f-9c0c-f03a9ea34934	82457	INR	150000	83043	10000	f	2026-04-26 09:46:09.307	2026-04-26 15:30:00.222	\N	\N	\N	f	\N	\N	\N	\N	f	f
\.


--
-- TOC entry 5401 (class 2606 OID 118033)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 5621 (class 2606 OID 119169)
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- TOC entry 5652 (class 2606 OID 119281)
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- TOC entry 5637 (class 2606 OID 119222)
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 5481 (class 2606 OID 118586)
-- Name: base_images base_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.base_images
    ADD CONSTRAINT base_images_pkey PRIMARY KEY (id);


--
-- TOC entry 5552 (class 2606 OID 118866)
-- Name: billing_charges billing_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_charges
    ADD CONSTRAINT billing_charges_pkey PRIMARY KEY (id);


--
-- TOC entry 5499 (class 2606 OID 118654)
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- TOC entry 5495 (class 2606 OID 118638)
-- Name: compute_config_access compute_config_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compute_config_access
    ADD CONSTRAINT compute_config_access_pkey PRIMARY KEY (id);


--
-- TOC entry 5488 (class 2606 OID 118626)
-- Name: compute_configs compute_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compute_configs
    ADD CONSTRAINT compute_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5571 (class 2606 OID 118932)
-- Name: course_enrollments course_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_pkey PRIMARY KEY (id);


--
-- TOC entry 5566 (class 2606 OID 118919)
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- TOC entry 5594 (class 2606 OID 119028)
-- Name: coursework_content coursework_content_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coursework_content
    ADD CONSTRAINT coursework_content_pkey PRIMARY KEY (id);


--
-- TOC entry 5529 (class 2606 OID 118758)
-- Name: credit_packages credit_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.credit_packages
    ADD CONSTRAINT credit_packages_pkey PRIMARY KEY (id);


--
-- TOC entry 5437 (class 2606 OID 118448)
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- TOC entry 5615 (class 2606 OID 119133)
-- Name: discussion_replies discussion_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussion_replies
    ADD CONSTRAINT discussion_replies_pkey PRIMARY KEY (id);


--
-- TOC entry 5611 (class 2606 OID 119117)
-- Name: discussions discussions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_pkey PRIMARY KEY (id);


--
-- TOC entry 5649 (class 2606 OID 119268)
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- TOC entry 5562 (class 2606 OID 118903)
-- Name: invoice_line_items invoice_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5558 (class 2606 OID 118888)
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- TOC entry 5583 (class 2606 OID 118982)
-- Name: lab_assignments lab_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_assignments
    ADD CONSTRAINT lab_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 5589 (class 2606 OID 119011)
-- Name: lab_grades lab_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_grades
    ADD CONSTRAINT lab_grades_pkey PRIMARY KEY (id);


--
-- TOC entry 5580 (class 2606 OID 118960)
-- Name: lab_group_assignments lab_group_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_group_assignments
    ADD CONSTRAINT lab_group_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 5586 (class 2606 OID 118998)
-- Name: lab_submissions lab_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_submissions
    ADD CONSTRAINT lab_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5577 (class 2606 OID 118948)
-- Name: labs labs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labs
    ADD CONSTRAINT labs_pkey PRIMARY KEY (id);


--
-- TOC entry 5414 (class 2606 OID 118362)
-- Name: login_history login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5599 (class 2606 OID 119066)
-- Name: mentor_availability_slots mentor_availability_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_availability_slots
    ADD CONSTRAINT mentor_availability_slots_pkey PRIMARY KEY (id);


--
-- TOC entry 5602 (class 2606 OID 119083)
-- Name: mentor_bookings mentor_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_bookings
    ADD CONSTRAINT mentor_bookings_pkey PRIMARY KEY (id);


--
-- TOC entry 5596 (class 2606 OID 119050)
-- Name: mentor_profiles mentor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5606 (class 2606 OID 119097)
-- Name: mentor_reviews mentor_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_reviews
    ADD CONSTRAINT mentor_reviews_pkey PRIMARY KEY (id);


--
-- TOC entry 5484 (class 2606 OID 118599)
-- Name: node_base_images node_base_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_base_images
    ADD CONSTRAINT node_base_images_pkey PRIMARY KEY (node_id, base_image_id);


--
-- TOC entry 5673 (class 2606 OID 120188)
-- Name: node_resource_reservations node_resource_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_resource_reservations
    ADD CONSTRAINT node_resource_reservations_pkey PRIMARY KEY (id);


--
-- TOC entry 5477 (class 2606 OID 118572)
-- Name: nodes nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nodes
    ADD CONSTRAINT nodes_pkey PRIMARY KEY (id);


--
-- TOC entry 5627 (class 2606 OID 119195)
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5630 (class 2606 OID 119210)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5541 (class 2606 OID 118813)
-- Name: org_contracts org_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_contracts
    ADD CONSTRAINT org_contracts_pkey PRIMARY KEY (id);


--
-- TOC entry 5545 (class 2606 OID 118831)
-- Name: org_resource_quotas org_resource_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_resource_quotas
    ADD CONSTRAINT org_resource_quotas_pkey PRIMARY KEY (id);


--
-- TOC entry 5416 (class 2606 OID 118366)
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- TOC entry 5466 (class 2606 OID 118534)
-- Name: os_switch_history os_switch_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_switch_history
    ADD CONSTRAINT os_switch_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5408 (class 2606 OID 118369)
-- Name: otp_verifications otp_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT otp_verifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5548 (class 2606 OID 118848)
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5423 (class 2606 OID 118372)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5618 (class 2606 OID 119154)
-- Name: project_showcases project_showcases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_showcases
    ADD CONSTRAINT project_showcases_pkey PRIMARY KEY (id);


--
-- TOC entry 5695 (class 2606 OID 124667)
-- Name: recommendation_sessions recommendation_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recommendation_sessions
    ADD CONSTRAINT recommendation_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5684 (class 2606 OID 124635)
-- Name: referral_conversions referral_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_pkey PRIMARY KEY (id);


--
-- TOC entry 5691 (class 2606 OID 124648)
-- Name: referral_events referral_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_events
    ADD CONSTRAINT referral_events_pkey PRIMARY KEY (id);


--
-- TOC entry 5678 (class 2606 OID 124612)
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- TOC entry 5412 (class 2606 OID 118378)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 5425 (class 2606 OID 118382)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- TOC entry 5420 (class 2606 OID 118385)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5513 (class 2606 OID 118685)
-- Name: session_events session_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_events
    ADD CONSTRAINT session_events_pkey PRIMARY KEY (id);


--
-- TOC entry 5506 (class 2606 OID 118673)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5667 (class 2606 OID 120086)
-- Name: storage_extensions storage_extensions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_extensions
    ADD CONSTRAINT storage_extensions_pkey PRIMARY KEY (id);


--
-- TOC entry 5532 (class 2606 OID 118780)
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- TOC entry 5537 (class 2606 OID 118797)
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- TOC entry 5657 (class 2606 OID 119299)
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- TOC entry 5646 (class 2606 OID 119252)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5660 (class 2606 OID 119314)
-- Name: ticket_messages ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5430 (class 2606 OID 118415)
-- Name: universities universities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.universities
    ADD CONSTRAINT universities_pkey PRIMARY KEY (id);


--
-- TOC entry 5433 (class 2606 OID 118432)
-- Name: university_idp_configs university_idp_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.university_idp_configs
    ADD CONSTRAINT university_idp_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5624 (class 2606 OID 119181)
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- TOC entry 5640 (class 2606 OID 119239)
-- Name: user_deletion_requests user_deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_deletion_requests
    ADD CONSTRAINT user_deletion_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 5450 (class 2606 OID 118492)
-- Name: user_departments user_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_pkey PRIMARY KEY (id);


--
-- TOC entry 5663 (class 2606 OID 119329)
-- Name: user_feedback user_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_pkey PRIMARY KEY (id);


--
-- TOC entry 5470 (class 2606 OID 118550)
-- Name: user_files user_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_files
    ADD CONSTRAINT user_files_pkey PRIMARY KEY (id);


--
-- TOC entry 5454 (class 2606 OID 118503)
-- Name: user_group_members user_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT user_group_members_pkey PRIMARY KEY (id);


--
-- TOC entry 5444 (class 2606 OID 118463)
-- Name: user_groups user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 5427 (class 2606 OID 118391)
-- Name: user_org_roles user_org_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_org_roles
    ADD CONSTRAINT user_org_roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5410 (class 2606 OID 118395)
-- Name: user_policy_consents user_policy_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_policy_consents
    ADD CONSTRAINT user_policy_consents_pkey PRIMARY KEY (id);


--
-- TOC entry 5446 (class 2606 OID 118479)
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5461 (class 2606 OID 118522)
-- Name: user_storage_volumes user_storage_volumes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_storage_volumes
    ADD CONSTRAINT user_storage_volumes_pkey PRIMARY KEY (id);


--
-- TOC entry 5405 (class 2606 OID 118398)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5700 (class 2606 OID 129419)
-- Name: waitlist_entries waitlist_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT waitlist_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 5521 (class 2606 OID 118723)
-- Name: wallet_holds wallet_holds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_holds
    ADD CONSTRAINT wallet_holds_pkey PRIMARY KEY (id);


--
-- TOC entry 5524 (class 2606 OID 118738)
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5517 (class 2606 OID 118709)
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- TOC entry 5622 (class 1259 OID 119424)
-- Name: achievements_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX achievements_slug_key ON public.achievements USING btree (slug);


--
-- TOC entry 5650 (class 1259 OID 119438)
-- Name: announcements_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX announcements_organization_id_idx ON public.announcements USING btree (organization_id);


--
-- TOC entry 5653 (class 1259 OID 119439)
-- Name: announcements_published_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX announcements_published_at_idx ON public.announcements USING btree (published_at);


--
-- TOC entry 5632 (class 1259 OID 119429)
-- Name: audit_log_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_log_action_idx ON public.audit_log USING btree (action);


--
-- TOC entry 5633 (class 1259 OID 119428)
-- Name: audit_log_actor_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_log_actor_id_idx ON public.audit_log USING btree (actor_id);


--
-- TOC entry 5634 (class 1259 OID 119432)
-- Name: audit_log_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_log_created_at_idx ON public.audit_log USING btree (created_at);


--
-- TOC entry 5635 (class 1259 OID 119431)
-- Name: audit_log_org_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_log_org_id_idx ON public.audit_log USING btree (org_id);


--
-- TOC entry 5638 (class 1259 OID 119430)
-- Name: audit_log_resource_type_resource_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_log_resource_type_resource_id_idx ON public.audit_log USING btree (resource_type, resource_id);


--
-- TOC entry 5479 (class 1259 OID 119356)
-- Name: base_images_is_default_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX base_images_is_default_idx ON public.base_images USING btree (is_default);


--
-- TOC entry 5482 (class 1259 OID 119355)
-- Name: base_images_tag_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX base_images_tag_key ON public.base_images USING btree (tag);


--
-- TOC entry 5553 (class 1259 OID 119393)
-- Name: billing_charges_session_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX billing_charges_session_id_idx ON public.billing_charges USING btree (session_id);


--
-- TOC entry 5554 (class 1259 OID 120123)
-- Name: billing_charges_storage_volume_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX billing_charges_storage_volume_id_idx ON public.billing_charges USING btree (storage_volume_id);


--
-- TOC entry 5555 (class 1259 OID 119392)
-- Name: billing_charges_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX billing_charges_user_id_created_at_idx ON public.billing_charges USING btree (user_id, created_at);


--
-- TOC entry 5497 (class 1259 OID 119366)
-- Name: bookings_node_id_scheduled_start_at_scheduled_end_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bookings_node_id_scheduled_start_at_scheduled_end_at_idx ON public.bookings USING btree (node_id, scheduled_start_at, scheduled_end_at);


--
-- TOC entry 5500 (class 1259 OID 119365)
-- Name: bookings_user_id_status_scheduled_start_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX bookings_user_id_status_scheduled_start_at_idx ON public.bookings USING btree (user_id, status, scheduled_start_at);


--
-- TOC entry 5492 (class 1259 OID 119364)
-- Name: compute_config_access_compute_config_id_organization_id_rol_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX compute_config_access_compute_config_id_organization_id_rol_key ON public.compute_config_access USING btree (compute_config_id, organization_id, role_id);


--
-- TOC entry 5493 (class 1259 OID 119362)
-- Name: compute_config_access_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX compute_config_access_organization_id_idx ON public.compute_config_access USING btree (organization_id);


--
-- TOC entry 5496 (class 1259 OID 119363)
-- Name: compute_config_access_role_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX compute_config_access_role_id_idx ON public.compute_config_access USING btree (role_id);


--
-- TOC entry 5486 (class 1259 OID 119361)
-- Name: compute_configs_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX compute_configs_is_active_idx ON public.compute_configs USING btree (is_active);


--
-- TOC entry 5489 (class 1259 OID 119359)
-- Name: compute_configs_session_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX compute_configs_session_type_idx ON public.compute_configs USING btree (session_type);


--
-- TOC entry 5490 (class 1259 OID 119358)
-- Name: compute_configs_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX compute_configs_slug_key ON public.compute_configs USING btree (slug);


--
-- TOC entry 5491 (class 1259 OID 119360)
-- Name: compute_configs_sort_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX compute_configs_sort_order_idx ON public.compute_configs USING btree (sort_order);


--
-- TOC entry 5568 (class 1259 OID 119400)
-- Name: course_enrollments_course_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX course_enrollments_course_id_idx ON public.course_enrollments USING btree (course_id);


--
-- TOC entry 5569 (class 1259 OID 119402)
-- Name: course_enrollments_course_id_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX course_enrollments_course_id_user_id_key ON public.course_enrollments USING btree (course_id, user_id);


--
-- TOC entry 5572 (class 1259 OID 119401)
-- Name: course_enrollments_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX course_enrollments_user_id_idx ON public.course_enrollments USING btree (user_id);


--
-- TOC entry 5563 (class 1259 OID 119398)
-- Name: courses_instructor_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX courses_instructor_id_idx ON public.courses USING btree (instructor_id);


--
-- TOC entry 5564 (class 1259 OID 119397)
-- Name: courses_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX courses_organization_id_idx ON public.courses USING btree (organization_id);


--
-- TOC entry 5567 (class 1259 OID 119399)
-- Name: courses_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX courses_status_idx ON public.courses USING btree (status);


--
-- TOC entry 5591 (class 1259 OID 119411)
-- Name: coursework_content_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX coursework_content_category_idx ON public.coursework_content USING btree (category);


--
-- TOC entry 5592 (class 1259 OID 119412)
-- Name: coursework_content_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX coursework_content_organization_id_idx ON public.coursework_content USING btree (organization_id);


--
-- TOC entry 5527 (class 1259 OID 119381)
-- Name: credit_packages_is_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX credit_packages_is_active_idx ON public.credit_packages USING btree (is_active);


--
-- TOC entry 5530 (class 1259 OID 119380)
-- Name: credit_packages_sort_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX credit_packages_sort_order_idx ON public.credit_packages USING btree (sort_order);


--
-- TOC entry 5435 (class 1259 OID 119333)
-- Name: departments_parent_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX departments_parent_id_idx ON public.departments USING btree (parent_id);


--
-- TOC entry 5438 (class 1259 OID 119332)
-- Name: departments_university_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX departments_university_id_idx ON public.departments USING btree (university_id);


--
-- TOC entry 5439 (class 1259 OID 119334)
-- Name: departments_university_id_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX departments_university_id_slug_key ON public.departments USING btree (university_id, slug);


--
-- TOC entry 5612 (class 1259 OID 119421)
-- Name: discussion_replies_author_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX discussion_replies_author_id_idx ON public.discussion_replies USING btree (author_id);


--
-- TOC entry 5613 (class 1259 OID 119420)
-- Name: discussion_replies_discussion_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX discussion_replies_discussion_id_idx ON public.discussion_replies USING btree (discussion_id);


--
-- TOC entry 5607 (class 1259 OID 119419)
-- Name: discussions_author_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX discussions_author_id_idx ON public.discussions USING btree (author_id);


--
-- TOC entry 5608 (class 1259 OID 119418)
-- Name: discussions_course_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX discussions_course_id_idx ON public.discussions USING btree (course_id);


--
-- TOC entry 5609 (class 1259 OID 119417)
-- Name: discussions_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX discussions_organization_id_idx ON public.discussions USING btree (organization_id);


--
-- TOC entry 5647 (class 1259 OID 119437)
-- Name: feature_flags_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX feature_flags_key_key ON public.feature_flags USING btree (key);


--
-- TOC entry 5556 (class 1259 OID 119394)
-- Name: invoices_invoice_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX invoices_invoice_number_key ON public.invoices USING btree (invoice_number);


--
-- TOC entry 5559 (class 1259 OID 119396)
-- Name: invoices_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);


--
-- TOC entry 5560 (class 1259 OID 119395)
-- Name: invoices_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX invoices_user_id_created_at_idx ON public.invoices USING btree (user_id, created_at);


--
-- TOC entry 5581 (class 1259 OID 119407)
-- Name: lab_assignments_lab_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lab_assignments_lab_id_idx ON public.lab_assignments USING btree (lab_id);


--
-- TOC entry 5590 (class 1259 OID 119410)
-- Name: lab_grades_submission_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lab_grades_submission_id_key ON public.lab_grades USING btree (submission_id);


--
-- TOC entry 5578 (class 1259 OID 119406)
-- Name: lab_group_assignments_lab_id_user_group_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lab_group_assignments_lab_id_user_group_id_key ON public.lab_group_assignments USING btree (lab_id, user_group_id);


--
-- TOC entry 5584 (class 1259 OID 119408)
-- Name: lab_submissions_lab_assignment_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lab_submissions_lab_assignment_id_idx ON public.lab_submissions USING btree (lab_assignment_id);


--
-- TOC entry 5587 (class 1259 OID 119409)
-- Name: lab_submissions_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX lab_submissions_user_id_idx ON public.lab_submissions USING btree (user_id);


--
-- TOC entry 5573 (class 1259 OID 119403)
-- Name: labs_course_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX labs_course_id_idx ON public.labs USING btree (course_id);


--
-- TOC entry 5574 (class 1259 OID 119405)
-- Name: labs_created_by_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX labs_created_by_user_id_idx ON public.labs USING btree (created_by_user_id);


--
-- TOC entry 5575 (class 1259 OID 119404)
-- Name: labs_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX labs_organization_id_idx ON public.labs USING btree (organization_id);


--
-- TOC entry 5600 (class 1259 OID 119414)
-- Name: mentor_bookings_mentor_profile_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mentor_bookings_mentor_profile_id_idx ON public.mentor_bookings USING btree (mentor_profile_id);


--
-- TOC entry 5603 (class 1259 OID 119415)
-- Name: mentor_bookings_student_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX mentor_bookings_student_user_id_idx ON public.mentor_bookings USING btree (student_user_id);


--
-- TOC entry 5597 (class 1259 OID 119413)
-- Name: mentor_profiles_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX mentor_profiles_user_id_key ON public.mentor_profiles USING btree (user_id);


--
-- TOC entry 5604 (class 1259 OID 119416)
-- Name: mentor_reviews_mentor_booking_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX mentor_reviews_mentor_booking_id_key ON public.mentor_reviews USING btree (mentor_booking_id);


--
-- TOC entry 5485 (class 1259 OID 119357)
-- Name: node_base_images_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX node_base_images_status_idx ON public.node_base_images USING btree (status);


--
-- TOC entry 5670 (class 1259 OID 120193)
-- Name: node_resource_reservations_node_id_session_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX node_resource_reservations_node_id_session_id_key ON public.node_resource_reservations USING btree (node_id, session_id);


--
-- TOC entry 5671 (class 1259 OID 120190)
-- Name: node_resource_reservations_node_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX node_resource_reservations_node_id_status_idx ON public.node_resource_reservations USING btree (node_id, status);


--
-- TOC entry 5674 (class 1259 OID 120192)
-- Name: node_resource_reservations_released_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX node_resource_reservations_released_at_idx ON public.node_resource_reservations USING btree (released_at);


--
-- TOC entry 5675 (class 1259 OID 120191)
-- Name: node_resource_reservations_session_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX node_resource_reservations_session_id_idx ON public.node_resource_reservations USING btree (session_id);


--
-- TOC entry 5676 (class 1259 OID 120189)
-- Name: node_resource_reservations_session_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX node_resource_reservations_session_id_key ON public.node_resource_reservations USING btree (session_id);


--
-- TOC entry 5473 (class 1259 OID 119352)
-- Name: nodes_hostname_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX nodes_hostname_key ON public.nodes USING btree (hostname);


--
-- TOC entry 5474 (class 1259 OID 119354)
-- Name: nodes_last_heartbeat_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX nodes_last_heartbeat_at_idx ON public.nodes USING btree (last_heartbeat_at);


--
-- TOC entry 5475 (class 1259 OID 120194)
-- Name: nodes_last_resource_sync_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX nodes_last_resource_sync_at_idx ON public.nodes USING btree (last_resource_sync_at);


--
-- TOC entry 5478 (class 1259 OID 119353)
-- Name: nodes_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX nodes_status_idx ON public.nodes USING btree (status);


--
-- TOC entry 5628 (class 1259 OID 119426)
-- Name: notification_templates_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX notification_templates_slug_key ON public.notification_templates USING btree (slug);


--
-- TOC entry 5631 (class 1259 OID 119427)
-- Name: notifications_user_id_status_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_user_id_status_created_at_idx ON public.notifications USING btree (user_id, status, created_at);


--
-- TOC entry 5539 (class 1259 OID 119386)
-- Name: org_contracts_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX org_contracts_organization_id_idx ON public.org_contracts USING btree (organization_id);


--
-- TOC entry 5542 (class 1259 OID 119387)
-- Name: org_contracts_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX org_contracts_status_idx ON public.org_contracts USING btree (status);


--
-- TOC entry 5543 (class 1259 OID 119388)
-- Name: org_resource_quotas_organization_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX org_resource_quotas_organization_id_key ON public.org_resource_quotas USING btree (organization_id);


--
-- TOC entry 5417 (class 1259 OID 118178)
-- Name: organizations_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);


--
-- TOC entry 5464 (class 1259 OID 119348)
-- Name: os_switch_history_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX os_switch_history_created_at_idx ON public.os_switch_history USING btree (created_at);


--
-- TOC entry 5467 (class 1259 OID 119347)
-- Name: os_switch_history_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX os_switch_history_user_id_idx ON public.os_switch_history USING btree (user_id);


--
-- TOC entry 5546 (class 1259 OID 119389)
-- Name: payment_transactions_gateway_txn_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX payment_transactions_gateway_txn_id_key ON public.payment_transactions USING btree (gateway_txn_id);


--
-- TOC entry 5549 (class 1259 OID 119391)
-- Name: payment_transactions_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_transactions_status_idx ON public.payment_transactions USING btree (status);


--
-- TOC entry 5550 (class 1259 OID 119390)
-- Name: payment_transactions_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_transactions_user_id_created_at_idx ON public.payment_transactions USING btree (user_id, created_at);


--
-- TOC entry 5421 (class 1259 OID 118180)
-- Name: permissions_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX permissions_code_key ON public.permissions USING btree (code);


--
-- TOC entry 5616 (class 1259 OID 119423)
-- Name: project_showcases_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_showcases_organization_id_idx ON public.project_showcases USING btree (organization_id);


--
-- TOC entry 5619 (class 1259 OID 119422)
-- Name: project_showcases_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX project_showcases_user_id_idx ON public.project_showcases USING btree (user_id);


--
-- TOC entry 5693 (class 1259 OID 124679)
-- Name: recommendation_sessions_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX recommendation_sessions_created_at_idx ON public.recommendation_sessions USING btree (created_at);


--
-- TOC entry 5696 (class 1259 OID 124678)
-- Name: recommendation_sessions_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX recommendation_sessions_user_id_idx ON public.recommendation_sessions USING btree (user_id);


--
-- TOC entry 5685 (class 1259 OID 124674)
-- Name: referral_conversions_referral_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX referral_conversions_referral_id_status_idx ON public.referral_conversions USING btree (referral_id, status);


--
-- TOC entry 5686 (class 1259 OID 124672)
-- Name: referral_conversions_referred_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX referral_conversions_referred_user_id_key ON public.referral_conversions USING btree (referred_user_id);


--
-- TOC entry 5687 (class 1259 OID 124673)
-- Name: referral_conversions_referrer_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX referral_conversions_referrer_user_id_idx ON public.referral_conversions USING btree (referrer_user_id);


--
-- TOC entry 5688 (class 1259 OID 124675)
-- Name: referral_conversions_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX referral_conversions_status_idx ON public.referral_conversions USING btree (status);


--
-- TOC entry 5689 (class 1259 OID 124677)
-- Name: referral_events_event_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX referral_events_event_type_idx ON public.referral_events USING btree (event_type);


--
-- TOC entry 5692 (class 1259 OID 124676)
-- Name: referral_events_referral_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX referral_events_referral_id_created_at_idx ON public.referral_events USING btree (referral_id, created_at);


--
-- TOC entry 5679 (class 1259 OID 124670)
-- Name: referrals_referral_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX referrals_referral_code_idx ON public.referrals USING btree (referral_code);


--
-- TOC entry 5680 (class 1259 OID 124669)
-- Name: referrals_referral_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX referrals_referral_code_key ON public.referrals USING btree (referral_code);


--
-- TOC entry 5681 (class 1259 OID 124671)
-- Name: referrals_referrer_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX referrals_referrer_user_id_idx ON public.referrals USING btree (referrer_user_id);


--
-- TOC entry 5682 (class 1259 OID 124668)
-- Name: referrals_referrer_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX referrals_referrer_user_id_key ON public.referrals USING btree (referrer_user_id);


--
-- TOC entry 5418 (class 1259 OID 118179)
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- TOC entry 5511 (class 1259 OID 119373)
-- Name: session_events_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX session_events_created_at_idx ON public.session_events USING btree (created_at);


--
-- TOC entry 5514 (class 1259 OID 119372)
-- Name: session_events_session_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX session_events_session_id_idx ON public.session_events USING btree (session_id);


--
-- TOC entry 5501 (class 1259 OID 119367)
-- Name: sessions_booking_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sessions_booking_id_key ON public.sessions USING btree (booking_id);


--
-- TOC entry 5502 (class 1259 OID 119371)
-- Name: sessions_compute_config_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_compute_config_id_idx ON public.sessions USING btree (compute_config_id);


--
-- TOC entry 5503 (class 1259 OID 120196)
-- Name: sessions_instance_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_instance_name_idx ON public.sessions USING btree (instance_name);


--
-- TOC entry 5504 (class 1259 OID 119369)
-- Name: sessions_node_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_node_id_status_idx ON public.sessions USING btree (node_id, status);


--
-- TOC entry 5507 (class 1259 OID 119370)
-- Name: sessions_started_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_started_at_idx ON public.sessions USING btree (started_at);


--
-- TOC entry 5508 (class 1259 OID 120195)
-- Name: sessions_storage_mode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_storage_mode_idx ON public.sessions USING btree (storage_mode);


--
-- TOC entry 5509 (class 1259 OID 137656)
-- Name: sessions_storage_node_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_storage_node_id_idx ON public.sessions USING btree (storage_node_id);


--
-- TOC entry 5510 (class 1259 OID 119368)
-- Name: sessions_user_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_user_id_status_idx ON public.sessions USING btree (user_id, status);


--
-- TOC entry 5665 (class 1259 OID 120089)
-- Name: storage_extensions_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX storage_extensions_created_at_idx ON public.storage_extensions USING btree (created_at);


--
-- TOC entry 5668 (class 1259 OID 120088)
-- Name: storage_extensions_storage_volume_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX storage_extensions_storage_volume_id_idx ON public.storage_extensions USING btree (storage_volume_id);


--
-- TOC entry 5669 (class 1259 OID 120087)
-- Name: storage_extensions_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX storage_extensions_user_id_idx ON public.storage_extensions USING btree (user_id);


--
-- TOC entry 5533 (class 1259 OID 119382)
-- Name: subscription_plans_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX subscription_plans_slug_key ON public.subscription_plans USING btree (slug);


--
-- TOC entry 5534 (class 1259 OID 119383)
-- Name: subscription_plans_sort_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscription_plans_sort_order_idx ON public.subscription_plans USING btree (sort_order);


--
-- TOC entry 5535 (class 1259 OID 119385)
-- Name: subscriptions_ends_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscriptions_ends_at_idx ON public.subscriptions USING btree (ends_at);


--
-- TOC entry 5538 (class 1259 OID 119384)
-- Name: subscriptions_user_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscriptions_user_id_status_idx ON public.subscriptions USING btree (user_id, status);


--
-- TOC entry 5654 (class 1259 OID 119441)
-- Name: support_tickets_assigned_to_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX support_tickets_assigned_to_status_idx ON public.support_tickets USING btree (assigned_to, status);


--
-- TOC entry 5655 (class 1259 OID 119442)
-- Name: support_tickets_organization_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX support_tickets_organization_id_status_idx ON public.support_tickets USING btree (organization_id, status);


--
-- TOC entry 5658 (class 1259 OID 119440)
-- Name: support_tickets_user_id_status_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX support_tickets_user_id_status_created_at_idx ON public.support_tickets USING btree (user_id, status, created_at);


--
-- TOC entry 5644 (class 1259 OID 119436)
-- Name: system_settings_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX system_settings_key_key ON public.system_settings USING btree (key);


--
-- TOC entry 5661 (class 1259 OID 119443)
-- Name: ticket_messages_ticket_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ticket_messages_ticket_id_created_at_idx ON public.ticket_messages USING btree (ticket_id, created_at);


--
-- TOC entry 5431 (class 1259 OID 119330)
-- Name: universities_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX universities_slug_key ON public.universities USING btree (slug);


--
-- TOC entry 5434 (class 1259 OID 119331)
-- Name: university_idp_configs_university_id_idp_type_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX university_idp_configs_university_id_idp_type_key ON public.university_idp_configs USING btree (university_id, idp_type);


--
-- TOC entry 5625 (class 1259 OID 119425)
-- Name: user_achievements_user_id_achievement_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_achievements_user_id_achievement_id_key ON public.user_achievements USING btree (user_id, achievement_id);


--
-- TOC entry 5641 (class 1259 OID 119435)
-- Name: user_deletion_requests_scheduled_deletion_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_deletion_requests_scheduled_deletion_at_idx ON public.user_deletion_requests USING btree (scheduled_deletion_at);


--
-- TOC entry 5642 (class 1259 OID 119434)
-- Name: user_deletion_requests_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_deletion_requests_status_idx ON public.user_deletion_requests USING btree (status);


--
-- TOC entry 5643 (class 1259 OID 119433)
-- Name: user_deletion_requests_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_deletion_requests_user_id_idx ON public.user_deletion_requests USING btree (user_id);


--
-- TOC entry 5448 (class 1259 OID 119340)
-- Name: user_departments_department_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_departments_department_id_idx ON public.user_departments USING btree (department_id);


--
-- TOC entry 5451 (class 1259 OID 119341)
-- Name: user_departments_user_id_department_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_departments_user_id_department_id_key ON public.user_departments USING btree (user_id, department_id);


--
-- TOC entry 5452 (class 1259 OID 119339)
-- Name: user_departments_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_departments_user_id_idx ON public.user_departments USING btree (user_id);


--
-- TOC entry 5664 (class 1259 OID 119444)
-- Name: user_feedback_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_feedback_user_id_created_at_idx ON public.user_feedback USING btree (user_id, created_at);


--
-- TOC entry 5468 (class 1259 OID 119350)
-- Name: user_files_deleted_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_files_deleted_at_idx ON public.user_files USING btree (deleted_at);


--
-- TOC entry 5471 (class 1259 OID 119351)
-- Name: user_files_scheduled_deletion_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_files_scheduled_deletion_at_idx ON public.user_files USING btree (scheduled_deletion_at);


--
-- TOC entry 5472 (class 1259 OID 119349)
-- Name: user_files_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_files_user_id_idx ON public.user_files USING btree (user_id);


--
-- TOC entry 5455 (class 1259 OID 119343)
-- Name: user_group_members_user_group_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_group_members_user_group_id_idx ON public.user_group_members USING btree (user_group_id);


--
-- TOC entry 5456 (class 1259 OID 119342)
-- Name: user_group_members_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_group_members_user_id_idx ON public.user_group_members USING btree (user_id);


--
-- TOC entry 5457 (class 1259 OID 119344)
-- Name: user_group_members_user_id_user_group_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_group_members_user_id_user_group_id_key ON public.user_group_members USING btree (user_id, user_group_id);


--
-- TOC entry 5440 (class 1259 OID 119336)
-- Name: user_groups_department_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_groups_department_id_idx ON public.user_groups USING btree (department_id);


--
-- TOC entry 5441 (class 1259 OID 119335)
-- Name: user_groups_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_groups_organization_id_idx ON public.user_groups USING btree (organization_id);


--
-- TOC entry 5442 (class 1259 OID 119337)
-- Name: user_groups_parent_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_groups_parent_id_idx ON public.user_groups USING btree (parent_id);


--
-- TOC entry 5428 (class 1259 OID 119445)
-- Name: user_org_roles_user_id_organization_id_role_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_org_roles_user_id_organization_id_role_id_key ON public.user_org_roles USING btree (user_id, organization_id, role_id);


--
-- TOC entry 5447 (class 1259 OID 119338)
-- Name: user_profiles_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_profiles_user_id_key ON public.user_profiles USING btree (user_id);


--
-- TOC entry 5458 (class 1259 OID 119346)
-- Name: user_storage_volumes_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_storage_volumes_created_at_idx ON public.user_storage_volumes USING btree (created_at);


--
-- TOC entry 5459 (class 1259 OID 137655)
-- Name: user_storage_volumes_node_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_storage_volumes_node_id_idx ON public.user_storage_volumes USING btree (node_id);


--
-- TOC entry 5462 (class 1259 OID 120118)
-- Name: user_storage_volumes_user_id_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_storage_volumes_user_id_name_key ON public.user_storage_volumes USING btree (user_id, name);


--
-- TOC entry 5463 (class 1259 OID 119345)
-- Name: user_storage_volumes_user_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_storage_volumes_user_id_status_idx ON public.user_storage_volumes USING btree (user_id, status);


--
-- TOC entry 5402 (class 1259 OID 118175)
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- TOC entry 5403 (class 1259 OID 118176)
-- Name: users_keycloak_sub_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_keycloak_sub_key ON public.users USING btree (keycloak_sub);


--
-- TOC entry 5406 (class 1259 OID 118177)
-- Name: users_storage_uid_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_storage_uid_key ON public.users USING btree (storage_uid);


--
-- TOC entry 5697 (class 1259 OID 129422)
-- Name: waitlist_entries_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "waitlist_entries_createdAt_idx" ON public.waitlist_entries USING btree ("createdAt");


--
-- TOC entry 5698 (class 1259 OID 129420)
-- Name: waitlist_entries_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX waitlist_entries_email_idx ON public.waitlist_entries USING btree (email);


--
-- TOC entry 5701 (class 1259 OID 129421)
-- Name: waitlist_entries_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX waitlist_entries_status_idx ON public.waitlist_entries USING btree (status);


--
-- TOC entry 5519 (class 1259 OID 119377)
-- Name: wallet_holds_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX wallet_holds_expires_at_idx ON public.wallet_holds USING btree (expires_at);


--
-- TOC entry 5522 (class 1259 OID 119376)
-- Name: wallet_holds_wallet_id_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX wallet_holds_wallet_id_status_idx ON public.wallet_holds USING btree (wallet_id, status);


--
-- TOC entry 5525 (class 1259 OID 119379)
-- Name: wallet_transactions_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX wallet_transactions_user_id_created_at_idx ON public.wallet_transactions USING btree (user_id, created_at);


--
-- TOC entry 5526 (class 1259 OID 119378)
-- Name: wallet_transactions_wallet_id_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX wallet_transactions_wallet_id_created_at_idx ON public.wallet_transactions USING btree (wallet_id, created_at);


--
-- TOC entry 5515 (class 1259 OID 119375)
-- Name: wallets_balance_cents_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX wallets_balance_cents_idx ON public.wallets USING btree (balance_cents);


--
-- TOC entry 5518 (class 1259 OID 119374)
-- Name: wallets_user_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX wallets_user_id_key ON public.wallets USING btree (user_id);


--
-- TOC entry 5819 (class 2606 OID 120011)
-- Name: announcements announcements_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5815 (class 2606 OID 119991)
-- Name: audit_log audit_log_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5816 (class 2606 OID 119996)
-- Name: audit_log audit_log_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5766 (class 2606 OID 119761)
-- Name: billing_charges billing_charges_compute_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_charges
    ADD CONSTRAINT billing_charges_compute_config_id_fkey FOREIGN KEY (compute_config_id) REFERENCES public.compute_configs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5767 (class 2606 OID 119756)
-- Name: billing_charges billing_charges_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_charges
    ADD CONSTRAINT billing_charges_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5768 (class 2606 OID 120124)
-- Name: billing_charges billing_charges_storage_volume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_charges
    ADD CONSTRAINT billing_charges_storage_volume_id_fkey FOREIGN KEY (storage_volume_id) REFERENCES public.user_storage_volumes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5769 (class 2606 OID 119751)
-- Name: billing_charges billing_charges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_charges
    ADD CONSTRAINT billing_charges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5770 (class 2606 OID 119766)
-- Name: billing_charges billing_charges_wallet_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_charges
    ADD CONSTRAINT billing_charges_wallet_transaction_id_fkey FOREIGN KEY (wallet_transaction_id) REFERENCES public.wallet_transactions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5740 (class 2606 OID 119636)
-- Name: bookings bookings_compute_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_compute_config_id_fkey FOREIGN KEY (compute_config_id) REFERENCES public.compute_configs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5741 (class 2606 OID 119641)
-- Name: bookings bookings_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.nodes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5742 (class 2606 OID 119631)
-- Name: bookings bookings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5743 (class 2606 OID 119626)
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5737 (class 2606 OID 119611)
-- Name: compute_config_access compute_config_access_compute_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compute_config_access
    ADD CONSTRAINT compute_config_access_compute_config_id_fkey FOREIGN KEY (compute_config_id) REFERENCES public.compute_configs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5738 (class 2606 OID 119616)
-- Name: compute_config_access compute_config_access_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compute_config_access
    ADD CONSTRAINT compute_config_access_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5739 (class 2606 OID 119621)
-- Name: compute_config_access compute_config_access_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.compute_config_access
    ADD CONSTRAINT compute_config_access_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5778 (class 2606 OID 119806)
-- Name: course_enrollments course_enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5779 (class 2606 OID 119811)
-- Name: course_enrollments course_enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5774 (class 2606 OID 119801)
-- Name: courses courses_default_compute_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_default_compute_config_id_fkey FOREIGN KEY (default_compute_config_id) REFERENCES public.compute_configs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5775 (class 2606 OID 119791)
-- Name: courses courses_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5776 (class 2606 OID 119796)
-- Name: courses courses_instructor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5777 (class 2606 OID 119786)
-- Name: courses courses_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5794 (class 2606 OID 119886)
-- Name: coursework_content coursework_content_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coursework_content
    ADD CONSTRAINT coursework_content_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5714 (class 2606 OID 119516)
-- Name: departments departments_head_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_head_user_id_fkey FOREIGN KEY (head_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5715 (class 2606 OID 119511)
-- Name: departments departments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5716 (class 2606 OID 119506)
-- Name: departments departments_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5806 (class 2606 OID 119956)
-- Name: discussion_replies discussion_replies_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussion_replies
    ADD CONSTRAINT discussion_replies_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5807 (class 2606 OID 119946)
-- Name: discussion_replies discussion_replies_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussion_replies
    ADD CONSTRAINT discussion_replies_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5808 (class 2606 OID 119951)
-- Name: discussion_replies discussion_replies_parent_reply_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussion_replies
    ADD CONSTRAINT discussion_replies_parent_reply_id_fkey FOREIGN KEY (parent_reply_id) REFERENCES public.discussion_replies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5802 (class 2606 OID 119941)
-- Name: discussions discussions_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5803 (class 2606 OID 119931)
-- Name: discussions discussions_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5804 (class 2606 OID 119936)
-- Name: discussions discussions_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5805 (class 2606 OID 119926)
-- Name: discussions discussions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5773 (class 2606 OID 119781)
-- Name: invoice_line_items invoice_line_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line_items
    ADD CONSTRAINT invoice_line_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5771 (class 2606 OID 119776)
-- Name: invoices invoices_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5772 (class 2606 OID 119771)
-- Name: invoices invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5788 (class 2606 OID 119856)
-- Name: lab_assignments lab_assignments_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_assignments
    ADD CONSTRAINT lab_assignments_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5792 (class 2606 OID 119881)
-- Name: lab_grades lab_grades_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_grades
    ADD CONSTRAINT lab_grades_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5793 (class 2606 OID 119876)
-- Name: lab_grades lab_grades_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_grades
    ADD CONSTRAINT lab_grades_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.lab_submissions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5785 (class 2606 OID 119851)
-- Name: lab_group_assignments lab_group_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_group_assignments
    ADD CONSTRAINT lab_group_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5786 (class 2606 OID 119841)
-- Name: lab_group_assignments lab_group_assignments_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_group_assignments
    ADD CONSTRAINT lab_group_assignments_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5787 (class 2606 OID 119846)
-- Name: lab_group_assignments lab_group_assignments_user_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_group_assignments
    ADD CONSTRAINT lab_group_assignments_user_group_id_fkey FOREIGN KEY (user_group_id) REFERENCES public.user_groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5789 (class 2606 OID 119861)
-- Name: lab_submissions lab_submissions_lab_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_submissions
    ADD CONSTRAINT lab_submissions_lab_assignment_id_fkey FOREIGN KEY (lab_assignment_id) REFERENCES public.lab_assignments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5790 (class 2606 OID 119871)
-- Name: lab_submissions lab_submissions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_submissions
    ADD CONSTRAINT lab_submissions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5791 (class 2606 OID 119866)
-- Name: lab_submissions lab_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_submissions
    ADD CONSTRAINT lab_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5780 (class 2606 OID 119836)
-- Name: labs labs_base_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labs
    ADD CONSTRAINT labs_base_image_id_fkey FOREIGN KEY (base_image_id) REFERENCES public.base_images(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5781 (class 2606 OID 119831)
-- Name: labs labs_compute_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labs
    ADD CONSTRAINT labs_compute_config_id_fkey FOREIGN KEY (compute_config_id) REFERENCES public.compute_configs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5782 (class 2606 OID 119816)
-- Name: labs labs_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labs
    ADD CONSTRAINT labs_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5783 (class 2606 OID 119826)
-- Name: labs labs_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labs
    ADD CONSTRAINT labs_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5784 (class 2606 OID 119821)
-- Name: labs labs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labs
    ADD CONSTRAINT labs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5706 (class 2606 OID 119466)
-- Name: login_history login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_history
    ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5796 (class 2606 OID 119896)
-- Name: mentor_availability_slots mentor_availability_slots_mentor_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_availability_slots
    ADD CONSTRAINT mentor_availability_slots_mentor_profile_id_fkey FOREIGN KEY (mentor_profile_id) REFERENCES public.mentor_profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5797 (class 2606 OID 119901)
-- Name: mentor_bookings mentor_bookings_mentor_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_bookings
    ADD CONSTRAINT mentor_bookings_mentor_profile_id_fkey FOREIGN KEY (mentor_profile_id) REFERENCES public.mentor_profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5798 (class 2606 OID 119911)
-- Name: mentor_bookings mentor_bookings_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_bookings
    ADD CONSTRAINT mentor_bookings_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5799 (class 2606 OID 119906)
-- Name: mentor_bookings mentor_bookings_student_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_bookings
    ADD CONSTRAINT mentor_bookings_student_user_id_fkey FOREIGN KEY (student_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5795 (class 2606 OID 119891)
-- Name: mentor_profiles mentor_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_profiles
    ADD CONSTRAINT mentor_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5800 (class 2606 OID 119916)
-- Name: mentor_reviews mentor_reviews_mentor_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_reviews
    ADD CONSTRAINT mentor_reviews_mentor_booking_id_fkey FOREIGN KEY (mentor_booking_id) REFERENCES public.mentor_bookings(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5801 (class 2606 OID 119921)
-- Name: mentor_reviews mentor_reviews_reviewer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mentor_reviews
    ADD CONSTRAINT mentor_reviews_reviewer_user_id_fkey FOREIGN KEY (reviewer_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5735 (class 2606 OID 119606)
-- Name: node_base_images node_base_images_base_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_base_images
    ADD CONSTRAINT node_base_images_base_image_id_fkey FOREIGN KEY (base_image_id) REFERENCES public.base_images(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5736 (class 2606 OID 119601)
-- Name: node_base_images node_base_images_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_base_images
    ADD CONSTRAINT node_base_images_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.nodes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5834 (class 2606 OID 120197)
-- Name: node_resource_reservations node_resource_reservations_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_resource_reservations
    ADD CONSTRAINT node_resource_reservations_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.nodes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5835 (class 2606 OID 120202)
-- Name: node_resource_reservations node_resource_reservations_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.node_resource_reservations
    ADD CONSTRAINT node_resource_reservations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5813 (class 2606 OID 119986)
-- Name: notifications notifications_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.notification_templates(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5814 (class 2606 OID 119981)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5763 (class 2606 OID 119736)
-- Name: org_contracts org_contracts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_contracts
    ADD CONSTRAINT org_contracts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5764 (class 2606 OID 119741)
-- Name: org_resource_quotas org_resource_quotas_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_resource_quotas
    ADD CONSTRAINT org_resource_quotas_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5707 (class 2606 OID 119471)
-- Name: organizations organizations_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5730 (class 2606 OID 119586)
-- Name: os_switch_history os_switch_history_new_volume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_switch_history
    ADD CONSTRAINT os_switch_history_new_volume_id_fkey FOREIGN KEY (new_volume_id) REFERENCES public.user_storage_volumes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5731 (class 2606 OID 119581)
-- Name: os_switch_history os_switch_history_old_volume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_switch_history
    ADD CONSTRAINT os_switch_history_old_volume_id_fkey FOREIGN KEY (old_volume_id) REFERENCES public.user_storage_volumes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5732 (class 2606 OID 119576)
-- Name: os_switch_history os_switch_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.os_switch_history
    ADD CONSTRAINT os_switch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5703 (class 2606 OID 119451)
-- Name: otp_verifications otp_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_verifications
    ADD CONSTRAINT otp_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5765 (class 2606 OID 119746)
-- Name: payment_transactions payment_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5809 (class 2606 OID 119966)
-- Name: project_showcases project_showcases_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_showcases
    ADD CONSTRAINT project_showcases_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5810 (class 2606 OID 119961)
-- Name: project_showcases project_showcases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_showcases
    ADD CONSTRAINT project_showcases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5842 (class 2606 OID 124710)
-- Name: recommendation_sessions recommendation_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recommendation_sessions
    ADD CONSTRAINT recommendation_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5837 (class 2606 OID 124685)
-- Name: referral_conversions referral_conversions_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5838 (class 2606 OID 124695)
-- Name: referral_conversions referral_conversions_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5839 (class 2606 OID 124690)
-- Name: referral_conversions referral_conversions_referrer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_conversions
    ADD CONSTRAINT referral_conversions_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5840 (class 2606 OID 124705)
-- Name: referral_events referral_events_referral_conversion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_events
    ADD CONSTRAINT referral_events_referral_conversion_id_fkey FOREIGN KEY (referral_conversion_id) REFERENCES public.referral_conversions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5841 (class 2606 OID 124700)
-- Name: referral_events referral_events_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_events
    ADD CONSTRAINT referral_events_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.referrals(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5836 (class 2606 OID 124680)
-- Name: referrals referrals_referrer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5705 (class 2606 OID 119461)
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5708 (class 2606 OID 119481)
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5709 (class 2606 OID 119476)
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5751 (class 2606 OID 119676)
-- Name: session_events session_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_events
    ADD CONSTRAINT session_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5744 (class 2606 OID 119671)
-- Name: sessions sessions_base_image_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_base_image_id_fkey FOREIGN KEY (base_image_id) REFERENCES public.base_images(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5745 (class 2606 OID 119661)
-- Name: sessions sessions_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5746 (class 2606 OID 119656)
-- Name: sessions sessions_compute_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_compute_config_id_fkey FOREIGN KEY (compute_config_id) REFERENCES public.compute_configs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5747 (class 2606 OID 119666)
-- Name: sessions sessions_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.nodes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5748 (class 2606 OID 119651)
-- Name: sessions sessions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5749 (class 2606 OID 137650)
-- Name: sessions sessions_storage_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_storage_node_id_fkey FOREIGN KEY (storage_node_id) REFERENCES public.nodes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5750 (class 2606 OID 119646)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5830 (class 2606 OID 120100)
-- Name: storage_extensions storage_extensions_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_extensions
    ADD CONSTRAINT storage_extensions_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5831 (class 2606 OID 120095)
-- Name: storage_extensions storage_extensions_storage_volume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_extensions
    ADD CONSTRAINT storage_extensions_storage_volume_id_fkey FOREIGN KEY (storage_volume_id) REFERENCES public.user_storage_volumes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5832 (class 2606 OID 120090)
-- Name: storage_extensions storage_extensions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_extensions
    ADD CONSTRAINT storage_extensions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5833 (class 2606 OID 120105)
-- Name: storage_extensions storage_extensions_wallet_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.storage_extensions
    ADD CONSTRAINT storage_extensions_wallet_transaction_id_fkey FOREIGN KEY (wallet_transaction_id) REFERENCES public.wallet_transactions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5759 (class 2606 OID 119726)
-- Name: subscriptions subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5760 (class 2606 OID 119731)
-- Name: subscriptions subscriptions_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5761 (class 2606 OID 119721)
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5762 (class 2606 OID 119716)
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5820 (class 2606 OID 120026)
-- Name: support_tickets support_tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5821 (class 2606 OID 120021)
-- Name: support_tickets support_tickets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5822 (class 2606 OID 120036)
-- Name: support_tickets support_tickets_related_billing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_related_billing_id_fkey FOREIGN KEY (related_billing_id) REFERENCES public.billing_charges(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5823 (class 2606 OID 120031)
-- Name: support_tickets support_tickets_related_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_related_session_id_fkey FOREIGN KEY (related_session_id) REFERENCES public.sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5824 (class 2606 OID 120016)
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5825 (class 2606 OID 120046)
-- Name: ticket_messages ticket_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5826 (class 2606 OID 120041)
-- Name: ticket_messages ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5713 (class 2606 OID 119501)
-- Name: university_idp_configs university_idp_configs_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.university_idp_configs
    ADD CONSTRAINT university_idp_configs_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5811 (class 2606 OID 119976)
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5812 (class 2606 OID 119971)
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5817 (class 2606 OID 120006)
-- Name: user_deletion_requests user_deletion_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_deletion_requests
    ADD CONSTRAINT user_deletion_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5818 (class 2606 OID 120001)
-- Name: user_deletion_requests user_deletion_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_deletion_requests
    ADD CONSTRAINT user_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5723 (class 2606 OID 119551)
-- Name: user_departments user_departments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5724 (class 2606 OID 119546)
-- Name: user_departments user_departments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5827 (class 2606 OID 120061)
-- Name: user_feedback user_feedback_responded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5828 (class 2606 OID 120056)
-- Name: user_feedback user_feedback_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5829 (class 2606 OID 120051)
-- Name: user_feedback user_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5733 (class 2606 OID 119596)
-- Name: user_files user_files_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_files
    ADD CONSTRAINT user_files_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5734 (class 2606 OID 119591)
-- Name: user_files user_files_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_files
    ADD CONSTRAINT user_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5725 (class 2606 OID 119566)
-- Name: user_group_members user_group_members_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT user_group_members_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5726 (class 2606 OID 119561)
-- Name: user_group_members user_group_members_user_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT user_group_members_user_group_id_fkey FOREIGN KEY (user_group_id) REFERENCES public.user_groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5727 (class 2606 OID 119556)
-- Name: user_group_members user_group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_group_members
    ADD CONSTRAINT user_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5717 (class 2606 OID 119526)
-- Name: user_groups user_groups_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5718 (class 2606 OID 119521)
-- Name: user_groups user_groups_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5719 (class 2606 OID 119531)
-- Name: user_groups user_groups_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.user_groups(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5710 (class 2606 OID 119491)
-- Name: user_org_roles user_org_roles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_org_roles
    ADD CONSTRAINT user_org_roles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5711 (class 2606 OID 119496)
-- Name: user_org_roles user_org_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_org_roles
    ADD CONSTRAINT user_org_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5712 (class 2606 OID 119486)
-- Name: user_org_roles user_org_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_org_roles
    ADD CONSTRAINT user_org_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5704 (class 2606 OID 119456)
-- Name: user_policy_consents user_policy_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_policy_consents
    ADD CONSTRAINT user_policy_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5720 (class 2606 OID 129387)
-- Name: user_profiles user_profiles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5721 (class 2606 OID 119541)
-- Name: user_profiles user_profiles_id_proof_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_id_proof_verified_by_fkey FOREIGN KEY (id_proof_verified_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5722 (class 2606 OID 119536)
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5728 (class 2606 OID 137645)
-- Name: user_storage_volumes user_storage_volumes_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_storage_volumes
    ADD CONSTRAINT user_storage_volumes_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.nodes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5729 (class 2606 OID 119571)
-- Name: user_storage_volumes user_storage_volumes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_storage_volumes
    ADD CONSTRAINT user_storage_volumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5702 (class 2606 OID 119446)
-- Name: users users_default_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_default_org_id_fkey FOREIGN KEY (default_org_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5843 (class 2606 OID 129423)
-- Name: waitlist_entries waitlist_entries_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waitlist_entries
    ADD CONSTRAINT "waitlist_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5753 (class 2606 OID 119696)
-- Name: wallet_holds wallet_holds_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_holds
    ADD CONSTRAINT wallet_holds_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5754 (class 2606 OID 119701)
-- Name: wallet_holds wallet_holds_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_holds
    ADD CONSTRAINT wallet_holds_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5755 (class 2606 OID 119691)
-- Name: wallet_holds wallet_holds_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_holds
    ADD CONSTRAINT wallet_holds_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5756 (class 2606 OID 119686)
-- Name: wallet_holds wallet_holds_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_holds
    ADD CONSTRAINT wallet_holds_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5757 (class 2606 OID 119711)
-- Name: wallet_transactions wallet_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5758 (class 2606 OID 119706)
-- Name: wallet_transactions wallet_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5752 (class 2606 OID 119681)
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 6072 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


-- Completed on 2026-04-26 21:54:15

--
-- PostgreSQL database dump complete
--

\unrestrict 4FrPnYuGM2IJbSuen1UBcUxUffEwQm8CKbPF1Bjfct20HNmiOqFKG5FJjwt3tNT

