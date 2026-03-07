# Pixelate SaaS: Social Asset Generator

> Pixelate is a robust, event-driven video processing platform that automates the creation of diverse social media assets from a single upload.

![Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20Inngest%20%7C%20Prisma%20%7C%20Mux-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ⚡ Project Overview

**Pixelate** solves the challenge of handling compute-heavy, long-running video processing tasks in a modern web environment. Rather than blocking the user interface, it offloads heavy analysis and transformation tasks to a distributed, background serverless architecture.

Users simply upload their landscape videos, and a decoupled architecture springs into action. Behind the scenes, the system transcribes the audio using AI, smart-crops the video into vertical framing (9:16 portrait), and uses state-of-the-art LLMs to automatically generate ready-to-use social posts—all seamlessly orchestrated.

---

## 🚀 Key Features

- **Event-Driven Serverless Pipeline**  
  Powered by **Inngest** to reliably orchestrate video uploads, AI transcription, and content generation, preventing timeout issues and handling bursty workloads resiliently.

- **AI Content Intelligence**  
  Uses **Llama 3 (via Groq)** alongside **Whisper** to process ultra-fast video transcriptions and generate platform-optimized tweets, LinkedIn posts, and SEO descriptions.

- **High-Performance Streaming**  
  Integrated with **Mux** for lightning-fast, high-quality Direct-to-Cloud video upload and robust playback.

- **Automated Smart Cropping**  
  Utilizes **Cloudinary's `g_auto`** magic to automatically detect the primary subject (like a speaker) and crop wide horizontal videos into perfectly framed 9:16 vertical shorts.

- **Full-Stack Type Safety**  
  End-to-end **TypeScript** strictness, relying on **Prisma** for reliable relational data management and schema modeling.

---

## 🏗️ System Architecture

Pixelate implements an asynchronous, distributed pipeline to ensure maximum scalability.

> 📌 **Architecture Flow**  
> *![Pixelate System Architecture](assets/Screenshot%202026-01-14%20001112.png)*  
> *(Note: The conceptual flow incorporates event-driven mechanisms powered by Inngest & Mux)*

### 🔁 Data Flow

1. **Upload & Media Ingestion**  
   Users upload raw video securely via **Mux** or **Cloudinary**, bypassing the application server to minimize latency, bandwidth costs, and server strain.

2. **Job Orchestration (Inngest)**  
   The Next.js application acts as a producer, securely registering an event (e.g., `video/process.started`) directly to **Inngest** upon upload success.

3. **Asynchronous Processing Steps**  
   A decoupled serverless function seamlessly steps through:
   - Synchronizing database status to `processing`.
   - Creating an intelligent vertical smart-crop version of the video via Cloudinary.
   - Calling **Groq (Whisper)** for hyper-fast audio text transcription.
   - Calling **Groq (Llama 3)** to interpret the transcript and dynamically generate engaging social posts.

4. **Real-Time State Synchronization**  
   The frontend continuously polls the database for updates to the video record (`processing → completed`), populating the user dashboard with the AI-generated assets the moment they are available.

---

## 🛠️ Tech Stack

| Domain | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | Node / Next.js 14 | App Router, Server-side rendering, API Routes |
| **Database** | PostgreSQL & Prisma | Relational data persistence, schema definitions |
| **Background Jobs** | Inngest | Reliable serverless job queuing & orchestration |
| **Video Engine** | Mux | Direct-to-cloud ingest, fast encoding, resilient playback |
| **Media Transform** | Cloudinary | Advanced media generation and `g_auto` smart cropping |
| **AI Layer** | Groq (Llama 3 & Whisper) | Extremely fast inference for transcription & content |
| **Authentication** | Clerk | Instant, secure user management and sign-in |
| **UI** | TailwindCSS & DaisyUI | Beautiful, modern responsive UI interfaces |

---

## 🏃 Getting Started

### 1. Clone & Install
```bash
npm install
```

### 2. Environment Variables
Provide the necessary API keys in `.env` based on `.env.local`:
- `DATABASE_URL` (PostgreSQL)
- **Mux Integration** (`MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`)
- **Cloudinary** (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, etc.)
- **Inngest** (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`)
- **Groq AI** (`GROQ_API_KEY`)
- **Clerk Auth** (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)

### 3. Database Setup (Prisma)
```bash
npx prisma generate
npx prisma db push
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Run Background Jobs Locally
To test background processes, start the Inngest local dev server in a new terminal window:
```bash
npx inngest-cli@latest dev
```
