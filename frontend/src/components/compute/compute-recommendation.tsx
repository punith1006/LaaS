"use client";

import { useState } from "react";
import { ScoredConfig, scoreConfigs, ConfigForScoring } from "@/lib/recommendation-engine";

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

  // Handle find best fit
  const handleFindBestFit = async () => {
    setAnalyzing(true);
    setAnalyzePhase("Analyzing your workload...");

    try {
      // Import the scoring engine
      const { scoreConfigs: scoreFn } = await import("@/lib/recommendation-engine");

      let llmAnalysis = undefined;
      const fullText = [descriptionText, extractedText].filter(Boolean).join("\n\n");

      // Step 1: If text provided, call LLM analysis
      if (fullText.trim().length > 20) {
        try {
          const { analyzeWorkload } = await import("@/lib/api");
          llmAnalysis = await analyzeWorkload(fullText, primaryGoal);
        } catch (e) {
          console.warn("LLM analysis failed, proceeding with classic scoring only", e);
        }
      }

      // Step 2: Run classic scoring
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
          llmAnalysis,
        }
      );

      // Step 3: Generate LLM explanations for top 3
      setAnalyzePhase("Generating recommendations...");
      const top3 = scored.slice(0, 3);

      try {
        const { generateExplanation } = await import("@/lib/api");
        const explanationPromises = top3.map((s) =>
          generateExplanation(
            s.config.slug,
            {
              vcpu: s.config.vcpu,
              memoryMb: s.config.memoryMb,
              gpuVramMb: s.config.gpuVramMb,
              hamiSmPercent: s.config.hamiSmPercent,
              basePricePerHourCents: s.config.basePricePerHourCents,
            },
            primaryGoal,
            fullText || `Goal: ${primaryGoal}, Dataset: ${datasetSize}, Workload Intensity: ${["Light", "Moderate", "Heavy", "Maximum"][workloadIntensity]}, Budget: ${budget || `₹${budgetAmount}`}, Duration: ${sessionDuration}`
          ).catch(() => ({ explanation: "" }))
        );

        const explanations = await Promise.all(explanationPromises);
        explanations.forEach((exp, i) => {
          if (exp.explanation) top3[i].explanation = exp.explanation;
        });
      } catch (e) {
        console.warn("LLM explanation generation failed", e);
      }

      setResults(scored);
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
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Section A: Describe Your Workload */}
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
          Describe Your Workload
        </div>
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
      </div>

      {/* Section B: Primary Goal */}
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
                onClick={() => setPrimaryGoal(goal.id)}
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
                onClick={() => setDatasetSize(item.id)}
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
          onChange={(e) => setWorkloadIntensity(parseInt(e.target.value, 10))}
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

        {/* LLM Analysis insights (blue info box) */}
        {results[0]?.explanation && (
          <div
            style={{
              display: "flex",
              gap: "12px",
              padding: "16px",
              backgroundColor: "rgba(58, 115, 255, 0.08)",
              borderLeft: "3px solid var(--fgColor-info)",
              borderRadius: "4px",
              marginBottom: "24px",
            }}
          >
            <span style={{ color: "var(--fgColor-info)", flexShrink: 0 }}>
              <LightbulbIcon size={18} />
            </span>
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "var(--text-sm, 0.875rem)",
                  color: "var(--fgColor-default)",
                  marginBottom: "4px",
                }}
              >
                Our Analysis
              </div>
              <div
                style={{
                  fontSize: "var(--text-sm, 0.875rem)",
                  color: "var(--fgColor-muted)",
                  lineHeight: "1.5",
                }}
              >
                Based on your description, we identified your workload requirements and matched them
                with optimal configurations.
              </div>
            </div>
          </div>
        )}

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

                  {/* GPU badge */}
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
                      display: "flex",
                      gap: "16px",
                      marginTop: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: "var(--text-xs, 0.75rem)", color: "var(--fgColor-muted)" }}>
                      {scored.config.vcpu} vCPU
                    </span>
                    <span style={{ fontSize: "var(--text-xs, 0.75rem)", color: "var(--fgColor-muted)" }}>
                      {scored.config.memoryMb / 1024} GB RAM
                    </span>
                    <span
                      style={{
                        fontSize: "var(--text-xs, 0.75rem)",
                        color: "var(--fgColor-default)",
                        fontWeight: 600,
                      }}
                    >
                      {scored.config.gpuVramMb / 1024} GB VRAM
                    </span>
                  </div>
                  {scored.config.gpuModel && (
                    <div
                      style={{
                        fontSize: "var(--text-xs, 0.75rem)",
                        color: "var(--fgColor-muted)",
                        marginTop: "4px",
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
                  {scored.explanation ? (
                    <p
                      style={{
                        fontSize: "var(--text-sm, 0.875rem)",
                        color: "var(--fgColor-muted)",
                        lineHeight: "1.6",
                        margin: 0,
                      }}
                    >
                      {scored.explanation}
                    </p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: "16px" }}>
                      {scored.reasons.map((reason, i) => (
                        <li
                          key={i}
                          style={{
                            fontSize: "var(--text-sm, 0.875rem)",
                            color: "var(--fgColor-muted)",
                            lineHeight: "1.6",
                          }}
                        >
                          {reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Upsell line for TOP_PERFORMANCE */}
                {scored.tag === "TOP_PERFORMANCE" &&
                  scored.reasons.some((r) => r.includes("more per hour")) && (
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: "4px",
                        backgroundColor: "rgba(217, 139, 12, 0.08)",
                        borderLeft: "3px solid var(--fgColor-warning)",
                        fontSize: "var(--text-xs, 0.75rem)",
                        color: "var(--fgColor-warning)",
                      }}
                    >
                      {scored.reasons.find((r) => r.includes("more per hour"))}
                    </div>
                  )}

                {/* Select button */}
                {!isUnavailable ? (
                  <button
                    onClick={() => onSelectConfig(scored.config.id)}
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
            onClick={() => setResults(null)}
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
          marginBottom: "24px",
          lineHeight: "1.375rem",
        }}
      >
        Answer a few questions about your workload and we&apos;ll recommend the best setup for you.
      </p>

      {/* Blue info banner */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          padding: "16px",
          backgroundColor: "rgba(58, 115, 255, 0.08)",
          borderLeft: "3px solid var(--fgColor-info)",
          borderRadius: "4px",
          marginBottom: "24px",
        }}
      >
        <span style={{ color: "var(--fgColor-info)", flexShrink: 0, marginTop: "2px" }}>
          <InfoIcon size={18} />
        </span>
        <div>
          <div
            style={{
              fontSize: "var(--text-sm, 0.875rem)",
              fontWeight: 600,
              color: "var(--fgColor-default)",
              marginBottom: "4px",
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
