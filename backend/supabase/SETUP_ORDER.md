# TechIT Network — Database Setup

Run these SQL files in Supabase SQL Editor (Dashboard → SQL Editor → New query) **in this exact order**:

## Step 1: Core Schema
Paste and run: `schema.sql`
This creates: profiles, projects, posts, comments, conversations, messages,
collab_requests, collaborations, workspaces, workspace_files,
credit_transactions, notifications tables + indexes + triggers

## Step 2: Critical FK Fixes  
Paste and run: `schema_fix.sql`
This fixes: posts/comments/messages FK to profiles (not auth.users),
enables RLS, enables realtime on all tables

## Step 3: Social Features
Paste and run: `schema_social.sql`  
This adds: connections (friend requests), project_join_requests,
post_saves (bookmarks), search indexes

## After All SQL
Fill in backend/.env:
```
SUPABASE_URL=https://avgfdwagvkaovtjbqvkz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard > Settings > API > service_role>
SUPABASE_ANON_KEY=sb_publishable_Ruljr_uVNsbBW-1Gr6oCQQ_ed6WEXEH
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Then start servers:
```bash
# Terminal 1 - Backend
cd techit/backend
npm install
npm run dev

# Terminal 2 - Frontend
cd techit/frontend
npm install
npm run dev
```

Open http://localhost:5173
