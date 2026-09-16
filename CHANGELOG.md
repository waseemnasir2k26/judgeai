# Changelog

All notable changes to this project are documented in this file.

## [2026.09] - 2026-09-16

- Maintenance review of judgeai — a legal-analysis web platform where users upload case PDFs and get AI-generated analysis and judgment reports, with tone and depth options, JSON export, an admin dashboard, dark mode and five UI languages including RTL for Arabic and Urdu.
- Status: public, MIT per the README, last commit 2026-04-08 (an SEO "Hire Me" block). Vercel-first architecture: React 18 + TypeScript + Vite SPA in `client/`, seven serverless functions in `api/` (auth, analysis create/list/[id], admin users, admin ai-config, health), Upstash Redis as the store, JWT auth, OpenAI for analysis, pdf-parse for extraction. `DEBUG_LOG.md` records a working deployment at https://judgeai-mu.vercel.app as of 2026-02-23.
- Reviewed September 2026: docs refreshed, `## Status` line added to README, changelog started, root package version bumped and tagged v2026.09. No API, client or server code was touched.
- Known gaps: `logs_20260223_032610.txt` and `DEBUG_LOG.md` are committed at the repo root, so deployment debugging output ships with the source; a `server/` directory exists alongside the Vercel `api/` functions, leaving two backend layouts in one repo; there is no LICENSE file despite the README declaring MIT; no tests or CI; no CHANGELOG before this release.
- The Vercel deployment URL and the endpoint test results in `DEBUG_LOG.md` date from February 2026 and were not re-verified in this pass.
