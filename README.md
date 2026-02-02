# 🏈 Coolie Bowl LX

A mobile-first Super Bowl **Boxes** app with a real-time board, admin controls, and live updates.

## ✨ What It Does
- **10x10 interactive box grid** with team axes and themed banners
- **Live updates** via Firebase Realtime Database (everyone sees changes instantly)
- **User personalization**: name + box color + text color preview
- **Lock-in flow** with conflict-safe claims (transactions prevent overwrites)
- **Admin controls**: lock board, reset board, set max boxes, generate random axes
- **Quarter results**: winners + scores displayed to all users
- **Social-ready**: OG metadata for link previews

## ✅ Key Features
- **Live board sync**: updates in real time across devices
- **Conflict-safe claims**: transactions prevent race conditions
- **Board lock**: view-only mode for attendees
- **Admin dashboard**: box limits, winners, and scores
- **Themed UI**: team colors, logos, and gradients

## 🧰 Tech Stack
- **React + TypeScript** (Vite) — UI + app logic
- **Tailwind CSS** — layout, theme, and responsive styling
- **Firebase Realtime Database** — storage + live sync
- **GitHub Pages** — deployment

## 🗂️ Project Structure
- `src/App.tsx` — core UI, state, and Firebase logic
- `src/firebase.ts` — Firebase initialization
- `src/index.css` — Tailwind + global styles
- `public/landing_page.jpg` — background + social preview image

## 📌 Notes
- Admin access is client‑side; for stricter security, add Firebase Auth + rules.
- Social previews require a public image URL (see `index.html` OG tags).
