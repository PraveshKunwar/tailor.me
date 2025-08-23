import { GoogleGenAI } from "@google/genai";

export type TailorRequest = {
  resumeText: string;
  jdText: string;
  targetTone?: "concise" | "impactful" | "academic";
};

export async function tailorWithGemini(req: TailorRequest) {
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
