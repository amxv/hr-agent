---
name: research
allowed-tools: Edit, MultiEdit, TodoWrite, Write, Grep, Glob, Bash(ls:*), Bash(gg:*)
argument-hint: [feature-id] [optional_notes_in_quotes]
description: Research the current state of the codebase to understand the current patterns, dependencies, and overall architecture before planning a new feature.
disable-model-invocation: true
---

## Task

This is the second phase of the Spec-Driven Development lifecycle.

You are tasked with researching the current state of the codebase to understand the current patterns, dependencies, and overall architecture before planning a new feature. This phase is crucial to ensure that the new feature integrates and builds on the existing patterns and architecture.

<details>
$ARGUMENTS
</details>

## Steps

### Step 1: Read The Spec

In the details above, you will find the feature id.

Run `ls gg/features/ | grep "^{feature-id}-"` to get the feature slug.
If the feature doesnt exist, immeidately tell me that the feature doesnt exist and I should run the /spec command to create it first.

Please read the specification document fully: `gg/features/<feature-slug>/{feature-id}-SPEC.md`

### Step 2: Plan what you need to research:
    - Think deeply about the proposed feature after reading the spec.
    - Take time to ultrathink about the underlying patterns, connections, and architectural implications of the proposed feature.
    - Your goal is to understand the current state of the codebase to inform the design of the new feature in a way that builds on the existing patterns and architecture.
    - Identify specific components, patterns, or concepts to investigate

### Step 3: Decompose the research task:
    - You have a very powerful and intelligent researcher subagent at your disposal called `codebase-researcher`. This agent is very good a answer specific questions about the codebase after doing comprehensive research.
    - Break down your proposed research plan into a list of a maximum of 5 composable research questions. For example: "How is NFC card assignment/removal handled in the enterprise application?", "How does the enterprise app handle incentives and rewards when users submit feedback?", etc.
    - Create a list of questions in a way that, if answered, would give you a comprehensive understanding of the current state of the codebase and the current patterns, dependencies, and architecture that the proposed feature will touch.

### Step 4: Spawn parallel researcher sub-agents (max 5) for every question:
    - Send each question to a separate `codebase-researcher` sub-agent.
    - Spawn them in parallel to research different aspects concurrently.
    - The `codebase-researcher` agent already knows how to research effectively. Don't include any instructions for how to research. Just send the question and wait for the answer.

### Step 5: Wait for all sub-agents to complete and synthesize findings:
    - IMPORTANT: Wait for ALL sub-agent tasks to complete before proceeding
    - Compile all sub-agent results
    - Connect findings across different components
    - Include specific file paths and line numbers for reference
    - Highlight patterns, connections, and architectural decisions

### Step 6: Web Research for External Packages and Framework Features:

After understanding the codebase, identify if the feature will require:
    - External packages (libraries, APIs, services)
    - Framework-specific features or patterns (Next.js, React, etc.)
    - Best practices or implementation approaches that would benefit from web research

If web research would be helpful, spawn `web-researcher` sub-agents:
    - For each external package: Include context about what you plan to use it for based on the spec and codebase research
    - For framework features: Describe what you're trying to accomplish and ask for best practices
    - For implementation approaches: Ask about modern patterns, performance considerations, or security best practices
    - Spawn them in parallel to research different topics concurrently
    - The `web-researcher` agent already knows how to research effectively. Don't include instructions for how to research. Just describe what package/feature you want to use and what you want to do with it.

Wait for all web-researcher sub-agents to complete and synthesize their findings, along with your codebase research in the final H2 section "Web Research Documents"

IMPORTANT: Put the file paths of the web research documents between the XML tags <web-research-documents> and </web-research-documents> (use EXACTLY this XML tag structure because scripts will parse this document).

### Step 7: Generate research document:

Write a research document `gg/features/{feature-slug}/{feature-id}-RESEARCH.md`.

Use this template to synthesize the findings:

<template>

```markdown
---
date: [Current date and time]
feature-slug: [Feature slug]
---

# [Feature Slug] Codebase Research

Here is a comprehensive research document of the current state of the codebase and the specific patterns, dependencies, and architecture that the proposed feature will touch.

## Summary
[High-level findings]

## Detailed Findings

### [Component/Area 1]
- Finding with reference ([file.ext:line](link))
- Connection to other components
- Implementation details

### [Component/Area 2]

...

## Code References
- `path/to/file.ts:123` - Short description of what this file does
- `another/file.ts:45-67` - Short description of the code block

## Architecture Insights
[Patterns, conventions, and design decisions discovered that could be reused or extended to support the proposed feature]

## Web Research Documents

<web-research-documents>

### [Package/Framework Name 1]
- **Purpose**: What it will be used for in this feature
- **Key Findings**: Important APIs, patterns, or best practices discovered
- **Integration Notes**: How it fits with the existing codebase

### [Package/Framework Name 2]
...

[If no external packages or framework features are needed, write "No external dependencies or framework-specific features required for this feature so no web research documents were created."]

</web-research-documents>

```
</template>

## Completion

After writing the document, run `code <file_path>` to open the document in my code editor so that I can review it.

