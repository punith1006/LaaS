-- CreateEnum
CREATE TYPE "ReferralConversionStatus" AS ENUM ('SIGNUP_COMPLETED', 'PAYMENT_PENDING', 'QUALIFIED', 'REWARD_CREDITED', 'REWARD_VOIDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReferralRewardStatus" AS ENUM ('PENDING', 'CREDITED', 'VOIDED');

-- AlterEnum
ALTER TYPE "SessionTerminationReason" ADD VALUE 'credit_exhausted';

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "country" TEXT,
ADD COLUMN     "expertise_level" TEXT,
ADD COLUMN     "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "operational_domains" TEXT[],
ADD COLUMN     "profession" TEXT,
ADD COLUMN     "use_case_other" TEXT,
ADD COLUMN     "use_case_purposes" TEXT[],
ADD COLUMN     "years_of_experience" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "referred_by_code" VARCHAR(20);

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "runway_warning_1hour_sent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrer_user_id" UUID NOT NULL,
    "referral_code" VARCHAR(20) NOT NULL,
    "referral_url" VARCHAR(500) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "total_signups" INTEGER NOT NULL DEFAULT 0,
    "total_rewards_cents" BIGINT NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_conversions" (
    "id" UUID NOT NULL,
    "referral_id" UUID NOT NULL,
    "referrer_user_id" UUID NOT NULL,
    "referred_user_id" UUID NOT NULL,
    "status" "ReferralConversionStatus" NOT NULL DEFAULT 'SIGNUP_COMPLETED',
    "signup_method" VARCHAR(50) NOT NULL,
    "signup_completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_payment_at" TIMESTAMP(3),
    "first_payment_amount_cents" BIGINT,
    "first_payment_txn_id" UUID,
    "reward_amount_cents" INTEGER NOT NULL DEFAULT 5000,
    "reward_status" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
    "reward_credited_at" TIMESTAMP(3),
    "reward_wallet_txn_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_events" (
    "id" UUID NOT NULL,
    "referral_id" UUID NOT NULL,
    "referral_conversion_id" UUID,
    "event_type" VARCHAR(50) NOT NULL,
    "previous_status" VARCHAR(50),
    "new_status" VARCHAR(50),
    "metadata" JSONB,
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workload_description" TEXT,
    "document_file_name" TEXT,
    "document_extracted_text" TEXT,
    "analysis_result" JSONB,
    "analysis_quality" TEXT,
    "analysis_confidence" DOUBLE PRECISION,
    "detected_goal" TEXT,
    "detected_vram_gb" DOUBLE PRECISION,
    "detected_intensity" TEXT,
    "detected_frameworks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selected_goal" TEXT,
    "selected_dataset_size" TEXT,
    "selected_intensity" INTEGER,
    "selected_budget_type" TEXT,
    "selected_budget_amount" INTEGER,
    "selected_duration" TEXT,
    "goal_auto_selected" BOOLEAN NOT NULL DEFAULT false,
    "dataset_auto_selected" BOOLEAN NOT NULL DEFAULT false,
    "intensity_auto_selected" BOOLEAN NOT NULL DEFAULT false,
    "recommendations" JSONB,
    "selected_config_slug" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "recommendation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referrer_user_id_key" ON "referrals"("referrer_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referral_code_key" ON "referrals"("referral_code");

-- CreateIndex
CREATE INDEX "referrals_referral_code_idx" ON "referrals"("referral_code");

-- CreateIndex
CREATE INDEX "referrals_referrer_user_id_idx" ON "referrals"("referrer_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_conversions_referred_user_id_key" ON "referral_conversions"("referred_user_id");

-- CreateIndex
CREATE INDEX "referral_conversions_referrer_user_id_idx" ON "referral_conversions"("referrer_user_id");

-- CreateIndex
CREATE INDEX "referral_conversions_referral_id_status_idx" ON "referral_conversions"("referral_id", "status");

-- CreateIndex
CREATE INDEX "referral_conversions_status_idx" ON "referral_conversions"("status");

-- CreateIndex
CREATE INDEX "referral_events_referral_id_created_at_idx" ON "referral_events"("referral_id", "created_at");

-- CreateIndex
CREATE INDEX "referral_events_event_type_idx" ON "referral_events"("event_type");

-- CreateIndex
CREATE INDEX "recommendation_sessions_user_id_idx" ON "recommendation_sessions"("user_id");

-- CreateIndex
CREATE INDEX "recommendation_sessions_created_at_idx" ON "recommendation_sessions"("created_at");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referral_id_fkey" FOREIGN KEY ("referral_id") REFERENCES "referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_referral_conversion_id_fkey" FOREIGN KEY ("referral_conversion_id") REFERENCES "referral_conversions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_sessions" ADD CONSTRAINT "recommendation_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
