import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import {
  cleanExtractedText,
  validateCleanedText,
  getCleaningStats,
} from "@/lib/text-cleaner";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (file.name.endsWith(".pdf")) {
      text = await parsePDF(buffer);
    } else if (file.name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (file.name.endsWith(".txt")) {
      text = buffer.toString("utf8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please use PDF, DOCX, or TXT." },
        { status: 400 }
      );
    }

    let cleanedText = text;
    try {
      const cleaningResult = cleanExtractedText(text, {
        preserveFormatting: true,
        aggressiveCleaning: false,
        removeSpecialChars: false,
        fixCommonIssues: true,
      });

      cleanedText = cleaningResult.cleanedText;

      console.log("Text cleaning completed:", {
        originalLength: text.length,
        cleanedLength: cleanedText.length,
        issuesFixed: cleaningResult.issuesFixed,
      });
    } catch (cleaningError) {
      console.warn("Text cleaning failed, using original text:", cleaningError);
      cleanedText = text;
    }

    return NextResponse.json({
      text: cleanedText,
    });
  } catch (error) {
    console.error("File parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse file" },
      { status: 500 }
    );
  }
}

async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const data = await pdfParse.default(buffer);

    if (!data.text || data.text.trim().length < 50) {
      throw new Error(
        "PDF text extraction failed or produced insufficient content"
      );
    }

    return data.text;
  } catch (error) {
    console.error("PDF parsing error:", error);
    return "PDF parsing encountered issues. For best results, please:\n\n1. Convert your PDF to DOCX format\n2. Copy-paste the text directly\n3. Ensure the PDF contains selectable text (not just images)\n\nThis will ensure accurate resume parsing and better ATS scoring.";
  }
}
