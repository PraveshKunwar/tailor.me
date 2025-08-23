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
} from "lucide-react";
import BulletDiff from "@/components/BulletDiff";
import ResumeHistory from "@/components/ResumeHistory";
import { calculateATSScore, type ATSScoreResult } from "@/lib/ats-scoring";

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const updateResumeCount = (count: number) => {
    setResumeCount(count);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
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

    setSaving(true);
    try {
      const { error } = await supabase.from("resumes").insert({
        user_id: user!.id,
        title: "My Resume",
        raw_text: resumeText,
        parsed_json: { sections: { summary: "", experience: [], skills: [] } },
      });

      if (error) throw error;
      toast.success("Resume saved!");
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
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
              <span className="text-xl font-bold text-gray-900">Tailor.me</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{user?.email}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSignOut}
                className="btn-primary btn-sm"
              >
                Sign out
              </motion.button>
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
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-12 h-12 relative">
                <Image
                  src="/logo.png"
                  alt="Tailor.me Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.email?.split("@")[0]}!
              </h1>
            </div>
            <p className="text-gray-600">
              Ready to tailor your resume for your next opportunity?
            </p>
            <div className="mt-4">
              <Link
                href="/settings"
                className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                ⚙️ Account Settings
              </Link>
            </div>
          </motion.div>

          {/* Resume History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Resume History
              </h3>
            </div>

            <ResumeHistory
              userId={user!.id}
              onSelectResume={(resumeText) => {
                setResumeText(resumeText);
                toast.success("Resume loaded from history");
              }}
              onViewTailoring={(tailoringId) => {
                // TODO: Implement view tailoring modal/page
                toast.success("View tailoring feature coming soon!");
              }}
              onResumeCountChange={updateResumeCount}
            />
          </motion.div>

          {/* Input Cards */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Resume Upload Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Resume Upload
                </h3>
              </div>

              <div className="space-y-4">
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
                      Please delete an existing resume from your history before
                      uploading a new one.
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label htmlFor="resume-upload" className="cursor-pointer">
                      <p className="text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF, DOCX, or TXT (max 10MB)
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        💡 Tip: DOCX files parse best. PDFs work but may have
                        formatting issues.
                      </p>
                    </label>
                  </div>
                )}

                {parsing && (
                  <div className="flex items-center justify-center space-x-2 text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Parsing resume...</span>
                  </div>
                )}

                {resumeText && (
                  <div className="space-y-4">
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      rows={6}
                      className="w-full rounded-xl border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Resume text will appear here..."
                    />
                    {resumeCount >= 5 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-amber-800 text-sm text-center">
                          Cannot save new resume - upload limit reached. Please
                          delete an existing resume first.
                        </p>
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveResume}
                        disabled={saving}
                        className="btn-primary btn-full"
                      >
                        {saving ? "Saving..." : "Save Resume"}
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Job Description Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center space-x-3 mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Job Description
                </h3>
              </div>

              <div className="space-y-4">
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={6}
                  className="w-full rounded-xl border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveJD}
                  disabled={saving || !jdText.trim()}
                  className="btn-primary btn-full"
                >
                  {saving ? "Saving..." : "Save Job Description"}
                </motion.button>
              </div>
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
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleTailorResume}
                disabled={tailoring}
                className="btn-primary btn-lg"
              >
                {tailoring ? "Tailoring..." : "Tailor Resume with AI"}
              </motion.button>
            </motion.div>
          )}

          {/* Tailored Results */}
          {tailoredContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">
                  AI Tailored Results
                </h3>
                <div className="flex items-center space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary btn-sm"
                  >
                    Export
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveTailoring}
                    disabled={saving}
                    className="btn-primary btn-sm"
                  >
                    {saving ? "Saving..." : "Save All"}
                  </motion.button>
                </div>
              </div>

              <div className="space-y-8">
                {/* ATS Score */}
                {atsScore !== null && (
                  <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
                    <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      {atsScore}%
                    </div>
                    <div className="text-lg text-gray-700 font-medium">
                      ATS Keyword Match
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      {atsScore >= 80
                        ? "Excellent match!"
                        : atsScore >= 60
                        ? "Good match"
                        : "Needs improvement"}
                    </div>
                  </div>
                )}

                {/* Technology Validation Warning */}
                {tailoredContent.validation &&
                  tailoredContent.validation.hasHallucinatedTech && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-amber-800 mb-2">
                            ⚠️ Technology Validation Warning
                          </h4>
                          <p className="text-sm text-amber-700 mb-2">
                            {tailoredContent.validation.message}
                          </p>
                          {tailoredContent.validation.hallucinatedTechnologies
                            .length > 0 && (
                            <div className="bg-white rounded-lg p-3 border border-amber-200">
                              <p className="text-xs font-medium text-amber-800 mb-2">
                                Technologies that were not in your original
                                resume:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {tailoredContent.validation.hallucinatedTechnologies.map(
                                  (tech, index) => (
                                    <span
                                      key={index}
                                      className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium"
                                    >
                                      {tech}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {/* Summary */}
                {tailoredContent.summary && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      Suggested Summary
                    </h4>
                    <p className="text-gray-700 leading-relaxed">
                      {tailoredContent.summary}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {tailoredContent.skills &&
                  tailoredContent.skills.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <BarChart3 className="w-5 h-5 text-blue-500 mr-2" />
                        Key Skills
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {tailoredContent.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Experience with Diffs */}
                {tailoredContent.experience &&
                  tailoredContent.experience.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-6">
                        Experience Rewrites
                      </h4>
                      <div className="space-y-6">
                        {tailoredContent.experience.map((item, index) => (
                          <div
                            key={index}
                            className="bg-white rounded-xl p-6 border border-gray-200"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-lg font-medium text-gray-900">
                                Bullet {index + 1}
                              </h5>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={acceptedBullets.has(index)}
                                  onChange={() => handleAcceptBullet(index)}
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
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Rewritten with Changes
                                </h6>
                                <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                                  <BulletDiff
                                    original={item.original}
                                    rewritten={item.rewritten}
                                  />
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                  <span className="inline-flex items-center mr-3">
                                    <span className="w-3 h-3 bg-green-100 rounded mr-1"></span>
                                    Added content
                                  </span>
                                  <span className="inline-flex items-center">
                                    <span className="w-3 h-3 bg-red-100 rounded mr-1"></span>
                                    Removed content
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <h6 className="text-sm font-medium text-blue-800 mb-1">
                                Why this change?
                              </h6>
                              <p className="text-sm text-blue-700">
                                {item.reason}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Cover Letter */}
                {tailoredContent.cover_letter_md && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FileText className="w-5 h-5 text-purple-500 mr-2" />
                      Cover Letter
                    </h4>
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <pre className="whitespace-pre-wrap text-gray-700 font-sans leading-relaxed">
                        {tailoredContent.cover_letter_md}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
