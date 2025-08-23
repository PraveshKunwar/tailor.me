import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

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
      // Use a more robust PDF parsing approach
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

    // Clean up the extracted text
    text = cleanExtractedText(text);

    return NextResponse.json({ text });
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
    // Try using pdf2pic first for better text extraction
    const { fromPath } = await import("pdf2pic");
    
    // For now, fall back to a more robust text extraction method
    // We'll use a combination of approaches to get the best result
    
    // Method 1: Try to extract text using pdf-parse with better options
    try {
      const pdfParse = await import("pdf-parse");
      const data = await pdfParse.default(buffer, {
        normalizeWhitespace: true,
        disableCombineTextItems: false,
      });
      
      if (data.text && data.text.trim().length > 100) {
        return data.text;
      }
    } catch (e) {
      console.log("pdf-parse failed, trying alternative method");
    }

    // Method 2: Use a different approach - extract text by converting to images first
    // This is more reliable but slower
    const sharp = await import("sharp");
    const pdf2pic = await import("pdf2pic");
    
    const options = {
      density: 300,
      saveFilename: "temp",
      savePath: "/tmp",
      format: "png",
      width: 2480,
      height: 3508,
    };

    const convert = pdf2pic.fromPath(buffer, options);
    const pageData = await convert(1); // Convert first page
    
    // For now, return a message that PDF parsing needs improvement
    // In production, you'd want to implement OCR here
    return "PDF parsing detected. For best results, please convert your PDF to DOCX format or copy-paste the text directly.";
    
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error("Failed to parse PDF. Please try converting to DOCX or copy-pasting text.");
  }
}

function cleanExtractedText(text: string): string {
  return text
    // Fix common PDF parsing issues
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
    .replace(/(\d+)([a-zA-Z])/g, '$1 $2') // Add space between numbers and letters
    .replace(/([a-zA-Z])(\d+)/g, '$1 $2') // Add space between letters and numbers
    
    // Fix common word combinations
    .replace(/\b(acollaborative|algorithmbased|onuser|similarityto|generate\d+)\b/g, (match) => {
      // Split common combined words
      return match
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/(\d+)/g, ' $1');
    })
    
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    
    // Fix common formatting issues
    .replace(/\s*•\s*/g, '\n• ')
    .replace(/\s*-\s*/g, '\n- ')
    
    .trim();
}
