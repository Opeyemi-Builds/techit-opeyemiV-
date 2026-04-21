# TechIT Network 🚀

> The global platform connecting tech founders, collaborators, investors and organisations — powered by AI matching and a real credit economy.

---

## 🗂️ Project Structure

```
techit/
├── frontend/          # React + Vite + Tailwind + Supabase
└── backend/           # Node.js + Express + Supabase Admin + Claude AI
```

---

## ⚡ Quick Start

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open **SQL Editor** and paste the entire contents of `backend/supabase/schema.sql`
3. Click **Run** — this creates all tables, indexes, RLS policies, and triggers
4. Go to **Project Settings → API** and copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Frontend Setup

```bash
cd frontend

# Copy env file and fill in your Supabase values
cp .env.example .env

# Install dependencies
npm install

# Start dev server
npm run dev
```

Visit `http://localhost:5173` — you're live! ✨

### 3. Backend Setup (optional — for AI matching & payments)

```bash
cd backend

# Copy env file and fill in values
cp .env.example .env

# Install dependencies
npm install

# Start dev server
npm run dev
```

Backend runs on `http://localhost:3001`

---

## 🔑 Environment Variables

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend URL (optional) |

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin) |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `ANTHROPIC_API_KEY` | Claude API key for AI matching |
| `STRIPE_SECRET_KEY` | Stripe secret key for payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `PORT` | Backend port (default: 3001) |
| `FRONTEND_URL` | Frontend URL for CORS |

---

## 🏗️ Architecture

### Frontend Stack
- **React 19** + TypeScript
- **Vite** (build tool)
- **Tailwind CSS v4** (styling)
- **Supabase JS** (auth + database + realtime)
- **Motion** (animations)
- **React Router v7** (routing)
- **Lucide React** (icons)
- **Syne + DM Sans + JetBrains Mono** (fonts)

### Backend Stack
- **Node.js** + TypeScript
- **Express.js** (HTTP server)
- **Socket.io** (real-time messaging)
- **Supabase** (PostgreSQL database + auth)
- **Anthropic Claude** (AI matching + idea evaluation)
- **Stripe** (credit purchases)

---

## 🎨 Design System

### Colors (OKLCH)
| Token | Value | Usage |
|---|---|---|
| Primary | `oklch(0.54 0.3 292)` | Violet — primary actions |
| Secondary | `oklch(0.58 0.25 206)` | Cyan — secondary actions |
| Accent | `oklch(0.56 0.17 192)` | Teal — accents |

### Fonts
- **Display/Headings:** Syne (weight 700–800)
- **Body:** DM Sans
- **Code/Mono:** JetBrains Mono

---

## 👤 User Roles

| Role | Dashboard Route | Setup Route |
|---|---|---|
| Founder | `/dashboard` | `/founder/setup` |
| Collaborator | `/collaborator/dashboard` | `/collaborator/setup` |
| Investor | `/investor/dashboard` | `/investor/setup` |
| Organisation | `/org/dashboard` | `/org/setup` |

Users can switch roles anytime from Settings.

---

## 💳 Credit System

| Action | Cost |
|---|---|
| AI Collaborator Matching | 50 credits |
| Idea AI Evaluation | 75 credits |
| Paid Collab Request | 25 credits |
| Incubation Hub (monthly) | 200 credits |
| Priority Profile Boost | 100 credits |

| Tier | Credits/mo | Price |
|---|---|---|
| Starter | 250 | Free |
| Pro Builder | 2,500 | $19/mo |
| Elite Network | Unlimited | $49/mo |

---

## 🗃️ Database Tables

| Table | Description |
|---|---|
| `profiles` | All user data, role, credits, credibility |
| `posts` | Social feed posts |
| `comments` | Post comments |
| `projects` | Startup projects |
| `collab_requests` | Collaboration requests (paid/free/equity) |
| `collaborations` | Active team memberships |
| `conversations` | Message threads |
| `messages` | Chat messages |
| `notifications` | In-app notifications |
| `credit_transactions` | Credit history |
| `workspaces` | Project workspaces |
| `workspace_files` | Code files in workspaces |

---

## 🚀 Deployment

### Frontend → Vercel
```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
```

### Backend → Railway / Render
```bash
cd backend
npm run build
# Deploy to Railway, Render, or Fly.io
```

### Supabase
- Already hosted — just run the schema SQL
- Enable **Realtime** for: `messages`, `notifications`, `posts`, `collab_requests`
- Create Storage bucket: `techit-uploads` (public)

---

## 📁 Key Files to Edit

| File | What to change |
|---|---|
| `frontend/src/App.css` | Colors, fonts, design tokens |
| `frontend/src/pages/Landing.tsx` | Landing page content |
| `frontend/src/contexts/AuthContext.tsx` | Auth logic |
| `frontend/src/contexts/CreditContext.tsx` | Credit costs |
| `backend/src/modules/matching/matching.router.ts` | AI matching prompt |
| `backend/supabase/schema.sql` | Database schema |

---

## 🔧 Adding New Pages

1. Create file in `frontend/src/dashboard/` or `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Use `<DashboardLayout>` wrapper for authenticated pages
4. Use components from `frontend/src/components/ui/card.tsx`



Built  for  TechIT Network. All rights reserved.
