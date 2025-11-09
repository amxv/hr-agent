---
name: new-cmd
allowed-tools: Write(~/.gg/claude/commands/**)
argument-hint: <description>
description: Generate a new slash command from description
disable-model-invocation: true
---
## Task

You are an AI command generator expert. Your task is to create a new slash command file based on the user's description by intelligently filling out the template.

## Instructions

### Step 1: Understand the new slash command idea

$ARGUMENTS

If no description is provided, respond with: "Please provide a description: /new-cmd `<description>`"

### Step 2: Analyze Description

Based on the description, intelligently determine:

1. **Command Name**: Generate a descriptive kebab-case name (e.g., "fix typescript errors" →`fix-ts-errors`)
2. **Role & Expertise**: What type of expert should this command embody?
3. **Main Objective & Approach**: What is the primary goal and how to achieve it?
4. **Required Tools**: Which tools would be needed? Consider:
   - Read, Write, Edit, MultiEdit for file operations
   - Bash, Grep, Glob for searching and commands
   - TodoWrite for task tracking
   - Task for complex multi-step operations
5. **Argument Pattern**: What arguments would this command typically accept?

### Step 3: Generate Command File

Read the template:
@gg/templates/command-template.md

Then create a new command file at `~/.gg/claude/commands/<command-name>.md` by:

1. Replacing all`{{PLACEHOLDER}}` values with appropriate content based on your analysis
2. Removing unnecessary sections (leave them empty or minimal if not needed)
3. Focusing on the core functionality described by the user
4. Using sensible defaults where the user hasn't been specific

### Step 4: Placeholder Filling Guide

When replacing placeholders, use these guidelines:

- `{{COMMAND_NAME}}`: The generated kebab-case command name
- `{{ALLOWED_TOOLS}}`: Only include tools that are actually needed
- `{{ARGUMENT_HINT}}`: Descriptive hint for expected arguments
- `{{DESCRIPTION}}`: One-line active voice description (max 15 words)
- `{{ROLE}}`: Specific expert role with 2-3 key attributes
- `{{EXPERTISE}}`: Domain expertise relevant to the command
- `{{MAIN_OBJECTIVE}}` &`{{APPROACH}}`: Clear goal and method
- Remove or minimize sections that aren't relevant to the specific command
- Keep it simple - not every command needs sub-agents or deep thinking

### Step 5: Confirm Creation

After creating the file:

- Tell the user the command name:`/<command-name>`
- Mention the file location for customization
- Suggest testing the command with appropriate arguments

## Examples

- "fix typescript errors in my project" →`/fix-ts-errors`
- "review code for security issues" →`/security-review`
- "generate unit tests for a module" →`/generate-tests`
- "optimize React component performance" →`/optimize-react`

Remember: Generate focused, practical commands that solve specific problems. Keep the generated command simple and purposeful - not every command needs every feature from the template.
