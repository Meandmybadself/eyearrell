## Project Setup

This project uses **pnpm** as the package manager, not npm. Always use `pnpm install`, `pnpm run build`, `pnpm run dev`, etc. Never use `npm install` or `npm run`.

## Build & Validation

Always compile TypeScript (`pnpm run build`) and verify the build succeeds before committing. Check for Prisma relation name casing, enum casing, and field access patterns — these are the most common sources of build errors.

Implement this feature incrementally. After every 2-3 file changes, run `pnpm run build` and fix any errors before continuing. If you change any Prisma schema, run `pnpm prisma generate` and `pnpm prisma migrate dev` immediately before editing dependent files.s

## Database / Prisma

After any Prisma schema change, run `pnpm prisma generate` and `pnpm prisma migrate dev`. Watch for schema drift — if migration fails, check if manual SQL is needed. Use snake_case for database columns and camelCase for Prisma model fields with `@map` directives.

## UI / Frontend Conventions

When implementing UI changes, ensure consistent layout constraints (max-width, centering, padding) match the existing page patterns. Always verify changes visually apply to ALL affected pages, not just one.

## Workflow Preferences

When asked to build a feature, implement the most likely interpretation immediately rather than asking clarifying questions. Use placeholders for minor unknowns (e.g., copyright holder names). Only ask questions for genuinely ambiguous architectural decisions.

## Project Management

Before starting, create a TodoWrite checklist of all changes needed. For each item: implement it, build-check, then mark complete. Do not start the next item until the current one compiles cleanly.