# JudgeAI

A production-ready legal AI platform that enables judges and legal professionals to upload case documents, receive AI-powered analysis, and generate high-end PDF judgment reports.

## Features

- **Document Analysis**: Upload PDF case documents for AI-powered analysis
- **Multiple Tones**: Choose between aggressive, professional, or simple analysis styles
- **Comprehensive Reports**: Executive summary, legal framework, timeline, recommendations
- **PDF Generation**: Professional legal document PDF reports
- **Admin Dashboard**: User management, AI configuration, feedback analytics
- **Multi-language**: English, Arabic, French, Spanish, Urdu
- **Dark Mode**: Full dark mode support
- **RTL Support**: Right-to-left layout for Arabic and Urdu

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- React Query
- i18next

### Backend
- Node.js + Express
- TypeScript
- MongoDB (Mongoose)
- JWT Authentication
- OpenAI API
- PDFKit
- Resend (Email)

## Deployment

### Vercel (Frontend)

1. Import the repository on Vercel
2. Set the root directory to `client`
3. Add environment variable:
   - `VITE_API_URL`: Your backend API URL

### Backend (Railway/Render/etc)

1. Deploy the `server` folder
2. Set environment variables (see `server/.env.example`)

## Environment Variables

### Server
```
NODE_ENV=production
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
ENCRYPTION_KEY=your_32_char_encryption_key
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=JudgeAI <noreply@yourdomain.com>
CLIENT_URL=https://your-frontend-url.vercel.app
SUPERADMIN_EMAIL=admin@gmail.com
SUPERADMIN_PASSWORD=YourSecurePassword123!
```

### Client
```
VITE_API_URL=https://your-backend-url.com/api/v1
VITE_APP_NAME=JudgeAI
```

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- OpenAI API key
- Resend API key

### Setup

```bash
# Clone the repository
git clone https://github.com/waseemnasir2k26/judgeai.git
cd judgeai

# Install server dependencies
cd server
npm install
cp .env.example .env
# Edit .env with your values

# Install client dependencies
cd ../client
npm install
cp .env.example .env
# Edit .env with your values

# Run development servers
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Client
cd client && npm run dev
```

## License

MIT
