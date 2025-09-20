export interface CleanTextOptions {
  preserveFormatting?: boolean;
  aggressiveCleaning?: boolean;
  removeSpecialChars?: boolean;
  fixCommonIssues?: boolean;
}

export interface CleanTextResult {
  cleanedText: string;
  originalLength: number;
  cleanedLength: number;
  issuesFixed: string[];
}

export function cleanExtractedText(
  text: string,
  options: CleanTextOptions = {}
): CleanTextResult {
  const {
    preserveFormatting = true,
    aggressiveCleaning = true,
    removeSpecialChars = false,
    fixCommonIssues = true,
  } = options;

  const issuesFixed: string[] = [];
  let cleanedText = text;

  const originalLength = text.length;

  if (fixCommonIssues) {
    cleanedText = fixCommonPDFIssues(cleanedText, issuesFixed);
  }

  cleanedText = cleanWhitespace(cleanedText, preserveFormatting, issuesFixed);

  cleanedText = fixWordBoundaries(cleanedText, issuesFixed);

  if (removeSpecialChars) {
    cleanedText = removeSpecialCharacters(cleanedText, issuesFixed);
  }

  cleanedText = finalCleanup(cleanedText, issuesFixed);

  return {
    cleanedText,
    originalLength,
    cleanedLength: cleanedText.length,
    issuesFixed,
  };
}

function fixCommonPDFIssues(text: string, issuesFixed: string[]): string {
  let cleaned = text;

  const specificFixes = [
    { pattern: /\bacollaborative\b/g, replacement: "a collaborative" },
    { pattern: /\balgorithmbased\b/g, replacement: "algorithm based" },
    { pattern: /\bonuser\b/g, replacement: "on user" },
    { pattern: /\bsimilarityto\b/g, replacement: "similarity to" },
    { pattern: /\bgenerate(\d+)\b/g, replacement: "generate $1" },
  ];

  let fixCount = 0;
  specificFixes.forEach(({ pattern, replacement }) => {
    const before = cleaned;
    cleaned = cleaned.replace(pattern, replacement);
    if (cleaned !== before) {
      fixCount++;
    }
  });

  if (fixCount > 0) {
    issuesFixed.push(`Fixed ${fixCount} specific PDF parsing issues`);
  }

  cleaned = cleaned.replace(
    /\b([a-z]+)([A-Z])([a-z]+)\b/g,
    (match, p1, p2, p3) => {
      if (p1.length > 2 && p3.length > 2) {
        return `${p1} ${p2}${p3}`;
      }
      return match;
    }
  );

  cleaned = cleaned.replace(/\b(\d+)([a-zA-Z]+)\b/g, (match, p1, p2) => {
    if (p2.length > 2) {
      return `${p1} ${p2}`;
    }
    return match;
  });

  return cleaned;
}

function cleanWhitespace(
  text: string,
  preserveFormatting: boolean,
  issuesFixed: string[]
): string {
  let cleaned = text;

  const beforeWhitespace = cleaned.length;
  cleaned = cleaned
    .replace(/\s{3,}/g, " ")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .replace(/\t+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  if (cleaned.length !== beforeWhitespace) {
    issuesFixed.push("Cleaned excessive whitespace");
  }

  return cleaned.trim();
}

function fixWordBoundaries(text: string, issuesFixed: string[]): string {
  let cleaned = text;

  const boundaryFixes = [
    { pattern: /([.!?])([A-Z])/g, replacement: "$1 $2" },
    { pattern: /([,;:])([A-Z])/g, replacement: "$1 $2" },
  ];

  let fixCount = 0;
  boundaryFixes.forEach(({ pattern, replacement }) => {
    const before = cleaned;
    cleaned = cleaned.replace(pattern, replacement);
    if (cleaned !== before) {
      fixCount++;
    }
  });

  if (fixCount > 0) {
    issuesFixed.push(`Fixed ${fixCount} word boundary issues`);
  }

  return cleaned;
}

function removeSpecialCharacters(text: string, issuesFixed: string[]): string {
  let cleaned = text;

  const specialCharFixes = [
    { pattern: /[^\w\s\-.,!?;:()"'&@#$%]/g, replacement: " " },
    { pattern: /[^\x00-\x7F]/g, replacement: " " },
    { pattern: /\s+/g, replacement: " " },
  ];

  let fixCount = 0;
  specialCharFixes.forEach(({ pattern, replacement }) => {
    const before = cleaned;
    cleaned = cleaned.replace(pattern, replacement);
    if (cleaned !== before) {
      fixCount++;
    }
  });

  if (fixCount > 0) {
    issuesFixed.push(`Removed ${fixCount} types of special characters`);
  }

  return cleaned;
}

function fixOCRErrors(text: string, issuesFixed: string[]): string {
  let cleaned = text;

  const ocrFixes = [
    { pattern: /[0O]/g, replacement: "0" },
    { pattern: /[1lI]/g, replacement: "1" },
    { pattern: /[5S]/g, replacement: "5" },
    { pattern: /[8B]/g, replacement: "8" },
    { pattern: /[6G]/g, replacement: "6" },
    { pattern: /[2Z]/g, replacement: "2" },
    { pattern: /[3E]/g, replacement: "3" },
    { pattern: /[4A]/g, replacement: "4" },
    { pattern: /[7T]/g, replacement: "7" },
    { pattern: /[9g]/g, replacement: "9" },
  ];

  let fixCount = 0;
  ocrFixes.forEach(({ pattern, replacement }) => {
    const before = cleaned;
    cleaned = cleaned.replace(pattern, replacement);
    if (cleaned !== before) {
      fixCount++;
    }
  });

  if (fixCount > 0) {
    issuesFixed.push(`Fixed ${fixCount} OCR character errors`);
  }

  return cleaned;
}

function normalizeTextStructure(text: string, issuesFixed: string[]): string {
  let cleaned = text;

  const sectionNormalizations = [
    { pattern: /\b(SUMMARY|PROFILE|OBJECTIVE)\b/gi, replacement: "SUMMARY" },
    {
      pattern: /\b(EXPERIENCE|WORK HISTORY|EMPLOYMENT)\b/gi,
      replacement: "EXPERIENCE",
    },
    { pattern: /\b(EDUCATION|ACADEMIC)\b/gi, replacement: "EDUCATION" },
    {
      pattern: /\b(SKILLS|TECHNICAL SKILLS|CORE SKILLS)\b/gi,
      replacement: "SKILLS",
    },
    { pattern: /\b(PROJECTS|PORTFOLIO)\b/gi, replacement: "PROJECTS" },
    {
      pattern: /\b(CERTIFICATIONS|CERTIFICATES)\b/gi,
      replacement: "CERTIFICATIONS",
    },
    {
      pattern: /\b(AWARDS|ACHIEVEMENTS|ACCOMPLISHMENTS)\b/gi,
      replacement: "AWARDS",
    },
    { pattern: /\b(LANGUAGES|LANGUAGE SKILLS)\b/gi, replacement: "LANGUAGES" },
    { pattern: /\b(REFERENCES|REFERENCE)\b/gi, replacement: "REFERENCES" },
  ];

  let fixCount = 0;
  sectionNormalizations.forEach(({ pattern, replacement }) => {
    const before = cleaned;
    cleaned = cleaned.replace(pattern, replacement);
    if (cleaned !== before) {
      fixCount++;
    }
  });

  if (fixCount > 0) {
    issuesFixed.push(`Normalized ${fixCount} resume sections`);
  }

  return cleaned;
}

function applyAggressiveCleaning(text: string, issuesFixed: string[]): string {
  let cleaned = text;

  cleaned = cleaned
    .replace(/[.]{2,}/g, ".")
    .replace(/[!]{2,}/g, "!")
    .replace(/[?]{2,}/g, "?")
    .replace(/[,]{2,}/g, ",")
    .replace(/[;]{2,}/g, ";")
    .replace(/[:]{2,}/g, ":")
    .replace(/[-]{2,}/g, "-")
    .replace(/[_]{2,}/g, "_")
    .replace(/[=]{2,}/g, "=")
    .replace(/[+]{2,}/g, "+")
    .replace(/[*]{2,}/g, "*")
    .replace(/[#]{2,}/g, "#")
    .replace(/[@]{2,}/g, "@")
    .replace(/[&]{2,}/g, "&")
    .replace(/[%]{2,}/g, "%")
    .replace(/[$]{2,}/g, "$")
    .replace(/[^]{2,}/g, "^")
    .replace(/[~]{2,}/g, "~")
    .replace(/[`]{2,}/g, "`")
    .replace(/[|]{2,}/g, "|")
    .replace(/[\\]{2,}/g, "\\")
    .replace(/[/]{2,}/g, "/")
    .replace(/[<]{2,}/g, "<")
    .replace(/[>]{2,}/g, ">")
    .replace(/[{]{2,}/g, "{")
    .replace(/[}]{2,}/g, "}")
    .replace(/[[]]{2,}/g, "[")
    .replace(/[\]]{2,}/g, "]")
    .replace(/[(]{2,}/g, "(")
    .replace(/[)]{2,}/g, ")")
    .replace(/["]{2,}/g, '"')
    .replace(/[']{2,}/g, "'")
    .replace(/[<,>./?]{2,}/g, ".")
    .replace(/[~!@#$%^&*()_+={}[\]|\\:";'<>?,./]{2,}/g, ".");

  cleaned = cleaned.replace(/\s+/g, " ");

  issuesFixed.push("Applied aggressive cleaning rules");

  return cleaned;
}

function finalCleanup(text: string, issuesFixed: string[]): string {
  let cleaned = text;

  cleaned = cleaned
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();

  issuesFixed.push("Applied final cleanup");

  return cleaned;
}

export function validateCleanedText(text: string): {
  isValid: boolean;
  issues: string[];
  qualityScore: number;
} {
  const issues: string[] = [];
  let qualityScore = 100;

  if (text.length < 50) {
    issues.push("Text too short");
    qualityScore -= 30;
  }

  if (text.length > 10000) {
    issues.push("Text too long");
    qualityScore -= 10;
  }

  const specialCharRatio = (text.match(/[^\w\s]/g) || []).length / text.length;
  if (specialCharRatio > 0.1) {
    issues.push("Too many special characters");
    qualityScore -= 20;
  }

  const whitespaceRatio = (text.match(/\s/g) || []).length / text.length;
  if (whitespaceRatio > 0.3) {
    issues.push("Too much whitespace");
    qualityScore -= 15;
  }

  const artifacts = [
    /\b\w+\d+\w+\b/g,
    /\b[a-z]+[A-Z][a-z]+\b/g,
    /\s{3,}/g,
    /\n{3,}/g,
  ];

  let artifactCount = 0;
  artifacts.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      artifactCount += matches.length;
    }
  });

  if (artifactCount > 10) {
    issues.push("Multiple PDF parsing artifacts detected");
    qualityScore -= 25;
  }

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLength =
    sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;

  if (avgSentenceLength < 10) {
    issues.push("Sentences too short");
    qualityScore -= 10;
  }

  if (avgSentenceLength > 200) {
    issues.push("Sentences too long");
    qualityScore -= 10;
  }

  return {
    isValid: qualityScore >= 70,
    issues,
    qualityScore: Math.max(0, qualityScore),
  };
}

export function getCleaningStats(
  original: string,
  cleaned: string
): {
  originalLength: number;
  cleanedLength: number;
  reductionPercentage: number;
  whitespaceReduction: number;
  specialCharReduction: number;
} {
  const originalLength = original.length;
  const cleanedLength = cleaned.length;
  const reductionPercentage =
    ((originalLength - cleanedLength) / originalLength) * 100;

  const originalWhitespace = (original.match(/\s/g) || []).length;
  const cleanedWhitespace = (cleaned.match(/\s/g) || []).length;
  const whitespaceReduction =
    originalWhitespace > 0
      ? ((originalWhitespace - cleanedWhitespace) / originalWhitespace) * 100
      : 0;

  const originalSpecialChars = (original.match(/[^\w\s]/g) || []).length;
  const cleanedSpecialChars = (cleaned.match(/[^\w\s]/g) || []).length;
  const specialCharReduction =
    originalSpecialChars > 0
      ? ((originalSpecialChars - cleanedSpecialChars) / originalSpecialChars) *
        100
      : 0;

  return {
    originalLength,
    cleanedLength,
    reductionPercentage,
    whitespaceReduction,
    specialCharReduction,
  };
}
