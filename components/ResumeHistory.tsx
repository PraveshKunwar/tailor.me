"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

interface ResumeHistoryItem {
  id: string;
  title: string;
  created_at: string;
  raw_text: string;
  hasTailoring: boolean;
  tailoring?: {
    id: string;
    ats_score: number;
    company: string;
    job_title: string;
    created_at: string;
  };
}

interface ResumeHistoryProps {
  userId: string;
  onSelectResume: (resumeText: string) => void;
  onViewTailoring?: (tailoringId: string) => void;
  onResumeCountChange?: (count: number) => void;
}

export default function ResumeHistory({
  userId,
  onSelectResume,
  onViewTailoring,
  onResumeCountChange,
}: ResumeHistoryProps) {
  const [resumes, setResumes] = useState<ResumeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadResumes();
  }, [userId]);

  const loadResumes = async () => {
    try {
      setLoading(true);

      // Get resumes with their latest tailoring info
      const { data: resumesData, error: resumesError } = await supabase
        .from("resumes")
        .select(
          `
          id,
          title,
          created_at,
          raw_text,
          tailorings (
            id,
            ats_score,
            created_at,
            job_posts (
              company,
              title
            )
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (resumesError) throw resumesError;

      const processedResumes =
        resumesData?.map((resume) => {
          const latestTailoring = resume.tailorings?.[0]; // Get the latest tailoring
          const jobPost = latestTailoring?.job_posts?.[0]; // Get the first job post
          return {
            id: resume.id,
            title: resume.title || "Untitled Resume",
            created_at: resume.created_at,
            raw_text: resume.raw_text,
            hasTailoring: !!latestTailoring,
            tailoring: latestTailoring
              ? {
                  id: latestTailoring.id,
                  ats_score: latestTailoring.ats_score,
                  company: jobPost?.company || "Unknown Company",
                  job_title: jobPost?.title || "Unknown Position",
                  created_at: latestTailoring.created_at,
                }
              : undefined,
          };
        }) || [];

      setResumes(processedResumes);
      if (onResumeCountChange) {
        onResumeCountChange(processedResumes.length);
      }
    } catch (error) {
      console.error("Error loading resumes:", error);
      toast.error("Failed to load resume history");
    } finally {
      setLoading(false);
    }
  };

  const deleteResume = async (resumeId: string) => {
    try {
      setDeleting(resumeId);

      // Delete associated tailorings first
      await supabase.from("tailorings").delete().eq("resume_id", resumeId);

      // Delete the resume
      const { error } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resumeId);

      if (error) throw error;

      toast.success("Resume deleted successfully");
      await loadResumes(); // Reload the list
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast.error("Failed to delete resume");
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading history...</span>
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl text-gray-400">📄</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No resumes yet
        </h3>
        <p className="text-gray-600">
          Upload your first resume to get started with AI tailoring
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Resume History ({resumes.length}/5)
        </h3>
        <div className="text-sm text-gray-500">
          {resumes.length === 5 && (
            <span className="text-amber-600 font-medium">
              Upload limit reached
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {resumes.map((resume, index) => (
          <motion.div
            key={resume.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="mb-3">
                  <h4 className="text-lg font-semibold text-gray-900 truncate">
                    {resume.title}
                  </h4>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                    {formatDate(resume.created_at)}
                  </span>
                  <span className="flex items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                    {formatTime(resume.created_at)}
                  </span>
                </div>

                {resume.hasTailoring && resume.tailoring && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-green-800">
                          Tailored for {resume.tailoring.company}
                        </p>
                        <p className="text-xs text-green-700">
                          {resume.tailoring.job_title} •{" "}
                          {formatDate(resume.tailoring.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {resume.tailoring.ats_score}%
                        </div>
                        <div className="text-xs text-green-600 font-medium">
                          ATS Score
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-2 ml-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectResume(resume.raw_text)}
                  className="btn-primary btn-sm btn-full"
                  title="Use this resume"
                >
                  Use Resume
                </motion.button>

                {resume.hasTailoring && resume.tailoring && onViewTailoring && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onViewTailoring(resume.tailoring!.id)}
                    className="btn-success btn-sm btn-full"
                    title="View tailoring results"
                  >
                    View Results
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => deleteResume(resume.id)}
                  disabled={deleting === resume.id}
                  className="btn-danger btn-sm btn-full"
                  title="Delete resume"
                >
                  {deleting === resume.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                  ) : (
                    "Delete"
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
