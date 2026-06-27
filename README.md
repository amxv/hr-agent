<div align="center">

# HR Agent

### Enterprise HR AI Assistant

AI-powered employee self-service for leave balances, benefits, HR cases, manager approvals, HR lookup, audit trails, and SLA-aware workflows.

**Next.js 15 • Vercel AI SDK v5 • Better Auth • Drizzle ORM • PostgreSQL**

[**Live Demo**](https://hr-agent.zue.ai)

</div>

## Overview

**HR Agent** is an enterprise HR assistant for internal employee self-service and HR operations. It gives employees, managers, and HR staff a conversational interface for routine HR workflows while preserving role-based access, case handling, auditability, and operational controls.

The product is designed around a simple promise: employees should be able to get HR answers in seconds, without waiting on repetitive email threads or navigating multiple internal systems.

HR Agent centers on:

- 🧾 **Employee self-service** for leave balances, benefits, policy questions, and HR case status
- 🎫 **HR case workflows** for intake, categorization, follow-up, and SLA tracking
- 👥 **Manager tools** for team availability, leave approvals, coverage checks, and people lookup
- 🛡️ **HR staff tools** for employee directory search, org context, employment status, and work authorization workflows
- 🔐 **Enterprise controls** including RBAC, authentication, audit trails, admin oversight, and usage controls
- 📚 **Knowledge-backed answers** through document retrieval, organization-specific content, and source citations

## Product Experience

### For Employees

Employees can ask natural-language HR questions and get immediate, permission-aware answers.

Examples:

- "How many vacation days do I have left?"
- "What medical plan am I enrolled in?"
- "When is open enrollment?"
- "File a case about my missing bonus."
- "What is the status of my HR request?"

Capabilities:

- Check vacation, sick, and personal leave balances
- View benefits plan details and enrollment information
- Ask policy questions against uploaded company documents
- File HR support cases with automatic categorization
- Track case status and history through the same conversation
- Ask follow-up questions without restarting context

### For Managers

Managers get role-aware visibility into team availability and approval workflows.

Examples:

- "Who on my team is off next week?"
- "Can I approve Priya's leave request without creating a coverage gap?"
- "Show pending leave requests for my team."

Capabilities:

- View team schedules and coverage
- Identify coverage risks before approving leave
- Review pending leave requests with conflict analysis
- Approve or deny requests from the assistant interface
- Search team members and relevant org context within role limits

### For HR Staff

HR staff can use the assistant as a secure operational console for common lookup-and-respond work.

Examples:

- "Look up Noor Al-Harbi's employment status."
- "Show this employee's manager chain."
- "Which work authorization renewals are coming due?"

Capabilities:

- Search employees by name, email, or employee ID
- Review employment status and employee metadata
- Access org context, manager chains, and direct reports
- Track work authorization and renewal-related workflows where configured
- Review and manage HR case information with auditability

## Enterprise Features

### Role-Based Access Control

Permissions are enforced at the system level. Employees see their own data, managers see team-level data, and HR staff get elevated directory and case-management tools according to their role.

### HR Case Management

The assistant can create and track HR cases, categorize requests, attach relevant metadata, and preserve conversation history for follow-up. Case workflows are designed to support SLA targets, status tracking, and escalation paths.

### Document Knowledge Base

Admins can upload employee handbooks, benefits guides, policies, and other internal HR documents. The assistant uses semantic search to retrieve relevant passages and answer with citations.

### Audit Trails

HR Agent is built for sensitive internal workflows. User actions, assistant tool calls, case updates, HR lookups, and admin operations can be logged with user identity, timestamps, and operation details.

### Admin Dashboard

Admins can manage users, roles, uploaded documents, credit/usage allocations, and system configuration from a centralized dashboard.

### Usage and Spend Controls

The underlying assistant platform includes credit reservations, per-tool usage accounting, budget-aware tool availability, and timeout protection. In an HR deployment, these controls can be used to manage AI spend, prevent runaway usage, and allocate capacity across users or teams.

## Assistant Platform Capabilities

HR Agent is built on a broader AI assistant platform. These capabilities support the HR product but are not the primary product positioning:

- **Streaming Assistant UI** - Real-time responses with markdown rendering
- **Persistent Chat History** - Session continuity across conversations
- **Document RAG** - Semantic search over uploaded documents with citations
- **Multimodal Input** - Text, images, PDFs, and document attachments
- **Follow-up Suggestions** - AI-generated next steps for employees and HR teams
- **Resumable Streaming** - Network resilience for long-running responses
- **Cross-Provider Models** - OpenAI, Anthropic, Google, xAI, and other providers through the AI Gateway
- **Reasoning Model Support** - Provider-specific reasoning controls and thinking-budget configuration
- **Optional Advanced Tools** - Web search, deep research, code execution, image generation, and document creation where enabled by administrators

## Tech Stack

### Frontend

- **[Next.js 15](https://nextjs.org)** - App Router, React Server Components, typed routes
- **[React 19](https://react.dev)** - Latest React with concurrent features
- **[TypeScript 5.8](https://www.typescriptlang.org)** - Full type safety
- **[Shadcn/UI](https://ui.shadcn.com)** - Accessible components built on Radix UI
- **[Tailwind CSS 4](https://tailwindcss.com)** - Utility-first styling
- **[Motion](https://motion.dev)** - Smooth animations
- **[Lexical](https://lexical.dev)** - Rich text chat input
- **[CodeMirror 6](https://codemirror.net)** - Code editing

### Backend

- **[Vercel AI SDK v5](https://sdk.vercel.ai)** - Unified AI provider integration
- **[Better Auth](https://www.better-auth.com)** - Authentication and session management
- **[PostgreSQL](https://www.postgresql.org)** - Primary database
- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe queries and migrations
- **[tRPC](https://trpc.io)** - End-to-end type-safe APIs
- **[Redis](https://redis.io)** - Caching and resumable streams
- **[Vercel Blob](https://vercel.com/storage/blob)** - File storage

### AI & Integrations

- **[Vercel AI Gateway](https://vercel.com/ai-gateway)** - Multi-provider AI access
- **[OpenAI API](https://openai.com)** - Vector stores, embeddings, and optional image generation
- **[Tavily](https://tavily.com)** - Optional web search
- **[Firecrawl](https://firecrawl.dev)** - Optional web scraping
- **[E2B](https://e2b.dev)** - Optional code execution sandboxes
- **[Langfuse](https://langfuse.com)** - LLM observability

### Development

- **[Zod 4](https://zod.dev)** - Schema validation
- **[Ultracite](https://ultracite.ai)** - Biome preset for linting
- **[Pino](https://getpino.io)** - Structured logging
- **[Vitest](https://vitest.dev)** - Unit testing
- **[Playwright](https://playwright.dev)** - E2E testing

## Quick Start

### Prerequisites

- **Node.js 18+** or **Bun** recommended
- **PostgreSQL** database
- **Vercel AI Gateway** account

### 1. Install Dependencies

```bash
bun install
# or
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure required variables:

```bash
# Database
POSTGRES_URL="postgresql://user:pass@host:5432/dbname"

# AI Gateway
AI_GATEWAY_API_KEY="your-gateway-key"

# Storage
BLOB_READ_WRITE_TOKEN="your-blob-token"

# Authentication
AUTH_SECRET="your-random-secret"
CRON_SECRET="your-cron-secret"

# OAuth, at least one provider required for local auth flows
AUTH_GOOGLE_ID="your-google-id"
AUTH_GOOGLE_SECRET="your-google-secret"
AUTH_GITHUB_ID="your-github-id"
AUTH_GITHUB_SECRET="your-github-secret"
```

Optional features:

```bash
# Resumable streams
REDIS_URL="redis://..."

# Document RAG and optional image generation
OPENAI_API_KEY="sk-..."

# Optional web search / research tools
TAVILY_API_KEY="tvly-..."
EXA_API_KEY="exa-..."
FIRECRAWL_API_KEY="fc-..."

# Optional code execution
SANDBOX_TEMPLATE_ID="your-e2b-template"

# Observability
LANGFUSE_SECRET_KEY="..."
LANGFUSE_PUBLIC_KEY="..."
LANGFUSE_HOST="https://cloud.langfuse.com"
```

### 3. Database Setup

Run migrations:

```bash
bun run db:migrate
```

Open Drizzle Studio if needed:

```bash
bun run db:studio
```

### 4. Development Server

```bash
bun dev
```

Visit [http://localhost:3000](http://localhost:3000).

### 5. Create Admin Account

1. Sign up through the UI at `/register`
2. Open the database and set `role = 'admin'` for your user
3. Access the admin panel at `/admin`

## Project Structure

```text
hr-agent/
├── app/                      # Next.js App Router
│   ├── (admin)/              # Admin route group
│   ├── (auth)/               # Login and registration pages
│   ├── (chat)/               # Chat UI and streaming APIs
│   ├── (landing)/            # Marketing landing page
│   ├── (models)/             # Model explorer and comparison
│   ├── admin/                # Admin panel pages
│   └── api/                  # API routes and tRPC endpoint
├── components/               # React components
│   ├── admin/                # Admin UI components
│   ├── ui/                   # Shadcn/UI primitives
│   └── landing-page.tsx      # Main HR Agent landing page
├── lib/                      # Core libraries
│   ├── ai/                   # AI integration layer and tools
│   ├── auth.ts               # Authentication
│   ├── credits/              # Usage and credit controls
│   ├── db/                   # Database schema and queries
│   ├── env.ts                # Environment config
│   └── config.ts             # App configuration
├── trpc/                     # tRPC routers
└── packages/                 # Shared packages
```

## Key API Endpoints

### Chat

- `POST /api/chat` - Main chat streaming endpoint
- `POST /api/files/upload` - Upload chat attachments

### Admin and Documents

- `POST /api/documents/upload` - Upload a single document for RAG
- `POST /api/documents/bulk-upload` - Upload multiple documents
- `PUT /api/documents/[id]/update` - Update an existing document

### tRPC

- `/api/trpc` - Type-safe API procedures
  - `chat.*` - Chat operations
  - `admin.*` - Admin operations
  - `document.*` - Document operations

## Database Schema

Key tables are defined in `lib/db/schema.ts`:

- **`user`** - User accounts, roles, and ban status
- **`session`** - Authentication sessions
- **`userCredit`** - Usage balances and reservations
- **`chat`** - Chat metadata, visibility, and pinning
- **`message`** - Messages with attachments and parent relationships
- **`uploadedDocument`** - RAG documents with OpenAI file IDs
- **`vectorStoreConfig`** - Shared vector store configuration
- **`document`** - Generated artifacts such as text, code, or sheets

## Adding AI Tools

Create a new tool in `lib/ai/tools/`:

```typescript
// lib/ai/tools/my-tool.ts
import { tool } from "ai";
import { z } from "zod";

export const myTool = tool({
  description: "Description for the AI",
  parameters: z.object({
    query: z.string().describe("The query parameter"),
  }),
  execute: async ({ query }, { aiState }) => {
    return {
      result: `Tool output for ${query}`,
    };
  },
});
```

Register it in `lib/ai/tools/tools.ts`:

```typescript
export const tools = {
  myTool,
  // ...other tools
};
```

Add cost metadata in `lib/ai/tools/tools-definitions.ts`:

```typescript
export const toolCosts = {
  myTool: 5,
};
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_URL` | ✅ | PostgreSQL connection string |
| `AI_GATEWAY_API_KEY` | ✅ | Vercel AI Gateway API key |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Vercel Blob storage token |
| `AUTH_SECRET` | ✅ | Better Auth encryption secret |
| `CRON_SECRET` | ✅ | Secret for scheduled jobs |
| `REDIS_URL` | ❌ | Redis for resumable streams |
| `OPENAI_API_KEY` | ❌ | Required for RAG and image generation |
| `TAVILY_API_KEY` | ❌ | Required for web search and deep research |
| `SANDBOX_TEMPLATE_ID` | ❌ | Required for code execution |

## Database Commands

```bash
# Generate migration from schema changes
bun run db:generate

# Run migrations
bun run db:migrate

# Open Drizzle Studio
bun run db:studio

# Push schema without migrations, for development only
bun run db:push

# Check migration status
bun run db:check
```

## Testing and Quality

```bash
# Run E2E tests with Playwright
bun test

# Run unit tests
bun test:unit

# Type checking
bun test:types

# Lint and format with Ultracite / Biome
bun run lint

# Check without fixing
bun run check
```

## Deployment

### Deploy to Vercel

1. Connect the repository to Vercel
2. Configure environment variables
3. Set up PostgreSQL
4. Set up Blob storage
5. Deploy

### Manual Deployment

Build for production:

```bash
bun run build
```

Start the production server:

```bash
bun start
```

Requirements for non-Vercel hosting:

- Node.js 18+ runtime
- PostgreSQL database
- Configured environment variables
- File storage compatible with the app's upload layer
- Redis if resumable streaming is enabled

## Architecture Highlights

### Resumable Streaming

Network interruptions do not have to lose progress:

- Stream state can be stored in Redis with TTLs
- Each request receives a unique stream ID
- Clients can reconnect and resume in-progress responses

### Usage Controls

The platform prevents runaway usage with reservation-based accounting:

1. Reserve the maximum possible credits before streaming
2. Calculate actual model and tool cost during the operation
3. Deduct actual cost on success
4. Release reservations on errors or timeouts
5. Filter expensive tools when a user or team lacks enough budget

### Document Retrieval

The RAG system supports HR policy and knowledge workflows:

- Admin-managed uploads
- OpenAI vector store integration
- Semantic search over uploaded documents
- Source-aware answers with citations
- Bulk document processing
- Processing status tracking

### Reasoning Model Support

The AI layer normalizes reasoning controls across providers:

- OpenAI reasoning summaries and effort settings
- Anthropic thinking budget tokens
- Google thinking configuration
- xAI reasoning extraction
- Standard and reasoning-enabled model variants

## Roadmap

- [ ] Multi-tenant architecture
- [ ] HRIS and payroll connector templates
- [ ] Advanced HR analytics dashboard
- [ ] Voice input/output
- [ ] Mobile apps
- [ ] Webhook integrations
- [ ] Plugin system for custom HR tools
- [ ] Custom model and policy-tuning integrations

## Support

For questions or issues, please contact the development team.

## Acknowledgments

Built with open-source technologies including:

- [Vercel AI SDK](https://sdk.vercel.ai)
- [Shadcn/UI](https://ui.shadcn.com)
- [Better Auth](https://www.better-auth.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [Ultracite](https://ultracite.ai)

---

<div align="center">

**[⬆ back to top](#hr-agent)**

## License

Apache License 2.0. See [LICENSE](LICENSE).

</div>
