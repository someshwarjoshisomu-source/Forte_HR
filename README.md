# ForteHR Dashboard

A modern HR dashboard web application for employee feedback, recognition, and analytics, built with React, TypeScript, Vite, and Supabase. Developed as part of an internship project.

## Features

- **Employee Dashboard:** View personal stats, submit feedback, and track recognition.
- **Manager & HR Dashboards:** Access team/organization insights, manage feedback, and recognize employees.
- **AI Insights:** Integrated OpenAI-powered assistant for HR support and analytics.
- **Authentication:** Secure login and role-based access.
- **Responsive UI:** Built with modern UI components and Tailwind CSS.
- **Supabase Backend:** Real-time data, RLS policies, and secure storage.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **AI Integration:** OpenAI API
- **Styling:** Tailwind CSS

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/fortehr-dashboard.git
   cd fortehr-dashboard
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up environment variables:**
   - Copy `.env.local.example` to `.env.local` and fill in your Supabase and OpenAI keys.
   - Example:
     ```env
     VITE_SUPABASE_PROJECT_ID=your_project_id
     VITE_SUPABASE_PUBLIC_ANON_KEY=your_anon_key
     VITE_OPENAI_API_KEY=your_openai_key
     ```
4. **Start the development server:**
   ```sh
   npm run dev
   ```

## Folder Structure

- `src/components/` — Reusable UI and dashboard components
- `src/pages/` — Page-level components for different user roles
- `src/utils/` — Utility functions and Supabase client setup
- `supabase/` — SQL policies and edge functions

## Security & Best Practices

- **Sensitive keys** are stored in `.env.local` (not committed to Git).
- **node_modules** and all `.env*` files are gitignored.
- **Attributions** for third-party assets are in `src/Attributions.md`.

## Screenshots

_Add screenshots or GIFs here to showcase the UI._

## License

This project is for educational and demonstration purposes. For reuse or contributions, please open an issue or pull request.

---

_Developed during an internship as a demonstration of full-stack web development, cloud integration, and modern UI/UX._
