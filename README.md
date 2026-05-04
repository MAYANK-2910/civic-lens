<div align="center">
  <img src="https://raw.githubusercontent.com/MAYANK-2910/civic-lens/main/public/vite.svg" alt="Civic Lens Logo" width="80" height="80">

  # Civic Lens 🏙️
  
  **A modern municipal transparency portal bridging the gap between citizens and local governance.**

  [![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.0-purple?style=for-the-badge&logo=vite)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
  [![Firebase](https://img.shields.io/badge/Firebase-Auth%2FFirestore-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
  [![Gemini](https://img.shields.io/badge/Gemini-AI-1A73E8?style=for-the-badge&logo=google)](https://ai.google.dev/)
</div>

<br />

Civic Lens is a SaaS-style web application designed to empower citizens with data-driven insights into municipal budgets, infrastructure reporting, and local governance. By leveraging modern web technologies and AI, the platform delivers a fluid, premium, and highly interactive user experience.

---

## ✨ Features

- **📊 Budget Explorer:** Interactive dashboards mapping municipal spending across departments with rich data visualizations (Recharts).
- **🧠 AI Insights (Powered by Gemini):** Automatically analyzes complex financial datasets to generate plain-language summaries and trend forecasts for citizens.
- **🗣️ Citizens Voice:** A structured feedback and reporting system where users can submit infrastructure issues, upvote community concerns, and track resolution statuses.
- **🗳️ Strategic Planning Polls:** Allows the community to vote on upcoming initiatives and budget allocations.
- **🛡️ Secure Authentication:** Frictionless sign-up and login utilizing Firebase Authentication (Google OAuth & Email).
- **🌗 Liquid Glass UI:** A beautiful, responsive, and animated user interface featuring a dynamic dark/light mode, custom glassmorphism components, and spring-physics page transitions via Framer Motion.

## 🚀 Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, Lucide Icons
- **Animation:** Framer Motion (`motion/react`)
- **Backend & Auth:** Firebase (Auth, Firestore)
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Routing:** React Router v7

## 🛠️ Local Development Setup

To run this project locally, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/MAYANK-2910/civic-lens.git
cd civic-lens
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory and configure your Google Gemini API key:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```
*(Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey))*

### 4. Start the Development Server
```bash
npm run dev
```
The application will start on `http://localhost:3000`.

## 📁 Project Structure

```text
civic-lens/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components (Dashboard, Auth, Layout, etc.)
│   ├── lib/                # Utility functions, Firebase config, Context providers
│   ├── App.tsx             # Main application router & entry
│   ├── index.css           # Global CSS and custom Tailwind theme configuration
│   ├── main.tsx            # React DOM renderer
│   └── types.ts            # TypeScript interfaces
├── .env.example            # Environment variables template
├── firebase-blueprint.json # Firebase schema representation
├── tailwind.config.js      # Tailwind v4 configuration
└── vite.config.ts          # Vite bundler configuration
```

## 🎨 UI/UX Philosophy

The interface was designed with a **"Fluid SaaS"** approach. Key characteristics include:
- Monochromatic, high-contrast palette with intelligent color-mapping for system status (Error, Success, Warning).
- Spring-based micro-interactions for buttons, cards, and data toggles.
- Ambient blurs and backdrop-filters to create depth.
- Skeleton loaders and progressive rendering to ensure perceived performance remains high during data fetches.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
