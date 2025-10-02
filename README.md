# Cloudinary SAAS: Social Asset Generator

Cloudinary SAAS is a web application designed to optimize and automate the content creation workflow by transforming a single uploaded video into a suite of platform-specific image assets (e.g., thumbnails, previews) ready for social media. It leverages Cloudinary’s video and AI capabilities to streamline asset generation, improving efficiency for social media content creators.

## Conceptual Features

### 1. Video Upload & Storage
- **Cloudinary Integration**: Securely upload and store video files using Cloudinary as the backend Digital Asset Management (DAM) system.

### 2. AI-Driven Best Frame Selection
- **Automatic Frame Selection**: Utilizes Cloudinary’s AI analysis to suggest the most engaging frames from the video (e.g., keyframes, frames with faces), eliminating manual frame scrubbing.

### 3. Dynamic Asset Generation
- **Social Media Image Generation**: In a single click, generate all necessary image assets for multiple social platforms with the correct aspect ratios and formatting:
  - **Instagram/Facebook**: 1:1 (Square), 4:5 (Vertical), 9:16 (Story/Reel).
  - **X (Twitter)**: 16:9 for Card.

### 4. Intelligent Cropping
- **Auto-Gravity Cropping**: Uses Cloudinary's `g_auto` transformation to ensure the main subject (e.g., a face) remains centered and visible, even when cropping from a widescreen source.

### 5. Branded Overlays (Planned)
- **Overlay Features**: Future capability to dynamically add branded overlays, such as text, logos, or watermarks, to the generated assets using Cloudinary’s overlay transformations.

### 6. Asset Management Dashboard
- **Centralized Dashboard**: A user interface built with Prisma to view upload history, manage generated assets, and track progress.

## Technology Stack

The project is built using a modern full-stack approach leveraging Next.js with the App Router.

| **Category**      | **Technology**             | **Purpose**                                                   |
|-------------------|----------------------------|---------------------------------------------------------------|
| Framework         | Next.js (App Router)       | React framework for server-side rendering and API routes.      |
| Language          | TypeScript                 | Ensures code quality, predictability, and scalability.         |
| Media/AI          | Cloudinary                 | Primary service for video storage, transformations, and AI analysis. |
| Database          | Prisma                     | ORM for interacting with the database (e.g., user data, video metadata, asset history). |
| Styling           | Tailwind CSS               | Utility-first CSS framework for rapid UI development.          |

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Cloudinary Account (Free tier is sufficient)
- A connected database (e.g., PostgreSQL, MySQL) compatible with Prisma.

### Setup Instructions

#### 1. Clone the Repository
```bash
git clone https://github.com/Rudra775/cloudinary-saas.git
cd cloudinary-saas
