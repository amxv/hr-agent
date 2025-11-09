---
name: spec
allowed-tools: Edit, MultiEdit, TodoWrite, Write
argument-hint: [feature-description]
description: Create a detailed specification for a new feature.
disable-model-invocation: true
---

The current time is !`date "+%Y-%m-%d %H:%M:%S"`

## Task

This is the first phase of the Spec-Driven Development lifecycle. You are tasked with creating a detailed specification for a new feature:

<feature-description>

    $ARGUMENTS

</feature-description>

## Initial Setup

Before you begin, think of a short feature slug (max 3 words) based on the feature description provided and run `gg new {feature-slug}` which will switch to a new branch for this feature and set up the feature directory. You will receive the assigned a feature id and a new feature slug after you run the command.

## Instructions

Write the spec to `gg/features/{feature-slug}/{feature-id}-SPEC.md`.

- Extract key concepts from the feature description. Identify actors, actions, data, and constraints.
- Focus on WHAT users need and WHY
- Avoid HOW to implement (no tech stack, APIs, code structure)
- Remember that you are writing for business stakeholders, not developers

## Sections

### 1. User Scenarios

Think from the perspective of the user using this feature. Describe the main user journey in plain language. Be as detailed and specific as possible.

### 2. Functional Requirements

Describe every requirement needed to implement the feature.

### 3. Key Entities

What are the key entities involved in the feature? How do they relate to each other?


## Dealing with Ambiguity or Underspecification

Never guess or assume anything. Mark all ambiguities clearly if I didn't provide enough information in the feature description. Use [NEEDS CLARIFICATION: specific question] in the spec.

Common underspecified areas:
- User types and permissions
- Data retention/deletion policies
- Performance targets and scale
- Error handling behaviors
- Integration requirements
- Security/compliance needs

## Template

Follow this spec template:

```markdown
---
date: [Current date and time]
feature-slug: [Feature slug]
---

# Feature Specification: [FEATURE NAME]

[Summarized feature description in 3-4 sentences]

## 1. User Scenarios

### Primary User Story
[Describe the main user journey in plain language]

### Acceptance Scenarios
1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

### Edge Cases
- What happens when [boundary condition]?
- How does system handle [error scenario]?

## 2. Requirements

### Functional Requirements
- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-003**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-004**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*
- **FR-005**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-006**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### 3. Key Entities

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

```

## Completion

Once you are done, run `code <spec-file-path>` so that I can review it in my code editor.

If you marked any items as [NEEDS CLARIFICATION: specific question], respond with a list of questions I should answer to clarify the requirement.

Once I answer your clarification questions, update the spec.