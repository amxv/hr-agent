<div align="center">

# HR Agent

### Enterprise HR AI Assistant

Employee self-service assistant for leave balances, benefits, HR cases, approvals, audit trails, and SLA-aware workflows.

**Next.js 15 • Vercel AI SDK v5 • Better Auth • Drizzle ORM • PostgreSQL**

[**Live Demo**](https://hr-agent.zue.ai)

</div>

## Overview

**HR Agent** is an enterprise HR assistant built for internal employee self-service and HR operations. It gives employees and managers a conversational interface for common HR workflows while preserving role-based access, case handling, auditability, and operational controls.

The product centers on:

- 🧾 **Employee self-service** for leave balances, benefits, and policy questions
- 🎫 **HR case workflows** for intake, status tracking, and follow-up
- 👥 **Manager and HR tools** for team availability, approvals, and people lookup
- 🔐 **Enterprise controls** including RBAC, audit trails, authentication, and admin oversight
- 📚 **Knowledge-backed answers** via document retrieval and organization-specific content

The broader assistant platform provides:

- 🏢 **Admin panel** with user and document management
- 📚 **Document RAG system** with semantic search and citations
- 💳 **Credit system** with usage tracking and reservations
- 🔐 **RBAC** and authentication with OAuth support
- 🎯 **Anonymous users** with graceful upgrade paths
- ⚡ **Resumable streaming** for network resilience
- 🧠 **Reasoning model support** across multiple providers

Designed for internal AI assistants, customer support, and AI-powered automation.

## Features

### 👩‍💼 Core HR Workflows

- **Leave Balance** - Check balances, accruals, and simple projections
- **Benefits Info** - Query plans, enrollment windows, and policy details
- **HR Cases** - Create and manage HR support tickets
- **Team Availability** - Review team coverage and approvals
- **People Search** - Find employees and org context with role-aware access

### 🏢 Enterprise HR Platform

- **Streaming Assistant UI** - Real-time responses with markdown rendering
- **Multimodal Input** - Text, images, PDFs, and document attachments
- **Follow-up Suggestions** - AI-generated next steps for employees and HR teams
- **Chat History** - Persistent conversations and session continuity
- **Role-Aware Experiences** - Different capabilities for employees, managers, and HR users

### 🏢 Administration and Governance

#### Admin Panel
- **User Management** - Create, edit, ban users, reset passwords, impersonate accounts
- **Document Management** - Upload, update, delete documents for RAG
- **Role-Based Access** - Admin vs user roles with granular permissions
- **Credit Allocation** - Track and manage user credits

#### Document RAG System (Feature 002)
- **Semantic Search** - Search across uploaded PDFs using OpenAI embeddings
- **Vector Store Integration** - Powered by OpenAI Vector Store API
- **Citation System** - Clickable references with page numbers
- **Bulk Upload** - Process multiple documents at once
- **Tag Organization** - Categorize documents with custom tags
- **Status Tracking** - Monitor processing: uploading → processing → ready

#### Authentication & Access Control
- **Better Auth** - Modern authentication with session management
- **OAuth Support** - Google and GitHub login
- **Anonymous Sessions** - Try without signup (limited credits and models)
- **IP Rate Limiting** - Prevent abuse from anonymous users
- **Security** - Password hashing, secure sessions, CSRF protection

#### Credit System
- **Usage Tracking** - Per-message and per-tool credit deduction
- **Credit Reservations** - Pre-reserve credits before expensive operations
- **Budget-Based Filtering** - Dynamically enable/disable tools based on remaining budget
- **Timeout Protection** - Auto-release reserved credits on errors

### 🚀 Underlying Assistant Platform Capabilities

#### AI Tools
- **Deep Research** - Multi-step autonomous research with web search and synthesis (50 credits)
- **Web Search** - Multi-query search with Tavily and Firecrawl (3 credits)
- **Image Generation** - Create and edit images with OpenAI's GPT-Image-1 (50 credits)
- **Code Execution** - Python sandbox with matplotlib, pandas, numpy (10 credits)
- **Document Creation** - Generate text, code, or spreadsheet artifacts (5 credits)
- **Semantic Search** - Search organization documents with citations (3 credits)

#### Reasoning Models
- **Cross-Provider Reasoning** - Unified interface for reasoning across OpenAI, Anthropic, Google, and xAI
- **Thinking Visualization** - Display model reasoning process
- **Token Budgets** - Configurable thinking limits per provider

### 🎨 User Experience

- **Resumable Streaming** - Recover from network interruptions without losing progress
- **Chat History** - Persistent conversations across devices
- **Chat Sharing** - Public/private visibility controls
- **Syntax Highlighting** - Code formatting for all major languages
- **Math Rendering** - LaTeX support with KaTeX
- **Mermaid Diagrams** - Visual diagram rendering
- **Responsive Design** - Mobile-friendly interface
- **Dark Mode** - Theme support (coming soon)

## Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org)** - App Router, React Server Components, typed routes
- **[React 19](https://react.dev)** - Latest React with concurrent features
- **[TypeScript 5.8](https://www.typescriptlang.org)** - Full type safety
- **[Shadcn/UI](https://ui.shadcn.com)** - 30+ accessible components built on Radix UI
- **[Tailwind CSS 4](https://tailwindcss.com)** - Utility-first styling
- **[Motion](https://motion.dev)** - Smooth animations
- **[Lexical](https://lexical.dev)** - Rich text chat input
- **[CodeMirror 6](https://codemirror.net)** - Code editing

### Backend
- **[Vercel AI SDK v5](https://sdk.vercel.ai)** - Unified AI provider integration
- **[Better Auth](https://www.better-auth.com)** - Authentication with OAuth
- **[PostgreSQL](https://www.postgresql.org)** - Primary database
- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe queries and migrations
- **[tRPC](https://trpc.io)** - End-to-end type-safe APIs
- **[Redis](https://redis.io)** - Caching and resumable streams (optional)
- **[Vercel Blob](https://vercel.com/storage/blob)** - File storage

### AI & Integrations
- **[Vercel AI Gateway](https://vercel.com/ai-gateway)** - Multi-provider AI access
- **[OpenAI API](https://openai.com)** - Vector Store, embeddings, image generation
- **[Tavily](https://tavily.com)** - Web search
- **[Firecrawl](https://firecrawl.dev)** - Web scraping
- **[E2B](https://e2b.dev)** - Code execution sandboxes
- **[Langfuse](https://langfuse.com)** - LLM observability

### Development
- **[Zod 4](https://zod.dev)** - Schema validation
- **[Ultracite](https://ultracite.ai)** - Biome preset for linting
- **[Pino](https://getpino.io)** - Structured logging
- **[Vitest](https://vitest.dev)** - Unit testing
- **[Playwright](https://playwright.dev)** - E2E testing

## Quick Start

### Prerequisites

- **Node.js 18+** or **Bun** (recommended)
- **PostgreSQL** database
- **Vercel AI Gateway** account ([sign up](https://vercel.com/ai-gateway))

### 1. Install Dependencies

```bash
bun install  # or npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure required variables:

#### Required

```bash
# Database
POSTGRES_URL="postgresql://user:pass@host:5432/dbname"

# AI Gateway
AI_GATEWAY_API_KEY="your-gateway-key"

# Storage
BLOB_READ_WRITE_TOKEN="your-blob-token"

# Authentication
AUTH_SECRET="your-random-secret"  # Generate with: openssl rand -base64 32
CRON_SECRET="your-cron-secret"

# OAuth (at least one required)
AUTH_GOOGLE_ID="your-google-id"
AUTH_GOOGLE_SECRET="your-google-secret"
AUTH_GITHUB_ID="your-github-id"
AUTH_GITHUB_SECRET="your-github-secret"
```

#### Optional Features

```bash
# Resumable Streams
REDIS_URL="redis://..."

# Document RAG & Image Generation
OPENAI_API_KEY="sk-..."

# Web Search & Deep Research
TAVILY_API_KEY="tvly-..."
EXA_API_KEY="exa-..."
FIRECRAWL_API_KEY="fc-..."

# Code Execution
SANDBOX_TEMPLATE_ID="your-e2b-template"

# Observability
LANGFUSE_SECRET_KEY="..."
LANGFUSE_PUBLIC_KEY="..."
LANGFUSE_HOST="https://cloud.langfuse.com"
```

### 3. Database Setup

Run migrations to set up your database:

```bash
bun run db:migrate
```

Optional: Open Drizzle Studio to view your database:

```bash
bun run db:studio
```

### 4. Development Server

Start the development server:

```bash
bun dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app.

### 5. Create Admin Account

1. Sign up through the UI at `/register`
2. Open your database and set `role = 'admin'` for your user
3. Access admin panel at `/admin`

## Documentation

### Project Structure

```
hr-agent/
├── app/                      # Next.js App Router
│   ├── (admin)/             # Admin route group
│   │   └── api/documents/   # Document upload APIs
│   ├── (auth)/              # Auth pages (login, register)
│   ├── (chat)/              # Chat route group
│   │   ├── api/chat/        # Main chat streaming endpoint
│   │   └── chat/[id]/       # Individual chat page
│   ├── (models)/            # Model explorer and comparison
│   ├── admin/               # Admin panel pages
│   │   ├── users/           # User management
│   │   └── documents/       # Document management
│   └── api/                 # API routes (tRPC, cron)
├── components/              # React components
│   ├── admin/              # Admin UI components
│   ├── ui/                 # Shadcn/UI primitives
│   └── [feature components]
├── lib/                     # Core libraries
│   ├── ai/                 # AI integration layer
│   │   ├── tools/          # AI tool definitions
│   │   ├── providers.ts    # AI provider setup
│   │   └── app-models.ts   # Model definitions
│   ├── db/                 # Database layer
│   │   ├── schema.ts       # Drizzle schema
│   │   └── queries.ts      # Query helpers
│   ├── credits/            # Credit system
│   ├── auth.ts             # Authentication
│   ├── env.ts              # Environment config
│   └── config.ts           # App configuration
├── trpc/                    # tRPC routers
└── [config files]
```

### Key API Endpoints

#### Chat
- `POST /api/chat` - Main chat streaming endpoint (see `app/(chat)/api/chat/route.ts`)
- `POST /api/files/upload` - Upload chat attachments

#### Admin
- `POST /api/documents/upload` - Upload single document for RAG
- `POST /api/documents/bulk-upload` - Upload multiple documents
- `PUT /api/documents/[id]/update` - Update existing document

#### tRPC
- `/api/trpc` - Type-safe API procedures
  - `chat.*` - Chat operations
  - `admin.*` - Admin operations
  - `document.*` - Document operations

### Database Schema

Key tables (see `lib/db/schema.ts`):

- **`user`** - User accounts with role (admin/user) and ban status
- **`session`** - Authentication sessions
- **`userCredit`** - Credit balances and reservations
- **`chat`** - Chat metadata (title, visibility, pinned)
- **`message`** - Messages with attachments and parent relationships
- **`uploadedDocument`** - RAG documents with OpenAI file IDs
- **`vectorStoreConfig`** - Shared vector store configuration
- **`document`** - Generated artifacts (text/code/sheet)

### Adding AI Tools

Create a new tool in `lib/ai/tools/`:

```typescript
// lib/ai/tools/my-tool.ts
import { tool } from "ai"
import { z } from "zod"

export const myTool = tool({
  description: "Description for the AI",
  parameters: z.object({
    query: z.string().describe("The query parameter"),
  }),
  execute: async ({ query }, { aiState }) => {
    // Your tool logic here
    return {
      result: "Tool output",
    }
  },
})
```

Register it in `lib/ai/tools/tools.ts`:

```typescript
export const tools = {
  myTool,
  // ... other tools
}
```

Add cost in `lib/ai/tools/tools-definitions.ts`:

```typescript
export const toolCosts = {
  myTool: 5, // 5 credits per use
}
```

### Environment Variables Reference

See `lib/env.ts` for the complete list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | ✅ | PostgreSQL connection string |
| `AI_GATEWAY_API_KEY` | ✅ | Vercel AI Gateway API key |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Vercel Blob storage token |
| `AUTH_SECRET` | ✅ | Better Auth encryption secret |
| `REDIS_URL` | ❌ | Redis for resumable streams |
| `OPENAI_API_KEY` | ❌ | Required for RAG and image generation |
| `TAVILY_API_KEY` | ❌ | Required for web search and deep research |
| `SANDBOX_TEMPLATE_ID` | ❌ | Required for code execution |

### Database Commands

```bash
# Generate migration from schema changes
bun run db:generate

# Run migrations
bun run db:migrate

# Open Drizzle Studio (GUI)
bun run db:studio

# Push schema without migrations (dev only)
bun run db:push

# Check migration status
bun run db:check
```

### Testing

```bash
# Run E2E tests with Playwright
bun test

# Run unit tests
bun test:unit

# Type checking
bun test:types
```

### Code Quality

```bash
# Lint and format with Ultracite (Biome)
bun run lint

# Check without fixing
bun run check
```

## Deployment

### Deploy to Vercel

The easiest way to deploy is with [Vercel](https://vercel.com):

1. Connect your repository to Vercel
2. Configure environment variables
3. Set up PostgreSQL database (Vercel Postgres recommended)
4. Set up Blob storage (auto-configured on Vercel)
5. Deploy!

### Manual Deployment

Build for production:

```bash
bun run build
```

Start production server:

```bash
bun start
```

Requirements for other hosting providers:
- Node.js 18+ runtime
- PostgreSQL database
- Environment variables configured
- Blob storage alternative (if not using Vercel)

## Architecture Highlights

### Resumable Streaming

Network interruptions don't lose progress:
- Stream state stored in Redis with 10-minute TTL
- Unique stream ID per request
- Client can reconnect and resume
- See `app/(chat)/api/chat/route.ts:66-114`

### Credit System

Prevent overspending with smart credit management:
1. Reserve max possible credits before streaming
2. Calculate actual cost during operation (base model + tools)
3. Deduct actual cost on success, release on error
4. Dynamically filter expensive tools based on remaining budget

### Anonymous User Experience

Try before signup with graceful limits:
- Cookie-based sessions
- Limited model access
- Limited tool access
- IP-based rate limiting
- Seamless upgrade to authenticated account

### Reasoning Model Support

Unified interface across providers:
- OpenAI: `reasoningSummary` and `reasoningEffort`
- Anthropic: `thinking.budgetTokens`
- Google: `thinkingConfig.thinkingBudget`
- xAI: Custom reasoning extraction
- Models get two variants: standard and reasoning-enabled

## Roadmap

- [ ] Dark mode support
- [ ] Multi-tenant architecture
- [ ] Voice input/output
- [ ] Mobile apps (React Native)
- [ ] Advanced analytics dashboard
- [ ] Custom model fine-tuning integration
- [ ] Webhook integrations
- [ ] Plugin system for custom tools

## Support

For questions or issues, please contact the development team.

## Acknowledgments

Built with amazing open-source technologies:
- [Vercel AI SDK](https://sdk.vercel.ai) - AI integration framework
- [Shadcn/UI](https://ui.shadcn.com) - Beautiful component library
- [Better Auth](https://www.better-auth.com) - Modern authentication
- [Drizzle ORM](https://orm.drizzle.team) - Type-safe database queries
- [Ultracite](https://ultracite.ai) - Code quality for humans and AI

---

<div align="center">

**[⬆ back to top](#hr-agent)**

Made with ❤️ by [HR Agent](https://hr-agent.zue.ai)

## License

Apache License 2.0. See [LICENSE](LICENSE).

</div>
