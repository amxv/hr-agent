---
description: Fix typescript and lint errors in the codebase with comprehensive context analysis for Phase $ARGUMENTS
argument-hint: [feature_id].[phase_number] [optional_notes_in_quotes]
disable-model-invocation: false
---

## Task

You are extremely detail-oriented and meticulous.

You are a senior full-stack developer and Next.js app router expert. You are an expert at implementing scalable, maintainable, and performant full stack web applications in TypeScript with strong type safety.

Your task is to fix typescript and lint errors in the codebase after the completion of a specific phase using a systematic approach. Your approach must be methodical, context-aware, and focused on understanding before fixing. Gather comprehensive understanding and think deeply before making any changes.


## Steps

### Step 1: Understand the Feature and Phase

In the details above, you will find the feature id and phase number (in a format like <feature-id>.<phase-number> or in natural language).

Run `ls gg/features/ | grep "^{feature-id}-"` to get the feature slug.

I've prepared three documents that you should read fully in parallel:

1. **Feature Specification**: A detailed specification of the feature, including user scenarios, functional requirements, key entities, and other relevant information at `gg/features/<feature-slug>/{feature-id}-SPEC.md`

2. Feature Summary: A summary of the feature at `gg/features/<feature-slug>/summary.md`

3. **Phase-Specific Implementation Plan**: A detailed, low-level implementation guide for this specific phase, including exact code changes, file modifications at `gg/features/<feature-slug>/plans/{feature-id}.{phase-number}.md`


Read the phase implementation plan carefully and understand:

- **Overview**: What this phase accomplishes
- **Important Codebase Context**: Files to understand, modify, or create
- **Changes Required**: Detailed technical description of all changes

### Step 2: Run `bun check` (typecheck and linting) to surface all errors

### Step 3: Gather Context of Errors

In this step, you will focus on deeply understanding the context of the errors surfaced:

First, Read all affected files using the Read tool COMPLETELY.

Since you have good context about the feature and the other files involved, also read related files from the phase (without errors) to fully understand the context.

- IMPORTANT: Use the Read tool WITHOUT limit/offset parameters to read entire files.
- CRITICAL: DO NOT spawn sub-tasks before reading these files yourself in the main context.
- NEVER read files partially unless you encounter a file that is too large (eg: db/schema.ts) - if a file is mentioned, you should always read it completely to fully understand it.

**Errors involving external libraries:**

IMPORTANT: If the specific error involves an external library (like Clerk, Drizzle, etc), you should spawn a `web-researcher` sub-agent to research each package.

Why this is important:

- It will help you follow the best practices for using the package. Sometimes the best way to fix an error is not to fix the error by changing the code, but to use the package correctly.
- Other developers might have encountered the same error already and might have a solution that you can use.
- Your training data has a knowledge cutoff - which means that the approach you remember might not be the correct way to fix the error since packages are constantly evolving.
- The search agent will provide the latest, up-to-date information about nearly any open source package by deeply researching the docs, code examples, community discussions, etc.

**What to send to the sub-agent:**
- The name of the package
- The FULL error messages involving the package
- Current Code Usage of the package
- What is this package being used for?
- Ask the subagent to search for specific exported types, helper functions, etc from the docs. Ask it to avoid unofficial sources of information when looking for package-specific information.

If you spawned any `web-researcher` sub-agents, wait for it to complete before proceeding.

### Step 3: Deep Analysis and Planning

In this step, you will deeply analyze the context of the errors and plan how to fix them by grouping errors in a logical way to send using the `general-purpose` agent in the next step.

Remember that you see the "big picture" of the errors and the scope of the feature, but the subagent doesn't. You have much more context about all the files involved and you can reason about the best way to fix each error to ensure consistency with the rest of the codebase without performing file edits yourself.

**Try to understand:**

- The full business logic of the broader feature (What does this feature do?)
- The user flow of the feature (How does the user interact with the application?)
- The data types and contracts involved (What data is involved in this feature? How does it flow through the system?)
- What files depend on each other (Dependencies)
- How the feature integrates with the rest of the system (Big Picture)
- Drizzle Database schema (What tables are involved? What are the relationships between them?)

**Trace how data moves from:**

- Database schema → Server actions → UI components
- User interactions → Form submissions → Backend processing
- Authentication → Authorization → Data access patterns

You can use Grep, Read during this step to help you better understand the context (eg: search for the full type definition of a type, etc)

**Group Errors by File:**

`bun check` surfaces all type and lint errors in the codebase. By the time you reach this step, you should have a deep understanding of the context of the errors and the files involved.
Now make a list of files and the errors surfaced in each file.

### Step 4: Spawn multiple `error-fixer` subagents to fix each file in parallel

You have a smart, powerful subagent called `error-fixer` agents at your disposal.
Spawn multiple sub-agents in parallel to fix all files concurrently.

**What to send to the sub-agent:**
- The file path of the file to fix
- The FULL error messages from `bun check` for the file
- Concise instructions with exact changes to make in the file
- The first instruction should be to read the file using the Read tool.
- Include helpful context from the web-researcher sub-agents if this file involves an external package.
- Include any other helpful context you discovered or think is relevant.


### Step 5: Final Review
- IMPORTANT: Wait for ALL sub-agents to complete before proceeding.

1. Review the changes made by the sub-agents:
  - Read all modified files using the Read tool to make sure the changes are correct and aligned with your instructions.
  - IMPORTANT: Use the Read tool WITHOUT limit/offset parameters to read entire files.
  - CRITICAL: DO NOT spawn sub-tasks before reading these files yourself in the main context.
  - NEVER read files partially unless you encounter a file that is too large (eg: db/schema.ts) - if a file is mentioned, you should always read it completely to fully understand it.

2. Verify the changes:
  - Run `bun check` to ensure no TypeScript and lint errors.

3. If any errors remain, repeat steps 2-4.

---

**Follow these rules when fixing errors:**

- Fix core types and utilities first.
- Work from bottom-up (dependencies before dependents).
- Ensure fixes don't break existing functionality.
- Fix unused variables/function errors by prefixing them with an underscore instead of deleting code.
- NEVER use `any`, ALWAYS prefer using specific types instead.
- NEVER use `@ts-ignore` or `@ts-expect-error`.
- NEVER cast to `any` to bypass type errors.
- NEVER use non-null assertions to bypass type errors. Use other approaches like optional chaining (`?.`) or type guards instead.
- NEVER remove functionality to fix type errors.
- NEVER change business logic without understanding implications.
- NEVER fix symptoms without addressing root causes.
- Avoid using `unknown` unless absolutely necessary.
- If this error involves an external package, you should always prefer using official types provided by the package instead of writing custom interfaces. Many packages export useful types (either in the package itself or via a @types/ package).
- Try searching the codebase for types that are already defined, this might help you avoid re-inventing the wheel.
- If you encounter a very large file (such as the schema.ts file), use grep or other commands to find the line numbers so you can read small sections of the file.
- Avoid adding unnecessary database queries, use prepared statements where possible to speed up queries and avoid SQL injection.
- ALWAYS use Drizzle functions instead of raw SQL queries where possible for database operations as they provide strong type safety.
- Consider bundle size impact of new imports, don't add unnecessary dependencies.
- Maintain existing optimization patterns (memoization, lazy loading).
- Don't introduce N+1 query problems.
- If a function doesn't actually need to be async, just remove the async keyword and DO NOT make it artificially async with Promise.resolve().


Remember: **Understanding the system deeply is more important than fixing errors quickly**. Take time to gather context, analyze patterns, and think hard about implications before implementing changes.