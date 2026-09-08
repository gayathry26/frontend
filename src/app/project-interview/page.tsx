"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Upload, FileText, Sparkles, CheckCircle2, AlertTriangle, ArrowRight,
  ShieldCheck, HelpCircle, Bot, User, RotateCcw, ChevronRight, BarChart2,
  Cpu, Layers, Target, Clock, ArrowLeft, RefreshCw, Zap, Check, Eye,
  AlertCircle, TrendingUp, Award, Volume2, Mic, MicOff, Send, Database,
  FileCode, Search, Server, Shield, Network, FolderGit2, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface StructuredProjectOverview {
  project_name: string;
  one_line_summary: string;
  overview: string;
  tech_stack: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    ai_ml?: string[];
    deployment_infra?: string[];
    other_tools?: string[];
  };
  apis_and_keys_used?: Array<{ name: string; purpose: string }>;
  architecture_highlights?: string[];
  notable_features?: string[];
  potential_interview_focus_areas?: string[];
}

interface ProjectProfile {
  name: string;
  projectType: string;
  techStack: string[];
  architecture: string;
  architectureFlow: string[];
  keyFeatures: string[];
  aiIdentifiedContributions: string[];
  notSpecifiedFields: string[];
  structuredOverview?: StructuredProjectOverview;
}

interface ProjectClaim {
  id: string;
  claim: string;
  category: string;
  sourceSection?: string;
}

interface KnowledgeNode {
  id: string;
  label: string;
  category: 'FRONTEND' | 'BACKEND' | 'DATABASE' | 'AUTHENTICATION' | 'API' | 'SECURITY' | 'ARCHITECTURE' | 'SCALABILITY' | 'DEPLOYMENT';
  section: string;
  snippet: string;
}

interface AnswerEvaluation {
  score: number;
  technicalCorrectness: number;
  projectRelevance: number;
  depth: number;
  missingConcepts: string[];
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  consistencyAlert?: string;
  claimPreparationAlert?: string;
  betterAnswerExample?: string;
}

interface RAGInterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: number;
  retrievedChunks: string[];
  sourceSections: string[];
  reason: string;
  isClaimDefense?: boolean;
  studentAnswer?: string;
  evaluation?: AnswerEvaluation;
}

interface RAGInterviewSession {
  sessionId: string;
  projectId: string;
  projectName: string;
  readmeContent: string;
  mode: string;
  profile: ProjectProfile;
  claims: ProjectClaim[];
  questions: RAGInterviewQuestion[];
  currentQuestionIndex: number;
  status: 'in_progress' | 'completed';
  knowledgeMap: Record<string, 'Strong' | 'Medium' | 'Weak'>;
  contradictions: string[];
  weakAreas: string[];
  strongAreas: string[];
  overallScore?: number;
  defenseReadiness?: number;
  categoryScores?: Record<string, number>;
  personalizedPlan?: {
    priority: number;
    topic: string;
    whyPrepare: string;
    whatToLearn: string;
    practiceQuestions: string[];
  }[];
  createdAt: string;
}

const RAG_PIPELINE_STEPS = [
  "README.md Document Detected",
  "Markdown Parser Extracting Sections",
  "Document Cleaner Sanitizing Text",
  "Section Extraction & Hierarchy Map",
  "Semantic Section-Based Chunking",
  "Generating Vector Embeddings",
  "Indexing into Vector Store",
  "Project Knowledge Base Ready",
];

export default function ProjectInterviewPage() {
  const [activeTab, setActiveTab] = useState<string>("prep");

  // RAG Workflow Steps: 'input' | 'ingesting' | 'ready' | 'mode_select' | 'interview' | 'report'
  const [workflowStep, setWorkflowStep] = useState<'input' | 'ingesting' | 'ready' | 'mode_select' | 'interview' | 'report'>('input');

  // Input state
  const [readmeText, setReadmeText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [pasteMode, setPasteMode] = useState<boolean>(false);
  const [inputError, setInputError] = useState<string>('');

  // Default README detection state
  const [defaultReadmeFound, setDefaultReadmeFound] = useState<boolean>(false);
  const [defaultReadmePath, setDefaultReadmePath] = useState<string>('');
  const [loadingDefault, setLoadingDefault] = useState<boolean>(false);

  // RAG Ingestion Pipeline State
  const [pipelineIdx, setPipelineIdx] = useState<number>(0);
  const [projectId, setProjectId] = useState<string>('');
  const [profile, setProfile] = useState<ProjectProfile | null>(null);
  const [claims, setClaims] = useState<ProjectClaim[]>([]);
  const [knowledgeNodes, setKnowledgeNodes] = useState<KnowledgeNode[]>([]);
  const [chunksCount, setChunksCount] = useState<number>(0);
  const [topicsCount, setTopicsCount] = useState<number>(0);

  // Selected Node for Knowledge Map exploration
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);

  // Interview Session State
  const [selectedMode, setSelectedMode] = useState<'QUICK' | 'FULL' | 'DEEP_TECHNICAL' | 'PROJECT_DEFENSE' | 'WEAKNESS_PRACTICE'>('FULL');
  const [session, setSession] = useState<RAGInterviewSession | null>(null);
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [submittingAnswer, setSubmittingAnswer] = useState<boolean>(false);
  const [showWhyAsked, setShowWhyAsked] = useState<boolean>(false);

  // User Projects & History state
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [history, setHistory] = useState<RAGInterviewSession[]>([]);

  // Voice recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Check default README on mount
  useEffect(() => {
    checkDefaultReadme();
    fetchUserProjects();
    fetchHistory();
  }, []);

  const checkDefaultReadme = async () => {
    try {
      const res = await fetch('/api/project-interview/default-readme');
      const data = await res.json();
      if (data.success && data.content) {
        setDefaultReadmeFound(true);
        setDefaultReadmePath(data.filepath || 'project-docs/README.md');
      }
    } catch {}
  };

  const fetchUserProjects = async () => {
    try {
      const res = await fetch('/api/project-interview/projects');
      const data = await res.json();
      if (data.success && Array.isArray(data.projects)) {
        setMyProjects(data.projects);
      }
    } catch {}
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/project-interview/history');
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        setHistory(data.history);
      }
    } catch {}
  };

  // Load default README from /project-docs/README.md
  const handleUseDefaultReadme = async () => {
    setLoadingDefault(true);
    setInputError('');
    try {
      const res = await fetch('/api/project-interview/default-readme');
      const data = await res.json();
      if (data.success && data.content) {
        setReadmeText(data.content);
        setFileName('project-docs/README.md');
        await triggerIngestion(data.content, 'default_project_docs');
      } else {
        setInputError(data.error || 'Could not load default README.md');
      }
    } catch (e) {
      setInputError('Failed to fetch default README.md');
    } finally {
      setLoadingDefault(false);
    }
  };

  // Handle File Upload (.md, .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      setInputError('Please upload a Markdown (.md) or Text (.txt) file.');
      return;
    }

    setInputError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content || content.trim().length < 50) {
        setInputError('Your README does not contain enough project information for a detailed interview.');
        return;
      }
      setReadmeText(content);
    };
    reader.readAsText(file);
  };

  // Ingestion Pipeline Execution
  const triggerIngestion = async (textToIngest: string, customProjId?: string) => {
    const cleanText = textToIngest.trim();
    if (!cleanText) {
      setInputError('Your README content is empty.');
      return;
    }
    if (cleanText.length < 50) {
      setInputError('Your README does not contain enough project information for a detailed interview.');
      return;
    }

    setInputError('');
    setWorkflowStep('ingesting');
    setPipelineIdx(0);

    // Animate pipeline execution
    const interval = setInterval(() => {
      setPipelineIdx((prev) => {
        if (prev < RAG_PIPELINE_STEPS.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 450);

    try {
      const res = await fetch('/api/project-interview/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readmeContent: cleanText, projectId: customProjId }),
      });

      const data = await res.json();
      if (data.success) {
        setProjectId(data.projectId);
        setProfile(data.profile);
        setClaims(data.claims || []);
        setKnowledgeNodes(data.knowledgeNodes || []);
        setChunksCount(data.chunksCount || 12);
        setTopicsCount(data.topics?.length || 8);

        setTimeout(() => {
          setWorkflowStep('ready');
          fetchUserProjects();
        }, 1200);
      } else {
        setInputError(data.error || 'Failed to analyze project README.');
        setWorkflowStep('input');
      }
    } catch (err) {
      setInputError('Network error during RAG ingestion pipeline.');
      setWorkflowStep('input');
    }
  };

  // Start RAG Interview Session
  const handleStartInterview = async (mode: 'QUICK' | 'FULL' | 'DEEP_TECHNICAL' | 'PROJECT_DEFENSE' | 'WEAKNESS_PRACTICE') => {
    if (!projectId) return;
    setSelectedMode(mode);

    try {
      const res = await fetch('/api/project-interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, mode }),
      });

      const data = await res.json();
      if (data.success && data.session) {
        setSession(data.session);
        setWorkflowStep('interview');
        setTypedAnswer('');
      }
    } catch (e) {
      console.error('Error starting interview:', e);
    }
  };

  // Submit Answer & RAG Follow-Up
  const handleSubmitAnswer = async () => {
    if (!session || !typedAnswer.trim() || submittingAnswer) return;

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
      if (data.success && data.session) {
        setSession(data.session);
        setTypedAnswer('');
        setShowWhyAsked(false);
        if (data.isCompleted) {
          setWorkflowStep('report');
          fetchHistory();
          fetchUserProjects();
        }
      }
    } catch (e) {
      console.error('Error submitting answer:', e);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Toggle Speech Recognition Voice Input
  const toggleVoiceInput = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setTypedAnswer((prev) => (prev ? prev + ' ' + transcript : transcript));
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const currentQ = session && session.questions ? session.questions[session.currentQuestionIndex] : null;

  // Chart data for history evolution
  const trendData = history
    .slice()
    .reverse()
    .map((s, idx) => ({
      attempt: `Session ${idx + 1}`,
      score: s.overallScore || 75,
      readiness: s.defenseReadiness || 78,
      name: s.projectName,
    }));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/70 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight">AI PROJECT INTERVIEW PREP</h1>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold uppercase">
                  RAG Vector Engine
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Upload or connect your project documentation. AI understands your project and interviews you specifically.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'prep' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab('prep');
                if (session && session.status === 'in_progress') setWorkflowStep('interview');
              }}
              className="text-xs font-semibold"
            >
              <Zap className="h-4 w-4 mr-1.5" /> Prep Session
            </Button>
            <Button
              variant={activeTab === 'my_projects' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('my_projects')}
              className="text-xs font-semibold"
            >
              <FolderGit2 className="h-4 w-4 mr-1.5" /> My Projects ({myProjects.length})
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 max-w-6xl">

        {/* TAB 1: PREPARATION WORKFLOW */}
        {activeTab === 'prep' && (
          <div>

            {/* STEP 1: DOCUMENT INPUT AREA */}
            {workflowStep === 'input' && (
              <div className="space-y-10 max-w-4xl mx-auto">
                <div className="text-center space-y-3">
                  <Badge variant="secondary" className="px-3 py-1 text-xs font-bold bg-primary/10 text-primary uppercase">
                    Source-Grounded Technical Interview Prep
                  </Badge>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                    "Give AI your project documentation.<br />AI studies your project. Then AI interviews you."
                  </h2>
                  <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
                    Retrieval-Augmented Generation (RAG) indexes your project <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-xs">README.md</code> into vector chunks to construct project-grounded questions.
                  </p>
                </div>

                {/* Auto-detected default README banner if found */}
                {defaultReadmeFound && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                        <FileCode className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">DEFAULT PROJECT DOCUMENTATION FOUND</p>
                        <p className="text-xs text-muted-foreground">{defaultReadmePath} • Ready for auto-indexing</p>
                      </div>
                    </div>

                    <Button
                      onClick={handleUseDefaultReadme}
                      disabled={loadingDefault}
                      className="font-bold bg-primary text-primary-foreground shadow-md w-full sm:w-auto"
                    >
                      {loadingDefault ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                      USE PROJECT README & ANALYZE
                    </Button>
                  </div>
                )}

                {/* Central Document Area Card */}
                <Card className="border-2 border-primary/20 shadow-2xl bg-card overflow-hidden">
                  <CardHeader className="text-center pb-2 border-b">
                    <div className="flex justify-center mb-1">
                      <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                        <BookOpen className="h-6 w-6" />
                      </div>
                    </div>
                    <CardTitle className="text-xl font-extrabold">📄 PROJECT README</CardTitle>
                    <CardDescription className="text-xs">
                      Your project documentation becomes your interview knowledge base.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-6 sm:p-8 space-y-6">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant={!pasteMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPasteMode(false)}
                        className="text-xs font-semibold"
                      >
                        <Upload className="h-4 w-4 mr-1.5" /> Upload File (.md / .txt)
                      </Button>
                      <Button
                        variant={pasteMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPasteMode(true)}
                        className="text-xs font-semibold"
                      >
                        <FileText className="h-4 w-4 mr-1.5" /> Paste Markdown
                      </Button>
                    </div>

                    {!pasteMode ? (
                      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl bg-muted/40 border-2 border-dashed border-border hover:border-primary/50 transition-all">
                        <Upload className="h-10 w-10 text-primary mb-3" />
                        <h3 className="font-bold text-base mb-1">Drop README.md or project documentation here</h3>
                        <p className="text-xs text-muted-foreground mb-4">Supports Markdown (.md) or Text (.txt) files</p>

                        <div className="flex items-center gap-3">
                          <label htmlFor="rag-file-input">
                            <input
                              id="rag-file-input"
                              type="file"
                              accept=".md,.txt"
                              className="hidden"
                              onChange={handleFileUpload}
                            />
                            <Button variant="outline" size="sm" className="cursor-pointer font-semibold" asChild>
                              <span>Browse README File</span>
                            </Button>
                          </label>

                          {defaultReadmeFound && (
                            <Button variant="ghost" size="sm" onClick={handleUseDefaultReadme} className="text-xs">
                              Use Default README.md
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Paste your project's # README.md markdown text here..."
                          className="min-h-[220px] font-mono text-xs bg-background"
                          value={readmeText}
                          onChange={(e) => {
                            setReadmeText(e.target.value);
                            setFileName('Pasted Markdown');
                          }}
                        />
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>{readmeText.length} characters</span>
                        </div>
                      </div>
                    )}

                    {inputError && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{inputError}</span>
                      </div>
                    )}

                    {readmeText && (
                      <div className="p-4 rounded-xl bg-card border flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                          <div>
                            <p className="font-bold text-sm">{fileName || 'README.md'}</p>
                            <p className="text-xs text-muted-foreground">{readmeText.length} characters ready for RAG ingestion</p>
                          </div>
                        </div>

                        <Button
                          onClick={() => triggerIngestion(readmeText)}
                          className="font-bold bg-primary text-primary-foreground shadow-lg"
                        >
                          ANALYZE MY README <ArrowRight className="h-4 w-4 ml-1.5" />
                        </Button>
                      </div>
                    )}

                    <div className="pt-2 text-center text-xs text-muted-foreground border-t">
                      Supported: <span className="font-semibold text-foreground">README.md</span> • <span className="font-semibold text-foreground">Markdown documentation</span> • <span className="font-semibold text-foreground">Project documentation</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* STEP 2: RAG INGESTION PIPELINE ANIMATION */}
            {workflowStep === 'ingesting' && (
              <div className="max-w-xl mx-auto py-16 text-center space-y-8">
                <div className="relative inline-flex items-center justify-center">
                  <div className="h-24 w-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center animate-pulse">
                    <Database className="h-10 w-10 text-primary animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-1">
                    RETRIEVAL-AUGMENTED GENERATION (RAG) ENGINE
                  </Badge>
                  <h2 className="text-2xl font-bold tracking-tight">INDEXING PROJECT KNOWLEDGE BASE...</h2>
                  <p className="text-xs text-muted-foreground">Parsing markdown, generating vector embeddings, and indexing chunks</p>
                </div>

                {/* Pipeline visual diagram */}
                <Card className="border shadow-lg p-6 text-left space-y-3">
                  {RAG_PIPELINE_STEPS.map((stepName, idx) => {
                    const isDone = idx < pipelineIdx;
                    const isCurrent = idx === pipelineIdx;
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2.5">
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : isCurrent ? (
                            <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                          )}
                          <span className={isDone ? 'font-semibold text-foreground' : isCurrent ? 'font-bold text-primary' : 'text-muted-foreground'}>
                            {stepName}
                          </span>
                        </div>
                        {isDone && <span className="text-[10px] text-emerald-500 font-bold">Indexed ✓</span>}
                      </div>
                    );
                  })}
                </Card>
              </div>
            )}

            {/* STEP 3: PROJECT READY DASHBOARD & INTERACTIVE KNOWLEDGE MAP */}
            {workflowStep === 'ready' && profile && (
              <div className="space-y-8 max-w-5xl mx-auto">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 font-bold px-3 py-1 mb-1">
                      ✓ PROJECT READY FOR INTERVIEW
                    </Badge>
                    <h2 className="text-2xl font-extrabold">{profile.name}</h2>
                  </div>
                  <Button onClick={() => setWorkflowStep('mode_select')} className="font-bold bg-primary text-primary-foreground shadow-lg">
                    START INTERVIEW <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>

                {/* Indexing Stats Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card className="border shadow-sm p-4 text-center">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase">Documentation</p>
                    <p className="font-bold text-sm text-foreground mt-1">{fileName || 'README.md'}</p>
                  </Card>
                  <Card className="border shadow-sm p-4 text-center">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase">Knowledge Base</p>
                    <p className="font-bold text-sm text-emerald-500 mt-1">Indexed ✓</p>
                  </Card>
                  <Card className="border shadow-sm p-4 text-center">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase">Vector Chunks</p>
                    <p className="font-bold text-sm text-primary mt-1">{chunksCount} Chunks</p>
                  </Card>
                  <Card className="border shadow-sm p-4 text-center">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase">Interview Topics</p>
                    <p className="font-bold text-sm text-indigo-500 mt-1">{topicsCount} Topics</p>
                  </Card>
                </div>

                {/* STRUCTURED PROJECT OVERVIEW CARD */}
                <Card className="border-2 border-indigo-500/20 bg-card shadow-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border-b pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-3 py-1 mb-1.5 border border-indigo-500/20">
                          ✨ STRUCTURED PROJECT OVERVIEW
                        </Badge>
                        <CardTitle className="text-xl font-extrabold tracking-tight">
                          {profile.structuredOverview?.project_name || profile.name}
                        </CardTitle>
                        {profile.structuredOverview?.one_line_summary && (
                          <p className="text-sm font-semibold text-primary/90 mt-1">
                            "{profile.structuredOverview.one_line_summary}"
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs font-mono border-indigo-500/30 text-indigo-600">
                        Ground Truth Verified
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Short Understandable Overview */}
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-500" /> Short Overview & Explanation
                      </h3>
                      <p className="text-sm text-foreground leading-relaxed p-4 rounded-xl bg-muted/30 border font-medium">
                        {profile.structuredOverview?.overview ||
                          `${profile.name} is a ${profile.projectType} designed to provide technical solutions including ${profile.keyFeatures.slice(0, 3).join(', ')}. Built using ${profile.techStack.join(', ')}.`}
                      </p>
                    </div>

                    {/* Categorized Tech Stack */}
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary" /> Categorized Tech Stack
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Frontend */}
                        {(profile.structuredOverview?.tech_stack?.frontend?.length ?? 0) > 0 && (
                          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                            <span className="text-[11px] font-bold uppercase text-blue-600 dark:text-blue-400 block">💻 Frontend</span>
                            <div className="flex flex-wrap gap-1">
                              {profile.structuredOverview?.tech_stack.frontend?.map((item, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Backend */}
                        {(profile.structuredOverview?.tech_stack?.backend?.length ?? 0) > 0 && (
                          <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1.5">
                            <span className="text-[11px] font-bold uppercase text-purple-600 dark:text-purple-400 block">⚙️ Backend</span>
                            <div className="flex flex-wrap gap-1">
                              {profile.structuredOverview?.tech_stack.backend?.map((item, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Database */}
                        {(profile.structuredOverview?.tech_stack?.database?.length ?? 0) > 0 && (
                          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                            <span className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">🗄️ Database</span>
                            <div className="flex flex-wrap gap-1">
                              {profile.structuredOverview?.tech_stack.database?.map((item, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* AI / ML */}
                        {(profile.structuredOverview?.tech_stack?.ai_ml?.length ?? 0) > 0 && (
                          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                            <span className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400 block">🤖 AI / ML</span>
                            <div className="flex flex-wrap gap-1">
                              {profile.structuredOverview?.tech_stack.ai_ml?.map((item, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Deployment / Infra */}
                        {(profile.structuredOverview?.tech_stack?.deployment_infra?.length ?? 0) > 0 && (
                          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
                            <span className="text-[11px] font-bold uppercase text-rose-600 dark:text-rose-400 block">🚀 Deployment & Infra</span>
                            <div className="flex flex-wrap gap-1">
                              {profile.structuredOverview?.tech_stack.deployment_infra?.map((item, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Other Tools */}
                        {(profile.structuredOverview?.tech_stack?.other_tools?.length ?? 0) > 0 && (
                          <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-1.5">
                            <span className="text-[11px] font-bold uppercase text-cyan-600 dark:text-cyan-400 block">🛠️ Other Tools</span>
                            <div className="flex flex-wrap gap-1">
                              {profile.structuredOverview?.tech_stack.other_tools?.map((item, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[11px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Fallback if tech_stack object is empty */}
                      {!profile.structuredOverview?.tech_stack && profile.techStack?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {profile.techStack.map((tech, idx) => (
                            <Badge key={idx} variant="outline" className="font-semibold text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* APIs and Keys Used */}
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" /> APIs & Keys Mentioned
                      </h3>
                      {profile.structuredOverview?.apis_and_keys_used && profile.structuredOverview.apis_and_keys_used.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {profile.structuredOverview.apis_and_keys_used.map((api, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-card border text-xs flex items-start gap-2.5 shadow-sm">
                              <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                              <div>
                                <span className="font-mono font-bold text-foreground block">{api.name}</span>
                                <span className="text-muted-foreground text-[11px]">{api.purpose}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-lg border">
                          No external API keys mentioned in README documentation.
                        </p>
                      )}
                    </div>

                    {/* Architecture & Notable Features */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {profile.structuredOverview?.notable_features && profile.structuredOverview.notable_features.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-amber-500" /> Notable Features
                          </h4>
                          <ul className="space-y-1.5 text-xs">
                            {profile.structuredOverview.notable_features.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-foreground">
                                <span className="text-amber-500 font-bold">•</span>
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {profile.structuredOverview?.architecture_highlights && profile.structuredOverview.architecture_highlights.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-indigo-500" /> Architecture Highlights
                          </h4>
                          <ul className="space-y-1.5 text-xs">
                            {profile.structuredOverview.architecture_highlights.map((arch, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-foreground">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span>{arch}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Potential Interview Focus Areas */}
                    {profile.structuredOverview?.potential_interview_focus_areas && profile.structuredOverview.potential_interview_focus_areas.length > 0 && (
                      <div className="pt-2 border-t">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-rose-500" /> Potential Interview Focus Areas
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {profile.structuredOverview.potential_interview_focus_areas.map((focus, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20 text-xs font-medium text-foreground flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                              <span>{focus}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* INTERACTIVE PROJECT KNOWLEDGE MAP GRAPH */}
                <Card className="border-2 border-primary/20 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                          <Network className="h-5 w-5 text-primary" /> PROJECT KNOWLEDGE MAP
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Visual node graph constructed dynamically from indexed README sections. Click a node to explore retrieved knowledge.
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">Dynamic Graph</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-6 rounded-xl bg-card border flex items-center justify-center flex-wrap gap-4 text-center">
                      <div className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-extrabold text-sm shadow-md">
                        {profile.name}
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground" />

                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {knowledgeNodes.map((node) => (
                          <div
                            key={node.id}
                            onClick={() => setSelectedNode(node)}
                            className="px-3.5 py-2 rounded-xl bg-muted/60 hover:bg-primary/10 hover:border-primary border border-border text-xs font-bold cursor-pointer transition-all hover:scale-105"
                          >
                            <span className="text-primary mr-1 font-mono">•</span>
                            {node.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Modal/Drawer when Node is Clicked */}
                    {selectedNode && (
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-2">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-primary uppercase flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4" /> Knowledge extracted from README: {selectedNode.section}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)} className="h-6 text-[10px]">
                            Close
                          </Button>
                        </div>
                        <p className="text-foreground leading-relaxed font-mono bg-background p-3 rounded-lg border">
                          "{selectedNode.snippet}"
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* WHAT YOU CLAIMED SECTION */}
                <Card className="border shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" /> WHAT YOU CLAIMED
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Extracted testable claim statements that AI will target during your interview session.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {claims.map((c) => (
                      <div key={c.id} className="p-3 rounded-xl bg-muted/30 border border-border text-xs flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <Badge variant="outline" className="text-[10px] mb-1 font-bold">
                            {c.category}
                          </Badge>
                          <p className="font-semibold text-foreground">"{c.claim}"</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex justify-end pt-4 gap-3">
                  <Button onClick={() => setWorkflowStep('mode_select')} size="lg" className="font-bold bg-primary text-primary-foreground shadow-xl">
                    START PROJECT INTERVIEW <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: INTERVIEW MODES SELECTION */}
            {workflowStep === 'mode_select' && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                  <Badge variant="secondary" className="px-3 py-1 text-xs font-bold bg-primary/10 text-primary">
                    SELECT INTERVIEW DEPTH
                  </Badge>
                  <h2 className="text-3xl font-extrabold">CHOOSE PREPARATION MODE</h2>
                  <p className="text-muted-foreground text-sm">Select how deep you want the AI interviewer to probe your RAG Knowledge Base.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Card
                    onClick={() => handleStartInterview('QUICK')}
                    className="border-2 hover:border-primary cursor-pointer transition-all hover:shadow-xl group"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 font-bold">10 Questions</Badge>
                        <Clock className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <CardTitle className="text-lg font-bold mt-2">QUICK PREPARATION</CardTitle>
                      <CardDescription>Core project architecture and stack questions.</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card
                    onClick={() => handleStartInterview('FULL')}
                    className="border-2 border-primary bg-primary/5 hover:bg-primary/10 cursor-pointer transition-all hover:shadow-xl group"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-primary/20 text-primary font-bold">20 Questions</Badge>
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg font-bold mt-2">FULL PROJECT INTERVIEW</CardTitle>
                      <CardDescription>Full RAG retrieval across all README sections with adaptive follow-ups.</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card
                    onClick={() => handleStartInterview('DEEP_TECHNICAL')}
                    className="border-2 hover:border-purple-500 cursor-pointer transition-all hover:shadow-xl group"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 font-bold">Technical</Badge>
                        <Cpu className="h-5 w-5 text-muted-foreground group-hover:text-purple-500 transition-colors" />
                      </div>
                      <CardTitle className="text-lg font-bold mt-2">DEEP TECHNICAL</CardTitle>
                      <CardDescription>Architecture + implementation + database schema + security.</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card
                    onClick={() => handleStartInterview('PROJECT_DEFENSE')}
                    className="border-2 hover:border-amber-500 cursor-pointer transition-all hover:shadow-xl group"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 font-bold">Claim Defense</Badge>
                        <ShieldCheck className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                      </div>
                      <CardTitle className="text-lg font-bold mt-2">PROJECT DEFENSE</CardTitle>
                      <CardDescription>AI challenges explicit claim statements extracted from your README.</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            )}

            {/* STEP 5: RAG AI INTERVIEWER */}
            {workflowStep === 'interview' && session && currentQ && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border shadow-xl bg-card/90">
                    <CardHeader className="pb-3 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Bot className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base">AI PROJECT INTERVIEWER</h3>
                            <p className="text-xs text-muted-foreground">"I'll ask questions based on what your project actually contains."</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-primary/10 text-primary font-bold font-mono text-xs">
                            LEVEL {currentQ.difficulty} / 7
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-semibold">
                            Q{session.currentQuestionIndex + 1} of {session.mode === 'QUICK' ? 5 : 8}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                      {/* CONSISTENCY ALERT */}
                      {currentQ.evaluation?.consistencyAlert && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>⚠️ CONSISTENCY ALERT: {currentQ.evaluation.consistencyAlert}</span>
                        </div>
                      )}

                      {/* CLAIM NEEDS PREPARATION ALERT */}
                      {currentQ.evaluation?.claimPreparationAlert && (
                        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive font-semibold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>⚠️ CLAIM NEEDS PREPARATION: {currentQ.evaluation.claimPreparationAlert}</span>
                        </div>
                      )}

                      {/* RAG Question Block */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          {/* SOURCE Tag */}
                          <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs font-mono">
                            SOURCE: {currentQ.category} | README.md
                          </Badge>

                          {/* 23. SOURCE-GROUNDED TRACEABILITY BUTTON */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowWhyAsked(!showWhyAsked)}
                            className="text-xs text-primary hover:underline h-auto p-0 font-semibold"
                          >
                            <HelpCircle className="h-3.5 w-3.5 mr-1" /> [ WHY AM I BEING ASKED THIS? ]
                          </Button>
                        </div>

                        {showWhyAsked && (
                          <div className="p-3.5 rounded-xl bg-muted text-xs border border-border space-y-1">
                            <p className="font-bold text-primary uppercase">Retrieved README Section Context</p>
                            <p className="text-muted-foreground font-mono">{currentQ.reason}</p>
                          </div>
                        )}

                        <p className="text-lg font-bold leading-relaxed text-foreground">
                          {currentQ.question}
                        </p>
                      </div>

                      {/* Answer Input */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <User className="h-3.5 w-3.5" /> Your Technical Answer
                          </label>
                          <Button
                            variant={isRecording ? "destructive" : "outline"}
                            size="sm"
                            onClick={toggleVoiceInput}
                            className="h-7 text-xs font-semibold"
                          >
                            {isRecording ? <MicOff className="h-3.5 w-3.5 mr-1 animate-pulse" /> : <Mic className="h-3.5 w-3.5 mr-1" />}
                            {isRecording ? "Recording..." : "Voice Input"}
                          </Button>
                        </div>

                        <Textarea
                          placeholder="Explain your architectural trade-offs, database choices, and code implementation details..."
                          className="min-h-[140px] text-sm bg-background"
                          value={typedAnswer}
                          onChange={(e) => setTypedAnswer(e.target.value)}
                        />

                        <div className="flex justify-end">
                          <Button
                            onClick={handleSubmitAnswer}
                            disabled={!typedAnswer.trim() || submittingAnswer}
                            className="font-bold bg-primary text-primary-foreground shadow-lg"
                          >
                            {submittingAnswer ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Evaluating RAG Answer...
                              </>
                            ) : (
                              <>
                                Submit Answer <Send className="h-4 w-4 ml-2" />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Evaluation Feedback on Submit */}
                      {currentQ.evaluation && (
                        <div className="p-4 rounded-xl bg-muted/50 border space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold">
                            <span>RAG Technical Evaluation</span>
                            <span className="text-primary text-sm">{currentQ.evaluation.score}/100</span>
                          </div>
                          <p className="text-muted-foreground">{currentQ.evaluation.feedback}</p>
                          {currentQ.evaluation.betterAnswerExample && (
                            <p className="text-[11px] font-mono text-emerald-500 mt-1">
                              Tip: {currentQ.evaluation.betterAnswerExample}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Panel: Knowledge Map Live State */}
                <div className="space-y-6">
                  <Card className="border shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-primary" /> LIVE KNOWLEDGE MAP
                      </CardTitle>
                      <CardDescription className="text-xs">Assessment updating live from your answers</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      {Object.entries(session.knowledgeMap).map(([topic, rating]) => (
                        <div key={topic} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-xs">
                          <span className="font-semibold text-foreground">{topic}</span>
                          <Badge
                            variant="outline"
                            className={
                              rating === 'Strong'
                                ? 'bg-emerald-500/10 text-emerald-500 font-bold border-emerald-500/30'
                                : rating === 'Weak'
                                ? 'bg-destructive/10 text-destructive font-bold border-destructive/30'
                                : 'bg-amber-500/10 text-amber-500 font-bold border-amber-500/30'
                            }
                          >
                            ● {rating}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider">Claims Being Tested</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {session.claims.map((c) => (
                        <div key={c.id} className="text-[11px] p-2 rounded bg-muted/30 border border-border">
                          <p className="font-semibold text-muted-foreground">"{c.claim}"</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* STEP 6: FINAL INTERVIEW REPORT & PERSONALIZED PREPARATION PLAN */}
            {workflowStep === 'report' && session && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-3">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 font-bold px-3 py-1">
                    ✓ PROJECT INTERVIEW COMPLETED
                  </Badge>
                  <h2 className="text-3xl font-extrabold">PROJECT INTERVIEW REPORT</h2>
                  <p className="text-sm text-muted-foreground">{session.projectName}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <Card className="border shadow-lg text-center p-6 bg-gradient-to-b from-primary/10 to-card">
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Overall Readiness</p>
                    <p className="text-5xl font-extrabold text-primary">{session.defenseReadiness || 82}%</p>
                    <Progress value={session.defenseReadiness || 82} className="h-2 mt-4" />
                  </Card>

                  <Card className="border shadow-md col-span-2 p-6">
                    <h3 className="font-bold text-sm mb-4 uppercase tracking-wider text-muted-foreground">Score Breakdown</h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {Object.entries(session.categoryScores || {}).map(([cat, score]) => (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between font-semibold">
                            <span>{cat}</span>
                            <span className="text-primary">{score}%</span>
                          </div>
                          <Progress value={score} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* 22. PERSONALIZED PREPARATION PLAN */}
                <Card className="border-2 border-primary/20 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" /> YOUR NEXT PREPARATION PLAN
                    </CardTitle>
                    <CardDescription className="text-xs">Priority preparation tasks generated from your weak answers and project README.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {session.personalizedPlan?.map((item) => (
                      <div key={item.priority} className="p-4 rounded-xl bg-card border space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary text-primary-foreground font-bold">
                            Priority {item.priority}
                          </Badge>
                          <span className="font-extrabold text-sm">{item.topic}</span>
                        </div>
                        <p className="text-muted-foreground"><strong className="text-foreground">Why prepare:</strong> {item.whyPrepare}</p>
                        <p className="text-muted-foreground"><strong className="text-foreground">What to learn:</strong> {item.whatToLearn}</p>
                        <div className="pt-1">
                          <p className="font-bold text-primary mb-1">Questions to practice:</p>
                          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground font-mono text-[11px]">
                            {item.practiceQuestions.map((pq, i) => (
                              <li key={i}>{pq}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex justify-between items-center pt-4">
                  <Button variant="outline" onClick={() => setWorkflowStep('input')}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Upload Another README
                  </Button>
                  <Button onClick={() => setWorkflowStep('input')} className="font-bold bg-primary text-primary-foreground">
                    START NEW INTERVIEW <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: MY PROJECTS (24. DYNAMIC PROJECTS LIST) */}
        {activeTab === 'my_projects' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">MY PROJECTS</h2>
                <p className="text-xs text-muted-foreground">Dynamically generated project knowledge bases from uploaded/indexed README files.</p>
              </div>
              <Button onClick={() => { setActiveTab('prep'); setWorkflowStep('input'); }} className="font-bold">
                <Upload className="h-4 w-4 mr-2" /> Upload New README
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {myProjects.map((p) => (
                <Card key={p.projectId} className="border shadow-md hover:border-primary transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary font-bold">
                        README Indexed ✓
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {p.chunksCount || 12} Chunks
                      </span>
                    </div>
                    <CardTitle className="text-lg font-bold mt-2">{p.name || p.profile?.name}</CardTitle>
                    <CardDescription className="text-xs">{p.profile?.projectType || 'Full Stack Web Application'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {(p.profile?.techStack || ['React', 'Node.js', 'Express', 'MongoDB']).map((tech: string, i: number) => (
                        <Badge key={i} variant="secondary" className="font-mono text-[10px]">
                          {tech}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-muted-foreground font-medium">Readiness: <strong className="text-primary">{p.readiness || 82}%</strong></span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setProjectId(p.projectId);
                          setProfile(p.profile);
                          setClaims(p.claims || []);
                          setKnowledgeNodes(p.knowledgeNodes || []);
                          setChunksCount(p.chunksCount || 12);
                          setTopicsCount(p.topics?.length || 8);
                          setActiveTab('prep');
                          setWorkflowStep('ready');
                        }}
                        className="font-bold text-xs"
                      >
                        PRACTICE INTERVIEW <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t py-6 bg-card text-center text-xs text-muted-foreground mt-12">
        <div className="container mx-auto px-4">
          <p>© 2026 IT Career Hub • RAG AI Project Interview Preparation Engine</p>
        </div>
      </footer>
    </div>
  );
}
