# Pixelate SaaS: Social Asset Generator

![Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20Cloudinary%20%7C%20Prisma-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**Pixelate SaaS** is a high-performance web application designed to optimize and automate the social media content creation workflow. By transforming a single uploaded video into a suite of platform-specific image assets, Pixelate leverages Cloudinary’s advanced AI and video capabilities to streamline production for content creators.

---

## 🚀 Conceptual Features

### 1. Video Upload & Storage
* **Secure DAM Integration:** Direct integration with **Cloudinary** for secure video uploads and backend Digital Asset Management (DAM).
* **Scalable Storage:** Handles high-resolution video files efficiently off-server.

### 2. AI-Driven Best Frame Selection
* **Automated Intelligence:** Utilizes Cloudinary’s AI analysis to identify and extract the most engaging frames (e.g., clear faces, action shots, keyframes).
* **Efficiency:** Eliminates the tedious process of manual frame scrubbing and screenshotting.

### 3. Dynamic Asset Generation
Generate all necessary assets for a multi-platform campaign in a single click. The system automatically formats images with correct aspect ratios:
* **Instagram/Facebook:** 1:1 (Square), 4:5 (Vertical Feed), 9:16 (Stories/Reels).
* **X (Twitter):** 16:9 (Social Card).

### 4. Intelligent Cropping
* **Content Awareness:** Implements Cloudinary's `g_auto` (gravity auto) transformation.
* **Subject Focus:** Ensures the main subject (e.g., a speaker's face) remains centered and visible, even when cropping a vertical Story from a widescreen video source.

### 5. Asset Management Dashboard
* **Centralized Hub:** A clean UI built with **Prisma** to track upload history, manage generated assets, and monitor processing status.

### 6. Roadmap (Planned Features)
* **Branded Overlays:** Dynamic injection of logos, watermarks, and text overlays using transformation layers.

---

## 🛠 Technology Stack

Pixelate is built using a modern full-stack approach, prioritizing type safety and server-side performance.

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | **Next.js (App Router)** | Server-side rendering, API routes, and modern React architecture. |
| **Language** | **TypeScript** | Ensures code quality, strictly typed interfaces, and scalability. |
| **Media Engine** | **Cloudinary** | The backbone for video storage, AI analysis, and image transformations. |
| **Database** | **Prisma** | Modern ORM for managing user data, video metadata, and asset history. |
| **Styling** | **Tailwind CSS** | Utility-first framework for rapid, responsive UI development. |

---

## ⚡ Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
* **Node.js** (v18 or higher)
* **npm** or **yarn**
* **Cloudinary Account** (Free tier is sufficient for development)
* **PostgreSQL/MySQL Database** (Local or cloud-hosted)

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/pixelate-saas.git](https://github.com/your-username/pixelate-saas.git)
    cd pixelate-saas
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Configuration**
    Create a `.env` file in the root directory and add your credentials:
    ```env
    # Database
    DATABASE_URL="postgresql://user:password@localhost:5432/pixelate?schema=public"

    # Cloudinary Credentials
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloud_name"
    CLOUDINARY_API_KEY="your_api_key"
    CLOUDINARY_API_SECRET="your_api_secret"
    
    # NextAuth (If Authentication is implemented)
    NEXTAUTH_SECRET="your_secret"
    NEXTAUTH_URL="http://localhost:3000"
    ```

4.  **Database Setup**
    Initialize Prisma and push the schema to your database:
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Run the Development Server**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📂 Project Structure

```text
├── app/                  # Next.js App Router directories
│   ├── api/              # Backend API routes (Cloudinary signing, DB ops)
│   ├── (dashboard)/      # Protected dashboard routes
│   └── page.tsx          # Landing page
├── components/           # Reusable UI components
├── lib/                  # Utility functions (Prisma client, Cloudinary helpers)
├── prisma/               # Database schema
└── public/               # Static assets/pixelate-saas.git
cd cloudinary-saas
