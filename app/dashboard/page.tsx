"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Upload,
  FileText,
  Zap,
  BarChart3,
  CheckCircle,
  XCircle,
  Download,
  LogOut,
  User as UserIcon,
  History,
  AlertTriangle,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import BulletDiff from "@/components/BulletDiff";
import ResumeHistory from "@/components/ResumeHistory";
import { calculateATSScore, type ATSScoreResult } from "@/lib/ats-scoring";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface TailoredContent {
  summary: string;
  skills: string[];
  experience: Array<{
    original: string;
    rewritten: string;
    reason: string;
  }>;
  ats_keywords: string[];
  cover_letter_md: string;
  validation?: {
    hasHallucinatedTech: boolean;
    hallucinatedTechnologies: string[];
    message: string;
  };
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [tailoredContent, setTailoredContent] =
    useState<TailoredContent | null>(null);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [acceptedBullets, setAcceptedBullets] = useState<Set<number>>(
    new Set()
  );
  const [resumeCount, setResumeCount] = useState(0);
  const [currentResumeSaved, setCurrentResumeSaved] = useState(false);
  const [metrics, setMetrics] = useState({
    totalResumes: 0,
    totalJobPosts: 0,
    totalTailorings: 0,
    averageATSScore: 0,
    topSkills: [] as string[],
    recentActivity: [] as Array<{
      type: "resume" | "job_post" | "tailoring";
      title: string;
      date: string;
      score?: number;
    }>,
    monthlyStats: {
      resumes: 0,
      jobPosts: 0,
      tailorings: 0,
    },
  });
  const [metricsLoading, setMetricsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      setLoading(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        router.push("/");
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const updateResumeCount = (count: number) => {
    setResumeCount(count);
  };

  const fetchMetrics = async () => {
    if (!user) return;

    setMetricsLoading(true);
    try {
      // Fetch total counts
      const [resumesRes, jobPostsRes, tailoringsRes] = await Promise.all([
        supabase
          .from("resumes")
          .select("id, created_at, title")
          .eq("user_id", user.id),
        supabase
          .from("job_posts")
          .select("id, created_at, company, title")
          .eq("user_id", user.id),
        supabase
          .from("tailorings")
          .select("id, ats_score, created_at")
          .eq("user_id", user.id),
      ]);

      const totalResumes = resumesRes.data?.length || 0;
      const totalJobPosts = jobPostsRes.data?.length || 0;
      const totalTailorings = tailoringsRes.data?.length || 0;

      // Calculate average ATS score
      const validScores =
        tailoringsRes.data
          ?.filter((t) => t.ats_score !== null)
          .map((t) => t.ats_score) || [];
      const averageATSScore =
        validScores.length > 0
          ? Math.round(
              validScores.reduce((a, b) => a + b, 0) / validScores.length
            )
          : 0;

      // Get recent activity (last 5 items) with more details
      const allActivity = [
        ...(resumesRes.data?.map((r) => ({
          type: "resume" as const,
          title: r.title || "Resume Upload",
          date: new Date(r.created_at).toLocaleDateString(),
        })) || []),
        ...(jobPostsRes.data?.map((j) => ({
          type: "job_post" as const,
          title: j.company ? `${j.company} - ${j.title}` : "Job Description",
          date: new Date(j.created_at).toLocaleDateString(),
        })) || []),
        ...(tailoringsRes.data?.map((t) => ({
          type: "tailoring" as const,
          title: "AI Tailoring",
          date: new Date(t.created_at).toLocaleDateString(),
          score: t.ats_score,
        })) || []),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Get monthly stats (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyStats = {
        resumes:
          resumesRes.data?.filter((r) => {
            const date = new Date(r.created_at);
            return (
              date.getMonth() === currentMonth &&
              date.getFullYear() === currentYear
            );
          }).length || 0,
        jobPosts:
          jobPostsRes.data?.filter((j) => {
            const date = new Date(j.created_at);
            return (
              date.getMonth() === currentMonth &&
              date.getFullYear() === currentYear
            );
          }).length || 0,
        tailorings:
          tailoringsRes.data?.filter((t) => {
            const date = new Date(t.created_at);
            return (
              date.getMonth() === currentMonth &&
              date.getFullYear() === currentYear
            );
          }).length || 0,
      };

      // Get top skills from recent tailorings - enhanced version
      const recentTailorings = tailoringsRes.data?.slice(0, 5) || [];
      const allSkills: string[] = [];

      // Add skills based on ATS scores and activity
      if (validScores.length > 0) {
        const avgScore =
          validScores.reduce((a, b) => a + b, 0) / validScores.length;
        if (avgScore >= 80) {
          allSkills.push("Excellent ATS Match", "Strong Keyword Optimization");
        } else if (avgScore >= 60) {
          allSkills.push("Good ATS Match", "Keyword Optimization");
        } else {
          allSkills.push("ATS Improvement Needed", "Keyword Enhancement");
        }
      }

      // Add skills based on activity
      if (totalTailorings > 0) {
        allSkills.push("AI-Powered Optimization", "Resume Tailoring");
      }
      if (totalResumes > 0) {
        allSkills.push("Resume Management", "Document Processing");
      }
      if (totalJobPosts > 0) {
        allSkills.push("Job Analysis", "Requirement Matching");
      }

      const topSkills = [...new Set(allSkills)].slice(0, 6);

      setMetrics({
        totalResumes,
        totalJobPosts,
        totalTailorings,
        averageATSScore,
        topSkills,
        recentActivity: allActivity,
        monthlyStats,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleResumeTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setResumeText(e.target.value);
    setCurrentResumeSaved(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setCurrentResumeSaved(false);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to parse resume");
      }

      const { text } = await response.json();
      setResumeText(text);
      toast.success("Resume parsed successfully!");
    } catch (error) {
      toast.error("Failed to parse resume");
      console.error(error);
    } finally {
      setParsing(false);
    }
  };

  const handleSaveResume = async () => {
    if (!resumeText.trim()) {
      toast.error("Please upload and parse a resume first");
      return;
    }

    if (resumeCount >= 5) {
      toast.error(
        "Upload limit reached. Please delete an existing resume before saving a new one."
      );
      return;
    }

    if (currentResumeSaved) {
      toast.error("This resume has already been saved");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("resumes").insert({
        user_id: user!.id,
        title: "My Resume",
        raw_text: resumeText,
        parsed_json: { sections: { summary: "", experience: [], skills: [] } },
      });

      if (error) throw error;
      setCurrentResumeSaved(true);
      toast.success("Resume saved!");
      fetchMetrics(); // Refresh metrics
    } catch (error) {
      toast.error("Failed to save resume");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJD = async () => {
    if (!jdText.trim()) {
      toast.error("Please enter a job description");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("job_posts").insert({
        user_id: user!.id,
        company: "Company",
        title: "Job Title",
        jd_text: jdText,
      });

      if (error) throw error;
      toast.success("Job description saved!");
      fetchMetrics(); // Refresh metrics
    } catch (error) {
      toast.error("Failed to save job description");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleTailorResume = async () => {
    if (!resumeText.trim() || !jdText.trim()) {
      toast.error("Please provide both resume and job description");
      return;
    }

    setTailoring(true);
    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText, userId: user!.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          if (errorData.error === "Upload limit reached") {
            toast.error(errorData.details);
          } else {
            toast.error(errorData.details);
          }
        } else {
          throw new Error(errorData.error || "Failed to tailor resume");
        }
        return;
      }

      const result = await response.json();
      setTailoredContent(result);

      const atsResult = calculateATSScore(resumeText, jdText);
      setAtsScore(atsResult.score);

      // Show validation warning if needed
      if (result.validation?.hasHallucinatedTech) {
        toast.error("⚠️ Technology validation warning - please review changes");
      } else {
        toast.success("Resume tailored successfully!");
      }
    } catch (error) {
      toast.error("Failed to tailor resume");
      console.error(error);
    } finally {
      setTailoring(false);
    }
  };

  const handleAcceptBullet = (index: number) => {
    const newAccepted = new Set(acceptedBullets);
    if (newAccepted.has(index)) {
      newAccepted.delete(index);
    } else {
      newAccepted.add(index);
    }
    setAcceptedBullets(newAccepted);
  };

  const handleSaveTailoring = async () => {
    if (!tailoredContent || !atsScore) {
      toast.error("No tailored content to save");
      return;
    }

    setSaving(true);
    try {
      const { data: resumes } = await supabase
        .from("resumes")
        .select("id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const { data: jobPosts } = await supabase
        .from("job_posts")
        .select("id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!resumes?.[0] || !jobPosts?.[0]) {
        throw new Error("Resume or job post not found");
      }

      const { error } = await supabase.from("tailorings").insert({
        user_id: user!.id,
        resume_id: resumes[0].id,
        job_post_id: jobPosts[0].id,
        ats_score: atsScore,
        tailored_json: tailoredContent,
        cover_letter_md: tailoredContent.cover_letter_md,
      });

      if (error) throw error;
      toast.success("Tailoring saved!");
      fetchMetrics(); // Refresh metrics
    } catch (error) {
      toast.error("Failed to save tailoring");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="bg-white shadow-xl border-0 p-8">
          <CardContent className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 relative">
                <Image
                  src="/logo.png"
                  alt="Tailor.me Logo"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Tailor.me
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <UserIcon className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="border-gray-300 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <Card className="bg-gradient-to-br from-blue-50 via-white to-purple-50 border-0 shadow-xl">
              <CardContent className="pt-8 pb-8">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="w-16 h-16 relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-3 shadow-lg">
                    <Image
                      src="/logo.png"
                      alt="Tailor.me Logo"
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome back, {user?.email?.split("@")[0]}!
                  </h1>
                </div>
                <p className="text-gray-600 text-lg mb-6">
                  Ready to tailor your resume for your next opportunity?
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <Link href="/settings">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      <UserIcon className="w-4 h-4 mr-2" />
                      Account Settings
                    </Button>
                  </Link>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    <span>AI-Powered Resume Tailoring</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Metrics Dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Dashboard Overview
              </h2>
              <Button
                onClick={fetchMetrics}
                disabled={metricsLoading}
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-gray-50"
              >
                {metricsLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Resumes */}
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">
                        Total Resumes
                      </p>
                      {metricsLoading ? (
                        <div className="w-16 h-8 bg-blue-200 rounded animate-pulse"></div>
                      ) : (
                        <p className="text-3xl font-bold text-blue-900">
                          {metrics.totalResumes}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Job Posts */}
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">
                        Job Descriptions
                      </p>
                      {metricsLoading ? (
                        <div className="w-16 h-8 bg-purple-200 rounded animate-pulse"></div>
                      ) : (
                        <p className="text-3xl font-bold text-purple-900">
                          {metrics.totalJobPosts}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Tailorings */}
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">
                        AI Tailorings
                      </p>
                      {metricsLoading ? (
                        <div className="w-16 h-8 bg-green-200 rounded animate-pulse"></div>
                      ) : (
                        <p className="text-3xl font-bold text-green-900">
                          {metrics.totalTailorings}
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Average ATS Score */}
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">
                        Avg ATS Score
                      </p>
                      {metricsLoading ? (
                        <div className="w-16 h-8 bg-orange-200 rounded animate-pulse"></div>
                      ) : (
                        <p className="text-3xl font-bold text-orange-900">
                          {metrics.averageATSScore}%
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Monthly Activity */}
              <Card className="shadow-lg border-0 bg-white">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg text-gray-900">
                      This Month
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Resumes</span>
                      <span className="text-lg font-semibold text-blue-600">
                        {metrics.monthlyStats.resumes}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Job Posts</span>
                      <span className="text-lg font-semibold text-purple-600">
                        {metrics.monthlyStats.jobPosts}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Tailorings</span>
                      <span className="text-lg font-semibold text-green-600">
                        {metrics.monthlyStats.tailorings}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="shadow-lg border-0 bg-white">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <History className="w-4 h-4 text-green-600" />
                    </div>
                    <CardTitle className="text-lg text-gray-900">
                      Recent Activity
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.recentActivity.length > 0 ? (
                      metrics.recentActivity.map((activity, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                activity.type === "resume"
                                  ? "bg-blue-500"
                                  : activity.type === "job_post"
                                  ? "bg-purple-500"
                                  : "bg-green-500"
                              }`}
                            />
                            <span className="text-gray-700">
                              {activity.title}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {activity.score && (
                              <Badge variant="secondary" className="text-xs">
                                {activity.score}%
                              </Badge>
                            )}
                            <span className="text-gray-500 text-xs">
                              {activity.date}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">
                        No recent activity
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Skills */}
              <Card className="shadow-lg border-0 bg-white">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg text-gray-900">
                      Top Skills
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {metrics.topSkills.length > 0 ? (
                      metrics.topSkills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-blue-200"
                        >
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm text-center py-4">
                        No skills data yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Resume History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <History className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-900">
                      Resume History
                    </CardTitle>
                    <CardDescription>
                      Manage and view your saved resumes
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResumeHistory
                  userId={user!.id}
                  onSelectResume={(resumeText) => {
                    setResumeText(resumeText);
                    setCurrentResumeSaved(false);
                    toast.success("Resume loaded from history");
                  }}
                  onViewTailoring={(tailoringId) => {
                    // TODO: Implement view tailoring modal/page
                    toast.success("View tailoring feature coming soon!");
                  }}
                  onResumeCountChange={updateResumeCount}
                  onResumeDeleted={fetchMetrics}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Input Cards */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Resume Upload Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="shadow-lg border-0 bg-white h-full">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900">
                        Resume Upload
                      </CardTitle>
                      <CardDescription>
                        Upload and parse your resume
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resumeCount >= 5 ? (
                    <div className="border-2 border-dashed border-amber-300 rounded-xl p-6 text-center bg-amber-50">
                      <div className="text-amber-600 mb-3">
                        <span className="text-2xl">⚠️</span>
                      </div>
                      <p className="text-amber-800 font-medium mb-2">
                        Upload Limit Reached
                      </p>
                      <p className="text-amber-700 text-sm mb-3">
                        You have reached the maximum of 5 resume uploads.
                      </p>
                      <p className="text-amber-600 text-sm">
                        Please delete an existing resume from your history
                        before uploading a new one.
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="resume-upload"
                      />
                      <label htmlFor="resume-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          PDF, DOCX, or TXT (max 10MB)
                        </p>
                        <p className="text-xs text-blue-600 mt-3 bg-blue-50 px-3 py-1 rounded-full inline-block">
                          💡 Tip: DOCX files parse best
                        </p>
                      </label>
                    </div>
                  )}

                  {parsing && (
                    <div className="flex items-center justify-center space-x-2 text-blue-600 p-4 bg-blue-50 rounded-lg">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Parsing resume...</span>
                    </div>
                  )}

                  {resumeText && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Resume Text
                        </label>
                        <Textarea
                          value={resumeText}
                          onChange={handleResumeTextChange}
                          rows={6}
                          className="w-full resize-none"
                          placeholder="Resume text will appear here..."
                        />
                      </div>
                      {resumeCount >= 5 ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-amber-800 text-sm text-center">
                            Cannot save new resume - upload limit reached.
                            Please delete an existing resume first.
                          </p>
                        </div>
                      ) : (
                        <Button
                          onClick={handleSaveResume}
                          disabled={saving || currentResumeSaved}
                          className={`w-full ${
                            currentResumeSaved
                              ? "bg-green-500 hover:bg-green-600 cursor-not-allowed"
                              : ""
                          }`}
                          size="lg"
                        >
                          {saving
                            ? "Saving..."
                            : currentResumeSaved
                            ? "✓ Resume Saved"
                            : "Save Resume"}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Job Description Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="shadow-lg border-0 bg-white h-full">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900">
                        Job Description
                      </CardTitle>
                      <CardDescription>
                        Paste the job description to tailor against
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Job Description Text
                    </label>
                    <Textarea
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      placeholder="Paste the job description here..."
                      rows={6}
                      className="w-full resize-none"
                    />
                  </div>
                  <Button
                    onClick={handleSaveJD}
                    disabled={saving || !jdText.trim()}
                    className="w-full"
                    size="lg"
                    variant="outline"
                  >
                    {saving ? "Saving..." : "Save Job Description"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Tailor Button */}
          {resumeText && jdText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center"
            >
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-lg">
                <CardContent className="pt-8 pb-8">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Ready to Tailor?
                    </h3>
                  </div>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Your resume and job description are ready. Click below to
                    start AI-powered tailoring.
                  </p>
                  <Button
                    onClick={handleTailorResume}
                    disabled={tailoring}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {tailoring ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Tailoring...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Tailor Resume with AI
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Tailored Results */}
          {tailoredContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="shadow-xl border-0 bg-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl text-gray-900">
                          AI Tailored Results
                        </CardTitle>
                        <CardDescription>
                          Your personalized resume optimization
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* ATS Score */}
                  {atsScore !== null && (
                    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0">
                      <CardContent className="pt-6 pb-6 text-center">
                        <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                          {atsScore}%
                        </div>
                        <div className="text-xl text-gray-700 font-semibold mb-2">
                          ATS Keyword Match
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                          {atsScore >= 80
                            ? "Excellent match!"
                            : atsScore >= 60
                            ? "Good match"
                            : "Needs improvement"}
                        </div>
                        <Progress value={atsScore} className="h-3" />
                      </CardContent>
                    </Card>
                  )}

                  {/* Technology Validation Warning */}
                  {tailoredContent.validation &&
                    tailoredContent.validation.hasHallucinatedTech && (
                      <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="pt-6">
                          <div className="flex items-start space-x-3">
                            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-amber-800 mb-3">
                                ⚠️ Technology Validation Warning
                              </h4>
                              <p className="text-amber-700 mb-3">
                                {tailoredContent.validation.message}
                              </p>
                              {tailoredContent.validation
                                .hallucinatedTechnologies.length > 0 && (
                                <div className="bg-white rounded-lg p-4 border border-amber-200">
                                  <p className="text-sm font-medium text-amber-800 mb-3">
                                    Technologies that were not in your original
                                    resume:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {tailoredContent.validation.hallucinatedTechnologies.map(
                                      (tech, index) => (
                                        <Badge
                                          key={index}
                                          variant="outline"
                                          className="bg-amber-100 text-amber-800 border-amber-200"
                                        >
                                          {tech}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Summary */}
                  {tailoredContent.summary && (
                    <Card className="bg-gray-50 border-0">
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <CardTitle className="text-lg text-gray-900">
                            Suggested Summary
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 leading-relaxed text-base">
                          {tailoredContent.summary}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Skills */}
                  {tailoredContent.skills &&
                    tailoredContent.skills.length > 0 && (
                      <Card className="bg-gray-50 border-0">
                        <CardHeader>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <BarChart3 className="w-4 h-4 text-blue-600" />
                            </div>
                            <CardTitle className="text-lg text-gray-900">
                              Key Skills
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-3">
                            {tailoredContent.skills.map((skill, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-0"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Experience with Diffs */}
                  {tailoredContent.experience &&
                    tailoredContent.experience.length > 0 && (
                      <Card className="bg-gray-50 border-0">
                        <CardHeader>
                          <CardTitle className="text-lg text-gray-900">
                            Experience Rewrites
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {tailoredContent.experience.map((item, index) => (
                              <Card
                                key={index}
                                className="bg-white border border-gray-200"
                              >
                                <CardContent className="pt-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <h5 className="text-lg font-medium text-gray-900">
                                      Bullet {index + 1}
                                    </h5>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={acceptedBullets.has(index)}
                                        onChange={() =>
                                          handleAcceptBullet(index)
                                        }
                                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                      />
                                      <span className="text-sm text-gray-700">
                                        Accept rewrite
                                      </span>
                                    </label>
                                  </div>

                                  <div className="space-y-4">
                                    <div>
                                      <h6 className="text-sm font-medium text-gray-500 mb-2">
                                        Original
                                      </h6>
                                      <div className="bg-gray-100 rounded-lg p-4 border-l-4 border-gray-300">
                                        <p className="text-gray-700 leading-relaxed">
                                          {item.original}
                                        </p>
                                      </div>
                                    </div>

                                    <div>
                                      <h6 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                        Rewritten with Changes
                                      </h6>
                                      <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                                        <BulletDiff
                                          original={item.original}
                                          rewritten={item.rewritten}
                                        />
                                      </div>
                                      <div className="mt-3 text-xs text-gray-500 flex items-center space-x-4">
                                        <span className="inline-flex items-center">
                                          <span className="w-3 h-3 bg-green-100 rounded mr-2"></span>
                                          Added content
                                        </span>
                                        <span className="inline-flex items-center">
                                          <span className="w-3 h-3 bg-red-100 rounded mr-2"></span>
                                          Removed content
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                    <h6 className="text-sm font-medium text-blue-800 mb-2">
                                      Why this change?
                                    </h6>
                                    <p className="text-sm text-blue-700">
                                      {item.reason}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Cover Letter */}
                  {tailoredContent.cover_letter_md && (
                    <Card className="bg-gray-50 border-0">
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-purple-600" />
                          </div>
                          <CardTitle className="text-lg text-gray-900">
                            Cover Letter
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Card className="bg-white border border-gray-200">
                          <CardContent className="pt-6">
                            <pre className="whitespace-pre-wrap text-gray-700 font-sans leading-relaxed text-sm">
                              {tailoredContent.cover_letter_md}
                            </pre>
                          </CardContent>
                        </Card>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
