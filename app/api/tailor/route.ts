import { NextRequest, NextResponse } from "next/server";
import { tailorWithGemini, validateTechnologies } from "@/lib/llm-gemini";
import { supabase } from "@/lib/supabase";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
const MAX_UPLOADS = 5;

function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return {
      allowed: true,
      remaining: RATE_LIMIT - 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
  }

  if (userLimit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetTime: userLimit.resetTime };
  }

  userLimit.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT - userLimit.count,
    resetTime: userLimit.resetTime,
  };
}

async function checkUploadLimit(
  userId: string
): Promise<{ allowed: boolean; current: number; max: number }> {
  const { count } = await supabase
    .from("resumes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const currentCount = count || 0;
  return {
    allowed: currentCount < MAX_UPLOADS,
    current: currentCount,
    max: MAX_UPLOADS,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeText, jdText, userId } = body || {};

    if (!resumeText || !jdText || !userId) {
      return NextResponse.json(
        { error: "Missing resume text, job description, or user ID" },
        { status: 400 }
      );
    }

    const uploadLimit = await checkUploadLimit(userId);
    if (!uploadLimit.allowed) {
      return NextResponse.json(
        {
          error: "Upload limit reached",
          details: `You have reached the maximum of ${uploadLimit.max} resume uploads. Please delete some old resumes to continue.`,
          current: uploadLimit.current,
          max: uploadLimit.max,
        },
        { status: 429 }
      );
    }

    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      const resetTime = new Date(rateLimit.resetTime).toISOString();
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          details:
            "You have exceeded the limit of 5 tailoring requests per hour.",
          resetTime,
          remaining: rateLimit.remaining,
        },
        { status: 429 }
      );
    }

    const tailoredContent = await tailorWithGemini({ resumeText, jdText });

    const validation = await validateTechnologies(resumeText, tailoredContent);

    return NextResponse.json({
      ...tailoredContent,
      validation,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime,
      },
    });
  } catch (e: unknown) {
    console.error("Tailoring error:", e);
    const errorMessage = e instanceof Error ? e.message : "LLM error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
