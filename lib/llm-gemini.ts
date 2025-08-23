import { GoogleGenAI } from "@google/genai";

export type TailorRequest = {
  resumeText: string;
  jdText: string;
  targetTone?: "concise" | "impactful" | "academic";
};

export type TailoredContent = {
  summary: string;
  skills: string[];
  experience: Array<{
    original: string;
    rewritten: string;
    reason: string;
  }>;
  ats_keywords: string[];
  cover_letter_md: string;
};

export type ValidationResult = {
  hasHallucinatedTech: boolean;
  hallucinatedTechnologies: string[];
  message: string;
};

export async function tailorWithGemini(
  req: TailorRequest
): Promise<TailoredContent> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const prompt = `You are an expert career coach and technical writer.
Return strict JSON. Improve clarity, quantify impact, and align with JD keywords.

Schema:
{
  "summary": string,
  "skills": string[],
  "experience": [{ "original": string, "rewritten": string, "reason": string }],
  "ats_keywords": string[],
  "cover_letter_md": string
}

JOB DESCRIPTION:
${req.jdText}

RESUME (RAW):
${req.resumeText}

Instructions:
1) Extract top ATS keywords from JD.
2) Rewrite resume bullets to align with JD—keep truthful, quantify impact where reasonable, prefer action verbs.
3) Keep technical stack accurate; do NOT invent tech.
4) Return JSON exactly as schema.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: prompt,
    });
    const content = response.text;

    if (!content) {
      throw new Error("No content generated");
    }

    // Clean up the response to ensure it's valid JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate tailored content");
  }
}

export async function validateTechnologies(
  originalResume: string,
  tailoredContent: TailoredContent
): Promise<ValidationResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const prompt = `You are a technology validation expert. Your task is to verify that NO new technologies were added in the tailored resume that do not exist in the original resume.

ORIGINAL RESUME:
${originalResume}

TAILORED CONTENT:
Summary: ${tailoredContent.summary}
Skills: ${tailoredContent.skills.join(", ")}
Experience: ${tailoredContent.experience.map((e) => e.rewritten).join(" | ")}

Instructions:
1) Extract ALL technologies mentioned in the original resume
2) Extract ALL technologies mentioned in the tailored content
3) Identify any technologies in the tailored content that were NOT in the original resume
4) Return JSON in this exact format:
{
  "hasHallucinatedTech": boolean,
  "hallucinatedTechnologies": string[],
  "message": string
}

If NO new technologies were added, set hasHallucinatedTech to false and hallucinatedTechnologies to empty array.
If new technologies were found, list them specifically and explain why this is problematic.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: prompt,
    });
    const content = response.text;

    if (!content) {
      throw new Error("No validation content generated");
    }

    // Clean up the response to ensure it's valid JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in validation response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Validation API error:", error);
    // Return a safe default that flags for manual review
    return {
      hasHallucinatedTech: true,
      hallucinatedTechnologies: ["Unknown"],
      message: "Validation failed - please review manually for accuracy",
    };
  }
}
