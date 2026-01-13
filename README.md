# Pixelate SaaS: Social Asset Generator

![Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20Cloudinary%20%7C%20Prisma-blue)
![License](https://img.shields.io/badge/License-MIT-green)
---

## ⚡ Project Overview

**Pixelate** is a robust video processing pipeline designed to automate the creation of social media assets. It solves the challenge of handling long-running, compute-heavy tasks in a web environment by utilizing a distributed task queue.

Users upload videos directly to a CDN, while a background microservice asynchronously analyzes the content—generating transcripts, smart-cropped thumbnails, and AI-driven social media posts—without impacting the responsiveness of the user interface.

---

## 🏗️ System Architecture

Pixelate implements a **Producer–Consumer pattern** to ensure scalability and reliability.

> 📌 **Architecture Diagram**  
> *![Pixelate System Architecture](assets/Screenshot%202026-01-14%20001112.png.png)*

### 🔁 Data Flow

1. **Direct-to-Cloud Upload**  
   Uses signed URLs to upload large files directly to **Cloudinary**, bypassing the application server to minimize latency and bandwidth costs.

2. **Job Orchestration**  
   The API acts as a **producer**, pushing a lightweight job reference to a **Redis queue** immediately upon upload success.

3. **Asynchronous Processing**  
   A decoupled **Node.js worker** consumes jobs, orchestrating:
   - AI transcription (Groq / Whisper)
   - Image transformation and smart cropping

4. **State Synchronization**  
   The frontend polls the database for status updates (`processing → completed`), providing real-time feedback to the user.

---

## 🚀 Key Features

- **Event-Driven Backend**  
  Powered by **BullMQ (Redis)** to efficiently buffer traffic spikes and handle bursty workloads.

- **AI Intelligence Layer**  
  Uses **Llama 3 (via Groq)** to generate viral tweets, LinkedIn posts, and SEO-optimized descriptions.

- **Smart Cropping**  
  Automated facial detection to generate **9:16 vertical shorts** from landscape videos.

- **Fault Tolerance**  
  Automatic **dead-letter queues** and retry logic for failed AI or processing requests.

- **Type Safety**  
  End-to-end **TypeScript validation**, from the database layer (**Prisma**) to the UI.

---

## 🛠️ Tech Stack

| Component  | Technology                     | Role                                      |
|-----------|--------------------------------|-------------------------------------------|
| Frontend  | Next.js 14 (App Router)         | Server-side rendering & UI                |
| Queue     | Redis + BullMQ                  | Message broker & job management           |
| Worker    | Node.js (TypeScript)            | Dedicated processing microservice         |
| Database  | PostgreSQL + Prisma             | Relational data & state management        |
| AI Models | Whisper & Llama 3               | Transcription & content generation        |
| Storage   | Cloudinary                      | CDN & media transformation                |
