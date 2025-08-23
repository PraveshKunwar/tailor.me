import { NextRequest, NextResponse } from "next/server";
import { tailorWithGemini } from "@/lib/llm-gemini";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { resumeText, jdText } = body || {};

  if (!resumeText || !jdText) {
    return NextResponse.json(
      { error: "Missing resume text or job description" },
      { status: 400 }
    );
  }

  try {
    const result = await tailorWithGemini({ resumeText, jdText });

    // Compute ATS score based on keyword overlap
    const jdSet = new Set(
      (result.ats_keywords || []).map((s: string) => s.toLowerCase())
    );
    const skillHit = (result.skills || []).filter((s: string) =>
      jdSet.has(s.toLowerCase())
    ).length;
    const atsScore = Math.round((skillHit / Math.max(1, jdSet.size)) * 100);

    return NextResponse.json({ ...result, atsScore });
  } catch (e: any) {
    console.error("Tailoring error:", e);
    return NextResponse.json(
      { error: e.message || "LLM error" },
      { status: 500 }
    );
  }
}
