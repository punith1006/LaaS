"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FooterLinks } from "@/components/auth/footer-links";
import { useSignupStore } from "@/stores/signup-store";
import { saveOnboardingProfile } from "@/lib/api";
import { Check, ChevronRight, ChevronLeft, Cpu, FlaskConical, BookOpen, Code, Layers, Lightbulb, PenTool, Film, Gamepad2, Building, Beaker, GraduationCap } from "lucide-react";

// ============================================
// AREAS (Domains) - User's work areas/categories
// ============================================
const AREAS = [
  // AI & ML
  { value: "machine_learning", label: "Machine Learning", icon: Cpu },
  { value: "deep_learning", label: "Deep Learning", icon: Layers },
  { value: "computer_vision", label: "Computer Vision", icon: Lightbulb },
  { value: "nlp", label: "Natural Language Processing", icon: BookOpen },
  { value: "data_science", label: "Data Science", icon: FlaskConical },
  // Creative
  { value: "graphic_design", label: "Graphic Design / 3D", icon: PenTool },
  { value: "video_editing", label: "Video Editing / VFX", icon: Film },
  { value: "game_dev", label: "Game Development", icon: Gamepad2 },
  // Engineering
  { value: "software_eng", label: "Software Engineering", icon: Code },
  { value: "robotics", label: "Robotics / IoT", icon: Cpu },
  { value: "architecture", label: "Architecture / CAD", icon: Building },
  // Science & Research
  { value: "scientific_computing", label: "Scientific Computing", icon: Beaker },
  { value: "research", label: "Research / Academia", icon: BookOpen },
  { value: "education", label: "Education", icon: GraduationCap },
  // Other
  { value: "other", label: "Other", icon: Lightbulb },
];

// ============================================
// TOOLS MAPPING - Tools dynamically shown based on selected areas
// ============================================
const TOOLS_MAPPING: Record<string, string[]> = {
  machine_learning: ["PyTorch", "TensorFlow", "JAX", "CUDA", "scikit-learn", "Hugging Face", "Keras"],
  deep_learning: ["PyTorch", "TensorFlow", "JAX", "CUDA", "OpenCV", "Keras"],
  computer_vision: ["OpenCV", "PyTorch", "TensorFlow", "CUDA", "Pillow", "MediaPipe"],
  nlp: ["Hugging Face", "spaCy", "NLTK", "LangChain", "Gensim", "Transformers"],
  data_science: ["Pandas", "NumPy", "Jupyter", "Matplotlib", "Seaborn", "SciPy", "Scikit-learn"],
  graphic_design: ["Blender", "Maya", "Cinema 4D", "Photoshop", "Illustrator", "Substance"],
  video_editing: ["DaVinci Resolve", "Blender", "FFmpeg", "After Effects", "Premiere Pro", "Final Cut"],
  game_dev: ["Unity", "Unreal Engine", "Godot", "DirectX", "OpenGL", "Cocos2d"],
  software_eng: ["VS Code", "Docker", "Git", "Jupyter", "Node.js", "Docker Compose", "IntelliJ"],
  robotics: ["ROS", "OpenCV", "Gazebo", "Arduino", "PyBullet", "MoveIt"],
  architecture: ["AutoCAD", "Revit", "SketchUp", "FreeCAD", "Blender", "Rhino"],
  scientific_computing: ["NumPy", "SciPy", "MATLAB", "Mathematica", "ParaView", "LAMMPS"],
  research: ["Jupyter", "Zotero", "Overleaf", "Mendeley", "MATLAB", "LaTeX"],
  education: ["Jupyter", "TensorFlow", "PyTorch", "LaTeX", "Moodle", "Google Colab"],
  other: [],
};

// Get unique tools from all mappings for "Other" selection fallback
const ALL_TOOLS = [...new Set(Object.values(TOOLS_MAPPING).flat())].sort();

// ============================================
// PRIMARY USE CASE CARDS
// ============================================
const USE_CASE_CARDS = [
  { value: "ai_ml_training", label: "AI/ML Training", description: "Train models at scale", icon: Cpu },
  { value: "model_inference", label: "Model Inference", description: "Test and deploy models", icon: Layers },
  { value: "data_processing", label: "Data Processing", description: "Analyze large datasets", icon: FlaskConical },
  { value: "research", label: "Research", description: "Academic & scientific research", icon: BookOpen },
  { value: "learning", label: "Learning", description: "Education & skill development", icon: GraduationCap },
  { value: "development", label: "Development", description: "Software & application building", icon: Code },
];

// Countries
const COUNTRIES = [
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "SG", label: "Singapore" },
  { value: "AE", label: "UAE" },
  { value: "JP", label: "Japan" },
  { value: "other", label: "Other" },
];

// Step 1 options
const PROFESSIONS = [
  { value: "student", label: "Student" },
  { value: "researcher", label: "Researcher" },
  { value: "engineer", label: "Software Engineer" },
  { value: "data_scientist", label: "Data Scientist" },
  { value: "academic", label: "Academic / Faculty" },
  { value: "ml_ai_specialist", label: "ML/AI Specialist" },
  { value: "freelancer", label: "Freelancer" },
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "other", label: "Other" },
];

const EXPERTISE_LEVELS = [
  { value: "beginner", label: "Beginner - New to AI/ML" },
  { value: "intermediate", label: "Intermediate - Some experience" },
  { value: "advanced", label: "Advanced - Regular user" },
  { value: "expert", label: "Expert - Power user / Researcher" },
];

const YEARS_OPTIONS = [
  { value: "0", label: "Less than 1 year" },
  { value: "1", label: "1-2 years" },
  { value: "2", label: "2-5 years" },
  { value: "5", label: "5-10 years" },
  { value: "10", label: "10+ years" },
];

export function OnboardingForm() {
  const router = useRouter();
  const { onboardingData, setOnboardingData, hasEmail, reset } = useSignupStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Step 1: About You
  const [profession, setProfession] = useState(onboardingData.profession || "");
  const [expertiseLevel, setExpertiseLevel] = useState(
    onboardingData.expertiseLevel || ""
  );

  // Step 2: Experience
  const [yearsOfExperience, setYearsOfExperience] = useState(
    onboardingData.yearsOfExperience?.toString() || ""
  );
  const [country, setCountry] = useState(onboardingData.country || "");

  // Step 3: Goals
  const [primaryUseCase, setPrimaryUseCase] = useState<string>("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>(
    onboardingData.operationalDomains || []
  );
  const [selectedTools, setSelectedTools] = useState<string[]>(
    onboardingData.toolsFrameworks || []
  );
  const [goalsOther, setGoalsOther] = useState(
    onboardingData.goalsOther || ""
  );

  // Dynamic tools based on selected areas
  const availableTools = useMemo(() => {
    if (selectedAreas.length === 0) return [];
    
    // If ONLY "other" is selected, show NO tools (user will type custom tools)
    if (selectedAreas.length === 1 && selectedAreas.includes("other")) {
      return [];
    }
    
    // If "other" is selected along with other areas, exclude "other" from tool calculation
    // and show tools only from the non-other areas
    const nonOtherAreas = selectedAreas.filter(area => area !== "other");
    
    if (nonOtherAreas.length === 0) return [];
    
    // Collect unique tools from all selected non-other areas
    const toolsSet = new Set<string>();
    nonOtherAreas.forEach(area => {
      const tools = TOOLS_MAPPING[area];
      if (tools) {
        tools.forEach(tool => toolsSet.add(tool));
      }
    });
    
    return Array.from(toolsSet).sort();
  }, [selectedAreas]);

  // Clear tools when areas change (to ensure validity)
  useEffect(() => {
    setSelectedTools(prev => prev.filter(tool => availableTools.includes(tool)));
  }, [availableTools]);

  useEffect(() => {
    if (!hasEmail()) {
      router.replace("/signup");
    }
  }, [hasEmail, router]);

  // Scroll to top on step change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  const toggleChip = (
    value: string,
    current: string[],
    setter: (v: string[]) => void
  ) => {
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return profession && expertiseLevel;
      case 2:
        return yearsOfExperience && country;
      case 3:
        if (!primaryUseCase || selectedAreas.length === 0) return false;
        // If "other" is selected, require goalsOther text
        if (selectedAreas.includes("other") && !goalsOther.trim()) return false;
        // If non-other areas selected, require at least one tool
        if (selectedAreas.some(a => a !== "other") && selectedTools.length === 0) return false;
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    setOnboardingData({
      profession,
      expertiseLevel,
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : undefined,
      country,
    });
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setOnboardingData({
      profession,
      expertiseLevel,
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : undefined,
      primaryUseCase,
      operationalDomains: selectedAreas,
      toolsFrameworks: selectedTools,
      goalsOther,
      country,
    });
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setOnboardingData({
      profession,
      expertiseLevel,
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : undefined,
      primaryUseCase,
      operationalDomains: selectedAreas,
      toolsFrameworks: selectedTools,
      goalsOther,
      country,
    });

    setIsSubmitting(true);
    try {
      await saveOnboardingProfile({
        profession,
        expertiseLevel,
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : undefined,
        operationalDomains: selectedAreas,
        useCasePurposes: [primaryUseCase, ...selectedTools],
        useCaseOther: goalsOther || undefined,
        country,
      });
      toast.success("Profile completed successfully!");
      reset();
      router.push("/home");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-3 mb-6">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
              currentStep >= step
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {currentStep > step ? <Check className="w-4 h-4" /> : step}
          </div>
          {step < 3 && (
            <div
              className={`w-8 h-0.5 rounded ${
                currentStep > step ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="profession" className="text-sm font-medium text-gray-700">
          What best describes your role? <span className="text-red-500">*</span>
        </Label>
        <Select value={profession} onValueChange={setProfession}>
          <SelectTrigger className="w-full h-11 bg-white border-neutral-400 text-black">
            <SelectValue placeholder="Select your role" className="text-black" />
          </SelectTrigger>
          <SelectContent>
            {PROFESSIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expertise" className="text-sm font-medium text-gray-700">
          Your expertise level? <span className="text-red-500">*</span>
        </Label>
        <Select value={expertiseLevel} onValueChange={setExpertiseLevel}>
          <SelectTrigger className="w-full h-11 bg-white border-neutral-400 text-black">
            <SelectValue placeholder="Select expertise level" className="text-black" />
          </SelectTrigger>
          <SelectContent>
            {EXPERTISE_LEVELS.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="years" className="text-sm font-medium text-gray-700">
          Years of experience? <span className="text-red-500">*</span>
        </Label>
        <Select value={yearsOfExperience} onValueChange={setYearsOfExperience}>
          <SelectTrigger className="w-full h-11 bg-white border-neutral-400 text-black">
            <SelectValue placeholder="Select experience" className="text-black" />
          </SelectTrigger>
          <SelectContent>
            {YEARS_OPTIONS.map((y) => (
              <SelectItem key={y.value} value={y.value}>
                {y.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country" className="text-sm font-medium text-gray-700">
          Country/Region <span className="text-red-500">*</span>
        </Label>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-full h-11 bg-white border-neutral-400 text-black">
            <SelectValue placeholder="Select country" className="text-black" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      {/* Primary Use Case - Single Select Cards */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          What is your primary goal? <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {USE_CASE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.value}
                type="button"
                onClick={() => setPrimaryUseCase(card.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                  primaryUseCase === card.value
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                <Icon className={`w-5 h-5 mb-1.5 ${
                  primaryUseCase === card.value ? "text-blue-600" : "text-gray-400"
                }`} />
                <p className={`text-sm font-medium ${
                  primaryUseCase === card.value ? "text-blue-700" : "text-gray-700"
                }`}>
                  {card.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                  {card.description}
                </p>
              </button>
            );
          })}
        </div>
        {!primaryUseCase && (
          <p className="text-xs text-red-500">Select your primary goal</p>
        )}
      </div>

      {/* Areas of Work - Multi-select Chips */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          What areas do you work in? <span className="text-red-500">*</span>
          <span className="text-gray-400 font-normal ml-1">(Select all)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((area) => (
            <button
              key={area.value}
              type="button"
              onClick={() => toggleChip(area.value, selectedAreas, setSelectedAreas)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-all duration-150 ${
                selectedAreas.includes(area.value)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              {area.label}
            </button>
          ))}
        </div>
        {selectedAreas.length === 0 && (
          <p className="text-xs text-red-500">Select at least one area</p>
        )}
      </div>

      {/* Tools & Frameworks - Multi-select Chips (Dynamic based on selected areas) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          What tools & frameworks do you use? <span className="text-red-500">*</span>
          <span className="text-gray-400 font-normal ml-1">(Filtered)</span>
        </Label>
        {availableTools.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableTools.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => toggleChip(tool, selectedTools, setSelectedTools)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-all duration-150 ${
                  selectedTools.includes(tool)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {tool}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            Select areas above to see relevant tools
          </p>
        )}
        {/* Only require tools if non-other areas are selected */}
        {selectedAreas.some(a => a !== "other") && selectedTools.length === 0 && (
          <p className="text-xs text-red-500">Select at least one tool</p>
        )}
      </div>

      {/* Other Input - Show when Other is selected in areas */}
      {selectedAreas.includes("other") && (
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <Label htmlFor="goalsOther" className="text-sm font-medium text-gray-800">
            Describe your areas <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">(max 50 words)</span>
          </Label>
          <textarea
            id="goalsOther"
            value={goalsOther}
            onChange={(e) => {
              const words = e.target.value.split(/\s+/).filter(Boolean);
              if (words.length <= 50) {
                setGoalsOther(e.target.value);
              }
            }}
            placeholder="e.g., Quantum computing, Blockchain development..."
            className="w-full min-h-[60px] px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-gray-400"
          />
          <p className="text-xs text-gray-400 text-right">
            {goalsOther.split(/\s+/).filter(Boolean).length}/50 words
          </p>
        </div>
      )}
    </div>
  );

  const stepTitles = [
    { title: "Tell us about yourself", subtitle: "Help us personalize your experience" },
    { title: "Your experience", subtitle: "This helps us recommend the right resources" },
    { title: "Your goals", subtitle: "Select areas and use cases that match your needs" },
  ];

  return (
    <div ref={containerRef} className="w-full max-w-md mx-auto flex flex-col" style={{ maxHeight: "calc(100vh - 200px)" }}>
      <div className="flex-shrink-0">
        {renderStepIndicator()}

        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">
            {stepTitles[currentStep - 1].title}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {stepTitles[currentStep - 1].subtitle}
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-1">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      <div className="flex-shrink-0 pt-4 space-y-3 border-t border-gray-100">
        <Button
          type="button"
          className={`w-full h-11 font-medium transition-colors ${
            isStepValid() && !isSubmitting
              ? "bg-gray-900 hover:bg-gray-800 text-white"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          disabled={!isStepValid() || isSubmitting}
          onClick={currentStep < 3 ? handleNext : handleSubmit}
        >
          {isSubmitting ? (
            "Saving..."
          ) : currentStep < 3 ? (
            <>
              Continue <ChevronRight className="ml-2 w-4 h-4" />
            </>
          ) : (
            "Complete Profile"
          )}
        </Button>

        {currentStep > 1 && (
          <Button
            type="button"
            variant="ghost"
            className="w-full h-10 text-gray-500 hover:text-gray-700"
            onClick={handleBack}
          >
            <ChevronLeft className="mr-1 w-4 h-4" /> Back
          </Button>
        )}
      </div>

      <div className="flex-shrink-0 pt-4">
        <p className="text-xs text-gray-400 text-center">
          All fields are required
        </p>
        <div className="mt-3">
          <FooterLinks />
        </div>
      </div>
    </div>
  );
}
