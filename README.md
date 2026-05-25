![Header](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=200&section=header&text=🐾%20PawPal%20India&fontSize=48&fontColor=fff&animation=fadeIn&fontAlignY=35&desc=AI-powered%20pet%20management%20and%20social%20discovery%20platform&descAlignY=55&descSize=16)

[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

> *Track health, identify breeds, find playmates — everything your pet needs in one place.*

---

## 🌟 What is PawPal?

PawPal India is a full-stack AI-powered pet platform built for Indian pet owners. It combines health management, computer vision, AI-driven veterinary advice, and social discovery into a single seamless experience.

India has one of the fastest-growing pet ownership markets in the world — yet there's no unified, AI-native platform built specifically for Indian pet owners. PawPal fills that gap.

---

## ✨ Features

### 🤖 AI Breed Scanner

- Upload any dog photo and identify the breed instantly
- Computer vision model trained on 95+ dog breeds
- High accuracy classification built with Google Gemini Vision API
- Works on mixed breeds too — returns top breed matches with confidence scores

### 🏥 Health Tracker

- Log and track vaccination records, vet visits, and medications
- Set reminders for upcoming care tasks
- Full health history timeline per pet
- Export records for vet visits

### 🩺 Dr. Paw — AI Health Advisor

- Powered by Google Gemini AI
- Ask any health question about your pet
- Get breed-specific advice and dietary recommendations
- Emergency symptom triage guidance

### 🐕 Social Discovery & Matching

- Create a profile for your pet
- Find nearby pets for playdates
- Community feed for pet owners
- Connect with local vets, groomers, and pet services

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) |
| AI / Vision | Google Gemini AI (Vision + Text) |
| Hosting | Vercel |
| Dev Tools | ESLint, Prettier, GitHub Actions |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│                  PawPal India                │
├─────────────┬───────────────┬───────────────┤
│   React 19  │  Supabase DB  │  Gemini AI    │
│  TypeScript │  Auth/Storage │  Vision + LLM │
│  Tailwind   │  Realtime     │  Health Advice│
└─────────────┴───────────────┴───────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account
- A Google Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/dmonk13/Pawversion2.0w.git
cd Pawversion2.0w

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY

# Start the development server
npm run dev
```

---

## 🗺️ Roadmap

- [x] AI breed scanner (95+ breeds)
- [x] Health records and reminders
- [x] Dr. Paw AI advisor
- [x] Social pet profiles
- [ ] Mobile app (React Native)
- [ ] Vet booking integration
- [ ] Pet food and product marketplace
- [ ] Multi-language support (Hindi, Tamil, Telugu)

---

## 👨‍💻 About the Builder

Built by **Shreyash Sharma** — PM2 @ ThoughtSpot, and a lifelong dog lover. PawPal is a passion project combining product thinking, AI engineering, and a genuine love for pets.

- [GitHub](https://github.com/shreyneil)
- [LinkedIn](https://www.linkedin.com/in/shreyash-sharma-b19918117/)

---

*If you love pets and love tech — ⭐ star this repo and let's build together!*

![Footer](https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=100&section=footer)
