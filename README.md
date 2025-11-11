# Darter Assistant

> A web-based analytics and improvement platform for amateur and professional darts players. 

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](#)
[![CI/CD Pipeline](https://github.com/adiranmirek/darterassistant/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/adiranmirek/darterassistant/actions/workflows/ci-cd.yml)

## Table of Contents

1. [Tech Stack](#tech-stack)  
2. [Getting Started](#getting-started)  
3. [Available Scripts](#available-scripts)  
4. [CI/CD Pipeline](#cicd-pipeline)  
5. [Testing](#testing)  
6. [Project Scope](#project-scope)  
   - [Included in MVP](#included-in-mvp)  
   - [Excluded from MVP](#excluded-from-mvp)  
7. [Project Status](#project-status)  
8. [License](#license)  

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
- **Testing**
  - Vitest (Unit & integration tests)
  - React Testing Library (Component tests)
  - Playwright (E2E tests, multi-browser)
  - Supertest (API endpoint tests)
  - OWASP ZAP (Security scanning)
  - axe DevTools (Accessibility testing)
- **CI/CD & Hosting**
  - GitHub Actions (CI/CD pipelines)
  - DigitalOcean (Docker-based hosting)

## Getting Started

### Prerequisites

- Node.js **v22.14.0** (see `.nvmrc`)
- npm (comes with Node.js)
- A Supabase project with:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- An Openrouter.ai API key:
  - `OPENROUTER_API_KEY`

### Installation

```bash
# Clone the repository
git clone https://github.com/adiranmirek/darterassistant.git
cd darterassistant

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

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment.

### Workflow Features

- **Automated Testing**: Runs linting and unit tests on every push to main
- **Production Build**: Validates that the production build succeeds
- **Manual Trigger**: Can be triggered manually from the Actions tab
- **Artifacts**: Stores build artifacts and test reports

### Setup Instructions

The CI/CD pipeline is ready to use without any additional configuration:

1. **No Secrets Required**  
   The workflow runs linting, unit tests, and production builds without requiring GitHub secrets.

2. **Follow the Checklist**  
   See [`.github/CI_CD_SETUP_CHECKLIST.md`](.github/CI_CD_SETUP_CHECKLIST.md) for step-by-step setup instructions.

3. **View Workflow Documentation**  
   See [`.github/workflows/README.md`](.github/workflows/README.md) for detailed workflow documentation.

### Running the Workflow

The workflow runs automatically on:
- Push to `main` branch
- Manual trigger from Actions tab

To manually trigger:
1. Go to the Actions tab in GitHub
2. Select "CI/CD Pipeline"
3. Click "Run workflow"

## Testing

This project includes comprehensive testing:

- **Unit & Integration Tests**: `npm test` (Vitest)
- **E2E Tests**: `npm run test:e2e` (Playwright)
- **Test Coverage**: `npm run test:coverage`

For E2E test setup, see:
- [`ENV_SETUP_E2E.md`](ENV_SETUP_E2E.md) - E2E environment configuration
- [`E2E_TEARDOWN_SETUP.md`](E2E_TEARDOWN_SETUP.md) - E2E cleanup documentation
- [`TESTING.md`](TESTING.md) - Comprehensive testing guide

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

This project is currently in **MVP / Alpha** stage.

## License

This project is distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

> **Note:** A `LICENSE` file is not yet present. Please add your chosen license to the repository.
