"use client";

import { useState } from "react";
import { ScoredConfig, scoreConfigs, ConfigForScoring, WorkloadAnalysis } from "@/lib/recommendation-engine";
import { createRecommendationSession, updateRecommendationSession } from "@/lib/api";

// ============================================================================
// PROPS INTERFACE
// ============================================================================

interface ComputeRecommendationProps {
  configs: Array<{
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
  }>;
  walletBalance: number;
  onSelectConfig: (configId: string) => void;
  onBack: () => void;
}

// ============================================================================
// ICONS
// ============================================================================

function InfoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function UploadIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function GpuChipIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
    </svg>
  );
}

function ArrowLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function LightbulbIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

// ============================================================================
// CONSTANTS
// ============================================================================

const GOALS = [
  { id: "ml_training", label: "ML Model Training", desc: "Fine-tuning, transfer learning, training from scratch" },
  { id: "inference", label: "AI Inference & Testing", desc: "Running predictions, testing models, demos" },
  { id: "data_science", label: "Data Science & Notebooks", desc: "Jupyter, pandas, data analysis, visualization" },
  { id: "rendering", label: "3D Rendering & Simulation", desc: "Blender, CUDA simulations, scientific computing" },
  { id: "general_dev", label: "General Development", desc: "Coding, compiling, development environment" },
  { id: "research", label: "Research & Experimentation", desc: "Academic projects, prototyping, exploration" },
];

const DATASET_SIZES = [
  { id: "small", label: "Small", desc: "Under 1 GB" },
  { id: "medium", label: "Medium", desc: "1-5 GB" },
  { id: "large", label: "Large", desc: "5-15 GB" },
  { id: "not_sure", label: "Not sure", desc: "I'll figure it out" },
];

const BUDGETS = [
  { id: "economy", label: "Economy", desc: "Keep costs low, tight budget" },
  { id: "balanced", label: "Balanced", desc: "Good performance at reasonable price" },
  { id: "performance", label: "Performance", desc: "Best resources, budget flexible" },
];

const DURATIONS = [
  { id: "quick", label: "Quick session", desc: "Under 2 hours" },
  { id: "standard", label: "Standard", desc: "2-6 hours" },
  { id: "extended", label: "Extended", desc: "6+ hours or ongoing" },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ComputeRecommendation({
  configs,
  walletBalance,
  onSelectConfig,
  onBack,
}: ComputeRecommendationProps) {
  // Input form state
  const [descriptionText, setDescriptionText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [datasetSize, setDatasetSize] = useState("");
  const [workloadIntensity, setWorkloadIntensity] = useState(1); // 0=Light, 1=Moderate, 2=Heavy, 3=Maximum
  const [budget, setBudget] = useState("");
  const [budgetAmount, setBudgetAmount] = useState<number>(50);
  const [sessionDuration, setSessionDuration] = useState("");

  // Results state
  const [results, setResults] = useState<ScoredConfig[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzePhase, setAnalyzePhase] = useState("");

  // Analyze flow state
  const [analysisState, setAnalysisState] = useState<'input' | 'analyzing' | 'success' | 'failure'>('input');
  const [analysisData, setAnalysisData] = useState<Partial<WorkloadAnalysis> | null>(null);
  const [autoSelectedFields, setAutoSelectedFields] = useState<Set<string>>(new Set());
  const [recommendationSessionId, setRecommendationSessionId] = useState<string | null>(null);
  const [llmAnalysis, setLlmAnalysis] = useState<WorkloadAnalysis | null>(null);
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [skippedAnalysis, setSkippedAnalysis] = useState(false);
  
  // Word count helper
  const getWordCount = (text: string): number => {
    return text.split(/\s+/).filter((w) => w).length;
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (
      !allowed.includes(file.type) &&
      !file.name.endsWith(".txt") &&
      !file.name.endsWith(".docx") &&
      !file.name.endsWith(".pdf")
    ) {
      alert("Please upload a PDF, DOCX, or TXT file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be under 5MB");
      return;
    }

    setUploadedFile(file);
    setExtracting(true);

    try {
      const { extractDocument } = await import("@/lib/api");
      const result = await extractDocument(file);
      setExtractedText(result.text);
    } catch (error) {
      console.error("Document extraction failed:", error);
      alert("Failed to extract text from document");
    } finally {
      setExtracting(false);
    }
  };

  // Handle analyze workload (new dedicated analyze step)
  const handleAnalyze = async () => {
    setAnalysisState('analyzing');

    // Reset prior selections so stale state doesn't persist
    setPrimaryGoal('');
    setDatasetSize('');
    setWorkloadIntensity(1);
    setAutoSelectedFields(new Set());
    setResults(null);

    const fullText = [descriptionText, extractedText].filter(Boolean).join('\n\n').trim();
    if (!fullText || getWordCount(fullText) < 20) return;

    try {
      const { analyzeWorkload } = await import("@/lib/api");
      const result = await analyzeWorkload(fullText);
      setAnalysisData(result);
      setLlmAnalysis(result);

      if (result.inputQuality === 'sufficient') {
        setAnalysisState('success');

        const newAutoSelected = new Set<string>();

        // Auto-select Primary Goal
        if (result.fieldConfidence?.goal >= 0.7 && result.detectedGoal) {
          setPrimaryGoal(result.detectedGoal);
          newAutoSelected.add('primaryGoal');
        }

        // Auto-select Dataset Size based on VRAM
        if (result.fieldConfidence?.vram >= 0.7 && result.estimatedVramNeedGb > 0) {
          const vram = result.estimatedVramNeedGb;
          if (vram <= 2) setDatasetSize('small');
          else if (vram <= 5) setDatasetSize('medium');
          else setDatasetSize('large');
          newAutoSelected.add('datasetSize');
        }

        // Auto-select Workload Intensity
        if (result.fieldConfidence?.intensity >= 0.7 && result.estimatedComputeIntensity) {
          const intensityMap: Record<string, number> = { low: 0, medium: 1, high: 2, very_high: 3 };
          const mapped = intensityMap[result.estimatedComputeIntensity];
          if (mapped !== undefined) {
            setWorkloadIntensity(mapped);
            newAutoSelected.add('workloadIntensity');
          }
        }

        setAutoSelectedFields(newAutoSelected);
      } else {
        setAnalysisState('failure');
      }

      // Persist session to DB (fire and forget)
      try {
        const session = await createRecommendationSession({
          workloadDescription: descriptionText || undefined,
          documentFileName: uploadedFile?.name || undefined,
          documentExtractedText: extractedText || undefined,
          analysisResult: result,
          analysisQuality: result.inputQuality,
          analysisConfidence: result.confidence,
          detectedGoal: result.detectedGoal,
          detectedVramGb: result.estimatedVramNeedGb,
          detectedIntensity: result.estimatedComputeIntensity,
          detectedFrameworks: result.detectedFrameworks,
        });
        setRecommendationSessionId(session.id);
      } catch (e) {
        console.warn('Failed to persist recommendation session:', e);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisState('failure');
      setAnalysisData({
        inputQuality: 'insufficient',
        missingCategories: ['primary_goal', 'gpu_memory', 'workload_intensity'],
        suggestions: 'The analysis service encountered an error. Please try again or provide more detail about your workload.',
      });
    }
  };

  // Handle find best fit
  const handleFindBestFit = async () => {
    setAnalyzing(true);
    setAnalyzePhase("Analyzing your workload...");

    try {
      // Import the scoring engine
      const { scoreConfigs: scoreFn } = await import("@/lib/recommendation-engine");

      const fullText = [descriptionText, extractedText].filter(Boolean).join("\n\n");

      // Step 1: Run classic scoring using already-stored llmAnalysis (from Analyze step)
      setAnalyzePhase("Scoring configurations...");
      const scored = scoreFn(
        configs as ConfigForScoring[],
        {
          primaryGoal,
          datasetSize: datasetSize || "not_sure",
          budget: budget || "balanced",
          budgetAmount: budgetAmount,
          sessionDuration: sessionDuration || "standard",
          performancePriority: workloadIntensity,
          llmAnalysis: llmAnalysis || undefined,
        }
      );

      // Step 2: Generate LLM explanations for top 3
      setAnalyzePhase("Generating recommendations...");
      const top3 = scored.slice(0, 3);
      const sortedResults = scored;

      try {
        const { generateExplanation } = await import("@/lib/api");
        const explanationPromises = top3.map((s) =>
          generateExplanation(
            s.config.slug,
            {
              vcpu: s.config.vcpu,
              memoryMb: s.config.memoryMb,
              gpuVramMb: s.config.gpuVramMb,
              basePricePerHourCents: s.config.basePricePerHourCents,
            },
            primaryGoal,
            fullText || `Goal: ${primaryGoal}, Dataset: ${datasetSize}, Workload Intensity: ${["Light", "Moderate", "Heavy", "Maximum"][workloadIntensity]}, Budget: ${budget || `₹${budgetAmount}`}, Duration: ${sessionDuration}`
          ).catch(() => ({ explanation: "", bullets: undefined as string[] | undefined }))
        );

        const explanations = await Promise.all(explanationPromises);
        explanations.forEach((exp, i) => {
          if (exp.explanation) top3[i].explanation = exp.explanation;
          if (exp.bullets) top3[i].bullets = exp.bullets;
        });
      } catch (e) {
        console.warn("LLM explanation generation failed", e);
      }

      // Step 3: Persist recommendation session update
      if (recommendationSessionId) {
        try {
          await updateRecommendationSession(recommendationSessionId, {
            selectedGoal: primaryGoal,
            selectedDatasetSize: datasetSize || undefined,
            selectedIntensity: workloadIntensity,
            selectedBudgetType: budget || undefined,
            selectedBudgetAmount: budgetAmount > 50 ? budgetAmount : undefined,
            selectedDuration: sessionDuration || undefined,
            goalAutoSelected: autoSelectedFields.has('primaryGoal'),
            datasetAutoSelected: autoSelectedFields.has('datasetSize'),
            intensityAutoSelected: autoSelectedFields.has('workloadIntensity'),
            recommendations: sortedResults.map(r => ({ slug: r.config.slug, score: r.score, tag: r.tag })),
          });
        } catch (e) {
          console.warn('Failed to update recommendation session:', e);
        }
      }

      setResults(sortedResults);
    } catch (error) {
      console.error("Recommendation failed:", error);
    } finally {
      setAnalyzing(false);
      setAnalyzePhase("");
    }
  };

  // ============================================================================
  // RENDER: INPUT FORM
  // ============================================================================

  const renderInputForm = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Minimal Circle-Based Step Indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          maxWidth: "600px",
          margin: "0 auto",
          fontFamily: "var(--font-outfit, var(--font-sans))",
        }}
      >
        {[
          { num: 1, label: "Describe Workload", sublabel: "(Optional)" },
          { num: 2, label: "Configure Setup", sublabel: null },
          { num: 3, label: "Budget & Duration", sublabel: null },
        ].map((step, idx) => {
          const isActive = wizardStep === step.num;
          const isCompleted = wizardStep > step.num;
          return (
            <div key={step.num} style={{ display: "flex", alignItems: "flex-start", flex: idx === 1 ? 1 : "none" }}>
              {/* Step column: circle + label */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                {/* Circle */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-outfit, var(--font-sans))",
                    background: isCompleted
                      ? "transparent"
                      : isActive
                        ? "var(--fgColor-default)"
                        : "transparent",
                    border: isCompleted
                      ? "1.5px solid var(--fgColor-muted)"
                      : isActive
                        ? "1.5px solid var(--fgColor-default)"
                        : "1.5px solid var(--borderColor-default)",
                    color: isCompleted
                      ? "var(--fgColor-muted)"
                      : isActive
                        ? "var(--bgColor-mild)"
                        : "var(--fgColor-muted)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {isCompleted ? "✓" : step.num}
                </div>
                {/* Label */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--fgColor-default)" : "var(--fgColor-muted)",
                      fontFamily: "var(--font-outfit, var(--font-sans))",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {step.label}
                  </span>
                  {step.sublabel && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--fgColor-muted)",
                        fontFamily: "var(--font-outfit, var(--font-sans))",
                      }}
                    >
                      {step.sublabel}
                    </span>
                  )}
                </div>
              </div>
              {/* Connecting line */}
              {idx < 2 && (
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: isCompleted ? "var(--fgColor-muted)" : "var(--borderColor-default)",
                    margin: "16px 8px 0",
                    minWidth: "40px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Blue info banner — Step 1 only */}
      {wizardStep === 1 && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "14px 16px",
            backgroundColor: "var(--bgColor-info, #cedeff)",
            border: "1px solid var(--borderColor-info, #3a73ff)",
            borderRadius: "4px",
          }}
        >
          <span style={{ color: "var(--fgColor-info)", flexShrink: 0, marginTop: "2px" }}>
            <InfoIcon size={16} />
          </span>
          <div>
            <div
              style={{
                fontSize: "var(--text-sm, 0.875rem)",
                fontWeight: 600,
                color: "var(--fgColor-default)",
                marginBottom: "2px",
              }}
            >
              AI-Powered Recommendations
            </div>
            <div
              style={{
                fontSize: "var(--text-sm, 0.875rem)",
                color: "var(--fgColor-muted)",
                lineHeight: "1.5",
              }}
            >
              Our recommendation engine combines your preferences with AI analysis to find the optimal
              balance of performance, cost, and availability for your specific workload.
            </div>
          </div>
        </div>
      )}

      {/* Section A: Describe Your Workload - Step 1 */}
      {wizardStep === 1 && (
        <div
          style={{
            backgroundColor: "var(--bgColor-mild)",
            border: "1px solid var(--borderColor-default)",
            borderRadius: "4px",
            padding: "20px",
          }}
        >
          <div
            style={{
              fontSize: "var(--text-xs, 0.75rem)",
              fontWeight: 600,
              color: "var(--fgColor-default)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "8px",
            }}
          >
            Describe Your Workload
          </div>

          {/* State-based content below the title */}
          {analysisState === 'input' && (
            <>
              <p
                style={{
                  fontSize: "var(--text-sm, 0.875rem)",
                  color: "var(--fgColor-default)",
                  marginBottom: "16px",
                  marginTop: 0,
                }}
              >
                Tell us what you&apos;re working on — the more detail you provide, the better our recommendation.
              </p>

              {/* Text area */}
              <textarea
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                placeholder="e.g., I need to fine-tune a ResNet model on a 2GB image dataset for my college project. I'll be using PyTorch and training for about 3-4 hours..."
                maxLength={3000}
                style={{
                  width: "100%",
                  minHeight: "120px",
                  resize: "vertical",
                  backgroundColor: "var(--bgColor-default)",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: "4px",
                  padding: "12px",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm, 0.875rem)",
                  color: "var(--fgColor-default)",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                }}
              >
                <span style={{ fontSize: "var(--text-xs, 0.75rem)", color: "var(--fgColor-default)" }}>
                  Optional — helps our AI understand your needs better
                </span>
                <span style={{ fontSize: "var(--text-xs, 0.75rem)", color: "var(--fgColor-default)" }}>
                  {getWordCount(descriptionText)} / 500 words
                </span>
              </div>

              {/* File upload area */}
              <div
                style={{
                  marginTop: "16px",
                  borderTop: "1px solid var(--borderColor-default)",
                  paddingTop: "16px",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--text-xs, 0.75rem)",
                    color: "var(--fgColor-default)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "8px",
                  }}
                >
                  Or Upload a Document
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    border: "1px dashed var(--borderColor-default)",
                    borderRadius: "4px",
                    padding: "20px",
                    cursor: "pointer",
                    color: "var(--fgColor-default)",
                    fontSize: "var(--text-sm, 0.875rem)",
                    backgroundColor: "var(--bgColor-default)",
                  }}
                >
                  <UploadIcon size={16} />
                  {uploadedFile ? uploadedFile.name : "Drop or click to upload (.pdf, .docx, .txt — max 5MB)"}
                  <input type="file" accept=".pdf,.docx,.txt" hidden onChange={handleFileUpload} />
                </label>
                {extracting && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "var(--text-xs, 0.75rem)",
                      color: "var(--fgColor-muted)",
                    }}
                  >
                    Extracting text...
                  </div>
                )}
                {extractedText && (
                  <div
                    style={{
                      marginTop: "8px",
                      padding: "8px 12px",
                      backgroundColor: "var(--bgColor-default)",
                      borderRadius: "4px",
                      fontSize: "var(--text-xs, 0.75rem)",
                      color: "var(--fgColor-muted)",
                    }}
                  >
                    Extracted {getWordCount(extractedText)} words from document
                  </div>
                )}
              </div>

              {/* Analyze and Skip buttons row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginTop: "16px" }}>
                <button
                  onClick={handleAnalyze}
                  disabled={getWordCount([descriptionText, extractedText].filter(Boolean).join(' ')) < 20}
                  style={{
                    padding: "10px 28px",
                    backgroundColor: getWordCount([descriptionText, extractedText].filter(Boolean).join(' ')) < 20 ? "var(--bgColor-muted)" : "var(--fgColor-default)",
                    color: getWordCount([descriptionText, extractedText].filter(Boolean).join(' ')) < 20 ? "var(--fgColor-muted)" : "var(--fgColor-inverse)",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    cursor: getWordCount([descriptionText, extractedText].filter(Boolean).join(' ')) < 20 ? "not-allowed" : "pointer",
                    fontFamily: "var(--font-sans)",
                    transition: "all 0.2s ease",
                  }}
                >
                  Analyze Workload
                </button>
                <button
                  onClick={() => { setSkippedAnalysis(true); setWizardStep(2); }}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--fgColor-default)",
                    color: "var(--fgColor-default)",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    fontSize: "0.813rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "var(--font-outfit), sans-serif",
                    transition: "all 0.2s ease",
                    opacity: 0.85,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--fgColor-default)";
                    e.currentTarget.style.color = "var(--fgColor-inverse)";
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--fgColor-default)";
                    e.currentTarget.style.opacity = "0.85";
                  }}
                >
                  Skip, I&apos;ll choose manually →
                </button>
              </div>
            </>
          )}

        {analysisState === 'analyzing' && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "32px 0" }}>
            <div style={{
              width: "20px", height: "20px",
              border: "2px solid var(--borderColor-info, #3a73ff)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <span style={{ color: "var(--fgColor-default)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)" }}>
              Analyzing your workload...
            </span>
          </div>
        )}

        {analysisState === 'success' && analysisData && (
          <div style={{
            backgroundColor: "var(--bgColor-info, #cedeff)",
            border: "1px solid var(--borderColor-info, #3a73ff)",
            borderRadius: "4px",
            padding: "16px",
            position: "relative",
            marginTop: "8px",
          }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--borderColor-info, #3a73ff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span style={{ fontWeight: 700, fontSize: "var(--text-base)", color: "var(--fgColor-default)", fontFamily: "var(--font-sans)" }}>
                Analysis Complete
              </span>
            </div>

            {/* Analysis details grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--fgColor-muted)", letterSpacing: "0.05em", marginBottom: "4px", fontFamily: "var(--font-sans)" }}>Detected Goal</div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--fgColor-default)", fontFamily: "var(--font-sans)" }}>
                  {analysisData?.detectedGoal ? ({ ml_training: "ML Model Training", inference: "AI Inference & Testing", data_science: "Data Science & Notebooks", rendering: "3D Rendering & Simulation", general_dev: "General Development", research: "Research & Experimentation" } as Record<string, string>)[analysisData.detectedGoal] || analysisData.detectedGoal : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--fgColor-muted)", letterSpacing: "0.05em", marginBottom: "4px", fontFamily: "var(--font-sans)" }}>GPU Memory Need</div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--fgColor-default)", fontFamily: "var(--font-sans)" }}>
                  {analysisData?.estimatedVramNeedGb ? `~${analysisData.estimatedVramNeedGb} GB VRAM` : "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--fgColor-muted)", letterSpacing: "0.05em", marginBottom: "4px", fontFamily: "var(--font-sans)" }}>Workload Intensity</div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--fgColor-default)", fontFamily: "var(--font-sans)" }}>
                  {analysisData?.estimatedComputeIntensity ? ({ low: "Light", medium: "Moderate", high: "Heavy", very_high: "Maximum" } as Record<string, string>)[analysisData.estimatedComputeIntensity] : "—"}
                </div>
              </div>
            </div>

            {/* Frameworks */}
            {analysisData?.detectedFrameworks && analysisData.detectedFrameworks.length > 0 && (
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "var(--fgColor-muted)", letterSpacing: "0.05em", fontFamily: "var(--font-sans)" }}>Frameworks: </span>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--fgColor-default)", fontFamily: "var(--font-sans)" }}>
                  {analysisData.detectedFrameworks.join(", ")}
                </span>
              </div>
            )}

            {/* Key insights */}
            {analysisData?.keyInsights && analysisData.keyInsights.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: "20px", listStyleType: "disc" }}>
                {analysisData.keyInsights.map((insight: string, i: number) => (
                  <li key={i} style={{ fontSize: "var(--text-sm)", color: "var(--fgColor-default)", marginBottom: "4px", fontFamily: "var(--font-sans)" }}>
                    {insight}
                  </li>
                ))}
              </ul>
            )}

            {/* Continue button with Edit Input link */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--borderColor-info, #3a73ff)" }}>
              <span
                onClick={() => setAnalysisState('input')}
                style={{
                  fontSize: "var(--text-xs, 0.75rem)",
                  color: "var(--fgColor-muted)",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fgColor-default)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fgColor-muted)")}
              >
                Edit Input
              </span>
              <button
                onClick={() => setWizardStep(2)}
                style={{
                  padding: "10px 28px",
                  backgroundColor: "var(--fgColor-default)",
                  color: "var(--bgColor-default)",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.2s ease",
                }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {analysisState === 'failure' && (
          <div style={{
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "4px",
            padding: "16px",
            position: "relative",
            marginTop: "8px",
          }}>
            <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ fontWeight: 700, fontSize: "var(--text-base)", color: "var(--fgColor-default)", fontFamily: "var(--font-sans)" }}>
                More Detail Needed
              </span>
            </div>

            {analysisData?.missingCategories && analysisData.missingCategories.length > 0 && (
              <p style={{ fontSize: "var(--text-sm)", color: "var(--fgColor-default)", margin: "0 0 8px", fontFamily: "var(--font-sans)" }}>
                We couldn&apos;t confidently determine your{' '}
                {analysisData.missingCategories.map((cat) => ({
                  primary_goal: 'primary goal',
                  gpu_memory: 'GPU memory requirements',
                  workload_intensity: 'workload intensity',
                } as Record<string, string>)[cat] || cat).join(', ')}.
              </p>
            )}

            {analysisData?.suggestions && (
              <p style={{ fontSize: "var(--text-sm)", color: "var(--fgColor-muted)", margin: "0", fontFamily: "var(--font-sans)", fontStyle: "italic" }}>
                {analysisData.suggestions}
              </p>
            )}

            {/* Try Again and Skip buttons row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(245, 158, 11, 0.3)" }}>
              <button
                onClick={() => setAnalysisState('input')}
                style={{
                  padding: "10px 28px",
                  backgroundColor: "transparent",
                  color: "var(--fgColor-default)",
                  border: "1px solid var(--borderColor-default)",
                  borderRadius: "6px",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.2s ease",
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => { setSkippedAnalysis(true); setWizardStep(2); }}
                style={{
                  background: "transparent",
                  border: "1px solid var(--fgColor-default)",
                  color: "var(--fgColor-default)",
                  padding: "10px 20px",
                  borderRadius: "4px",
                  fontSize: "0.813rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "var(--font-outfit), sans-serif",
                  transition: "all 0.2s ease",
                  opacity: 0.85,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--fgColor-default)";
                  e.currentTarget.style.color = "var(--fgColor-inverse)";
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--fgColor-default)";
                  e.currentTarget.style.opacity = "0.85";
                }}
              >
                Skip and choose manually →
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Step 2: Configure Setup */}
      {wizardStep === 2 && (
        <>
          {/* Integrated Step 2 Header */}
          <div style={{ marginBottom: "8px" }}>
            {/* Top row: Back + Step label */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span
                onClick={() => setWizardStep(1)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "var(--text-sm, 0.875rem)",
                  color: "var(--fgColor-muted)",
                  cursor: "pointer",
                  fontFamily: "var(--font-outfit, var(--font-sans))",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fgColor-default)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fgColor-muted)")}
              >
                ← Back
              </span>
              <span style={{ fontSize: "var(--text-xs, 0.75rem)", color: "var(--fgColor-muted)", fontFamily: "var(--font-outfit, var(--font-sans))" }}>
                Step 2 of 3
              </span>
            </div>
            {/* Heading */}
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--fgColor-default)", fontFamily: "var(--font-outfit, var(--font-sans))", lineHeight: 1.2, marginBottom: "6px" }}>
              Configure Your Setup
            </div>
            {/* Subtitle */}
            <div style={{ fontSize: "0.875rem", color: "var(--fgColor-muted)", fontFamily: "var(--font-outfit, var(--font-sans))" }}>
              {!skippedAnalysis && analysisState === 'success' && analysisData ? (
                <span>
                  Based on your analysis:
                  {" "}<strong style={{ color: "var(--fgColor-default)" }}>
                    {analysisData.detectedGoal ? ({ ml_training: "ML Model Training", inference: "AI Inference & Testing", data_science: "Data Science & Notebooks", rendering: "3D Rendering & Simulation", general_dev: "General Development", research: "Research & Experimentation" } as Record<string, string>)[analysisData.detectedGoal] || "Your goal" : "Your goal"}
                  </strong>
                  {analysisData?.estimatedVramNeedGb && <> · ~{analysisData.estimatedVramNeedGb} GB VRAM</>}
                  {analysisData?.estimatedComputeIntensity && <> · {({ low: "Light", medium: "Moderate", high: "Heavy", very_high: "Maximum" } as Record<string, string>)[analysisData.estimatedComputeIntensity]} intensity</>}
                </span>
              ) : (
                <span>Choose your workload type, dataset size, and processing intensity.</span>
              )}
            </div>
          </div>

          {/* Section B: Primary Goal */}
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: autoSelectedFields.has('primaryGoal') ? "1px solid var(--borderColor-info, #3a73ff)" : "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "24px",
          position: "relative",
        }}
      >
        {autoSelectedFields.has('primaryGoal') && (
          <span style={{
            position: "absolute",
            top: "12px",
            right: "16px",
            fontSize: "0.7rem",
            fontStyle: "italic",
            color: "var(--borderColor-info, #3a73ff)",
            fontFamily: "var(--font-sans)",
          }}>
            Auto-selected based on analysis — you can change this
          </span>
        )}
        <div
          style={{
            fontSize: "var(--text-xs, 0.75rem)",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "8px",
          }}
        >
          What&apos;s Your Primary Goal?
        </div>
        <p
          style={{
            fontSize: "var(--text-sm, 0.875rem)",
            color: "var(--fgColor-default)",
            marginBottom: "16px",
            marginTop: 0,
          }}
        >
          Select the option that best describes what you&apos;re trying to accomplish.
        </p>

        {/* 2-column grid of selectable cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
          }}
        >
          {GOALS.map((goal) => {
            const isSelected = primaryGoal === goal.id;
            return (
              <button
                key={goal.id}
                onClick={() => {
                  setPrimaryGoal(goal.id);
                  setAutoSelectedFields(prev => { const next = new Set(prev); next.delete('primaryGoal'); return next; });
                }}
                style={{
                  padding: isSelected ? "11px 15px" : "12px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  backgroundColor: "var(--bgColor-default)",
                  border: isSelected
                    ? "2px solid var(--fgColor-default)"
                    : "1px solid var(--borderColor-default)",
                  borderRadius: "4px",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "var(--text-sm, 0.875rem)",
                    color: "var(--fgColor-default)",
                  }}
                >
                  {goal.label}
                </div>
                <div
                  style={{
                    fontSize: "var(--text-xs, 0.75rem)",
                    color: "var(--fgColor-muted)",
                    marginTop: "4px",
                  }}
                >
                  {goal.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section C: Dataset Size */}
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: autoSelectedFields.has('datasetSize') ? "1px solid var(--borderColor-info, #3a73ff)" : "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "24px",
          position: "relative",
        }}
      >
        {autoSelectedFields.has('datasetSize') && (
          <span style={{
            position: "absolute",
            top: "12px",
            right: "16px",
            fontSize: "0.7rem",
            fontStyle: "italic",
            color: "var(--borderColor-info, #3a73ff)",
            fontFamily: "var(--font-sans)",
          }}>
            Auto-selected based on analysis — you can change this
          </span>
        )}
        <div
          style={{
            fontSize: "var(--text-xs, 0.75rem)",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "8px",
          }}
        >
          Dataset Size
        </div>
        <p
          style={{
            fontSize: "var(--text-sm, 0.875rem)",
            color: "var(--fgColor-default)",
            marginBottom: "16px",
            marginTop: 0,
          }}
        >
          How large is your dataset or model? This helps us recommend the right GPU memory.
        </p>

        {/* Horizontal flex layout */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {DATASET_SIZES.map((item) => {
            const isSelected = datasetSize === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setDatasetSize(item.id);
                  setAutoSelectedFields(prev => { const next = new Set(prev); next.delete('datasetSize'); return next; });
                }}
                style={{
                  flex: "1 1 auto",
                  minWidth: "140px",
                  padding: isSelected ? "11px 15px" : "12px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  backgroundColor: "var(--bgColor-default)",
                  border: isSelected
                    ? "2px solid var(--fgColor-default)"
                    : "1px solid var(--borderColor-default)",
                  borderRadius: "4px",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "var(--text-sm, 0.875rem)",
                    color: "var(--fgColor-default)",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "var(--text-xs, 0.75rem)",
                    color: "var(--fgColor-muted)",
                    marginTop: "4px",
                  }}
                >
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section D: Performance Priority */}
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: autoSelectedFields.has('workloadIntensity') ? "1px solid var(--borderColor-info, #3a73ff)" : "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "24px",
          position: "relative",
        }}
      >
        {autoSelectedFields.has('workloadIntensity') && (
          <span style={{
            position: "absolute",
            top: "12px",
            right: "16px",
            fontSize: "0.7rem",
            fontStyle: "italic",
            color: "var(--borderColor-info, #3a73ff)",
            fontFamily: "var(--font-sans)",
          }}>
            Auto-selected based on analysis — you can change this
          </span>
        )}
        <div
          style={{
            fontSize: "var(--text-xs, 0.75rem)",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "8px",
          }}
        >
          Workload Intensity
        </div>
        <p
          style={{
            fontSize: "var(--text-sm, 0.875rem)",
            color: "var(--fgColor-default)",
            marginBottom: "20px",
            marginTop: 0,
          }}
        >
          How demanding will your workload be?
        </p>

        {/* Current level display */}
        <div
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "var(--fgColor-default)",
            marginBottom: "12px",
          }}
        >
          {["Light", "Moderate", "Heavy", "Maximum"][workloadIntensity]}
          <span
            style={{
              fontSize: "var(--text-sm, 0.875rem)",
              fontWeight: 400,
              color: "var(--fgColor-muted)",
              marginLeft: "12px",
            }}
          >
            {[
              "Jupyter notebooks, small experiments, coursework",
              "Model training, data analysis, standard development",
              "Large model training, complex simulations, production workloads",
              "Enterprise-grade processing, large-scale deep learning",
            ][workloadIntensity]}
          </span>
        </div>

        {/* Stepped slider */}
        <input
          type="range"
          min={0}
          max={3}
          step={1}
          value={workloadIntensity}
          onChange={(e) => {
            setWorkloadIntensity(parseInt(e.target.value, 10));
            setAutoSelectedFields(prev => { const next = new Set(prev); next.delete('workloadIntensity'); return next; });
          }}
          style={{
            width: "100%",
            height: "4px",
            background: "var(--borderColor-default)",
            borderRadius: "2px",
            outline: "none",
            WebkitAppearance: "none",
            appearance: "none",
            cursor: "pointer",
          }}
        />

        {/* Step labels */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "8px",
            fontSize: "var(--text-xs, 0.75rem)",
            color: "var(--fgColor-muted)",
          }}
        >
          <span>Light</span>
          <span>Moderate</span>
          <span>Heavy</span>
          <span>Maximum</span>
        </div>
      </div>

          {/* Continue button */}
          <div style={{ marginTop: "24px" }}>
            <button
              onClick={() => setWizardStep(3)}
              disabled={!primaryGoal}
              style={{
                width: "100%",
                padding: "14px 24px",
                backgroundColor: !primaryGoal ? "var(--bgColor-muted)" : "var(--fgColor-default)",
                color: !primaryGoal ? "var(--fgColor-muted)" : "var(--bgColor-default)",
                border: "none",
                borderRadius: "4px",
                cursor: primaryGoal ? "pointer" : "not-allowed",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm, 0.875rem)",
                fontWeight: 600,
              }}
            >
              Continue
            </button>
            {!primaryGoal && (
              <div style={{ marginTop: "8px", textAlign: "center", fontSize: "var(--text-xs, 0.75rem)", color: "var(--fgColor-muted)", fontFamily: "var(--font-sans)" }}>
                Please select a primary goal to continue
              </div>
            )}
          </div>
        </>
      )}

      {/* Step 3: Budget & Duration */}
      {wizardStep === 3 && (
        <>
          {/* Integrated Step 3 Header */}
          <div style={{ marginBottom: "8px" }}>
            {/* Top row: Back + Step label */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span
                onClick={() => setWizardStep(2)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "var(--text-sm, 0.875rem)",
                  color: "var(--fgColor-muted)",
                  cursor: "pointer",
                  fontFamily: "var(--font-outfit, var(--font-sans))",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fgColor-default)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fgColor-muted)")}
              >
                ← Back
              </span>
              <span style={{ fontSize: "var(--text-xs, 0.75rem)", color: "var(--fgColor-muted)", fontFamily: "var(--font-outfit, var(--font-sans))" }}>
                Step 3 of 3
              </span>
            </div>
            {/* Heading */}
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--fgColor-default)", fontFamily: "var(--font-outfit, var(--font-sans))", lineHeight: 1.2, marginBottom: "6px" }}>
              Set Your Budget &amp; Duration
            </div>
            {/* Subtitle */}
            <div style={{ fontSize: "0.875rem", color: "var(--fgColor-muted)", fontFamily: "var(--font-outfit, var(--font-sans))" }}>
              Define your spending preference and how long you plan to use the instance.
            </div>
          </div>

          {/* Section E: Budget Preference */}
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "24px",
        }}
      >
        <div
          style={{
            fontSize: "var(--text-xs, 0.75rem)",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "8px",
          }}
        >
          Budget Preference
        </div>
        <p
          style={{
            fontSize: "var(--text-sm, 0.875rem)",
            color: "var(--fgColor-default)",
            marginBottom: "16px",
            marginTop: 0,
          }}
        >
          What&apos;s your priority when it comes to pricing?
        </p>

        {/* Horizontal flex layout */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {BUDGETS.map((item) => {
            const isSelected = budget === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setBudget(item.id);
                  setBudgetAmount(50); // Reset slider when chip selected
                }}
                style={{
                  flex: "1 1 auto",
                  minWidth: "140px",
                  padding: isSelected ? "11px 15px" : "12px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  backgroundColor: "var(--bgColor-default)",
                  border: isSelected
                    ? "2px solid var(--fgColor-default)"
                    : "1px solid var(--borderColor-default)",
                  borderRadius: "4px",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "var(--text-sm, 0.875rem)",
                    color: "var(--fgColor-default)",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "var(--text-xs, 0.75rem)",
                    color: "var(--fgColor-muted)",
                    marginTop: "4px",
                  }}
                >
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div
          style={{
            borderTop: "1px solid var(--borderColor-default)",
            marginTop: "20px",
            marginBottom: "16px",
          }}
        />

        {/* Or set a specific budget */}
        <div
          style={{
            fontSize: "var(--text-xs, 0.75rem)",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "12px",
          }}
        >
          Or Set a Specific Budget
        </div>

        {/* Budget display */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--fgColor-default)",
            }}
          >
            ₹{budgetAmount}
          </span>
          {budgetAmount > 50 && (
            <span
              style={{
                fontSize: "var(--text-xs, 0.75rem)",
                color: "var(--fgColor-muted)",
              }}
            >
              budget set
            </span>
          )}
        </div>

        {/* Slider */}
        <input
          type="range"
          min={50}
          max={2000}
          step={10}
          value={budgetAmount}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            setBudgetAmount(value);
            setBudget(""); // Clear chip selection when slider used
          }}
          style={{
            width: "100%",
            height: "4px",
            background: "var(--borderColor-default)",
            borderRadius: "2px",
            outline: "none",
            WebkitAppearance: "none",
            appearance: "none",
            cursor: "pointer",
          }}
        />

        {/* Tick labels */}
        <div
          style={{
            display: "flex",
            position: "relative",
            marginTop: "8px",
            fontSize: "var(--text-xs, 0.75rem)",
            color: "var(--fgColor-muted)",
            height: "16px",
          }}
        >
          {[
            { label: "₹50", pct: 0 },
            { label: "₹250", pct: ((250 - 50) / (2000 - 50)) * 100 },
            { label: "₹500", pct: ((500 - 50) / (2000 - 50)) * 100 },
            { label: "₹1000", pct: ((1000 - 50) / (2000 - 50)) * 100 },
            { label: "₹2000", pct: 100 },
          ].map((tick) => (
            <span
              key={tick.label}
              style={{
                position: "absolute",
                left: `${tick.pct}%`,
                transform: tick.pct === 100 ? "translateX(-100%)" : tick.pct === 0 ? "none" : "translateX(-50%)",
              }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        {/* Estimated hours helper text */}
        {budgetAmount > 50 && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 12px",
              backgroundColor: "var(--bgColor-info, #cedeff)",
              border: "1px solid var(--borderColor-info, #3a73ff)",
              borderRadius: "4px",
              fontSize: "var(--text-xs, 0.75rem)",
              color: "var(--fgColor-default)",
            }}
          >
            {sessionDuration ? (
              <>
                For {sessionDuration === "quick" ? 2 : sessionDuration === "extended" ? 8 : 4}hrs:{" "}
                {(() => {
                  const durationHours = sessionDuration === "quick" ? 2 : sessionDuration === "extended" ? 8 : 4;
                  const sparkCost = 35 * durationHours;
                  const blazeCost = 65 * durationHours;
                  const infernoCost = 105 * durationHours;
                  return (
                    <>
                      <span>Spark ₹{sparkCost}</span>
                      <span style={{ color: sparkCost <= budgetAmount ? "#1a7f37" : "#cf222e", marginLeft: "2px" }}>
                        {sparkCost <= budgetAmount ? " ✓" : " ✗"}
                      </span>
                      {" | "}
                      <span>Blaze ₹{blazeCost}</span>
                      <span style={{ color: blazeCost <= budgetAmount ? "#1a7f37" : "#cf222e", marginLeft: "2px" }}>
                        {blazeCost <= budgetAmount ? " ✓" : " ✗"}
                      </span>
                      {" | "}
                      <span>Inferno ₹{infernoCost}</span>
                      <span style={{ color: infernoCost <= budgetAmount ? "#1a7f37" : "#cf222e", marginLeft: "2px" }}>
                        {infernoCost <= budgetAmount ? " ✓" : " ✗"}
                      </span>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                At ₹{budgetAmount}: ~{Math.floor(budgetAmount / 35)}hrs on Spark, ~
                {Math.floor(budgetAmount / 65)}hrs on Blaze, ~{Math.floor(budgetAmount / 105)}hrs on
                Inferno
              </>
            )}
          </div>
        )}
      </div>

      {/* Section F: Session Duration */}
      <div
        style={{
          backgroundColor: "var(--bgColor-mild)",
          border: "1px solid var(--borderColor-default)",
          borderRadius: "4px",
          padding: "24px",
        }}
      >
        <div
          style={{
            fontSize: "var(--text-xs, 0.75rem)",
            fontWeight: 600,
            color: "var(--fgColor-default)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "8px",
          }}
        >
          Expected Session Duration
        </div>
        <p
          style={{
            fontSize: "var(--text-sm, 0.875rem)",
            color: "var(--fgColor-default)",
            marginBottom: "16px",
            marginTop: 0,
          }}
        >
          How long do you expect to use this instance? We&apos;ll estimate your total cost.
        </p>

        {/* Horizontal flex layout */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          {DURATIONS.map((item) => {
            const isSelected = sessionDuration === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSessionDuration(item.id)}
                style={{
                  flex: "1 1 auto",
                  minWidth: "140px",
                  padding: isSelected ? "11px 15px" : "12px 16px",
                  textAlign: "left",
                  cursor: "pointer",
                  backgroundColor: "var(--bgColor-default)",
                  border: isSelected
                    ? "2px solid var(--fgColor-default)"
                    : "1px solid var(--borderColor-default)",
                  borderRadius: "4px",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "var(--text-sm, 0.875rem)",
                    color: "var(--fgColor-default)",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "var(--text-xs, 0.75rem)",
                    color: "var(--fgColor-muted)",
                    marginTop: "4px",
                  }}
                >
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={handleFindBestFit}
        disabled={!primaryGoal || analyzing}
        style={{
          width: "100%",
          padding: "14px 24px",
          marginTop: "24px",
          backgroundColor: !primaryGoal ? "var(--bgColor-muted)" : "var(--fgColor-default)",
          color: !primaryGoal ? "var(--fgColor-muted)" : "var(--bgColor-default)",
          border: "none",
          borderRadius: "4px",
          cursor: primaryGoal ? "pointer" : "not-allowed",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm, 0.875rem)",
          fontWeight: 600,
        }}
      >
        {analyzing ? analyzePhase : "Find My Best Fit"}
      </button>

      {/* Loading State */}
      {analyzing && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "3px solid var(--borderColor-default)",
              borderTopColor: "var(--fgColor-default)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <div style={{ fontSize: "var(--text-sm, 0.875rem)", color: "var(--fgColor-muted)" }}>
            {analyzePhase}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );

  // ============================================================================
  // RENDER: RESULTS DISPLAY
  // ============================================================================

  const renderResults = () => {
    if (!results) return null;

    return (
      <div>
        {/* Results header */}
        <div style={{ marginBottom: "24px" }}>
          <h2
            style={{
              fontSize: "var(--text-base, 1rem)",
              fontWeight: 700,
              color: "var(--fgColor-default)",
              margin: 0,
            }}
          >
            Recommended Configurations
          </h2>
          <p
            style={{
              fontSize: "var(--text-sm, 0.875rem)",
              color: "var(--fgColor-muted)",
              marginTop: "4px",
              marginBottom: 0,
            }}
          >
            Based on your workload profile, here are our top picks
          </p>
        </div>

        {/* Result cards — 2 column grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "16px",
          }}
          className="recommendation-grid"
        >
          {results.slice(0, 4).map((scored) => {
            const isBestMatch = scored.tag === "BEST_MATCH";
            const isUnavailable = !scored.available;

            // ── Performance indicator helpers ──────────────────────────────
            const vcpu = scored.config.vcpu;
            const ramGb = scored.config.memoryMb / 1024;
            const vramGb = scored.config.gpuVramMb / 1024;
            const slug = scored.config.slug;

            // Dot count per metric (1-4)
            const cpuDots = vcpu >= 12 ? 4 : vcpu >= 8 ? 3 : vcpu >= 4 ? 2 : 1;
            const ramDots = ramGb >= 32 ? 4 : ramGb >= 16 ? 3 : ramGb >= 8 ? 2 : 1;
            const vramDots = vramGb >= 16 ? 4 : vramGb >= 8 ? 3 : vramGb >= 4 ? 2 : 1;
            const costDots = slug === "spark" ? 4 : slug === "blaze" ? 3 : slug === "inferno" ? 2 : 1;

            const dotLabel = (n: number) =>
              n === 4 ? "Excellent" : n === 3 ? "Good" : n === 2 ? "Moderate" : "Basic";

            const dotColor = (n: number) =>
              n >= 3 ? "#3fb950" : n === 2 ? "#d29922" : "#db6d28";

            // ── WHY bullets ───────────────────────────────────────────────
            let bullets: string[] = [];
            if (scored.bullets && scored.bullets.length > 0) {
              bullets = scored.bullets;
            } else if (scored.explanation) {
              // Try JSON parse first (in case explanation is raw JSON string)
              try {
                const parsed = JSON.parse(scored.explanation) as { bullets?: string[] };
                if (parsed.bullets) bullets = parsed.bullets;
              } catch {
                // Split on newlines or sentences
                bullets = scored.explanation
                  .split(/\n|(?<=\.)\s+/)
                  .map((s) => s.trim())
                  .filter((s) => s.length > 10)
                  .slice(0, 3);
              }
            }
            // Final fallback to reasons
            if (bullets.length === 0) bullets = scored.reasons.slice(0, 3);

            const renderDots = (filled: number) => (
              <span style={{ display: "inline-flex", gap: "3px", alignItems: "center" }}>
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: i <= filled ? dotColor(filled) : "var(--borderColor-default)",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </span>
            );

            return (
              <div
                key={scored.config.id}
                style={{
                  backgroundColor: "var(--bgColor-mild)",
                  border: isBestMatch
                    ? "2px solid var(--fgColor-info)"
                    : "1px solid var(--borderColor-default)",
                  borderRadius: "4px",
                  padding: isBestMatch ? "23px" : "24px",
                  opacity: isUnavailable ? 0.5 : 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {/* Tag badge row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "2px",
                      fontSize: "var(--text-xs, 0.75rem)",
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                      backgroundColor:
                        isBestMatch
                          ? "var(--fgColor-info)"
                          : scored.tag === "TOP_PERFORMANCE"
                          ? "var(--fgColor-warning)"
                          : "var(--bgColor-muted)",
                      color:
                        isBestMatch || scored.tag === "TOP_PERFORMANCE"
                          ? "#FFFFFF"
                          : "var(--fgColor-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {scored.tag.replace(/_/g, " ")}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isUnavailable && (
                      <span
                        style={{
                          fontSize: "var(--text-xs, 0.75rem)",
                          color: "var(--fgColor-critical, #E70000)",
                          fontWeight: 600,
                        }}
                      >
                        UNAVAILABLE
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "var(--text-xs, 0.75rem)",
                        color: "var(--fgColor-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <GpuChipIcon size={12} /> GPU
                    </span>
                  </div>
                </div>

                {/* Config name & specs */}
                <div>
                  <div
                    style={{
                      fontSize: "var(--text-base, 1rem)",
                      fontWeight: 700,
                      color: "var(--fgColor-default)",
                    }}
                  >
                    {scored.config.name}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xs, 0.75rem)",
                      color: "var(--fgColor-muted)",
                      marginTop: "6px",
                    }}
                  >
                    {scored.config.vcpu} vCPU &bull; {ramGb} GB RAM
                    {vramGb > 0 ? ` \u2022 ${vramGb} GB VRAM` : ""}
                  </div>
                  {scored.config.gpuModel && (
                    <div
                      style={{
                        fontSize: "var(--text-xs, 0.75rem)",
                        color: "var(--fgColor-muted)",
                        marginTop: "2px",
                        opacity: 0.7,
                      }}
                    >
                      {scored.config.gpuModel}
                    </div>
                  )}
                </div>

                {/* Price + estimated cost */}
                <div>
                  <span
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "var(--fgColor-default)",
                    }}
                  >
                    ₹{scored.config.basePricePerHourCents / 100}/hr
                  </span>
                  <span
                    style={{
                      fontSize: "var(--text-xs, 0.75rem)",
                      color: "var(--fgColor-muted)",
                      marginLeft: "8px",
                    }}
                  >
                    {scored.estimatedCost}
                  </span>
                </div>

                {/* Divider */}
                <div style={{ borderTop: "1px solid var(--borderColor-default)" }} />

                {/* Performance overview */}
                <div>
                  <div
                    style={{
                      fontSize: "var(--text-xs, 0.75rem)",
                      color: "var(--fgColor-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: "10px",
                    }}
                  >
                    Performance Overview
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    {[
                      { label: "Processing Power", dots: cpuDots },
                      { label: "Memory", dots: ramDots },
                      { label: "GPU Capability", dots: vramDots },
                      { label: "Cost Efficiency", dots: costDots },
                    ].map(({ label, dots }) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "var(--text-xs, 0.75rem)",
                            color: "var(--fgColor-muted)",
                            minWidth: "110px",
                          }}
                        >
                          {label}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {renderDots(dots)}
                          <span
                            style={{
                              fontSize: "var(--text-xs, 0.75rem)",
                              color: dotColor(dots),
                              fontWeight: 500,
                              minWidth: "56px",
                              textAlign: "right",
                            }}
                          >
                            {dotLabel(dots)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: "1px solid var(--borderColor-default)" }} />

                {/* Why this config */}
                <div>
                  <div
                    style={{
                      fontSize: "var(--text-xs, 0.75rem)",
                      color: "var(--fgColor-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: "8px",
                    }}
                  >
                    Why This Config
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {bullets.map((bullet, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            color: "#3fb950",
                            fontSize: "var(--text-sm, 0.875rem)",
                            lineHeight: "1.5",
                            flexShrink: 0,
                            marginTop: "1px",
                          }}
                        >
                          ✓
                        </span>
                        <span
                          style={{
                            fontSize: "var(--text-sm, 0.875rem)",
                            color: "var(--fgColor-muted)",
                            lineHeight: "1.5",
                          }}
                        >
                          {bullet}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Select button */}
                {!isUnavailable ? (
                  <button
                    onClick={() => {
                      onSelectConfig(scored.config.id);
                      if (recommendationSessionId) {
                        updateRecommendationSession(recommendationSessionId, {
                          selectedConfigSlug: scored.config.slug,
                          completedAt: new Date().toISOString(),
                        }).catch(e => console.warn('Failed to persist config selection:', e));
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "10px",
                      marginTop: "auto",
                      backgroundColor: isBestMatch ? "var(--fgColor-default)" : "transparent",
                      color: isBestMatch ? "var(--bgColor-default)" : "var(--fgColor-default)",
                      border: isBestMatch ? "none" : "1px solid var(--borderColor-default)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-sm, 0.875rem)",
                      fontWeight: 600,
                    }}
                  >
                    Select This Config
                  </button>
                ) : (
                  <div
                    style={{
                      fontSize: "var(--text-xs, 0.75rem)",
                      color: "var(--fgColor-critical, #E70000)",
                      textAlign: "center",
                      padding: "10px",
                    }}
                  >
                    Currently at capacity — all GPU resources allocated
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "24px",
          }}
        >
          <button
            onClick={() => { setResults(null); setWizardStep(skippedAnalysis ? 2 : 1); }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--fgColor-info)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm, 0.875rem)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            ← Refine your inputs
          </button>
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--fgColor-muted)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm, 0.875rem)",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            Back to manual selection
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div>
      {/* Back link */}
      <div
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "var(--text-sm, 0.875rem)",
          fontWeight: 400,
          color: "var(--fgColor-muted)",
          cursor: "pointer",
          marginBottom: "24px",
          transition: "color 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fgColor-default)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fgColor-muted)")}
      >
        <ArrowLeftIcon size={16} />
        Back to manual selection
      </div>

      {/* Header */}
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          color: "var(--fgColor-default)",
          margin: 0,
          lineHeight: "2.5rem",
        }}
      >
        Find Your Ideal Compute Configuration
      </h1>
      <p
        style={{
          fontSize: "var(--text-sm, 0.875rem)",
          fontWeight: 400,
          color: "var(--fgColor-muted)",
          marginTop: "8px",
          marginBottom: "16px",
          lineHeight: "1.375rem",
        }}
      >
        Answer a few questions about your workload and we&apos;ll recommend the best setup for you.
      </p>

      {/* Conditional rendering: Input Form OR Results */}
      {results ? renderResults() : renderInputForm()}

      {/* Responsive grid styles */}
      <style>{`
        .recommendation-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        @media (max-width: 640px) {
          .recommendation-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        /* Slider thumb styling */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: var(--fgColor-default);
          border-radius: 50%;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: var(--fgColor-default);
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}
