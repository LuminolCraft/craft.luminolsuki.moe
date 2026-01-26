# LuminolCraft

<div align="center">

![Vue 3](https://img.shields.io/badge/Vue-3.5.25-42b883?style=flat-square&logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.0-3178c6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646cff?style=flat-square&logo=vite)
![License](https://img.shields.io/badge/License-AGPL_v3-blue?style=flat-square)

</div>

LuminolCraft is the official website of the LuminolMC-affiliated Minecraft server, a modern Single Page Application (SPA) built with Vue 3. The website provides server status monitoring, news, server rules, support information, and more, with multi-language support and responsive design.

## Core Features

- **Server Status Monitoring** - Real-time display of server online players, version, and more
- **News System** - Dynamic news list and detail pages with Markdown rendering
- **Server Rules** - Clear and concise server rules display
- **Support Page** - Server support and donation information
- **Multi-language Support** - Built-in Chinese and English internationalization
- **Theme Switching** - Support for light/dark themes and multiple color schemes
- **Responsive Design** - Perfect adaptation for desktop and mobile devices
- **High Performance** - Built with Vite, supports code splitting and lazy loading
- **TypeScript** - Complete type safety support

## Quick Start

### Prerequisites

- Node.js >= 20.19.0 or >= 22.12.0
- pnpm (recommended) or npm

### Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### Development Mode

```bash
# Start development server (default port 3000)
pnpm dev

# Or using npm
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
# Type check and build
pnpm build

# Or using npm
npm run build
```

The build output will be in the `dist/` directory.

### Preview Production Build

```bash
pnpm preview

# Or using npm
npm run preview
```

## Project Structure

```
luminolcraft-vue/
├── public/                 # Static assets
├── src/
│   ├── components/          # Reusable components
│   │   ├── Navbar.vue       # Navigation bar
│   │   ├── Footer.vue       # Footer
│   │   ├── MarkdownRenderer.vue  # Markdown renderer
│   │   ├── ThemeToggle.vue  # Theme toggle
│   │   ├── LanguageSwitcher.vue  # Language switcher
│   │   └── ColorSchemeSwitcher.vue  # Color scheme switcher
│   ├── config/              # Application configuration
│   │   └── app-config.ts    # Configuration file
│   ├── i18n/                # Internationalization
│   │   ├── locales/         # Language files
│   │   │   ├── zh.ts        # Chinese
│   │   │   └── en.ts        # English
│   │   └── index.ts         # i18n configuration
│   ├── router/              # Router configuration
│   │   └── index.ts
│   ├── stores/              # Pinia state management
│   ├── styles/              # Style files
│   │   ├── desktop/         # Desktop styles
│   │   ├── mobile/          # Mobile styles
│   │   ├── fonts.css        # Fonts
│   │   ├── theme-colors.css # Theme colors
│   │   ├── typography.css   # Typography
│   │   └── responsive.css   # Responsive styles
│   ├── utils/               # Utility functions
│   │   └── netlify/         # Netlify Functions
│   ├── views/               # Page components
│   │   ├── Home.vue         # Home page
│   │   ├── News.vue         # News list
│   │   ├── NewsDetail.vue   # News detail
│   │   ├── Monitoring.vue    # Server monitoring
│   │   ├── SimpleRules.vue  # Server rules
│   │   ├── Support.vue      # Support page
│   │   └── NotFound.vue     # 404 page
│   ├── App.vue              # Root component
│   └── main.ts              # Application entry
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Project dependencies
└── netlify.toml             # Netlify deployment configuration
```

## Configuration

### Application Configuration

Configure the following options in `src/config/app-config.ts`:

```typescript
export interface AppConfig {
  showLanguageToggle: boolean;    // Show language toggle button
  navbarFixed: boolean;           // Fixed navigation bar
  showFooterCopyright: boolean;   // Show footer copyright
}
```

### Route Configuration

Routes are defined in `src/router/index.ts`:

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Home | Home page |
| `/News` | News | News list |
| `/NewsDetail` | NewsDetail | News detail |
| `/Monitoring` | Monitoring | Server monitoring |
| `/SimpleRules` | SimpleRules | Server rules |
| `/Support` | Support | Support page |

## Testing

```bash
# Run unit tests
pnpm test:unit

# Or using npm
npm run test:unit
```

## Code Style

The project uses ESLint and Prettier for code linting and formatting.

```bash
# Run ESLint and auto-fix
pnpm lint

# Or using npm
npm run lint

# Format code
pnpm format

# Or using npm
npm run format
```

## Deployment

### Netlify Deployment

The project is configured for Netlify deployment using `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

Deployment steps:

1. Push code to GitHub repository
2. Connect repository in Netlify
3. Netlify will automatically detect `netlify.toml` and execute build commands

### Other Platforms

The project can be deployed to any platform that supports static site hosting:

- Vercel
- GitHub Pages
- Cloudflare Pages
- AWS S3 + CloudFront

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add TypeScript types for new features
- Update relevant documentation
- Ensure all tests pass
- Run `pnpm lint` to ensure code compliance

## License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details

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

## Contact

- QQ Group: [Join Now](https://qm.qq.com/q/M29Eyniu8S)
- GitHub Issues: [Submit Issue](https://github.com/NARCSSU/craft.luminolsuki.moe/issues)

---

<div align="center">

**Made with ❤️ by LuminolCraft Team**

</div>
