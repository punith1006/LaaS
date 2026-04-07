/**
 * Hybrid Recommendation Engine
 *
 * A pure TypeScript utility module that implements hybrid AI + classic scoring
 * for compute config recommendations. No React dependencies.
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * LLM-generated workload analysis from user's project description
 */
export interface WorkloadAnalysis {
  detectedGoal: string;
  detectedFrameworks: string[];
  estimatedVramNeedGb: number;
  estimatedComputeIntensity: 'low' | 'medium' | 'high';
  datasetSizeCategory: string;
  keyInsights: string[];
  confidence: number;
}

/**
 * User input for recommendation generation
 */
export interface RecommendationInput {
  primaryGoal: string;
  datasetSize: string;
  budget: string; // chip selection: 'economy' | 'balanced' | 'performance' | ''
  budgetAmount: number; // slider value in INR (0 = not set)
  sessionDuration: string;
  performanceExpectation: string; // 'light' | 'moderate' | 'heavy' | 'maximum' | ''
  llmAnalysis?: WorkloadAnalysis;
}

/**
 * Tags applied to scored configs for UI display
 */
export type RecommendationTag =
  | 'BEST_MATCH'
  | 'GREAT_VALUE'
  | 'TOP_PERFORMANCE'
  | 'BUDGET_FRIENDLY';

/**
 * Compute config shape for scoring (matches backend API response)
 */
export interface ConfigForScoring {
  id: string;
  slug: string;
  name: string;
  vcpu: number;
  memoryMb: number;
  gpuVramMb: number;
  hamiSmPercent: number | null;
  gpuModel: string | null;
  basePricePerHourCents: number;
  bestFor: string | null;
  available: boolean;
  maxLaunchable: number;
}

/**
 * Scored config with recommendation metadata
 */
export interface ScoredConfig {
  config: ConfigForScoring;
  score: number;
  normalizedScore: number; // 0-100
  tag: RecommendationTag;
  reasons: string[];
  explanation?: string; // LLM-generated, populated later
  available: boolean;
  estimatedCost: string; // e.g., "~₹130 for 2 hrs"
}

/**
 * Internal scoring breakdown for each config
 */
interface ScoringBreakdown {
  goalMatch: number;
  performanceExpectation: number;
  budgetFit: number;
  datasetFit: number;
  durationCost: number;
  llmInsight: number;
  weightedTotal: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Weights for each scoring factor — prioritizes technical fit while keeping budget influential */
const SCORING_WEIGHTS = {
  performanceExpectation: 0.25, // Highest — user's explicit compute intensity need
  goalMatch: 0.20,             // What the user is trying to accomplish
  budgetFit: 0.20,             // Important but not a hard stop — informs, not gates
  datasetFit: 0.15,            // VRAM/memory requirements
  durationCost: 0.10,          // Session length cost efficiency
  llmInsight: 0.10,            // AI-analyzed workload context
} as const;

/** Goal → ideal config tier mapping (0-100 score per slug) */
const GOAL_TO_IDEAL_TIER: Record<string, Record<string, number>> = {
  ml_training: { spark: 20, blaze: 50, inferno: 90, supernova: 100 },
  inference: { spark: 80, blaze: 100, inferno: 60, supernova: 30 },
  data_science: { spark: 90, blaze: 100, inferno: 50, supernova: 20 },
  rendering: { spark: 20, blaze: 60, inferno: 100, supernova: 90 },
  general_dev: { spark: 100, blaze: 70, inferno: 30, supernova: 10 },
  research: { spark: 50, blaze: 100, inferno: 70, supernova: 40 },
};

/** Dataset size → VRAM requirement in GB */
const DATASET_TO_VRAM: Record<string, number> = {
  small: 2,
  medium: 4,
  large: 8,
  not_sure: 4,
};

/** Session duration → hours */
const DURATION_HOURS: Record<string, number> = {
  quick: 2,
  standard: 4,
  extended: 8,
};

/** Price boundaries (in rupees) */
const MAX_PRICE_RUPEES = 155; // supernova
const MIN_PRICE_RUPEES = 35; // spark

/** Human-readable goal labels */
const GOAL_LABELS: Record<string, string> = {
  ml_training: 'ML model training',
  inference: 'AI inference & testing',
  data_science: 'data science workflows',
  rendering: '3D rendering & simulation',
  general_dev: 'general development',
  research: 'research & experimentation',
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate goal match score (0-100)
 * Higher score = better fit for the user's primary goal
 */
function calculateGoalMatchScore(config: ConfigForScoring, primaryGoal: string): number {
  const tierScores = GOAL_TO_IDEAL_TIER[primaryGoal];
  if (!tierScores) {
    // Unknown goal - give moderate scores based on versatility
    return 60;
  }
  return tierScores[config.slug] ?? 50;
}

/**
 * Performance expectation → ideal SM% mapping
 */
const PERF_TO_IDEAL_SM: Record<string, number> = {
  light: 8, // Spark's 8% SM
  moderate: 17, // Blaze's 17% SM
  heavy: 33, // Inferno's 33% SM
  maximum: 67, // Supernova's 67% SM
};

/**
 * Calculate performance expectation score (0-100)
 * Score: 100 for exact SM% match, penalize for over/under
 */
function calculatePerformanceExpectationScore(
  config: ConfigForScoring,
  performanceExpectation: string
): number {
  if (!performanceExpectation || !PERF_TO_IDEAL_SM[performanceExpectation]) {
    return 50; // Neutral if not set
  }

  const idealSm = PERF_TO_IDEAL_SM[performanceExpectation];
  const configSm = config.hamiSmPercent ?? 8;
  const smDiff = Math.abs(configSm - idealSm);

  // 100 for exact match, gradual penalty based on difference
  return Math.max(0, 100 - smDiff * 2.5);
}

/**
 * Calculate budget fit score (0-100)
 * Economy: cheaper = higher score
 * Balanced: mid-range scores highest
 * Performance: more expensive = higher score
 * Budget slider: score based on total session cost vs budget
 */
function calculateBudgetFitScore(
  config: ConfigForScoring,
  budget: string,
  budgetAmount: number,
  sessionDuration: string
): number {
  const pricePerHour = config.basePricePerHourCents / 100;

  // If slider is used (budgetAmount > 50), score based on total session cost
  if (budgetAmount > 50) {
    const durationHours = DURATION_HOURS[sessionDuration] || 4;
    const totalSessionCost = pricePerHour * durationHours;
    const budgetRatio = budgetAmount / totalSessionCost; // >1 = affordable, <1 = over budget

    if (budgetRatio >= 1.5) {
      return 100; // Very comfortable — budget is 1.5x+ the cost
    } else if (budgetRatio >= 1.0) {
      return 85; // Fits within budget
    } else if (budgetRatio >= 0.8) {
      return 40; // Slightly over budget (within 20%)
    } else if (budgetRatio >= 0.5) {
      return 15; // Significantly over budget
    } else {
      return 5; // Way over budget
    }
  }

  // Use existing chip-based scoring
  const priceRange = MAX_PRICE_RUPEES - MIN_PRICE_RUPEES;

  if (budget === 'economy') {
    // Cheaper = better (inverse linear)
    return 100 * (1 - (pricePerHour - MIN_PRICE_RUPEES) / priceRange);
  } else if (budget === 'balanced') {
    // Bell curve centered around midpoint
    const mid = (MAX_PRICE_RUPEES + MIN_PRICE_RUPEES) / 2;
    return 100 * (1 - Math.abs(pricePerHour - mid) / priceRange);
  } else {
    // performance: more expensive = better (linear)
    return 100 * ((pricePerHour - MIN_PRICE_RUPEES) / priceRange);
  }
}

/**
 * Calculate dataset/model fit score (0-100)
 * Based on VRAM adequacy for the dataset size
 */
function calculateDatasetFitScore(config: ConfigForScoring, datasetSize: string): number {
  const neededVramGb = DATASET_TO_VRAM[datasetSize] ?? 4;
  const configVramGb = config.gpuVramMb / 1024;

  if (configVramGb >= neededVramGb) {
    // Sufficient VRAM — score higher for closer match (don't overpay)
    return Math.max(0, 100 - (configVramGb - neededVramGb) * 10);
  } else {
    // Insufficient VRAM — heavy penalty
    return Math.max(0, 50 - (neededVramGb - configVramGb) * 25);
  }
}

/**
 * Calculate duration cost score (0-100)
 * For extended sessions, cheaper configs score higher
 * For quick sessions, price matters less
 */
function calculateDurationCostScore(
  config: ConfigForScoring,
  sessionDuration: string
): number {
  const hours = DURATION_HOURS[sessionDuration] ?? 4;
  const totalCost = (config.basePricePerHourCents / 100) * hours;

  if (sessionDuration === 'extended') {
    // Normalize against max possible cost (supernova for 8 hrs)
    return 100 * (1 - totalCost / (MAX_PRICE_RUPEES * 8));
  } else if (sessionDuration === 'quick') {
    // Duration barely matters for short sessions
    return 80;
  } else {
    // Standard session
    return 100 * (1 - totalCost / (MAX_PRICE_RUPEES * 4));
  }
}

/**
 * Calculate LLM insight boost score (0-100)
 * Uses AI-detected workload characteristics for refined scoring
 */
function calculateLlmInsightScore(
  config: ConfigForScoring,
  llmAnalysis?: WorkloadAnalysis
): number {
  if (!llmAnalysis || llmAnalysis.confidence === 0) {
    return 50; // Neutral if no LLM data
  }

  let llmScore = 50;
  const configVramGb = config.gpuVramMb / 1024;

  // VRAM fit evaluation
  if (configVramGb >= llmAnalysis.estimatedVramNeedGb) {
    llmScore += 20;
    // Bonus for close match (not overpaying)
    if (configVramGb <= llmAnalysis.estimatedVramNeedGb * 1.5) {
      llmScore += 10;
    }
  } else {
    llmScore -= 30; // Insufficient VRAM penalty
  }

  // Compute intensity alignment
  const smPercent = config.hamiSmPercent ?? 0;
  if (llmAnalysis.estimatedComputeIntensity === 'high' && smPercent >= 33) {
    llmScore += 15;
  } else if (llmAnalysis.estimatedComputeIntensity === 'low' && smPercent <= 17) {
    llmScore += 10;
  }

  // Framework keyword matching against bestFor
  if (config.bestFor && llmAnalysis.detectedFrameworks.length > 0) {
    const bestForLower = config.bestFor.toLowerCase();
    const matchCount = llmAnalysis.detectedFrameworks.filter(
      (fw) => bestForLower.includes(fw.toLowerCase())
    ).length;
    llmScore += matchCount * 5;
  }

  return Math.min(100, Math.max(0, llmScore));
}

/**
 * Calculate all scoring components and weighted total
 */
function calculateFullScore(
  config: ConfigForScoring,
  input: RecommendationInput
): ScoringBreakdown {
  const goalMatch = calculateGoalMatchScore(config, input.primaryGoal);
  const performanceExpectation = calculatePerformanceExpectationScore(
    config,
    input.performanceExpectation
  );
  const budgetFit = calculateBudgetFitScore(config, input.budget, input.budgetAmount, input.sessionDuration);
  const datasetFit = calculateDatasetFitScore(config, input.datasetSize);
  const durationCost = calculateDurationCostScore(config, input.sessionDuration);
  const llmInsight = calculateLlmInsightScore(config, input.llmAnalysis);

  const weightedTotal =
    goalMatch * SCORING_WEIGHTS.goalMatch +
    performanceExpectation * SCORING_WEIGHTS.performanceExpectation +
    budgetFit * SCORING_WEIGHTS.budgetFit +
    datasetFit * SCORING_WEIGHTS.datasetFit +
    durationCost * SCORING_WEIGHTS.durationCost +
    llmInsight * SCORING_WEIGHTS.llmInsight;

  return {
    goalMatch,
    performanceExpectation,
    budgetFit,
    datasetFit,
    durationCost,
    llmInsight,
    weightedTotal,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate estimated cost string for display
 */
function calculateEstimatedCost(config: ConfigForScoring, duration: string): string {
  const hours = DURATION_HOURS[duration] ?? 4;
  const total = Math.round((config.basePricePerHourCents / 100) * hours);
  return `~₹${total} for ${hours} hrs`;
}

/**
 * Generate human-readable reasons for recommendation
 */
function generateReasons(
  config: ConfigForScoring,
  input: RecommendationInput,
  scores: ScoringBreakdown
): string[] {
  const reasons: string[] = [];

  // Top scoring factor - goal alignment
  if (scores.goalMatch >= 80) {
    const goalLabel = GOAL_LABELS[input.primaryGoal] ?? input.primaryGoal;
    reasons.push(`Well-suited for ${goalLabel}`);
  }

  // VRAM and compute allocation
  const vramGb = config.gpuVramMb / 1024;
  const smPercent = config.hamiSmPercent ?? 0;
  reasons.push(`${vramGb} GB VRAM with ${smPercent}% GPU compute allocation`);

  // Performance expectation context
  if (
    input.performanceExpectation &&
    (input.performanceExpectation === 'heavy' || input.performanceExpectation === 'maximum') &&
    smPercent >= 33
  ) {
    reasons.push(`Provides ${smPercent}% GPU compute allocation for intensive workloads`);
  }

  // Budget slider context
  if (input.budgetAmount > 50) {
    const pricePerHour = config.basePricePerHourCents / 100;
    const durationHours = DURATION_HOURS[input.sessionDuration] || 4;
    const totalCost = Math.round(pricePerHour * durationHours);

    if (totalCost <= input.budgetAmount) {
      reasons.push(
        `Fits within your ₹${input.budgetAmount} budget — ₹${totalCost} for ${durationHours}hrs`
      );
    } else {
      reasons.push(
        `Estimated cost ₹${totalCost} for ${durationHours}hrs exceeds your ₹${input.budgetAmount} budget`
      );
    }
  } else {
    // Cost context based on budget preference
    const pricePerHour = config.basePricePerHourCents / 100;
    if (input.budget === 'economy') {
      reasons.push(`Cost-effective at ₹${pricePerHour}/hr`);
    } else if (input.budget === 'performance') {
      reasons.push(`Premium resources at ₹${pricePerHour}/hr`);
    } else {
      reasons.push(`Balanced pricing at ₹${pricePerHour}/hr`);
    }
  }

  // Return up to 3 reasons
  return reasons.slice(0, 3);
}

/**
 * Assign tags to scored configs with upsell logic
 */
function assignTags(sortedConfigs: ScoredConfig[]): void {
  // Reset all tags first
  sortedConfigs.forEach((sc) => {
    sc.tag = 'GREAT_VALUE'; // Default, will be overwritten
  });

  // Find the first available config for BEST_MATCH
  const firstAvailableIndex = sortedConfigs.findIndex((sc) => sc.available);

  if (firstAvailableIndex === -1) {
    // No available configs - just mark first as best match
    if (sortedConfigs.length > 0) {
      sortedConfigs[0].tag = 'BEST_MATCH';
    }
    return;
  }

  // Assign BEST_MATCH to first available
  sortedConfigs[firstAvailableIndex].tag = 'BEST_MATCH';
  const bestMatch = sortedConfigs[firstAvailableIndex];

  // Find cheapest available for BUDGET_FRIENDLY
  const availableConfigs = sortedConfigs.filter((sc) => sc.available);
  const cheapestAvailable = availableConfigs.reduce(
    (min, sc) =>
      sc.config.basePricePerHourCents < min.config.basePricePerHourCents ? sc : min,
    availableConfigs[0]
  );

  // Assign BUDGET_FRIENDLY if different from BEST_MATCH
  if (
    cheapestAvailable &&
    cheapestAvailable.config.id !== bestMatch.config.id &&
    cheapestAvailable.tag !== 'BEST_MATCH'
  ) {
    cheapestAvailable.tag = 'BUDGET_FRIENDLY';
  }

  // Upsell logic: check next higher tier
  const nextHigher = sortedConfigs.find(
    (sc) =>
      sc.available &&
      sc.config.basePricePerHourCents > bestMatch.config.basePricePerHourCents
  );

  if (nextHigher) {
    const scoreDiff = bestMatch.score - nextHigher.score;
    const relativeDiff = scoreDiff / bestMatch.score;

    // If next higher is within 15% score, mark as TOP_PERFORMANCE
    if (relativeDiff < 0.15) {
      nextHigher.tag = 'TOP_PERFORMANCE';

      // Add upsell reason
      const priceDiff =
        (nextHigher.config.basePricePerHourCents - bestMatch.config.basePricePerHourCents) /
        100;
      const vramMultiple = nextHigher.config.gpuVramMb / bestMatch.config.gpuVramMb;

      nextHigher.reasons.push(
        `For just ₹${priceDiff.toFixed(0)} more/hr, get ${Math.round(vramMultiple)}x the GPU memory`
      );
    }
  }

  // Mark second available config as GREAT_VALUE if cheaper than BEST_MATCH
  const secondAvailable = availableConfigs.find(
    (sc) => sc.config.id !== bestMatch.config.id && sc.tag !== 'TOP_PERFORMANCE'
  );

  if (
    secondAvailable &&
    secondAvailable.config.basePricePerHourCents < bestMatch.config.basePricePerHourCents &&
    secondAvailable.tag !== 'BUDGET_FRIENDLY'
  ) {
    secondAvailable.tag = 'GREAT_VALUE';
  }

  // If best match is unavailable but we promoted another, keep original as BEST_MATCH visually
  // but the promoted one already has the tag
  if (!sortedConfigs[0].available && firstAvailableIndex > 0) {
    // The unavailable top scorer keeps a note in reasons
    sortedConfigs[0].reasons.unshift('Currently unavailable - check back soon');
  }
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Main recommendation function
 *
 * Scores all compute configs based on user input and returns them sorted
 * by score with tags and explanations.
 *
 * @param configs - Available compute configurations from backend
 * @param input - User's requirements and preferences
 * @returns Array of scored configs sorted by recommendation strength
 */
export function scoreConfigs(
  configs: ConfigForScoring[],
  input: RecommendationInput
): ScoredConfig[] {
  // Calculate scores for each config
  const scoredConfigs: ScoredConfig[] = configs.map((config) => {
    const breakdown = calculateFullScore(config, input);

    return {
      config,
      score: breakdown.weightedTotal,
      normalizedScore: Math.round(breakdown.weightedTotal), // Already 0-100 scale
      tag: 'GREAT_VALUE', // Will be assigned later
      reasons: generateReasons(config, input, breakdown),
      available: config.available,
      estimatedCost: calculateEstimatedCost(config, input.sessionDuration),
    };
  });

  // Sort by score descending
  scoredConfigs.sort((a, b) => b.score - a.score);

  // Assign recommendation tags with upsell logic
  assignTags(scoredConfigs);

  return scoredConfigs;
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get the best available config from scored results
 */
export function getBestAvailable(scoredConfigs: ScoredConfig[]): ScoredConfig | null {
  return scoredConfigs.find((sc) => sc.available && sc.tag === 'BEST_MATCH') ?? null;
}

/**
 * Get all configs that match a specific tag
 */
export function getByTag(
  scoredConfigs: ScoredConfig[],
  tag: RecommendationTag
): ScoredConfig[] {
  return scoredConfigs.filter((sc) => sc.tag === tag);
}

/**
 * Check if any configs are available
 */
export function hasAvailableConfigs(scoredConfigs: ScoredConfig[]): boolean {
  return scoredConfigs.some((sc) => sc.available);
}

/**
 * Format price for display (cents to rupees string)
 */
export function formatPrice(basePricePerHourCents: number): string {
  const rupees = basePricePerHourCents / 100;
  return `₹${rupees}/hr`;
}
