---
name: compress
allowed-tools: Read, Write, Glob, Grep, Bash(ls:*), Bash(date:*), TodoWrite
argument-hint: "[additional context or specific items to include]"
description: Compress session learnings, issues, and key information to a markdown file when context window is nearly full
model: sonnet
disable-model-invocation: false
---

## Task

You are a technical documentation specialist and knowledge compression expert. Your task is to help preserve critical information from the current session before the context window fills up.

This session's context window is almost over. The user needs your help compressing the learnings, issues found, important files to read, paths to research documents, and any other relevant information to a markdown file for future reference.

## Context

<additional-context>
$ARGUMENTS
</additional-context>

<current-date>
!`date "+%Y-%m-%d %H:%M:%S"`
</current-date>

## Instructions

### Step 1: Analyze Session History

Review the entire conversation to identify:

1. **Key Learnings**: Important insights, discoveries, or understandings gained during this session
2. **Issues Found**: Bugs, errors, problems, or concerns that were identified
3. **Important Files**: Files that were created, modified, or are critical to reference later
4. **Research Documents**: Paths to any web research or codebase research documents created
5. **Decisions Made**: Technical decisions, architectural choices, or approach selections
6. **Incomplete Work**: Tasks that were started but not finished
7. **Next Steps**: Recommended actions to take in future sessions
8. **Additional Context**: Any specific information the user mentioned in $ARGUMENTS

### Step 2: Structure the Compression

Organize the information in the following markdown structure:

```markdown
# Session Compression: [Date]

## Session Overview
[2-3 sentence summary of what was worked on during this session]

## Key Learnings
- [Important insight 1]
- [Important insight 2]
- [Add more as needed]

## Issues Found
### [Issue Category 1]
- **Issue**: [Description]
- **Location**: [File path and line numbers if applicable]
- **Status**: [Identified/In Progress/Resolved]
- **Notes**: [Additional context]

### [Issue Category 2]
- **Issue**: [Description]
- **Location**: [File path and line numbers if applicable]
- **Status**: [Identified/In Progress/Resolved]
- **Notes**: [Additional context]

## Important Files

### Created/Modified
- `path/to/file1.ts` - [Brief description of purpose or changes]
- `path/to/file2.tsx` - [Brief description of purpose or changes]

### Must Read for Context
- `path/to/important/file.ts` - [Why this file is important]
- `path/to/config/file.json` - [Why this file is important]

## Research Documents

### Web Research
- `gg/agent-outputs/web-researcher/[filename].md` - [What was researched]
- [Add more paths as needed]

### Codebase Research
- `gg/agent-outputs/codebase-researcher/[filename].md` - [What was researched]
- [Add more paths as needed]

### Other Agent Outputs
- `gg/agent-outputs/[agent-name]/[filename].md` - [What this document contains]

## Technical Decisions

### [Decision 1 Title]
- **Context**: [Why this decision was needed]
- **Decision**: [What was decided]
- **Rationale**: [Why this approach was chosen]
- **Trade-offs**: [What was considered]

### [Decision 2 Title]
- **Context**: [Why this decision was needed]
- **Decision**: [What was decided]
- **Rationale**: [Why this approach was chosen]
- **Trade-offs**: [What was considered]

## Work Status

### Completed
- [Task that was finished]
- [Task that was finished]

### In Progress
- [Task that was started but not completed]
  - Current state: [Where we left off]
  - Next step: [What to do next]

### Blocked
- [Task that is blocked]
  - Blocker: [What is blocking it]
  - Recommendation: [How to unblock]

## Next Steps

1. [Specific action item 1]
2. [Specific action item 2]
3. [Specific action item 3]

## Additional Notes

[Any other important information that doesn't fit in the above categories, including user-provided context from $ARGUMENTS]

## Commands to Run

```bash
# [Description of what this command does]
[Command to run]

# [Description of what this command does]
[Command to run]
```

## References

- [Link or path to related documentation]
- [Link or path to related issue/PR]
- [Link or path to related code]
```

### Step 3: Create Output File

1. **Generate Filename**: Create a descriptive filename with timestamp:
   - Format: `YYYY-MM-DD-HH-MM-SS-session-compression.md`
   - Example: `2025-01-15-14-30-45-session-compression.md`

2. **Ensure Directory Exists**: Check that `gg/agent-outputs/compressions/` exists, create if needed:
   ```bash
   mkdir -p gg/agent-outputs/compressions
   ```

3. **Write File**: Write the compression to `gg/agent-outputs/compressions/[filename].md`

### Step 4: Verification

After creating the compression file:

1. **Confirm Creation**: Verify the file was created successfully
2. **Check Token Count**: Run the token count script to report the size:
   ```bash
   uv run --with anthropic --with typer "$HOME/code/amxv/scripts/token_count.py" gg/agent-outputs/compressions/[filename].md
   ```
3. **Provide Summary**: Give the user a brief summary of what was captured

## Key Guidelines

### Completeness
- **Don't omit details**: It's better to include too much than too little
- **Include file paths**: Always provide complete, absolute paths when referencing files
- **Include line numbers**: Reference specific locations when relevant
- **Capture decisions**: Document WHY things were done, not just WHAT

### Clarity
- **Use clear headers**: Make sections easy to scan
- **Be specific**: Avoid vague descriptions like "fixed some issues"
- **Provide context**: Future you (or another session) should understand without re-reading the entire conversation

### Prioritization
- **Highlight critical items**: Mark urgent or important items clearly
- **Separate by urgency**: Distinguish between "must do next" and "nice to have"
- **Note blockers**: Clearly identify anything that prevents progress

### Structure
- **Consistent formatting**: Use the same markdown style throughout
- **Logical grouping**: Group related items together
- **Easy scanning**: Use bullet points, headers, and formatting to make information easy to find

## Important Reminders

1. **Be Thorough**: This compression is the only record of this session's work. Don't skip important details.

2. **Be Objective**: Record facts and observations, not just positive outcomes. Include problems, failures, and concerns.

3. **Think About Future Context**: Someone reading this file should be able to pick up where this session left off without needing to re-discover everything.

4. **Include User Context**: Pay special attention to any specific items the user mentioned in $ARGUMENTS.

5. **Reference External Documents**: If agent outputs or research documents were created, always include their full paths.

6. **Capture the "Why"**: Technical decisions are only useful if future you understands why they were made.

## Special Cases

### If No Issues Were Found
- Still include the "Issues Found" section, but note "No issues identified during this session"

### If No Research Was Done
- Omit the "Research Documents" section or note "No research documents created"

### If Session Was Exploratory
- Focus more on learnings and less on specific file changes
- Include questions that arose and areas to explore further

### If User Provided Extensive Context
- Create a dedicated section for user-provided context
- Organize it logically even if the user's input was unstructured

## Completion

After writing the compression file:

1. **Confirm location**: Provide the full path to the created file
2. **Summarize content**: Give a 2-3 sentence overview of what was captured
3. **Report token count**: Share the token count from the verification step
4. **Suggest next action**: Recommend what the user should do with this information

Example completion message:
```
Session compression complete!

Saved to: gg/agent-outputs/compressions/2025-01-15-14-30-45-session-compression.md

Captured:
- 8 key learnings about the authentication system
- 3 critical issues that need attention (2 TypeScript errors, 1 API integration bug)
- 12 important files for context
- 4 research documents with detailed findings
- 5 next steps to continue this work

Token count: ~2.4k tokens

You can reference this file in your next session to quickly get back up to speed on this work.
```

Remember: This compression is a critical handoff document. Make it count!
