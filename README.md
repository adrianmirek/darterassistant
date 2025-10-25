# Darter Assistant

> A web-based analytics and improvement platform for amateur and professional darts players.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](#)

## Table of Contents

1. [Tech Stack](#tech-stack)  
2. [Getting Started](#getting-started)  
3. [Available Scripts](#available-scripts)  
4. [Project Scope](#project-scope)  
   - [Included in MVP](#included-in-mvp)  
   - [Excluded from MVP](#excluded-from-mvp)  
5. [Project Status](#project-status)  
6. [License](#license)  

## Tech Stack

- **Frontend**
  - Astro 5
  - React 19
  - TypeScript 5
  - Tailwind CSS 4
  - Shadcn/ui
- **Backend**
  - Supabase (PostgreSQL database, SDKs, built-in authentication)
- **AI Integration**
  - Openrouter.ai service for model access
- **CI/CD & Hosting**
  - GitHub Actions (CI/CD pipelines)
  - DigitalOcean (Docker-based hosting)

## Getting Started

### Prerequisites

- Node.js v22.14.0 (see `.nvmrc`)
- npm (comes with Node.js)
- A Supabase project with:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- An Openrouter.ai API key:
  - `OPENROUTER_API_KEY`

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/darter-assistant.git
cd darter-assistant

# Use the correct Node version
nvm use

# Install dependencies
npm install

# Create a .env file in the project root:
# .env
# SUPABASE_URL=your_supabase_url
# SUPABASE_ANON_KEY=your_supabase_anonymous_key
# OPENROUTER_API_KEY=your_openrouter_api_key

# Start the development server
npm run dev
```

## Available Scripts

- `npm run dev`  
  Start Astro in development mode with hot reload.
- `npm run build`  
  Build the production-ready site.
- `npm run preview`  
  Preview the production build locally.
- `npm run astro`  
  Run Astro CLI commands.
- `npm run lint`  
  Run ESLint across the codebase.
- `npm run lint:fix`  
  Automatically fix ESLint errors.
- `npm run format`  
  Format code with Prettier.

## Project Scope

### Included in MVP

- Manual entry of tournament results
- Basic analytics:
  - Goal progress percentage
  - Average score (AVG) over time
- AI-powered motivational feedback via on-demand toast messages

### Excluded from MVP

- Live scoring or match-by-match data entry
- Social sharing or multi-user collaboration
- Integration with official tournament management systems
- Advanced visualizations (charts, heatmaps)
- Training plan generation
- Editing or deleting tournament entries

## Project Status

This project is currently in **MVP / Alpha** stage. Core functionality has been implemented, and the focus is on polishing, testing, and adding missing environment configuration and license.

## License

This project is distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

> **Note:** A `LICENSE` file is not yet present. Please add your chosen license to the repository.
