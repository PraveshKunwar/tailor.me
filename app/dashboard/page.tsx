"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { toast } from "react-hot-toast";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
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

    // Listen for auth changes
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Resume Tailor AI
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Resume Upload Panel */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Resume Upload
              </h3>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {parsing && <p className="text-sm text-gray-600">Parsing...</p>}
                {resumeText && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Extracted Text:
                    </label>
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      rows={8}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <button
                      onClick={handleSaveResume}
                      disabled={saving}
                      className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Resume"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Job Description Panel */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Job Description
              </h3>
              <div className="space-y-4">
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={8}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <button
                  onClick={handleSaveJD}
                  disabled={saving || !jdText.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save JD"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
