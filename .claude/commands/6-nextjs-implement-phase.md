---
name: implement
allowed-tools: Edit, MultiEdit, TodoWrite, Write, Read, Grep, Glob, Bash(gg ctx:*), Bash(bun:*), Bash(git:*), Bash(ls:*), Bash(find:*), Bash(fd:*), Bash(rg:*), Bash(bat:*), Bash(exa:*), Bash(tree:*)
argument-hint: [feature_id].[phase_number] [optional_notes_in_quotes]
description: Implement a specific phase of a feature based on detailed implementation plans.
disable-model-invocation: true
---

## Task

You are a senior full-stack developer and Next.js app router expert. You are an expert at implementing scalable, maintainable, and performant full stack web applications in TypeScript with strong type safety.

This is the fifth and final phase of the Spec-Driven Development lifecycle: implementing the actual code changes for a specific phase based on the detailed implementation plans.

Your task is to implement all the changes described in the phase plan by following the structured process outlined below.

<details>
$ARGUMENTS
</details>

## Steps

### Step 1: Gather Context

In the details above, you will find the feature id and phase number (in a format like <feature-id>.<phase-number> or in natural language).

Run `ls gg/features/ | grep "^{feature-id}-"` to get the feature slug.

I've prepared four documents that you should read fully in parallel:

1. **Feature Specification**: A detailed specification of the feature, including user scenarios, functional requirements, key entities, and other relevant information at `gg/features/<feature-slug>/{feature-id}-SPEC.md`

2. Feature Summary: A summary of the feature at `gg/features/<feature-slug>/summary.md`

3. **Phase-Specific Implementation Plan**: A detailed, low-level implementation guide for this specific phase, including exact code changes, file modifications at `gg/features/<feature-slug>/plans/{feature-id}.{phase-number}.md`

4. Task List: A comprehensive task list for this phase at `gg/features/<feature-slug>/plans/{feature-id}.{phase-number}-TASKS.md`


Read the phase implementation plan carefully and understand:

- **Overview**: What this phase accomplishes
- **Important Codebase Context**: Files to understand, modify, or create
- **Changes Required**: Detailed technical description of all changes

Now, Read ALL mentioned files in the phase plan document using the Read tool.

- IMPORTANT: Use the Read tool WITHOUT limit/offset parameters to read entire files.
- CRITICAL: DO NOT spawn sub-tasks before reading these files yourself in the main context.
- NEVER read files partially unless you encounter a file that is too large (eg: db/schema.ts) - if a file is mentioned, you should always read it completely to fully understand it.


### Step 2: Set up Tasks Todo List using the TodoWrite tool

Create a todo list using the TodoWrite tool that captures all the tasks from the tasks document in the exact order they should be completed.

- Use the task descriptions from the phase plan as your todo items
- Mark all tasks as `pending` initially
- Convert the hierarchical task structure (1, 1.1, 1.2, etc.) into a flat, sequential list
- Each todo should have both `content` (imperative form) and `activeForm` (present continuous form)

Update the frontmatter:

Read the first 10 lines of the tasks document `gg/features/<feature-slug>/plans/{feature-id}.{phase-number}-TASKS.md` and update the frontmatter "status: not_started" to "status: in_progress".

### Step 3: Systematic Implementation

Implement the changes following the exact order specified in the tasks document:

1. **Start Each Task**: Mark the current task as `in_progress` using TodoWrite before beginning work.

2. **Implement Incrementally**:
   - Make focused, atomic changes for each task
   - Follow the technical specifications exactly as described in the plan
   - Maintain the established code patterns and conventions
   - Ensure type safety throughout all changes

3. **Complete Each Task**: Mark the task as `completed` using TodoWrite immediately after finishing.

If you discover any issues, inconsistencies, or missing dependencies that prevent implementation:
- Stop the implementation process
- Clearly describe the issue and its impact
- Ask for clarification or plan updates before proceeding


### Step 4: Implementation Verification

After completing all tasks:

1. **Type Safety and Code Quality Check**: Run `bun check`(combined typechecking and linting).

IMPORTANT: If you encounter any errors, NEVER fix the errors yourself. ALWAYS call the SlashCommand tool with "/8-nextjs-fix-phase-errors" command.

2. **Build Verification**: Run `bun run build` to ensure the application builds successfully.

### Step 5: Final Review and Documentation

1. **Review Implementation**: Compare the completed implementation against the phase plan requirements and task list to ensure everything has been implemented correctly.

2. **Update Todo List**: Ensure all tasks are marked as `completed` in the TodoWrite tool.

3. Change the frontmatter "status: in_progress" to "status: completed" in the phase plan document

4. **Summary Report**: Provide a brief summary of:
   - What was implemented in this phase
   - Any deviations from the original plan (if any)
   - Next steps or dependencies for subsequent phases
   - Any issues encountered and how they were resolved

## Key Implementation Guidelines

### Code Quality Standards
- **Type Safety First**: Ensure strong TypeScript typing throughout
- **Follow Existing Patterns**: Maintain consistency with established codebase patterns
- **Clean Code**: Write readable, maintainable code with proper naming conventions
- **Error Handling**: Include appropriate error handling and validation
- **UI Components**: Use shadcn/ui components for consistency

## Important Reminders

1. **Use TodoWrite Extensively**: Track every single task and update progress in real-time.

2. **Follow the Plan Exactly**: The phase plan has been carefully designed - implement exactly what's specified.

3. **Ask Before Deviating**: If you need to deviate from the plan due to technical constraints, ask for guidance first.

4. **Maintain Context**: Keep the high-level feature goals in mind while implementing specific changes.

5. **Quality Over Speed**: Prioritize correctness and code quality over implementation speed.

6. The dev server is already running, do not attempt to start it again.

Remember: You're implementing a carefully planned phase of a larger feature. Your implementation should be production-ready, well-tested, and seamlessly integrate with the existing codebase.
