# ResumeTailor AI 🚀

> Transform your resume with AI power. Upload, tailor, and optimize for ATS systems in minutes.

[![Next.js](https://img.shields.io/badge/Next.js-15.5.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.12-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.56.0-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Google AI](https://img.shields.io/badge/Google_AI-1.15.0-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)

## ✨ Features

- **🤖 AI-Powered Tailoring** - Get personalized resume rewrites using Google Gemini AI
- **📊 ATS Optimization** - Real-time keyword matching and scoring
- **📄 Multi-Format Support** - Upload PDF, DOCX, or TXT resumes
- **🔍 Smart Parsing** - Intelligent text extraction and analysis
- **📝 Cover Letter Generation** - AI-generated cover letters for each application
- **🎨 Modern UI/UX** - Clean, responsive design with dark/light mode
- **⚡ Magic Link Auth** - Secure, passwordless authentication
- **📱 Mobile-First** - Optimized for all devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Google AI Studio API key

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/resume-tailor.git
   cd resume-tailor
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Add your credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Routes    │    │   External      │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   File Parsing  │    │   Google AI     │
│   (Auth + DB)   │    │   (PDF/DOCX)    │    │   (Gemini)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 15.5.0, React 19.1.0, TypeScript 5.0
- **Styling**: Tailwind CSS 4.1.12, Framer Motion 12.23.12
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase 2.56.0 (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Links)
- **AI**: Google AI 1.15.0 (Gemini)
- **File Processing**: pdf-parse 1.1.1, mammoth 1.10.0
- **Deployment**: Vercel (recommended)

## 📁 Project Structure

```
resume-tailor/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   │   └── login/         # Login page
│   ├── api/               # API routes
│   │   ├── parse-resume/  # Resume parsing endpoint
│   │   └── tailor/        # AI tailoring endpoint
│   ├── dashboard/         # Main dashboard
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/             # Reusable components
│   ├── navbar.tsx         # Navigation component
│   ├── theme-toggle.tsx   # Dark/light mode toggle
│   ├── theme-provider.tsx # Theme context provider
│   └── BulletDiff.tsx     # Resume diff viewer
├── lib/                    # Utility libraries
│   ├── supabase.ts        # Supabase client
│   └── llm-gemini.ts      # AI integration
├── public/                 # Static assets
└── package.json            # Dependencies
```

## 🔧 Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run the SQL schema in the SQL editor:

```sql
-- Create tables for users, resumes, job posts, and tailorings
-- (See the PLAN.mdx file for complete schema)
```

3. Enable Row Level Security (RLS)
4. Set up storage bucket for resumes

### Google AI Setup

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Add to your `.env.local`

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Manual Deployment

```bash
npm run build
npm start
```

## 📊 Features in Detail

### Resume Parsing

- **PDF Support**: Intelligent text extraction with pdf-parse
- **DOCX Support**: Clean text extraction with mammoth
- **TXT Support**: Direct text processing
- **Smart Parsing**: Automatic section detection

### AI Tailoring

- **Keyword Extraction**: ATS keyword identification
- **Content Rewriting**: Professional bullet point optimization
- **Impact Quantification**: Add measurable achievements
- **Technical Accuracy**: Maintain factual integrity

### ATS Optimization

- **Score Calculation**: Real-time keyword matching
- **Performance Metrics**: Track improvement over time
- **Optimization Tips**: AI-powered suggestions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing framework
- [Supabase](https://supabase.com/) for backend services
- [Google AI](https://ai.google.dev/) for Gemini AI
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Framer Motion](https://www.framer.com/motion/) for animations
