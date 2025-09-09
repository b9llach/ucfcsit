# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build production version  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint (configured with Next.js TypeScript rules)

## Project Structure

This is a Next.js 15 project using the App Router with TypeScript and Tailwind CSS v4.

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode enabled
- **Styling**: Tailwind CSS v4 with PostCSS
- **Fonts**: Geist Sans and Geist Mono from Google Fonts

### Key Directories
- `src/app/` - App Router pages and layouts
- `public/` - Static assets (SVG icons)
- Root level contains Next.js config files

### Architecture Notes

- Uses App Router (not Pages Router)  
- Path aliasing configured: `@/*` maps to `./src/*`
- TypeScript paths resolve with bundler module resolution
- ESLint extends Next.js core-web-vitals and TypeScript configs
- Tailwind configured with inline theme and CSS custom properties
- Dark mode support via `prefers-color-scheme`
- Font variables injected via CSS custom properties from layout

The project currently contains default Next.js boilerplate components in `src/app/page.tsx` and `src/app/layout.tsx`.