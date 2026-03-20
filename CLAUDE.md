# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (Turbopack)
npm run dev

# Build for production
npm run build

# Run all tests
npm test

# Run a single test file
npx vitest src/lib/transform/__tests__/transform.test.ts

# Lint
npm run lint

# Reset database
npm run db:reset
```

> **Note:** On Windows, `npm run dev` uses `set NODE_OPTIONS=...` syntax. The `node-compat.cjs` shim is required for Node.js compatibility with the Babel/bcrypt dependencies.

## Environment

- Copy `.env.example` to `.env` and add `ANTHROPIC_API_KEY`. Without a key the app falls back to a mock provider that returns static component templates.

## Architecture

**UIGen** is a Next.js 15 (App Router) full-stack app where users chat with Claude to generate, preview, and edit React components in real time.

### Core Data Flow

1. User types a prompt in `ChatInterface` → POST to `/api/chat`
2. API route streams a response from Claude (`claude-haiku-4-5`) via Vercel AI SDK
3. Claude calls two tools: `str_replace_editor` (create/modify files) and `file_manager` (rename/delete)
4. Tool results flow into `FileSystemContext`, updating the **virtual file system** (in-memory, no disk writes)
5. `PreviewFrame` picks up the new file tree, compiles JSX with Babel Standalone, and renders the live preview

### Key Abstractions

| Module | Purpose |
|---|---|
| `src/lib/file-system.ts` | Virtual FS — in-memory tree with serialize/deserialize for DB storage |
| `src/lib/provider.ts` | Returns Anthropic or mock `LanguageModel`; mock activates when `ANTHROPIC_API_KEY` is absent |
| `src/lib/contexts/FileSystemContext` | React context that owns the virtual FS and exposes `handleToolCall()` |
| `src/lib/contexts/ChatContext` | Chat history state and streaming control |
| `src/lib/tools/` | Tool definitions (`str_replace_editor`, `file_manager`) passed to the AI SDK |
| `src/lib/prompts/` | System prompts that instruct Claude how to generate components |
| `src/lib/transform/` | Babel transform pipeline that converts JSX → executable JS for the preview |
| `src/app/api/chat/route.ts` | Streaming API route; serializes the virtual FS into each request so Claude has full context |

### Authentication

JWT-based (7-day expiry, httpOnly cookie). Middleware at `src/middleware.ts` protects `/projects/*`. Server actions in `src/actions/` handle sign-up/sign-in with bcrypt. Projects are persisted to SQLite via Prisma; anonymous sessions are supported without an account.

### Database

SQLite with Prisma. Schema has two models: `User` and `Project`. `Project.data` stores the serialized virtual file system (JSON) and `Project.messages` stores chat history (JSON).

### UI Structure

Split-pane layout (`react-resizable-panels`): left pane is the chat interface; right pane toggles between a Monaco code editor (with a file tree) and the live preview frame. Styling is Tailwind CSS v4 with shadcn/ui (new-york style, Radix primitives).

### Testing

Tests live alongside source in `__tests__/` subdirectories. Framework is Vitest + React Testing Library. Run a specific file with `npx vitest <path>`.
