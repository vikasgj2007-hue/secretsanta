# THE EVERGREEN EXPRESS — A SECRET CHRISTMAS JOURNEY
### Premium Faculty Secret Santa Celebration Platform

> *"A Little Magic. A Special Someone. A Christmas to Remember."*  
> *"Beyond the winter lights and falling snow, a special Christmas connection is waiting to be discovered."*

---

## 🌟 Overview

**THE EVERGREEN EXPRESS** is a full-stack, cinema-grade Secret Santa web experience custom built for college faculty celebrations (~75–80 faculty members). Designed to feel like entering a breathtaking winter kingdom at midnight, it combines a realistic snowfall world, glowing European castle, Web Audio train synthesizer, and an 8-stage interactive Christmas train journey leading to a wax-sealed letter reveal.

Backed by a secure **Node.js + Express** server and hosted **Supabase PostgreSQL** database, it strictly guarantees:
- **Zero Self-Assignments** ($P(i) \neq i$ via Sattolo's Derangement algorithm)
- **1:1 Colleague Bijection** (every participant gives 1 gift, every participant receives 1 gift)
- **Zero Client-Side Leaks** (participants cannot view the global assignment roster or inspect other recipients)
- **Permanent Persistence** (refreshing or re-logging in always returns the exact same recipient)
- **Two-Stage Reveal Privacy** (reveals Recipient Participant ID first, then opens the sealed letter for the Full Name)

---

## 🚀 Quick Start Guide (Windows)

### 1. Start the Website (One-Click)
Simply double-click:
```cmd
start-website.bat
```
This automatically starts the Node.js server and launches your browser at `http://localhost:5000`.

Or from your terminal:
```bash
npm start
```

---

## 🔑 Default Credentials & Access

### Administrator Access
- **How to Open**: Click the **College Crest Logo** at the top right of the website.
- **Default Username**: `admin`
- **Default Password**: `ChristmasAdmin2026!`

### Faculty Access
- **Registration**: Click **REGISTER** on the landing page.
- Enter Full Name, College Email, Department, and Password.
- Upon completion, the system awards a unique **Participant ID** (e.g. `SS101`, `SS102`, `SS103`).
- **Login**: Participants log in with their **Participant ID** and **Password** (email is not used for participant login).

---

## 🛠️ System Architecture

### Frontend
- **Atmospheric World**: HTML5 Canvas multi-plane snowfall engine (`SnowEngine`), starlight night sky (`SkyStarsEngine`), breathing castle window warmth glow, tree fairy lights, and celestial Santa flight cycle.
- **Audio Synthesizer**: Web Audio API oscillator synthesis generating realistic steam train whistles, locomotive chuffing, station pressure hisses, and Christmas bells without external audio files.
- **Interactive Train Journey**: 15-second cinematic parallax journey moving strictly LEFT $\rightarrow$ RIGHT across 3 scenery stages (*Central Quad Station* $\rightarrow$ *Alpine Viaduct* $\rightarrow$ *North Pole Pavilion*).
- **Two-Stage Reveal**: Golden ticket boarding pass $\rightarrow$ Recipient Ticket ID reveal $\rightarrow$ Interactive 3D wax seal break $\rightarrow$ Parchment letter opening with multi-color holiday confetti.

### Backend & Database
- **Server**: Node.js + Express with parameterized SQL queries, cookie sessions (`express-session`), and rate limiting (`express-rate-limit`).
- **Database**: Supabase hosted PostgreSQL 17 via `pg` connection pool with SSL.
- **Tables**:
  - `events`: Tracks celebration status (`open`, `closed`, `pending`, `active`, `ended`) and draw locks.
  - `administrators`: Bcrypt-hashed administrator credentials.
  - `participants`: Faculty records with unique `participant_id` sequence (`SS101`, `SS102`...).
  - `assignments`: Permanent derangement pairs with check constraint `giver_id <> recipient_id`.
  - `reveal_records`: Tracks first and second reveal timestamps and replay counts.
  - `audit_logs`: Complete security audit trail of administrative and participant actions.
  - `email_notifications`: Outbox for email dispatches.

---

## 🧪 Testing & Verification

Run the automated test suites anytime:

```bash
# 1. Test Supabase Database Connection
npm run test:db

# 2. Run Derangement & Mathematical Invariant Tests
npm test

# 3. Run End-to-End Database Flow Test
npm run test:e2e
```

---

## 📜 License
Created for Faculty Secret Santa Celebration. All rights reserved.
