### 🎨 Design Principles# LearnQuest Africa - PWA Build Prompt

You are an expert full-stack developer tasked with building "LearnQuest Africa" - an educational gamification PWA for African students. This is for a one-day hackathon, so prioritize **simplicity, functionality, and demo impact** over complex features.

## Tech Stack Requirements
- **Frontend**: React 19 + TypeScript + Tailwind CSS 4 + Vite (for fast development & PWA)
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite with TypeScript (simple file-based DB, no server setup needed)
- **PWA**: Vite PWA plugin for service worker and offline functionality
- **SMS**: Africa's Talking API integration (use sandbox/mock for demo)

## Product Overview
**LearnQuest Africa**: An offline-first educational RPG where students complete learning quests and parents receive SMS progress updates. Focus on **math learning games** with **SMS community integration**.

## Phase-Based TODO Checklist

### 📋 PHASE 1: Project Foundation (Hours 1-2)
**Backend Setup:**
- [x] Initialize Node.js + Express + TypeScript project
- [x] Install and configure SQLite with `sqlite3` or `better-sqlite3` package
- [x] Set up basic folder structure (`/src`, `/routes`, `/types`, `/db`)
- [x] Create SQLite database initialization script with tables for students, quests, progress, sms_logs
- [x] Create simple database service layer with TypeScript (CRUD operations)
- [x] Create basic Express server with CORS enabled
- [x] Add basic error handling middleware
- [x] Create mock Africa's Talking SMS service (for demo)
- [x] Set up basic API routes: `/api/health`, `/api/sms/send`, `/api/students`, `/api/progress`

**Frontend Setup:**
- [x] Initialize React 19 + TypeScript + Vite project using `npm create vite@latest`
- [x] Install and configure Tailwind CSS 4 with Vite
- [x] Install and configure Vite PWA plugin (`vite-plugin-pwa`)
- [x] Configure PWA manifest.json through Vite config
- [x] Set up basic folder structure (`/src/components`, `/src/pages`, `/src/types`, `/src/utils`)
- [x] Create responsive mobile-first layout component
- [x] Add basic routing using React Router (Home, Game, Progress pages)
- [x] Configure Vite proxy for backend API calls (avoid CORS issues)
- [x] Test PWA generation and installation capability

**Integration:**
- [x] Connect frontend to backend API using Vite proxy configuration
- [x] Test basic API communication through Vite dev server
- [x] Verify mobile responsiveness and hot reload functionality
- [x] Test PWA build process with `npm run build` and `npm run preview`

### 🎮 PHASE 2: Core Game Mechanics (Hours 3-4)
**Game Framework:**
- [x] Create TypeScript interfaces for: Student, Quest, Progress, Achievement, SMSLog
- [x] Build SQLite service layer for data persistence with proper error handling
- [x] Create database seed script with sample quests and achievements
- [x] Create basic student profile/avatar system (name + simple avatar selection)
- [x] Implement level/XP progression system with SQLite storage
- [x] Build simple localStorage service for offline data sync (cache SQLite data locally)

**Math Learning Games:**
- [x] **Quest 1**: "Market Math" - Addition/subtraction with African market scenarios
  - [x] Simple drag-and-drop or click-based math problems
  - [x] 5 progressive difficulty levels
  - [x] Immediate feedback with animations
- [x] **Quest 2**: "Fraction Village" - Basic fractions using visual pizza/pie slices
  - [x] Visual fraction representation
  - [x] Click-to-select correct fractions
  - [x] 3 difficulty levels
- [x] Create quest completion flow with XP rewards and celebrations

**Game UI Components:**
- [x] Quest selection screen with progress indicators
- [x] In-game UI with timer, score, and level display
- [x] Achievement popup animations
- [x] Simple leaderboard component (local scores)

### 📱 PHASE 3: SMS Integration & Community Features (Hours 5-6)
**SMS Backend:**
- [x] Create SMS service using Africa's Talking API (or mock service)
- [x] Build parent registration system with SQLite storage (student name + parent phone)
- [x] Create SMS templates stored in database for: welcome, daily progress, achievements, weekly summary
- [x] Add API routes: `/api/parents/register`, `/api/sms/progress`, `/api/sms/achievement`
- [x] Implement SMS logging to SQLite database for tracking and admin dashboard

**SMS Triggers:**
- [x] Auto-SMS when student completes first quest
- [x] SMS when student achieves new level
- [ ] SMS with weekly progress summary (mock timing for demo)
- [ ] Parent encouragement SMS with specific achievements

**Admin Dashboard (Simple):**
- [x] Basic teacher/parent dashboard querying SQLite for student progress
- [x] SMS history viewer from SMS logs table
- [x] Simple class overview with student rankings from database
- [x] Manual SMS trigger for demo purposes with database logging

### 🎯 PHASE 4: PWA Polish & Demo Preparation (Hours 7-8)
**Offline Functionality:**
- [x] Configure Vite PWA plugin with workbox for automatic service worker generation
- [x] Set up PWA caching strategies (cache-first for assets, network-first for API)
- [x] Create sync mechanism: cache SQLite data in localStorage for offline access
- [x] Cache essential game assets and data using Vite PWA plugin
- [x] Show offline/online status indicator
- [x] Queue SMS notifications and progress updates for when back online
- [x] Implement data synchronization when connection is restored
- [ ] Test offline functionality using `npm run preview` (production build)

**UI/UX Polish:**
- [ ] Add loading animations and micro-interactions
- [ ] Implement sound effects (simple beeps/chimes for actions)
- [ ] Create smooth transitions between game states
- [ ] Add helpful tooltips and onboarding flow
- [ ] Ensure mobile touch interactions work perfectly

**Demo Preparation:**
- [ ] Create demo data (sample student with progress)
- [ ] Prepare live SMS demonstration flow
- [ ] Test entire user journey from registration to SMS receipt
- [ ] Create compelling demo script with clear talking points
- [ ] Ensure app works in "offline mode" for demo

## Implementation Guidelines

### ⚡ Vite Development Advantages
- **Lightning Fast**: Hot module replacement for instant feedback during development
- **Optimized Builds**: Automatic code splitting and asset optimization
- **PWA Plugin**: Built-in PWA generation with workbox service worker
- **TypeScript**: Native TypeScript support without complex configuration
- **Proxy Setup**: Easy backend API integration without CORS issues

### 🔧 Key Vite Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'LearnQuest Africa',
        short_name: 'LearnQuest',
        description: 'Educational Gaming for African Students',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/api\./,
          handler: 'NetworkFirst'
        }]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```
- **Mobile-First**: Design for 375px width, scale up
- **High Contrast**: Use bold colors and large touch targets
- **Simple Navigation**: Maximum 3 taps to reach any feature
- **Immediate Feedback**: Every action should have visual response
- **African Context**: Use local currency (KES), familiar scenarios (markets, villages)

### 📊 Data Models & SQLite Schema
```typescript
// TypeScript Interfaces
interface Student {
  id: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  parentPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Quest {
  id: string;
  title: string;
  type: 'math' | 'reading';
  difficulty: 1 | 2 | 3;
  description: string;
  maxScore: number;
  createdAt: Date;
}

interface Progress {
  id: string;
  studentId: string;
  questId: string;
  completed: boolean;
  score: number;
  attempts: number;
  completedAt?: Date;
}

interface SMSLog {
  id: string;
  studentId: string;
  phoneNumber: string;
  message: string;
  type: 'welcome' | 'progress' | 'achievement' | 'weekly';
  sentAt: Date;
  status: 'pending' | 'sent' | 'failed';
}

// SQLite Schema (Auto-generated tables)
/*
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  parent_phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quests (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  description TEXT,
  max_score INTEGER DEFAULT 100,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE progress (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT 0,
  score INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  completed_at DATETIME,
  FOREIGN KEY (student_id) REFERENCES students (id),
  FOREIGN KEY (quest_id) REFERENCES quests (id)
);

CREATE TABLE sms_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'pending',
  FOREIGN KEY (student_id) REFERENCES students (id)
);
*/
```

### 🎯 Demo Flow Strategy
1. **Student Registration**: Show creating profile + parent SMS registration
2. **Game Play**: Live play through 2-3 math quests
3. **SMS Magic**: Trigger live SMS to real phone number during demo
4. **Offline Mode**: Disconnect internet, show continued functionality
5. **Community Impact**: Show parent dashboard with progress insights

### ⚡ Quick Wins for Impact
- **Instant SMS**: Use webhook or real Africa's Talking sandbox for live demo
- **Visual Progress**: Animated progress bars and achievement celebrations
- **Local Context**: Use Kenyan Shilling (KES) in math problems, local names
- **Sound Effects**: Simple audio feedback for actions (optional but impactful)
- **Responsive Demo**: Works perfectly on judge's phones/tablets

### 🚫 What NOT to Spend Time On
- Complex user authentication (simple name entry with SQLite storage is enough)
- Advanced graphics/animations (focus on functionality)
- Multiple game types (2-3 solid math games is better than 10 basic ones)
- Complex database relationships (keep SQLite schema simple with basic foreign keys)
- Advanced SMS features (basic progress notifications are sufficient)
- Database migrations (create tables once and keep schema simple)

## Success Criteria
By end of build phase, you should have:
- ✅ Working PWA that installs on mobile devices
- ✅ SQLite database with proper schema and seed data
- ✅ 2-3 engaging math learning games with progression stored in database
- ✅ Live SMS integration sending real messages with database logging
- ✅ Offline functionality with localStorage sync to SQLite data
- ✅ Simple parent/teacher dashboard querying real database
- ✅ Smooth, compelling 5-minute demo flow

## Final Demo Checklist
- [ ] Vite PWA builds successfully with `npm run build`
- [ ] PWA installs correctly on mobile browser from preview server
- [ ] All games work smoothly on mobile touch through Vite dev server
- [ ] SMS sends successfully during live demo
- [ ] Offline mode functions without internet (test with `npm run preview`)
- [ ] Parent dashboard shows meaningful data with fast Vite hot reload
- [ ] Demo script practiced and timed under 5 minutes
- [ ] Backup demo plan ready (in case of technical issues)
- [ ] Production build tested and optimized by Vite

Remember: **Better to have 3 features that work perfectly than 10 features that are half-broken.** Focus on the core value proposition: engaging offline learning + SMS community connection.

Start with Phase 1 and work systematically through each checklist. Tick off each item as you complete it, and don't move to the next phase until the current one is solid.

Good luck building something that will wow the judges! 🚀