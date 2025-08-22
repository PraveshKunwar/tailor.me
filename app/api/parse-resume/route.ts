import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export const runtime = "nodejs"; // ensure Node runtime on Vercel

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  let text = "";
  if (file.name.endsWith(".pdf")) {
    const data = await pdf(buf);
    text = data.text;
  } else if (file.name.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    text = value;
  } else {
    text = buf.toString("utf8"); // .txt fallback
  }

  // naive section split; refine later
  return NextResponse.json({ text });
}
