export interface ATSScoreResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  totalKeywords: number;
  matchPercentage: number;
  analysis: {
    skills: { matched: string[]; missing: string[] };
    experience: { matched: string[]; missing: string[] };
    summary: { matched: string[]; missing: string[] };
  };
}

export function calculateATSScore(
  resumeText: string,
  jobDescription: string
): ATSScoreResult {
  const normalizedResume = resumeText.toLowerCase().replace(/[^\w\s]/g, " ");
  const normalizedJD = jobDescription.toLowerCase().replace(/[^\w\s]/g, " ");

  const jdKeywords = extractKeywords(normalizedJD);
  const resumeKeywords = extractKeywords(normalizedResume);

  const matchedKeywords = jdKeywords.filter((keyword) =>
    resumeKeywords.includes(keyword)
  );

  const missingKeywords = jdKeywords.filter(
    (keyword) => !resumeKeywords.includes(keyword)
  );

  const totalKeywords = jdKeywords.length;
  const matchedCount = matchedKeywords.length;
  const matchPercentage =
    totalKeywords > 0 ? (matchedCount / totalKeywords) * 100 : 0;

  let finalScore = Math.round(matchPercentage);

  if (totalKeywords >= 10 && matchedCount >= 5) {
    finalScore += 10;
  }

  finalScore = Math.min(100, finalScore);

  const analysis = analyzeSections(resumeText, jobDescription);

  return {
    score: finalScore,
    matchedKeywords,
    missingKeywords,
    totalKeywords,
    matchPercentage,
    analysis,
  };
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "he",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "that",
    "the",
    "to",
    "was",
    "will",
    "with",
    "i",
    "you",
    "your",
    "we",
    "they",
    "them",
    "their",
    "this",
    "but",
    "have",
    "had",
    "what",
    "when",
    "where",
    "who",
    "which",
    "why",
    "how",
    "all",
    "any",
    "both",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "only",
    "own",
    "same",
    "so",
    "than",
    "too",
    "very",
    "can",
    "will",
    "just",
    "should",
    "now",
    "would",
    "could",
    "may",
    "might",
    "must",
    "shall",
  ]);

  const words = text
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .filter((word) => !stopWords.has(word))
    .filter((word) => /^[a-zA-Z]+$/.test(word))
    .map((word) => word.toLowerCase());

  const wordCount: { [key: string]: number } = {};
  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  return Object.keys(wordCount)
    .filter((word) => wordCount[word] >= 2)
    .sort((a, b) => wordCount[b] - wordCount[a])
    .slice(0, 50);
}

function analyzeSections(
  resumeText: string,
  jobDescription: string
): {
  skills: { matched: string[]; missing: string[] };
  experience: { matched: string[]; missing: string[] };
  summary: { matched: string[]; missing: string[] };
} {
  const normalizedResume = resumeText.toLowerCase();
  const normalizedJD = jobDescription.toLowerCase();

  const technicalKeywords = extractTechnicalKeywords(normalizedJD);

  const matchedSkills = technicalKeywords.filter((keyword) =>
    normalizedResume.includes(keyword)
  );

  const missingSkills = technicalKeywords.filter(
    (keyword) => !normalizedResume.includes(keyword)
  );

  const experienceKeywords = extractExperienceKeywords(normalizedJD);
  const summaryKeywords = extractSummaryKeywords(normalizedJD);

  const matchedExperience = experienceKeywords.filter((keyword) =>
    normalizedResume.includes(keyword)
  );

  const missingExperience = experienceKeywords.filter(
    (keyword) => !normalizedResume.includes(keyword)
  );

  const matchedSummary = summaryKeywords.filter((keyword) =>
    normalizedResume.includes(keyword)
  );

  const missingSummary = summaryKeywords.filter(
    (keyword) => !normalizedResume.includes(keyword)
  );

  return {
    skills: { matched: matchedSkills, missing: missingSkills },
    experience: { matched: matchedExperience, missing: missingExperience },
    summary: { matched: matchedSummary, missing: missingSummary },
  };
}

function extractTechnicalKeywords(text: string): string[] {
  const technicalTerms = [
    "javascript",
    "python",
    "java",
    "react",
    "node.js",
    "sql",
    "mongodb",
    "aws",
    "docker",
    "kubernetes",
    "git",
    "html",
    "css",
    "typescript",
    "angular",
    "vue",
    "express",
    "django",
    "flask",
    "spring",
    "hibernate",
    "postgresql",
    "mysql",
    "redis",
    "elasticsearch",
    "kafka",
    "rabbitmq",
    "jenkins",
    "ci/cd",
    "agile",
    "scrum",
    "kanban",
    "rest",
    "graphql",
    "microservices",
    "api",
    "frontend",
    "backend",
    "fullstack",
    "devops",
    "cloud",
    "serverless",
    "lambda",
    "ec2",
    "s3",
    "rds",
    "elastic",
    "kubernetes",
    "docker",
    "terraform",
    "ansible",
  ];

  return technicalTerms.filter((term) => text.includes(term));
}

function extractExperienceKeywords(text: string): string[] {
  const experienceTerms = [
    "experience",
    "years",
    "senior",
    "junior",
    "lead",
    "manager",
    "developer",
    "engineer",
    "architect",
    "consultant",
    "specialist",
    "analyst",
    "coordinator",
    "supervisor",
    "director",
    "vp",
    "cto",
    "ceo",
    "founder",
    "co-founder",
  ];

  return experienceTerms.filter((term) => text.includes(term));
}

function extractSummaryKeywords(text: string): string[] {
  const summaryTerms = [
    "bachelor",
    "master",
    "phd",
    "degree",
    "certification",
    "certified",
    "expertise",
    "proficient",
    "skilled",
    "knowledgeable",
    "experienced",
    "proven",
    "track record",
    "successful",
    "results",
    "achieved",
    "delivered",
  ];

  return summaryTerms.filter((term) => text.includes(term));
}
