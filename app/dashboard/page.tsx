"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
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
} from "lucide-react";
import BulletDiff from "@/components/BulletDiff";

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
        router.push("/login");
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
        body: JSON.stringify({ resumeText, jdText }),
      });

      if (!response.ok) {
        throw new Error("Failed to tailor resume");
      }

      const result = await response.json();
      setTailoredContent(result);
      setAtsScore(result.atsScore);
      toast.success("Resume tailored successfully!");
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            Loading your dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RT</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ResumeTailor
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <UserIcon className="w-4 h-4" />
                <span>{user?.email}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, {user?.email?.split("@")[0]}!
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Ready to tailor your resume for your next opportunity?
            </p>
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
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Resume Upload
                </h3>
              </div>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label htmlFor="resume-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-300">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      PDF, DOCX, or TXT (max 10MB)
                    </p>
                  </label>
                </div>

                {parsing && (
                  <div className="flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400">
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
                      className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Resume text will appear here..."
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSaveResume}
                      disabled={saving}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      {saving ? "Saving..." : "Save Resume"}
                    </motion.button>
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
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
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
                  className="w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveJD}
                  disabled={saving || !jdText.trim()}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
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
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleTailorResume}
                disabled={tailoring}
                className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl disabled:opacity-50 transition-all duration-300"
              >
                <Zap className="w-5 h-5" />
                <span>
                  {tailoring ? "Tailoring..." : "Tailor Resume with AI"}
                </span>
              </motion.button>
            </motion.div>
          )}

          {/* Tailored Results */}
          {tailoredContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI Tailored Results
                </h3>
                <div className="flex items-center space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2 inline" />
                    Export
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveTailoring}
                    disabled={saving}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {saving ? "Saving..." : "Save All"}
                  </motion.button>
                </div>
              </div>

              <div className="space-y-8">
                {/* ATS Score */}
                {atsScore !== null && (
                  <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                    <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                      {atsScore}%
                    </div>
                    <div className="text-lg text-gray-700 dark:text-gray-200 font-medium">
                      ATS Keyword Match
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      {atsScore >= 80
                        ? "Excellent match!"
                        : atsScore >= 60
                        ? "Good match"
                        : "Needs improvement"}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {tailoredContent.summary && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      Suggested Summary
                    </h4>
                    <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
                      {tailoredContent.summary}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {tailoredContent.skills &&
                  tailoredContent.skills.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <BarChart3 className="w-5 h-5 text-blue-500 mr-2" />
                        Key Skills
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {tailoredContent.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
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
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                        Experience Rewrites
                      </h4>
                      <div className="space-y-6">
                        {tailoredContent.experience.map((item, index) => (
                          <div
                            key={index}
                            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                                Bullet {index + 1}
                              </h5>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={acceptedBullets.has(index)}
                                  onChange={() => handleAcceptBullet(index)}
                                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Accept rewrite
                                </span>
                              </label>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center">
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Original
                                </h6>
                                <p className="text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                                  {item.original}
                                </p>
                              </div>

                              <div>
                                <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Rewritten
                                </h6>
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                  <BulletDiff
                                    original={item.original}
                                    rewritten={item.rewritten}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <h6 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                                Why this change?
                              </h6>
                              <p className="text-sm text-blue-700 dark:text-blue-300">
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
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <FileText className="w-5 h-5 text-purple-500 mr-2" />
                      Cover Letter
                    </h4>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                      <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-200 font-sans leading-relaxed">
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
