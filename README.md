# LuminolCraft

<div align="center">

![Vue 3](https://img.shields.io/badge/Vue-3.5.25-42b883?style=flat-square&logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.0-3178c6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646cff?style=flat-square&logo=vite)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.19.0-339933?style=flat-square&logo=node.js)
![pnpm](https://img.shields.io/badge/pnpm-recommended-F69220?style=flat-square&logo=pnpm)
![License](https://img.shields.io/badge/License-AGPL_v3-blue?style=flat-square)

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

---

LuminolCraft is the official website of the LuminolMC-affiliated Minecraft server, a modern Single Page Application (SPA) built with Vue 3. The website provides server status monitoring, news, server rules, support information, and more, with multi-language support and responsive design.

## Table of Contents

- [Project Background & Goals](#project-background--goals)
- [Core Features](#core-features)
- [Technology Stack](#technology-stack)
- [Environment Configuration Guide](#environment-configuration-guide)
- [Project Structure](#project-structure)
- [Core Module Introduction](#core-module-introduction)
- [API Documentation](#api-documentation)
- [Configuration Reference](#configuration-reference)
- [Testing Strategy](#testing-strategy)
- [Deployment Process](#deployment-process)
- [Version Control Standards](#version-control-standards)
- [Code Style Guide](#code-style-guide)
- [FAQ & Troubleshooting](#faq--troubleshooting)
- [Maintenance Notes](#maintenance-notes)
- [Contributing Guide](#contributing-guide)
- [License](#license)
- [Acknowledgments](#acknowledgments)
- [Contact](#contact)

## Project Background & Goals

### Background

LuminolCraft is the official website of the LuminolMC-affiliated Minecraft server. The project aims to provide a modern, high-performance web platform for the server's community, offering real-time server information, news updates, and support resources.

### Project Positioning

This project is a modern Single Page Application (SPA) that delivers:
- Real-time server status monitoring
- Dynamic news and announcement system
- Server rules and support information
- Multi-language and multi-theme support
- Responsive design for desktop and mobile devices

### Business Goals

- **Community Engagement**: Foster an active player community through real-time information and news
- **Server Transparency**: Provide visibility into server status, player counts, and performance
- **Donation Support**: Facilitate server maintenance through a dedicated support page

### Technical Goals

- **High Performance**: Code splitting, lazy loading, and optimized build output
- **Type Safety**: Complete TypeScript coverage for maintainable code
- **Responsive Design**: Seamless experience across desktop and mobile devices
- **Internationalization**: Built-in Chinese and English language support
- **SEO Optimization**: Open Graph tags, sitemap generation, and canonical URLs

### Target Audience

- LuminolCraft Minecraft server players
- Project maintainers and contributors
- Minecraft community members interested in server status

## Core Features

- **Server Status Monitoring** - Real-time display of online players, server version, and uptime via mcsrvstat.us API
- **News System** - Dynamic news list and detail pages with Markdown rendering, KaTeX math formulas, and syntax highlighting
- **Server Rules** - Clear and concise server rules display
- **Support Page** - Server support and donation information
- **Archive/Monitoring** - Server status history and visualization using Chart.js
- **Multi-language Support** - Built-in Chinese and English internationalization with localStorage persistence
- **Theme Switching** - Light/dark themes and multiple color schemes
- **Responsive Design** - Separate CSS for desktop and mobile, perfect adaptation
- **High Performance** - Vite build with code splitting, lazy loading, and terser minification
- **SEO Optimization** - Open Graph tags per route, automatic sitemap generation, canonical URLs
- **Analytics** - Privacy-focused analytics integration for traffic monitoring

## Technology Stack

### Runtime Dependencies

| Library | Version | Purpose | Documentation |
|---------|---------|---------|---------------|
| vue | ^3.5.25 | Progressive JavaScript framework | [vuejs.org](https://vuejs.org/) |
| vue-router | ^4.6.3 | Official router for Vue.js | [router.vuejs.org](https://router.vuejs.org/) |
| pinia | ^3.0.4 | State management | [pinia.vuejs.org](https://pinia.vuejs.org/) |
| vue-i18n | ^9.14.4 | Internationalization | [vue-i18n.intlify.dev](https://vue-i18n.intlify.dev/) |
| @unhead/vue | ^1.9.5 | Head tag management for SEO | [unhead.unjs.io](https://unhead.unjs.io/) |
| @unhead/ssr | ^2.0.19 | SSR head management utilities | [unhead.unjs.io](https://unhead.unjs.io/) |
| gsap | ^3.15.0 | Professional animation library | [gsap.com](https://gsap.com/) |
| chart.js | ^4.5.1 | Data visualization charts | [chartjs.org](https://www.chartjs.org/) |
| marked | ^17.0.1 | Markdown parser | [marked.js.org](https://marked.js.org/) |
| highlight.js | ^11.11.1 | Syntax highlighting | [highlightjs.org](https://highlightjs.org/) |
| katex | ^0.16.27 | Math formula rendering | [katex.org](https://katex.org/) |
| lodash | ^4.17.21 | Utility functions | [lodash.com](https://lodash.com/) |

### Dev Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| vite | ^7.2.4 | Build tool |
| @vitejs/plugin-vue | ^6.0.2 | Vue SFC support |
| vite-plugin-vue-devtools | ^8.0.5 | Developer tools |
| typescript | ~5.9.0 | Type checking |
| vue-tsc | ^3.2.1 | Vue type checking |
| vitest | ^4.0.14 | Unit testing framework |
| @vue/test-utils | ^2.4.6 | Vue testing utilities |
| jsdom | ^27.2.0 | DOM environment for tests |
| eslint | ^9.39.1 | Code linting |
| eslint-plugin-vue | ~10.5.1 | Vue ESLint rules |
| prettier | 3.6.2 | Code formatting |
| terser | ^5.44.1 | JS minification |
| tsx | ^4.21.0 | TypeScript execution |
| sitemap | ^9.0.0 | Sitemap generation |
| npm-run-all2 | ^8.0.4 | Parallel script runner |

### GSAP Plugins Used

The project uses the following GSAP plugins (registered in `src/gsap/plugin-setup.ts`):
- ScrollTrigger - Scroll-triggered animations
- ScrollToPlugin - Smooth scroll animations
- SplitText - Text splitting animations
- Flip - Layout transition animations
- CustomEase - Custom easing curves
- DrawSVGPlugin - SVG drawing animations
- MotionPathPlugin - Path-based motion animations
- MorphSVGPlugin - SVG morphing animations

## Environment Configuration Guide

### Prerequisites

- **Node.js**: >= 20.19.0 or >= 22.12.0 (specified in `package.json` engines)
- **Package Manager**: pnpm (recommended) or npm
- **Git**: For version control

### Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd craft.luminolsuki.moe

# Install dependencies (pnpm recommended)
pnpm install

# Or using npm
npm install

# Start development server (default port 3000, auto-opens browser)
pnpm dev

# Or using npm
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

### Test Environment

- **Framework**: Vitest 4.0.14 with jsdom environment
- **Config**: `vitest.config.ts` (extends vite.config, jsdom environment, excludes e2e)

```bash
# Run unit tests
pnpm test:unit

# Watch mode
pnpm test:unit -- --watch

# Coverage report
pnpm test:unit -- --coverage
```

### Production Environment

```bash
# Type check + build + sitemap generation
pnpm build

# Or using npm
npm run build

# Preview production build
pnpm preview

# Or using npm
npm run preview
```

- **Build output**: `dist/` directory
- **Node version for Netlify**: 22 (specified in `netlify.toml`)

### Build-time Global Variables

The following global variables are injected at build time via Vite `define`:

- `__APP_VERSION__`: Git commit hash (from `COMMIT_REF`, `CF_PAGES_COMMIT_SHA`, `GIT_COMMIT` environment variables, or git command)
- `__BUILD_TIME__`: ISO timestamp of the build

## Project Structure

```
craft.luminolsuki.moe/
├── .netlify/
│   └── functions/                    # Netlify serverless functions
│       ├── news.js                   # News data proxy function
│       └── version.js                # Version info function
├── .trae/
│   └── specs/                        # Project specifications
├── public/
│   ├── images/                       # Static images (WebP/AVIF)
│   └── favicon.ico                   # Site favicon
├── src/
│   ├── components/                   # Reusable components (7 files)
│   │   ├── Navbar.vue                # Navigation bar
│   │   ├── Footer.vue                # Footer
│   │   ├── MarkdownRenderer.vue      # Markdown renderer (KaTeX + highlight.js)
│   │   ├── ColorSchemeSwitcher.vue   # Color scheme switcher
│   │   ├── CookieConsentBanner.vue   # Cookie consent banner
│   │   ├── LastViewedPopup.vue       # Recently viewed popup
│   │   └── TocToggles.vue            # Theme and language toggle
│   ├── composables/                  # Composables (9 files)
│   │   ├── useCookieConsent.ts       # Cookie consent state
│   │   ├── useEntranceAnimation.ts   # Entrance animations
│   │   ├── useGsap.ts                # GSAP utilities
│   │   ├── useHoverAnimation.ts      # Hover animations
│   │   ├── useI18n.ts                # i18n helpers
│   │   ├── useLastViewedCookie.ts    # Recently viewed cookie
│   │   ├── usePageTransition.ts      # Page transitions
│   │   ├── useScrollTrigger.ts       # Scroll-triggered animations
│   │   └── useSplitText.ts           # Text splitting
│   ├── config/
│   │   └── app-config.ts             # Application configuration
│   ├── gsap/                         # GSAP animation module
│   │   ├── config/
│   │   │   ├── durations.ts          # Animation durations
│   │   │   ├── easings.ts            # Easing curves
│   │   │   └── staggers.ts           # Stagger configs
│   │   ├── defaults.ts               # Default animation config
│   │   ├── index.ts                  # Module entry
│   │   ├── match-media.ts            # Responsive animation matching
│   │   └── plugin-setup.ts           # Plugin registration
│   ├── i18n/                         # Internationalization
│   │   ├── locales/
│   │   │   ├── zh.ts                 # Chinese translations
│   │   │   └── en.ts                 # English translations
│   │   └── index.ts                  # i18n configuration
│   ├── router/
│   │   └── index.ts                  # Vue Router configuration
│   ├── stores/                       # Pinia state management
│   ├── styles/                       # CSS styles
│   │   ├── desktop/                  # Desktop styles
│   │   │   ├── home.css
│   │   │   ├── monitoring-styles.css
│   │   │   ├── navigation.css
│   │   │   ├── news-detail-styles.css
│   │   │   ├── news-styles.css
│   │   │   └── support-styles.css
│   │   ├── mobile/                   # Mobile styles
│   │   │   ├── home-mobile.css
│   │   │   ├── monitoring-mobile.css
│   │   │   ├── navigation-mobile.css
│   │   │   ├── news-detail-mobile.css
│   │   │   ├── news-mobile.css
│   │   │   ├── notfound-mobile.css
│   │   │   └── support-mobile.css
│   │   ├── fonts.css                 # Font definitions
│   │   ├── gsap-splittext.css        # GSAP SplitText styles
│   │   ├── responsive.css            # Responsive styles
│   │   ├── theme-colors.css          # Theme color variables
│   │   ├── typography.css            # Typography
│   │   └── vercel-design-system.css  # Vercel design system
│   ├── utils/                        # Utility functions
│   │   ├── generate-sitemap.ts       # Sitemap generation
│   │   └── utils.ts                  # Common utilities (debounce, throttle)
│   ├── views/                        # Page components (7 files)
│   │   ├── Home.vue                  # Homepage
│   │   ├── News.vue                  # News list
│   │   ├── NewsDetail.vue            # News detail
│   │   ├── SimpleRules.vue           # Server rules
│   │   ├── Support.vue               # Support page
│   │   ├── Archive.vue               # Server monitoring
│   │   └── NotFound.vue              # 404 page
│   ├── App.vue                       # Root component
│   └── main.ts                       # Application entry
├── .editorconfig                     # Editor configuration
├── .gitattributes                    # Git attributes
├── .gitignore                        # Git ignore rules
├── .prettierrc.json                  # Prettier configuration
├── DESIGN.md                         # Design system documentation
├── eslint.config.ts                  # ESLint configuration
├── index.html                        # HTML template
├── netlify.toml                      # Netlify deployment config
├── package.json                      # Project dependencies
├── tsconfig.json                     # TypeScript config (references)
├── tsconfig.app.json                 # App TypeScript config
├── tsconfig.node.json                # Node TypeScript config
├── tsconfig.vitest.json              # Vitest TypeScript config
├── vite.config.ts                    # Vite configuration
└── vitest.config.ts                  # Vitest configuration
```

## Core Module Introduction

### Page Components (views/)

| Component | Route | Description |
|-----------|-------|-------------|
| Home.vue | `/` | Homepage with hero section, features, server info |
| News.vue | `/News` | News list with pagination |
| NewsDetail.vue | `/NewsDetail` | News detail with Markdown rendering (aliases: `/news-detail`, `/news-detail.html`, `/NewsDetail.html`) |
| SimpleRules.vue | `/SimpleRules` | Server rules display |
| Support.vue | `/Support` | Support and donation info |
| Archive.vue | `/Archive` | Server monitoring and history |
| NotFound.vue | `/:pathMatch(.*)*` | 404 page |

### Reusable Components (components/)

- **Navbar.vue** - Navigation bar with fixed positioning support
- **Footer.vue** - Footer with copyright information
- **MarkdownRenderer.vue** - Markdown rendering with KaTeX math formulas and highlight.js syntax highlighting
- **ColorSchemeSwitcher.vue** - Color scheme toggle component
- **CookieConsentBanner.vue** - GDPR cookie consent banner
- **LastViewedPopup.vue** - Recently viewed content popup
- **TocToggles.vue** - Theme and language toggle component

### Composables (composables/)

- **useCookieConsent.ts** - Cookie consent state management
- **useEntranceAnimation.ts** - Page entrance animations
- **useGsap.ts** - GSAP utility wrapper
- **useHoverAnimation.ts** - Hover effect animations
- **useI18n.ts** - Internationalization helper functions
- **useLastViewedCookie.ts** - Recently viewed cookie logic
- **usePageTransition.ts** - Page transition animations
- **useScrollTrigger.ts** - Scroll-triggered animations
- **useSplitText.ts** - Text splitting for animations

### GSAP Module (gsap/)

- **plugin-setup.ts** - Registers 8 GSAP plugins (ScrollTrigger, ScrollToPlugin, SplitText, Flip, CustomEase, DrawSVGPlugin, MotionPathPlugin, MorphSVGPlugin)
- **defaults.ts** - Default animation config (duration: 0.6, ease: 'power2.out', overwrite: 'auto')
- **match-media.ts** - Responsive animation matching
- **config/** - Animation configurations (durations.ts, easings.ts, staggers.ts)

### Internationalization (i18n/)

- **Default locale**: `zh` (Chinese)
- **Fallback locale**: `en` (English)
- **Persistence**: localStorage key `locale`
- **Mode**: Composition API (legacy: false)
- **Files**: `locales/zh.ts` (Chinese), `locales/en.ts` (English)

## API Documentation

### Netlify Functions

#### GET /.netlify/functions/news

Fetches news data from an external GitHub repository.

- **Methods**: GET, OPTIONS (CORS preflight)
- **Response**: JSON array containing news items
- **Data source**: `LuminolCraft/news.json` repository (main branch)
- **CORS**: `Access-Control-Allow-Origin: *`
- **Error response**: 500 status code with error message

#### GET /.netlify/functions/version

Returns deployment version information.

- **Methods**: GET, OPTIONS (CORS preflight)
- **Response**: JSON object with `version`, `fullHash`, `branch`, `deployTime`, `timestamp`, `source` fields
- **Version sources** (priority order): `COMMIT_REF`, `GIT_COMMIT_REF`, `NETLIFY_VERSION`, `DEPLOY_ID`, or GitHub API fallback
- **Error response**: 500 status code with error message

### External APIs Used

- **mcsrvstat.us API**: Minecraft server status (player count, version, uptime)
- **GitHub Raw Content**: News data repository
- **GitHub API**: Commit info fallback for version function
- **Analytics Service**: Privacy-focused analytics platform for traffic monitoring

### Build-time Variables

- `__APP_VERSION__`: Injected via Vite `define`, contains the Git commit hash
- `__BUILD_TIME__`: Injected via Vite `define`, contains the ISO timestamp of the build

## Configuration Reference

### Application Config (`src/config/app-config.ts`)

```typescript
export interface AppConfig {
  showTocToggles: boolean;           // Show theme/language toggle component
  navbarFixed: boolean;              // Fixed navigation bar
  showFooterCopyright: boolean;      // Footer copyright visibility
  newsPagination: {
    desktopItemsPerPage: number;     // Desktop items per page (default: 6)
    mobileItemsPerPage: number;      // Mobile items per page (default: 2)
    maxDisplayedPages: number;       // Max page numbers displayed (default: 5)
  };
}
```

### Vite Config (`vite.config.ts`)

- **Alias**: `@` → `./src`
- **Build**: Terser minification, manual chunks (vue-vendor, markdown, highlight), CSS code splitting, no sourcemap
- **Server**: Port 3000, auto-open browser
- **Define**: `__APP_VERSION__`, `__BUILD_TIME__`

### TypeScript Config

- **tsconfig.json**: Project references (node, app, vitest)
- **tsconfig.app.json**: Extends @vue/tsconfig dom, paths `@/*` → `./src/*`
- **tsconfig.vitest.json**: Extends vite config, jsdom environment

### Netlify Config (`netlify.toml`)

```toml
[build]
  command = "pnpm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Testing Strategy

### Framework

- **Vitest** 4.0.14 with jsdom environment
- **@vue/test-utils** for component testing

### Test Commands

```bash
# Run unit tests
pnpm test:unit

# Watch mode
pnpm test:unit -- --watch

# Coverage report
pnpm test:unit -- --coverage
```

### Test File Location

- **Test files**: `src/**/__tests__/*`
- **Config file**: `vitest.config.ts`
- **Exclusions**: `e2e/**`, default vitest exclusions

### Testing Guidelines

- Write unit tests for composables and utility functions
- Use @vue/test-utils for component testing
- Mock external API calls in tests
- Test both Chinese and English i18n outputs
- Ensure tests pass before creating pull requests

## Deployment Process

### Netlify Deployment (Primary)

1. Push code to GitHub repository
2. Connect the repository in Netlify dashboard
3. Configure build settings (auto-detected from `netlify.toml`):
   - Build command: `pnpm run build`
   - Publish directory: `dist`
   - Node version: 22
4. Netlify auto-deploys on push to `main` branch
5. Netlify Functions deployed from `.netlify/functions/`
6. SPA redirect configured for client-side routing

### Other Platforms

- **Vercel**: Import repo, framework preset Vue, build command `pnpm build`, output `dist`
- **GitHub Pages**: Build locally, deploy `dist/` to `gh-pages` branch, configure base path
- **Cloudflare Pages**: Build command `pnpm build`, output `dist`, Node version 20+
- **AWS S3 + CloudFront**: Upload `dist/` to S3, configure CloudFront for SPA

### Build Output

- **Location**: `dist/`
- **Contents**: `index.html`, `assets/`, `sitemap.xml`
- **Code splitting**: vue-vendor, markdown, highlight chunks
- **No sourcemaps** in production (smaller bundle size)

## Version Control Standards

### Branch Strategy

- `main`: Production-ready code
- `feature/*`: New feature development
- `fix/*`: Bug fixes
- `docs/*`: Documentation updates

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`

**Examples**:
```
feat(news): add pagination for news list
fix(router): resolve NewsDetail alias issue
docs(readme): update deployment guide
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch from `main`: `git checkout -b feature/AmazingFeature`
3. Ensure tests pass: `pnpm test:unit`
4. Ensure linting passes: `pnpm lint`
5. Ensure type check passes: `pnpm type-check`
6. Update documentation if needed
7. Create a Pull Request with description and screenshots

## Code Style Guide

### ESLint Configuration

- **Config file**: `eslint.config.ts`
- **Rules**: Vue essential + TypeScript recommended
- **Vitest plugin** for test files
- **Prettier integration** (skip-formatting)

```bash
# Run ESLint with auto-fix
pnpm lint

# Or using npm
npm run lint
```

### Prettier Configuration

- **No semicolons** (`semi: false`)
- **Single quotes** (`singleQuote: true`)
- **Print width**: 100

```bash
# Format code
pnpm format

# Or using npm
npm run format
```

### EditorConfig

- **Indent**: 2 spaces
- **Line ending**: LF
- **Charset**: UTF-8
- **Trim trailing whitespace**: Yes
- **Insert final newline**: Yes
- **Max line length**: 100

### TypeScript Guidelines

- **Strict mode** (via @vue/tsconfig)
- Use **Composition API** with `<script setup lang="ts">`
- Define **interfaces** for all data structures
- Use `@/` alias for imports
- Avoid `any` type (use `unknown` or proper types)

## FAQ & Troubleshooting

### 1. Dev server won't start / port 3000 in use

**Solution**: Modify `server.port` in `vite.config.ts`, or kill the process using port 3000:

```bash
# Find and kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change the port in vite.config.ts
server: { port: 3001 }
```

### 2. pnpm install fails with peer dependency errors

**Solution**: Ensure Node.js version >= 20.19.0 or >= 22.12.0. If needed, use:

```bash
pnpm install --force
```

### 3. Build fails with type errors

**Solution**: Run type check separately to see detailed errors:

```bash
pnpm type-check
```

Fix all type errors before running `pnpm build`.

### 4. News not loading on local development

**Solution**: The news function runs on Netlify. During local development, the app may call the production API endpoint. Check `News.vue` for the API URL configuration.

### 5. i18n changes not reflecting

**Solution**: Clear localStorage `locale` key in browser DevTools. Ensure both `zh.ts` and `en.ts` have the same key structure.

### 6. GSAP animations not working

**Solution**: Ensure `setupGsap()` is called in `main.ts`. Check that all required plugins are registered in `src/gsap/plugin-setup.ts`.

### 7. Sitemap generation fails during build

**Solution**: Ensure `dist/` directory exists. The sitemap script runs after the build. Check `src/utils/generate-sitemap.ts` for errors.

### 8. Netlify deployment shows 404 on refresh

**Solution**: Verify `netlify.toml` has the SPA redirect rule:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 9. Images not loading (referrer policy)

**Solution**: `index.html` has `<meta name="referrer" content="no-referrer">`. Some image hosts require a referrer. Check image URLs and host policies.

### 10. KaTeX/math formulas not rendering

**Solution**: Ensure KaTeX CSS is imported. Check `MarkdownRenderer.vue` for KaTeX integration and verify the KaTeX CSS is loaded.

## Maintenance Notes

### Regular Maintenance Tasks

- **Dependencies**: Run `pnpm outdated` monthly, update dependencies carefully
- **Security**: Run `pnpm audit` regularly, fix vulnerabilities promptly
- **Node.js**: Keep Node.js version updated within the supported range
- **News data**: Maintain the `LuminolCraft/news.json` repository
- **Analytics**: Monitor analytics dashboard for traffic anomalies

### Critical Files to Understand

- `src/main.ts` - Application entry, plugin registration, SEO meta injection
- `src/router/index.ts` - Route definitions with OG meta tags
- `src/config/app-config.ts` - Centralized application configuration
- `vite.config.ts` - Build optimization settings
- `netlify.toml` - Deployment and caching rules

### Performance Considerations

- Code splitting configured for vue/markdown/highlight vendors
- Images use WebP/AVIF formats for smaller file sizes
- Font preloading configured in `index.html`
- CSS code splitting enabled
- No sourcemaps in production (smaller bundle)
- Terser minification enabled

### SEO Maintenance

- OG tags configured per-route in `src/router/index.ts`
- Sitemap auto-generated on build via `src/utils/generate-sitemap.ts`
- Canonical URLs injected in `src/main.ts`
- Update sitemap routes in `generate-sitemap.ts` when adding new pages

### i18n Maintenance

- Always update both `zh.ts` and `en.ts` simultaneously
- Maintain consistent key structure across languages
- Test language switching after updates
- Default locale is `zh`, fallback locale is `en`

### GSAP/Animation Maintenance

- Plugin registration in `src/gsap/plugin-setup.ts`
- Default duration/ease in `src/gsap/defaults.ts`
- Animation configs in `src/gsap/config/`
- Some plugins (DrawSVGPlugin, MorphSVGPlugin) are premium GSAP plugins - verify license

## Contributing Guide

### Fork and Branch Workflow

1. Fork the repository on GitHub
2. Clone your fork locally
3. Add the upstream repository as a remote
4. Create a feature branch for your changes
5. Make your changes following the code style guidelines
6. Test your changes thoroughly
7. Submit a Pull Request

### Code Style Requirements

- Follow ESLint rules (run `pnpm lint`)
- Follow Prettier formatting (run `pnpm format`)
- Use 2-space indentation
- Use LF line endings
- No trailing whitespace

### TypeScript Requirements

- Define types for all new functions and components
- Use interfaces for data structures
- Avoid `any` type
- Use the `@/` alias for imports

### Test Requirements

- Write tests for new composables and utilities
- Ensure existing tests pass: `pnpm test:unit`
- Test both Chinese and English outputs for i18n changes

### PR Review Process

- Ensure all CI checks pass
- Update documentation if needed
- Include screenshots for UI changes
- Respond to review feedback promptly

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Vue.js](https://vuejs.org/) - The Progressive JavaScript Framework
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [TypeScript](https://www.typescriptlang.org/) - JavaScript with syntax for types
- [Pinia](https://pinia.vuejs.org/) - The Vue Store that you will enjoy using
- [Vue Router](https://router.vuejs.org/) - The official router for Vue.js
- [Vue I18n](https://vue-i18n.intlify.dev/) - Vue I18n plugin
- [Chart.js](https://www.chartjs.org/) - Simple yet flexible JavaScript charting library
- [Marked](https://marked.js.org/) - A markdown parser and compiler
- [Highlight.js](https://highlightjs.org/) - Syntax highlighting for the Web
- [GSAP](https://gsap.com/) - Professional-grade animation for the modern web
- [Lodash](https://lodash.com/) - A modern JavaScript utility library
- [KaTeX](https://katex.org/) - Fast math typesetting for the web
- [Unhead](https://unhead.unjs.io/) - Universal head tag manager for Vue

## Contact

- QQ Group: [Join Now](https://qm.qq.com/q/M29Eyniu8S)
- GitHub Issues: [Submit Issue](https://github.com/NARCSSU/craft.luminolsuki.moe/issues)

---

<div align="center">

**Made with ❤️ by LuminolCraft Team**

</div>
