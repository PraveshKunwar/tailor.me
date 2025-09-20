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
  const preCleanedResume = preCleanForATS(resumeText);
  const normalizedResume = preCleanedResume
    .toLowerCase()
    .replace(/[^\w\s]/g, " ");
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

  const analysis = analyzeSections(preCleanedResume, jobDescription);

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

function preCleanForATS(text: string): string {
  let cleaned = text;

  const atsFixes = [
    { pattern: /\bobject-oriented\b/g, replacement: "object oriented" },
    {
      pattern: /\bfunctional-programming\b/g,
      replacement: "functional programming",
    },
    {
      pattern: /\bsoftware-development\b/g,
      replacement: "software development",
    },
    { pattern: /\bweb-development\b/g, replacement: "web development" },
    { pattern: /\bmobile-development\b/g, replacement: "mobile development" },
    { pattern: /\bfull-stack\b/g, replacement: "full stack" },
    { pattern: /\bfront-end\b/g, replacement: "front end" },
    { pattern: /\bback-end\b/g, replacement: "back end" },
    { pattern: /\bend-to-end\b/g, replacement: "end to end" },
    { pattern: /\buser-experience\b/g, replacement: "user experience" },
    { pattern: /\buser-interface\b/g, replacement: "user interface" },
    {
      pattern: /\bapplication-programming-interface\b/g,
      replacement: "application programming interface",
    },
    {
      pattern: /\brepresentational-state-transfer\b/g,
      replacement: "representational state transfer",
    },

    { pattern: /\bproject-management\b/g, replacement: "project management" },
    { pattern: /\bprogram-management\b/g, replacement: "program management" },
    { pattern: /\bproduct-management\b/g, replacement: "product management" },
    { pattern: /\bchange-management\b/g, replacement: "change management" },
    { pattern: /\brisk-management\b/g, replacement: "risk management" },
    { pattern: /\bquality-assurance\b/g, replacement: "quality assurance" },
    { pattern: /\bquality-control\b/g, replacement: "quality control" },

    {
      pattern: /\bcontinuous-integration\b/g,
      replacement: "continuous integration",
    },
    {
      pattern: /\bcontinuous-deployment\b/g,
      replacement: "continuous deployment",
    },
    { pattern: /\bcontinuous-delivery\b/g, replacement: "continuous delivery" },
    { pattern: /\bdevops\b/g, replacement: "dev ops" },
    { pattern: /\bagile\b/g, replacement: "agile" },
    { pattern: /\bscrum\b/g, replacement: "scrum" },
    { pattern: /\bkanban\b/g, replacement: "kanban" },

    { pattern: /\bdata-science\b/g, replacement: "data science" },
    { pattern: /\bdata-analysis\b/g, replacement: "data analysis" },
    { pattern: /\bdata-visualization\b/g, replacement: "data visualization" },
    { pattern: /\bdata-mining\b/g, replacement: "data mining" },
    { pattern: /\bdata-warehousing\b/g, replacement: "data warehousing" },
    {
      pattern: /\bbusiness-intelligence\b/g,
      replacement: "business intelligence",
    },
    { pattern: /\bmachine-learning\b/g, replacement: "machine learning" },
    { pattern: /\bdeep-learning\b/g, replacement: "deep learning" },
    {
      pattern: /\bartificial-intelligence\b/g,
      replacement: "artificial intelligence",
    },

    { pattern: /\bcloud-computing\b/g, replacement: "cloud computing" },
    { pattern: /\bedge-computing\b/g, replacement: "edge computing" },
    {
      pattern: /\bdistributed-computing\b/g,
      replacement: "distributed computing",
    },
    { pattern: /\bparallel-computing\b/g, replacement: "parallel computing" },
    { pattern: /\bcontainerization\b/g, replacement: "containerization" },
    { pattern: /\bmicroservices\b/g, replacement: "microservices" },

    { pattern: /\bunit-testing\b/g, replacement: "unit testing" },
    { pattern: /\bintegration-testing\b/g, replacement: "integration testing" },
    { pattern: /\bend-to-end-testing\b/g, replacement: "end to end testing" },
    { pattern: /\bperformance-testing\b/g, replacement: "performance testing" },
    { pattern: /\bsecurity-testing\b/g, replacement: "security testing" },
    {
      pattern: /\buser-acceptance-testing\b/g,
      replacement: "user acceptance testing",
    },
    { pattern: /\btest-automation\b/g, replacement: "test automation" },

    { pattern: /\bproblem-solving\b/g, replacement: "problem solving" },
    { pattern: /\bteam-work\b/g, replacement: "team work" },
    { pattern: /\bcross-functional\b/g, replacement: "cross functional" },
    { pattern: /\bself-motivated\b/g, replacement: "self motivated" },
    { pattern: /\bdetail-oriented\b/g, replacement: "detail oriented" },
    { pattern: /\bresults-driven\b/g, replacement: "results driven" },
    { pattern: /\bclient-focused\b/g, replacement: "client focused" },
    { pattern: /\bdata-driven\b/g, replacement: "data driven" },
    { pattern: /\bgoal-oriented\b/g, replacement: "goal oriented" },
    { pattern: /\btime-management\b/g, replacement: "time management" },
    { pattern: /\bhands-on\b/g, replacement: "hands on" },
    { pattern: /\bhigh-level\b/g, replacement: "high level" },
    { pattern: /\blow-level\b/g, replacement: "low level" },
    { pattern: /\bmid-level\b/g, replacement: "mid level" },
    { pattern: /\bentry-level\b/g, replacement: "entry level" },
    { pattern: /\bsenior-level\b/g, replacement: "senior level" },
    { pattern: /\bjunior-level\b/g, replacement: "junior level" },
    { pattern: /\bexpert-level\b/g, replacement: "expert level" },
    { pattern: /\bprofessional-level\b/g, replacement: "professional level" },

    { pattern: /\bindustry-standard\b/g, replacement: "industry standard" },
    { pattern: /\bbest-practices\b/g, replacement: "best practices" },
    { pattern: /\bcode-review\b/g, replacement: "code review" },
    { pattern: /\bversion-control\b/g, replacement: "version control" },
    { pattern: /\bsource-control\b/g, replacement: "source control" },
    {
      pattern: /\bconfiguration-management\b/g,
      replacement: "configuration management",
    },
    {
      pattern: /\bdeployment-automation\b/g,
      replacement: "deployment automation",
    },
    { pattern: /\bprocess-automation\b/g, replacement: "process automation" },
    { pattern: /\bworkflow-automation\b/g, replacement: "workflow automation" },

    { pattern: /\bbusiness-continuity\b/g, replacement: "business continuity" },
    { pattern: /\bdisaster-recovery\b/g, replacement: "disaster recovery" },
    {
      pattern: /\bdigital-transformation\b/g,
      replacement: "digital transformation",
    },
    { pattern: /\bprocess-improvement\b/g, replacement: "process improvement" },
    {
      pattern: /\bperformance-optimization\b/g,
      replacement: "performance optimization",
    },
    { pattern: /\bcost-optimization\b/g, replacement: "cost optimization" },
    {
      pattern: /\bresource-optimization\b/g,
      replacement: "resource optimization",
    },

    {
      pattern: /\bclient-communication\b/g,
      replacement: "client communication",
    },
    {
      pattern: /\bstakeholder-communication\b/g,
      replacement: "stakeholder communication",
    },
    { pattern: /\bcross-team\b/g, replacement: "cross team" },
    { pattern: /\binter-departmental\b/g, replacement: "inter departmental" },
    { pattern: /\bintra-departmental\b/g, replacement: "intra departmental" },
  ];

  atsFixes.forEach(({ pattern, replacement }) => {
    cleaned = cleaned.replace(pattern, replacement);
  });

  cleaned = cleaned
    .replace(/\b([a-z]+)([A-Z])([a-z]+)\b/g, "$1 $2$3")
    .replace(/\b(\d+)([a-zA-Z]+)\b/g, "$1 $2")
    .replace(/\b([a-zA-Z]+)(\d+)\b/g, "$1 $2")
    .replace(/([.!?])([A-Z])/g, "$1 $2")
    .replace(/([,;:])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}
