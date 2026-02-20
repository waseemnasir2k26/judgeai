# JudgeAI

A production-ready legal AI platform that enables judges and legal professionals to upload case documents, receive AI-powered analysis, and generate comprehensive judgment reports.

## Features

- **Document Analysis**: Upload PDF case documents for AI-powered analysis
- **Multiple Tones**: Choose between aggressive, professional, or simple analysis styles
- **Analysis Depth**: Basic, Standard, or Comprehensive analysis options
- **Comprehensive Reports**: Executive summary, legal framework, timeline, recommendations
- **JSON Export**: Export analysis results as JSON
- **Admin Dashboard**: User management, AI configuration
- **Dark Mode**: Full dark mode support
- **Multi-language**: English, Arabic, French, Spanish, Urdu
- **RTL Support**: Right-to-left layout for Arabic and Urdu

## Tech Stack

### Frontend (Client)
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- React Query (TanStack)
- i18next
- Axios

### Backend (Vercel Serverless Functions)
- Node.js Serverless Functions
- Upstash Redis (KV Store)
- JWT Authentication
- OpenAI API (GPT-4o)
- pdf-parse (PDF text extraction)
- bcryptjs (password hashing)

## Architecture

This project uses a **Vercel-first** architecture:
- **Frontend**: React SPA built with Vite, deployed to Vercel
- **Backend**: Serverless API functions in the `/api` directory
- **Database**: Upstash Redis (serverless Redis via REST API)
- **AI**: OpenAI GPT-4o for document analysis

The `/server` directory contains an alternative Express/MongoDB backend for self-hosting (not used in Vercel deployment).

## Deployment (Vercel)

### 1. Set Up External Services

1. **Upstash Redis**: Create a database at [console.upstash.com](https://console.upstash.com/)
2. **OpenAI API**: Get an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 2. Deploy to Vercel

1. Import this repository on [vercel.com](https://vercel.com)
2. The root directory should be `./` (project root)
3. Framework: Vite (auto-detected)

### 3. Configure Environment Variables

In Vercel Dashboard > Settings > Environment Variables, add:

| Variable | Required | Description |
|----------|----------|-------------|
| `KV_REST_API_URL` | ✅ | Upstash Redis REST API URL |
| `KV_REST_API_TOKEN` | ✅ | Upstash Redis REST API Token |
| `OPENAI_API_KEY` | ✅ | OpenAI API Key |
| `JWT_SECRET` | ✅ | JWT secret (32+ chars) |
| `JWT_REFRESH_SECRET` | ✅ | JWT refresh secret (32+ chars) |
| `SUPERADMIN_EMAIL` | ✅ | Initial admin email |
| `SUPERADMIN_PASSWORD` | ✅ | Initial admin password |
| `OPENAI_MODEL` | ❌ | Override AI model (default: gpt-4o) |

### 4. First Login

After deployment:
1. Visit your Vercel URL
2. Login with the superadmin credentials you configured
3. The superadmin account is auto-created on the first API request
4. Approve new user registrations from the Admin Panel

## Local Development

### Prerequisites
- Node.js 18+
- Upstash Redis account (for API functions)
- OpenAI API key

### Setup

```bash
# Clone the repository
git clone https://github.com/waseemnasir2k26/judgeai.git
cd judgeai

# Install root dependencies (for API serverless functions)
npm install

# Install client dependencies
cd client
npm install

# Configure environment
cd ..
cp .env.example .env
# Edit .env with your actual values

cp client/.env.example client/.env
# VITE_API_URL=/api is already set for Vercel

# Run the client dev server
cd client
npm run dev
```

> **Note**: For local development, the API serverless functions require Vercel CLI (`vercel dev`) to work. Alternatively, use the Express server in `/server` with a MongoDB database.

## User Flow

1. **Register** → Account starts as "pending"
2. **Admin Approval** → Superadmin approves via Admin Panel
3. **Login** → Access the platform
4. **Upload PDFs** → Drag & drop legal documents
5. **Configure** → Set tone and analysis depth
6. **Analyze** → AI processes documents (1-2 minutes)
7. **Review** → Browse analysis tabs (summary, timeline, etc.)
8. **Export** → Download as JSON

## License

MIT
