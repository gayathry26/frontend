"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Github, Sparkles, CheckCircle2, AlertTriangle, ArrowRight,
  ShieldCheck, HelpCircle, Bot, User, RotateCcw, ChevronRight, BarChart2,
  Cpu, Layers, Target, Clock, ArrowLeft, RefreshCw, Zap, Check, Eye,
  AlertCircle, TrendingUp, Award, Volume2, Mic, MicOff, Send, Database,
  FileCode, Search, Server, Shield, Network, FolderGit2, BookOpen,
  Code2, Terminal, Play, Lock, ChevronDown, ChevronUp, Copy, ExternalLink,
  Flame, CheckCircle, Info, Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface DetectedStack {
  languages: string[];
  frontendFrameworks: string[];
  backendFrameworks: string[];
  databases: string[];
  ormOrQueryBuilders: string[];
  authentication: string[];
  apiTechnologies: string[];
  stateManagement: string[];
  cloudAndDevOps: string[];
  testingFrameworks: string[];
  buildToolsAndPackageManagers: string[];
  primaryStackLabel: string;
}

interface ProjectKnowledge {
  project: string;
  owner: string;
  url: string;
  description: string;
  technologies: string[];
  techStackDetailed: DetectedStack;
  features: string[];
  architecture: {
    pattern: string;
    flowDiagram: string[];
    componentLayers: {
      presentation: string[];
      routing: string[];
      businessLogic: string[];
      dataAccess: string[];
    };
    scalabilityBottlenecks: string[];
    securityHighlights: string[];
  };
  authentication: string;
  apis: Array<{ method: string; path: string; filePath: string; handlerName: string; hasAuthGuard: boolean }>;
  databaseModels: Array<{ name: string; type: string; filePath: string; fields: string[]; relations: string[] }>;
  codeDefenseSnippets: Array<{
    id: string;
    filePath: string;
    name: string;
    type: string;
    startLine: number;
    endLine: number;
    codeSnippet: string;
    language: string;
    purpose: string;
  }>;
  importantFiles: Array<{ path: string; category: string; description: string }>;
  dependencies: string[];
  relationships: Array<{ from: string; to: string; description: string }>;
  totalFilesCount: number;
}

interface GeneratedQuestion {
  id: string;
  questionNumber: number;
  question: string;
  category: string;
  difficultyLevel: 1 | 2 | 3 | 4;
  difficultyLabel: 'Basic' | 'Intermediate' | 'Advanced' | 'Project Defense';
  evidenceFiles: string[];
  reasonWhyAsked: string;
  codeSnippet?: {
    filePath: string;
    language: string;
    startLine: number;
    endLine: number;
    code: string;
  };
  expectedKeyPoints: string[];
}

interface DetailedAnswerEvaluation {
  overallScore: number;
  technicalCorrectness: number;
  projectUnderstanding: number;
  implementationUnderstanding: number;
  reasoning: number;
  codeMatch: number;
  strengths: string[];
  weaknesses: string[];
  missingConcepts: string[];
  feedback: string;
  isShallow: boolean;
  needsFollowUp: boolean;
  followUpQuestion?: string;
  contradictionAlert?: {
    hasContradiction: boolean;
    topic: string;
    candidateClaim: string;
    actualRepositoryFact: string;
    politeInquiry: string;
  };
}

interface InterviewSession {
  sessionId: string;
  projectId: string;
  projectName: string;
  repoUrl: string;
  mode: 'QUICK' | 'STANDARD' | 'DEEP_TECHNICAL';
  maxQuestions: number;
  currentQuestionIndex: number;
  currentDifficulty: 1 | 2 | 3 | 4;
  records: Array<{
    question: GeneratedQuestion;
    candidateAnswer?: string;
    evaluation?: DetailedAnswerEvaluation;
    isFollowUp?: boolean;
  }>;
  status: 'IN_PROGRESS' | 'COMPLETED';
  contradictionsDetected: string[];
}

interface FinalReport {
  sessionId: string;
  projectName: string;
  repoUrl: string;
  overallScore: number;
  ownershipConfidence: {
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    confidenceScore: number;
    rationale: string;
    contributionsVerified: string[];
    riskFactors: string[];
  };
  knowledgeDimensions: Array<{
    category: string;
    percentage: number;
    rating: 'Strong' | 'Proficient' | 'Developing' | 'Needs Focus';
  }>;
  strongAreas: string[];
  weakAreas: string[];
  totalQuestions: number;
  answeredConfidently: number;
  requiredFollowUp: number;
  contradictionsDetected: string[];
  recommendedLearning: Array<{
    priority: number;
    topic: string;
    category: string;
    whyPrepare: string;
    studyGuide: string;
    practiceQuestions: string[];
  }>;
  generatedAt: string;
}

const ANALYSIS_PIPELINE_STEPS = [
  "Validating GitHub Repository URL & Structure",
  "Fetching Git Tree, Manifests & Source Code",
  "Sanitizing Sensitive Credentials & Keys",
  "Technology Detection (Languages, Frameworks, DB)",
  "Architecture Analysis & Request Pipeline Mapping",
  "Extracting APIs, Database Models & Code Defense Snippets",
  "Indexing Code Chunks & Assembling Knowledge Graph",
  "Project Knowledge Representation Ready",
];

export default function ProjectInterviewPage() {
  // Workflow Phase: 'input' | 'analyzing' | 'overview' | 'interview' | 'report'
  const [phase, setPhase] = useState<'input' | 'analyzing' | 'overview' | 'interview' | 'report'>('input');

  // Input States
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [inputError, setInputError] = useState<string>('');
  const [sampleRepos, setSampleRepos] = useState<any[]>([]);

  // Pipeline Stepper
  const [pipelineStep, setPipelineStep] = useState<number>(0);

  // Analyzed Repository & Project Knowledge
  const [projectId, setProjectId] = useState<string>('');
  const [projectKnowledge, setProjectKnowledge] = useState<ProjectKnowledge | null>(null);

  // Interview Mode: QUICK (10 Qs), STANDARD (20 Qs), DEEP_TECHNICAL
  const [interviewMode, setInterviewMode] = useState<'QUICK' | 'STANDARD' | 'DEEP_TECHNICAL'>('QUICK');

  // Active Session & Interview State
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [submittingAnswer, setSubmittingAnswer] = useState<boolean>(false);
  const [latestEvaluation, setLatestEvaluation] = useState<DetailedAnswerEvaluation | null>(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState<boolean>(false);
  const [showEvidence, setShowEvidence] = useState<boolean>(false);

  // Voice recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Final Assessment Report
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);

  // Load samples on mount
  useEffect(() => {
    fetch('/api/project-interview/analyze')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.samples)) {
          setSampleRepos(data.samples);
        }
      })
      .catch(() => {});
  }, []);

  // Speech-to-Text handler
  const toggleSpeechToText = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in your browser.");
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setTypedAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
        toast.info("Listening... speak your answer clearly.");
      } catch (err) {
        setIsRecording(false);
      }
    }
  };

  // Run Repository Analysis
  const handleAnalyzeRepo = async (targetUrl?: string, sampleId?: string) => {
    setInputError('');
    const urlToUse = targetUrl || repoUrl;

    if (!sampleId && (!urlToUse || !urlToUse.trim())) {
      setInputError('Please enter a valid GitHub repository URL.');
      return;
    }

    setPhase('analyzing');
    setPipelineStep(0);

    // Animate progress through the pipeline steps
    const stepInterval = setInterval(() => {
      setPipelineStep((prev) => {
        if (prev < ANALYSIS_PIPELINE_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 600);

    try {
      const res = await fetch('/api/project-interview/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleId ? { sampleId } : { repoUrl: urlToUse.trim() }),
      });

      clearInterval(stepInterval);
      setPipelineStep(ANALYSIS_PIPELINE_STEPS.length - 1);

      const data = await res.json();
      if (!data.success || !data.projectKnowledge) {
        throw new Error(data.error || 'Failed to analyze repository');
      }

      setProjectId(data.projectId);
      setProjectKnowledge(data.projectKnowledge);
      setPhase('overview');
      toast.success(`Repository "${data.projectKnowledge.project}" analyzed successfully!`);
    } catch (err: any) {
      clearInterval(stepInterval);
      setPhase('input');
      setInputError(err.message || 'Error analyzing repository. Check URL or try a preset sample repo.');
      toast.error(err.message || 'Analysis failed.');
    }
  };

  // Start Adaptive Interview Session
  const handleStartInterview = async () => {
    if (!projectId || !projectKnowledge) return;

    try {
      toast.loading("Preparing adaptive technical questions grounded in your repository...", { id: 'start_session' });
      const res = await fetch('/api/project-interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          mode: interviewMode,
        }),
      });

      const data = await res.json();
      toast.dismiss('start_session');

      if (!data.success || !data.session) {
        throw new Error(data.error || 'Could not initialize interview session.');
      }

      setSession(data.session);
      setTypedAnswer('');
      setShowEvaluationModal(false);
      setPhase('interview');
      toast.success(`Interview started in ${interviewMode} mode!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start interview.');
    }
  };

  // Submit Answer
  const handleSubmitAnswer = async () => {
    if (!session || !typedAnswer.trim()) {
      toast.warning("Please type or speak your answer before submitting.");
      return;
    }

    setSubmittingAnswer(true);
    try {
      const res = await fetch('/api/project-interview/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          answer: typedAnswer.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success || !data.session) {
        throw new Error(data.error || 'Error submitting answer');
      }

      setSession(data.session);
      setLatestEvaluation(data.evaluation);
      setShowEvaluationModal(true);

      if (data.isCompleted) {
        // Fetch Final Report
        const repRes = await fetch(`/api/project-interview/report?sessionId=${session.sessionId}`);
        const repData = await repRes.json();
        if (repData.success && repData.report) {
          setFinalReport(repData.report);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to evaluate answer.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Move to Next Question
  const handleProceedToNextQuestion = () => {
    setShowEvaluationModal(false);
    setTypedAnswer('');
    setShowEvidence(false);

    if (session?.status === 'COMPLETED') {
      setPhase('report');
    }
  };

  const currentRecord = session?.records[session.currentQuestionIndex];
  const currentQ = currentRecord?.question;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                IT
              </div>
              <span className="font-semibold text-sm sm:text-base tracking-tight">IT Career Hub</span>
            </Link>
            <span className="text-slate-600">/</span>
            <div className="flex items-center gap-2">
              <Github className="w-4 h-4 text-blue-400" />
              <span className="text-xs sm:text-sm font-medium text-slate-200">GitHub Project Defense & Knowledge Assessment</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {phase !== 'input' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPhase('input')}
                className="text-slate-400 hover:text-white text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Analyze New Repo
              </Button>
            )}
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">

        {/* PHASE 1: REPOSITORY URL INPUT SCREEN */}
        {phase === 'input' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Hero Card */}
            <div className="text-center space-y-4 pt-6 pb-2">
              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" />
                Project Technical Ownership Assessment
              </Badge>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                Assess Your Knowledge of Your <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">GitHub Project</span>
              </h1>
              <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                We don't just ask textbook trivia. Our AI analyzes your actual source code, APIs, database schemas, and architecture to conduct an adaptive interview and verify true project ownership.
              </p>
            </div>

            {/* Input Form Card */}
            <Card className="border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Github className="w-5 h-5 text-blue-400" />
                  Enter Public GitHub Repository URL
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs sm:text-sm">
                  The system analyzes manifest dependencies, routes, controllers, database models, and code logic.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="url"
                      placeholder="https://github.com/owner/repository"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeRepo()}
                      className="bg-slate-950 border-slate-700/80 text-white placeholder:text-slate-600 h-12 text-sm pl-4 pr-10 focus-visible:ring-blue-500"
                    />
                    {repoUrl && (
                      <button
                        onClick={() => setRepoUrl('')}
                        className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <Button
                    onClick={() => handleAnalyzeRepo()}
                    className="h-12 px-6 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Analyze Repository
                  </Button>
                </div>

                {inputError && (
                  <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{inputError}</span>
                  </div>
                )}

                {/* Secret redaction guarantee */}
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Security Guaranteed: API keys, tokens, and credentials are automatically scrubbed and redacted.</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick-Load Preset Sample Repositories */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Instant 1-Click Test Repositories (Diverse Tech Stacks)
                </h3>
                <span className="text-xs text-slate-500">No GitHub auth required</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sampleRepos.map((sample) => (
                  <Card
                    key={sample.id}
                    onClick={() => handleAnalyzeRepo(undefined, sample.id)}
                    className="border border-slate-800 hover:border-blue-500/50 bg-slate-900/60 hover:bg-slate-900 transition cursor-pointer p-4 space-y-3 group flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-blue-500/30 text-blue-300 text-[10px] bg-blue-500/5">
                          {sample.primaryLanguage}
                        </Badge>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          ★ {sample.stars}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-white group-hover:text-blue-300 transition line-clamp-1">
                        {sample.name}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {sample.description}
                      </p>
                    </div>
                    <div className="pt-2 flex items-center text-xs text-blue-400 font-medium gap-1 group-hover:translate-x-0.5 transition">
                      <span>Test this architecture</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Value Proposition Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/60 text-slate-400 text-xs">
              <div className="flex items-start gap-2.5">
                <Code2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 block text-sm mb-0.5">Code Defense Questions</strong>
                  Shows your actual function snippets and asks you to defend logic and error handling.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 block text-sm mb-0.5">Technology Agnostic</strong>
                  Detects Next.js, FastAPI, Spring Boot, Django, Flutter, and adapts questions dynamically.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 block text-sm mb-0.5">Contradiction Detection</strong>
                  Flags discrepancies if your answers conflict with what's actually in your repository.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: ANIMATED ANALYSIS PROGRESS */}
        {phase === 'analyzing' && (
          <div className="max-w-2xl mx-auto py-16 space-y-8 animate-in fade-in duration-300 text-center">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
              <div className="relative rounded-full border-4 border-t-blue-500 border-slate-800 w-20 h-20 animate-spin flex items-center justify-center">
                <Github className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Analyzing GitHub Repository
              </h2>
              <p className="text-sm text-slate-400">
                Inspecting manifest files, code structures, routing controllers, and database models...
              </p>
            </div>

            {/* Stepper progress */}
            <Card className="border border-slate-800 bg-slate-900/80 p-6 text-left space-y-3">
              {ANALYSIS_PIPELINE_STEPS.map((stepName, idx) => {
                const isDone = idx < pipelineStep;
                const isCurrent = idx === pipelineStep;
                return (
                  <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                    )}
                    <span className={isDone ? 'text-slate-300' : isCurrent ? 'text-blue-300 font-medium' : 'text-slate-600'}>
                      {stepName}
                    </span>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* PHASE 3: REPOSITORY KNOWLEDGE OVERVIEW & MODE SELECTION */}
        {phase === 'overview' && projectKnowledge && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header / Summary Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                    Analysis Complete
                  </Badge>
                  <span className="text-xs text-slate-500">{projectKnowledge.totalFilesCount} files analyzed</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  <Github className="w-6 h-6 text-blue-400" />
                  {projectKnowledge.project}
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  {projectKnowledge.description}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleStartInterview}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-6 text-base shadow-xl shadow-blue-600/30 flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Start Project Interview
                </Button>
              </div>
            </div>

            {/* Mode Selection */}
            <Card className="border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Select Interview Depth</h3>
                  <p className="text-xs text-slate-400">Choose how deep the adaptive interview should probe your project.</p>
                </div>
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                  Active Mode: {interviewMode}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div
                  onClick={() => setInterviewMode('QUICK')}
                  className={`p-3.5 rounded-lg border cursor-pointer transition ${interviewMode === 'QUICK' ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'}`}
                >
                  <div className="font-semibold text-sm text-white flex items-center justify-between">
                    <span>Quick Assessment</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">10 Questions</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Core project architecture, major technologies, and primary feature flow.</p>
                </div>

                <div
                  onClick={() => setInterviewMode('STANDARD')}
                  className={`p-3.5 rounded-lg border cursor-pointer transition ${interviewMode === 'STANDARD' ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'}`}
                >
                  <div className="font-semibold text-sm text-white flex items-center justify-between">
                    <span>Standard Interview</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">20 Questions</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Full-spectrum interview: code defense, data model design, and error handling.</p>
                </div>

                <div
                  onClick={() => setInterviewMode('DEEP_TECHNICAL')}
                  className={`p-3.5 rounded-lg border cursor-pointer transition ${interviewMode === 'DEEP_TECHNICAL' ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'}`}
                >
                  <div className="font-semibold text-sm text-white flex items-center justify-between">
                    <span>Deep Technical</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">Adaptive Defense</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Scalability at 100k users, failure recovery, security tradeoffs, and refactoring.</p>
                </div>
              </div>
            </Card>

            {/* Grid of Extracted Tech & Architecture */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Stack & Architecture */}
              <div className="lg:col-span-2 space-y-6">
                {/* Detected Tech Stack Card */}
                <Card className="border border-slate-800 bg-slate-900/80 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-blue-400" />
                      Detected Technology Stack
                    </h3>
                    <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/30 text-xs">
                      {projectKnowledge.techStackDetailed.primaryStackLabel}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-1">Languages</span>
                      <div className="flex flex-wrap gap-1">
                        {projectKnowledge.techStackDetailed.languages.map((l) => (
                          <Badge key={l} variant="secondary" className="bg-slate-800 text-slate-200 text-[11px]">{l}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-1">Frontend</span>
                      <div className="flex flex-wrap gap-1">
                        {projectKnowledge.techStackDetailed.frontendFrameworks.length > 0 ? (
                          projectKnowledge.techStackDetailed.frontendFrameworks.map((f) => (
                            <Badge key={f} variant="secondary" className="bg-slate-800 text-slate-200 text-[11px]">{f}</Badge>
                          ))
                        ) : <span className="text-slate-600">N/A</span>}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-1">Backend</span>
                      <div className="flex flex-wrap gap-1">
                        {projectKnowledge.techStackDetailed.backendFrameworks.length > 0 ? (
                          projectKnowledge.techStackDetailed.backendFrameworks.map((b) => (
                            <Badge key={b} variant="secondary" className="bg-slate-800 text-slate-200 text-[11px]">{b}</Badge>
                          ))
                        ) : <span className="text-slate-600">N/A</span>}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-1">Databases & ORM</span>
                      <div className="flex flex-wrap gap-1">
                        {[...projectKnowledge.techStackDetailed.databases, ...projectKnowledge.techStackDetailed.ormOrQueryBuilders].map((d) => (
                          <Badge key={d} variant="secondary" className="bg-slate-800 text-slate-200 text-[11px]">{d}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-1">Authentication</span>
                      <div className="flex flex-wrap gap-1">
                        {projectKnowledge.techStackDetailed.authentication.length > 0 ? (
                          projectKnowledge.techStackDetailed.authentication.map((a) => (
                            <Badge key={a} variant="secondary" className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-[11px]">{a}</Badge>
                          ))
                        ) : <span className="text-slate-600">Standard</span>}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-1">Cloud & DevOps</span>
                      <div className="flex flex-wrap gap-1">
                        {projectKnowledge.techStackDetailed.cloudAndDevOps.length > 0 ? (
                          projectKnowledge.techStackDetailed.cloudAndDevOps.map((c) => (
                            <Badge key={c} variant="secondary" className="bg-slate-800 text-slate-200 text-[11px]">{c}</Badge>
                          ))
                        ) : <span className="text-slate-600">Standard</span>}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Architecture Request Flow Diagram */}
                <Card className="border border-slate-800 bg-slate-900/80 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Network className="w-4 h-4 text-purple-400" />
                      End-to-End Architectural Flow
                    </h3>
                    <span className="text-xs text-slate-400">{projectKnowledge.architecture.pattern}</span>
                  </div>

                  <div className="space-y-2 pt-2">
                    {projectKnowledge.architecture.flowDiagram.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <div className="h-6 w-6 rounded-full bg-blue-900/50 text-blue-300 font-bold flex items-center justify-center text-[10px] shrink-0 border border-blue-500/30">
                          {idx + 1}
                        </div>
                        <div className="flex-1 bg-slate-950 border border-slate-800/80 rounded-lg p-2 text-slate-300 font-mono text-[11px]">
                          {step}
                        </div>
                        {idx < projectKnowledge.architecture.flowDiagram.length - 1 && (
                          <div className="text-slate-600 hidden sm:block">↓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Right Col: Features, APIs, Code Defense Snippets */}
              <div className="space-y-6">
                {/* Detected Features */}
                <Card className="border border-slate-800 bg-slate-900/80 p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Major Features
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {projectKnowledge.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* API & Database Models Discovered */}
                <Card className="border border-slate-800 bg-slate-900/80 p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-400" />
                    APIs & Database Models
                  </h3>
                  <div className="space-y-2 text-xs">
                    <span className="text-slate-500 block">Endpoints:</span>
                    <div className="space-y-1">
                      {projectKnowledge.apis.slice(0, 4).map((api, idx) => (
                        <div key={idx} className="flex items-center gap-2 font-mono text-[11px] text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800/60">
                          <span className={`text-[10px] font-bold ${api.method === 'POST' ? 'text-emerald-400' : api.method === 'GET' ? 'text-blue-400' : 'text-amber-400'}`}>
                            {api.method}
                          </span>
                          <span className="truncate">{api.path}</span>
                        </div>
                      ))}
                    </div>

                    <span className="text-slate-500 block pt-2">Database Models:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {projectKnowledge.databaseModels.map((m, idx) => (
                        <Badge key={idx} variant="outline" className="text-[11px] border-indigo-500/30 text-indigo-300 bg-indigo-950/20">
                          {m.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Code Defense Snippets extracted */}
                {projectKnowledge.codeDefenseSnippets.length > 0 && (
                  <Card className="border border-slate-800 bg-slate-900/80 p-5 space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-emerald-400" />
                      Code Defense Ready
                    </h3>
                    <p className="text-xs text-slate-400">
                      Extracted {projectKnowledge.codeDefenseSnippets.length} source functions to challenge your line-by-line understanding during the interview.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PHASE 4: ADAPTIVE INTERVIEW IN PROGRESS */}
        {phase === 'interview' && session && currentQ && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Top Progress & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Question {currentQ.questionNumber} of {session.maxQuestions}
                </span>
                <Badge
                  className={`text-xs ${
                    currentQ.difficultyLevel === 1
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : currentQ.difficultyLevel === 2
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : currentQ.difficultyLevel === 3
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}
                >
                  Level {currentQ.difficultyLevel} • {currentQ.difficultyLabel}
                </Badge>
                <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                  {currentQ.category}
                </Badge>
                {currentRecord?.isFollowUp && (
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                    Follow-Up Question
                  </Badge>
                )}
              </div>

              <div className="w-full sm:w-48">
                <Progress
                  value={((currentQ.questionNumber - 1) / session.maxQuestions) * 100}
                  className="h-2 bg-slate-800"
                />
              </div>
            </div>

            {/* Question Display Card */}
            <Card className="border border-slate-800 bg-slate-900/90 shadow-2xl p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
                    <Bot className="w-4 h-4" />
                    AI Technical Interviewer
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEvidence(!showEvidence)}
                    className="text-slate-400 hover:text-white text-xs h-7 gap-1"
                  >
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    Why was this question asked?
                    {showEvidence ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                </div>

                <h2 className="text-xl sm:text-2xl font-semibold text-white leading-relaxed">
                  {currentQ.question}
                </h2>
              </div>

              {/* Evidence Reference Drawer */}
              {showEvidence && (
                <div className="p-3.5 bg-blue-950/30 border border-blue-800/40 rounded-lg text-xs space-y-1 text-slate-300 animate-in fade-in duration-200">
                  <p className="font-semibold text-blue-300 flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5" />
                    Evidence Reference from your Repository:
                  </p>
                  <p className="text-slate-300">{currentQ.reasonWhyAsked}</p>
                  <div className="flex flex-wrap gap-1 pt-1 font-mono text-[11px] text-blue-400">
                    {currentQ.evidenceFiles.map((f, i) => (
                      <span key={i} className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CODE DEFENSE SNIPPET BOX (If present in question) */}
              {currentQ.codeSnippet && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 px-3 py-2 rounded-t-lg border border-b-0 border-slate-800">
                    <span className="font-mono text-emerald-400 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4" />
                      {currentQ.codeSnippet.filePath} (lines {currentQ.codeSnippet.startLine}-{currentQ.codeSnippet.endLine})
                    </span>
                    <Badge variant="outline" className="border-slate-800 text-[10px] uppercase text-slate-400">
                      {currentQ.codeSnippet.language}
                    </Badge>
                  </div>
                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-b-lg overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed max-h-72">
                    <code>{currentQ.codeSnippet.code}</code>
                  </pre>
                </div>
              )}
            </Card>

            {/* Answer Submission Card */}
            <Card className="border border-slate-800 bg-slate-900/90 shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  Your Technical Explanation & Defense
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    onClick={toggleSpeechToText}
                    className="h-8 text-xs gap-1.5 border-slate-700 bg-slate-950"
                  >
                    {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-blue-400" />}
                    {isRecording ? "Stop Dictation" : "Voice Answer"}
                  </Button>
                  {typedAnswer && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTypedAnswer('')}
                      className="text-slate-500 hover:text-slate-300 text-xs h-8"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <Textarea
                rows={6}
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="Explain the technical mechanics, architecture flow, and rationale based on your code..."
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500 text-sm leading-relaxed"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <span className="text-xs text-slate-500">
                  {typedAnswer.trim().split(/\s+/).filter(Boolean).length} words • Evaluated against repository truth
                </span>
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={submittingAnswer || !typedAnswer.trim()}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 h-11 gap-2 shadow-lg shadow-blue-600/30"
                >
                  {submittingAnswer ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Evaluating against Repository...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Answer
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* EVALUATION FEEDBACK MODAL / INLINE DRAWER */}
        <Dialog open={showEvaluationModal} onOpenChange={setShowEvaluationModal}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                  Answer Evaluation
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Score:</span>
                  <span className={`text-xl font-bold ${
                    (latestEvaluation?.overallScore || 0) >= 75
                      ? 'text-emerald-400'
                      : (latestEvaluation?.overallScore || 0) >= 55
                      ? 'text-blue-400'
                      : 'text-amber-400'
                  }`}>
                    {latestEvaluation?.overallScore || 0}/100
                  </span>
                </div>
              </div>
              <DialogTitle className="text-lg font-bold text-white">
                Technical Feedback
              </DialogTitle>
            </DialogHeader>

            {/* Contradiction Warning Alert */}
            {latestEvaluation?.contradictionAlert?.hasContradiction && (
              <div className="p-4 bg-amber-950/40 border border-amber-600/60 rounded-lg text-amber-200 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Repository Discrepancy Detected
                </div>
                <p className="text-amber-200/90 leading-relaxed">
                  {latestEvaluation.contradictionAlert.politeInquiry}
                </p>
                <div className="text-[11px] text-amber-400/80 pt-1">
                  Claimed: <span className="underline">{latestEvaluation.contradictionAlert.candidateClaim}</span> vs Repository Reality: <span className="font-mono text-white">{latestEvaluation.contradictionAlert.actualRepositoryFact}</span>
                </div>
              </div>
            )}

            {/* Evaluation Breakdown Metrics */}
            <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Correctness</span>
                <strong className="text-white text-sm">{latestEvaluation?.technicalCorrectness || 0}%</strong>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Project Depth</span>
                <strong className="text-white text-sm">{latestEvaluation?.projectUnderstanding || 0}%</strong>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Code Match</span>
                <strong className="text-white text-sm">{latestEvaluation?.codeMatch || 0}%</strong>
              </div>
            </div>

            {/* Coach Feedback Text */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-400">Interviewer Assessment:</span>
              <p className="text-sm text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed">
                {latestEvaluation?.feedback}
              </p>
            </div>

            {/* Strengths & Missing Concepts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                </span>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {latestEvaluation?.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              {latestEvaluation?.missingConcepts && latestEvaluation.missingConcepts.length > 0 && (
                <div className="space-y-1">
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" /> Missing Concepts
                  </span>
                  <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                    {latestEvaluation.missingConcepts.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Next Action Button */}
            <Button
              onClick={handleProceedToNextQuestion}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium h-11 mt-2"
            >
              {session?.status === 'COMPLETED' ? "View Final Assessment Report" : "Proceed to Next Question →"}
            </Button>
          </DialogContent>
        </Dialog>

        {/* PHASE 5: FINAL PROJECT KNOWLEDGE ASSESSMENT REPORT */}
        {phase === 'report' && finalReport && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header / Score Banner */}
            <Card className="border border-slate-800 bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center sm:text-left">
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                    Project Knowledge Assessment Report
                  </Badge>
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
                    {finalReport.projectName}
                  </h1>
                  <p className="text-xs text-slate-400">
                    Conducted on {new Date(finalReport.generatedAt).toLocaleDateString()} • {finalReport.totalQuestions} Questions Evaluated
                  </p>
                </div>

                {/* Big Score Ring */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-4xl sm:text-5xl font-extrabold text-blue-400 tracking-tight">
                      {finalReport.overallScore}%
                    </div>
                    <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Overall Score</span>
                  </div>

                  <div className="text-center border-l border-slate-800 pl-6">
                    <Badge
                      className={`text-sm px-3 py-1 font-bold ${
                        finalReport.ownershipConfidence.level === 'HIGH'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : finalReport.ownershipConfidence.level === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-red-500/20 text-red-300 border-red-500/40'
                      }`}
                    >
                      {finalReport.ownershipConfidence.level} CONFIDENCE
                    </Badge>
                    <span className="text-xs text-slate-400 block mt-1">Ownership Trust</span>
                  </div>
                </div>
              </div>

              {/* Ownership Confidence Rationale Box */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1.5 text-xs">
                <strong className="text-slate-200 block text-sm">Ownership Assessment Rationale:</strong>
                <p className="text-slate-300 leading-relaxed">
                  {finalReport.ownershipConfidence.rationale}
                </p>
                {finalReport.contradictionsDetected.length > 0 && (
                  <div className="pt-1 text-amber-400 font-medium">
                    ⚠️ {finalReport.contradictionsDetected.length} contradiction(s) noted during technical defense.
                  </div>
                )}
              </div>
            </Card>

            {/* 10-DIMENSIONAL KNOWLEDGE MAP */}
            <Card className="border border-slate-800 bg-slate-900/80 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-blue-400" />
                    Multi-Dimensional Knowledge Map
                  </h3>
                  <p className="text-xs text-slate-400">
                    Breakdown of technical understanding across 10 architectural competencies.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {finalReport.knowledgeDimensions.map((dim, idx) => (
                  <div key={idx} className="space-y-1.5 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{dim.category}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          dim.rating === 'Strong'
                            ? 'bg-emerald-950 text-emerald-400'
                            : dim.rating === 'Proficient'
                            ? 'bg-blue-950 text-blue-400'
                            : dim.rating === 'Developing'
                            ? 'bg-amber-950 text-amber-400'
                            : 'bg-red-950 text-red-400'
                        }`}>
                          {dim.rating}
                        </span>
                        <span className="font-mono text-slate-400 font-bold">{dim.percentage}%</span>
                      </div>
                    </div>
                    <Progress value={dim.percentage} className="h-1.5 bg-slate-800" />
                  </div>
                ))}
              </div>
            </Card>

            {/* Strong vs Weak Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-slate-800 bg-slate-900/80 p-6 space-y-3">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Strong Competency Areas
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {finalReport.strongAreas.map((area, idx) => (
                    <li key={idx} className="flex items-center gap-2 bg-slate-950 p-2.5 rounded border border-slate-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="border border-slate-800 bg-slate-900/80 p-6 space-y-3">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Areas Requiring Focus
                </h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  {finalReport.weakAreas.map((area, idx) => (
                    <li key={idx} className="flex items-center gap-2 bg-slate-950 p-2.5 rounded border border-slate-800">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* PERSONALIZED LEARNING ROADMAP */}
            <Card className="border border-slate-800 bg-slate-900/80 p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  Personalized Study Roadmap & Preparation Guide
                </h3>
                <p className="text-xs text-slate-400">
                  Targeted topics derived directly from weak areas identified during your project interview.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {finalReport.recommendedLearning.map((topic) => (
                  <div
                    key={topic.priority}
                    className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-600 text-white text-xs font-bold">
                          Priority {topic.priority}
                        </Badge>
                        <h4 className="font-semibold text-sm text-white">{topic.topic}</h4>
                      </div>
                      <Badge variant="outline" className="border-slate-800 text-[11px] text-slate-400">
                        {topic.category}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-400">
                      <strong className="text-slate-300">Why prepare:</strong> {topic.whyPrepare}
                    </p>

                    <p className="text-xs text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800/80">
                      <strong className="text-blue-400">Study Guide:</strong> {topic.studyGuide}
                    </p>

                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Sample Technical Questions to Practice:
                      </span>
                      <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                        {topic.practiceQuestions.map((q, idx) => (
                          <li key={idx} className="italic text-slate-300">"{q}"</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => setPhase('input')}
                className="w-full sm:w-auto border-slate-700 bg-slate-900 hover:bg-slate-800 text-white"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Analyze Another Repository
              </Button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  onClick={handleStartInterview}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retake Interview (Higher Difficulty)
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
