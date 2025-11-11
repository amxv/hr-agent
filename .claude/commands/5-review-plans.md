---
name: review-plans
allowed-tools: Read, TodoWrite, Grep, Glob, Bash(./gg/scripts:*), Bash(ls:*), Bash(find:*), Bash(fd:*), Bash(rg:*), Bash(bat:*), Bash(exa:*), Bash(tree:*)
argument-hint: [feature_id] [optional_notes_in_quotes]
description: Review phase plans and task lists for consistency and correctness.
disable-model-invocation: true
---

## Task

You are a meticulous technical architect, senior software engineer, and quality assurance expert. You have an exceptional eye for detail, consistency, and logical coherence.

This is the review phase of the Spec-Driven Development lifecycle: validating that all phase plans and task lists are consistent, complete, and correctly aligned with the specification and research.

Your task is to thoroughly review all phase implementation plans and their corresponding task lists by systematically analyzing them for consistency, completeness, and correctness.

<details>
$ARGUMENTS
</details>

## Steps

### Step 1: Gather Context

In the details above, you will find the feature id.

Run `ls gg/features/ | grep "^{feature-id}-"` to get the feature slug.
If the feature doesnt exist, immediately tell me that the feature doesnt exist and I should run the /spec command to create it first.

Please use the Read tool in parallel and read the following documents fully:

1. Specification: `gg/features/<feature-slug>/{feature-id}-SPEC.md`
2. Research: `gg/features/<feature-slug>/{feature-id}-RESEARCH.md`
3. Feature Summary: `gg/features/<feature-slug>/summary.md`

Please read these documents carefully to understand the proposed feature, the current state of the codebase, and the overall phase breakdown.

If you notice any middle truncated text in the context provided, STOP and ask me to provide the complete context.

Now, use the Glob tool to find all phase plans and task lists:
```
gg/features/{feature-slug}/plans/{feature-id}.*.md
```

Then Read ALL phase plans and task lists in parallel using the Read tool:
- IMPORTANT: Read all phase plans and task lists simultaneously in a single message with multiple tool calls
- Use the Read tool WITHOUT limit/offset parameters to read entire files
- You must read EVERY phase plan and task list to understand the complete implementation

### Step 2: Set Up Review Todo List

Create a comprehensive review checklist using TodoWrite:

- [ ] Read and understand spec, research, and feature summary
- [ ] Read all phase plans and task lists in parallel
- [ ] Verify phase plans align with spec requirements
- [ ] Check phase plan consistency with research findings
- [ ] Verify ordering of changes is logical
- [ ] Check for missing functionality in phase plans
- [ ] Check for extra changes not in spec
- [ ] Identify duplicate implementations across phases
- [ ] Verify type definitions consistency across phases
- [ ] Check database schema progression
- [ ] Verify dependency ordering between phases
- [ ] Review task list completeness for each phase
- [ ] Verify 1:1 mapping between phase plan changes and tasks
- [ ] Check task list formatting and numbering
- [ ] Check for logical errors or inconsistencies
- [ ] Generate comprehensive review report

### Step 3: Phase-by-Phase Analysis

For each phase plan and its corresponding task list, perform the following verification:

1. **Mark review task as in_progress** in TodoWrite

2. **Cross-Reference with Specification**:
   - Open the specification for this feature
   - Compare phase deliverables against spec requirements
   - Verify the phase contributes to fulfilling spec requirements
   - Check that nothing from the spec is missing
   - Check that nothing extra was added that contradicts the spec

3. **Cross-Reference with Research**:
   - Verify the phase plan follows patterns identified in research
   - Check that existing code patterns are being reused appropriately
   - Ensure dependencies identified in research are addressed
   - Confirm architectural decisions align with research findings

4. **Implementation Details Check**:
   - Are the technical details logical and correct?
   - Do the proposed implementations make sense?
   - Are there any obvious bugs or issues in the approach?
   - Is the code structure consistent with the codebase?
   - Are file paths and locations appropriate?

5. **Type and Schema Verification**:
   - Do type definitions match between phases?
   - Is the database schema consistent?
   - Are shared types defined in the correct phase (typically Phase 1)?
   - Do dependent phases reference types correctly?

6. **Task List Verification**:
   - Does each "Changes Required" item map to a corresponding task?
   - Are tasks properly numbered (1.1, 1.2, etc.)?
   - Are subtasks logically grouped under parent tasks?
   - Are task descriptions clear and actionable?
   - Do tasks reference specific file paths where applicable?

7. **Mark review task as completed** in TodoWrite

### Step 4: Cross-Phase Consistency Analysis

Perform deep analysis across all phases:

1. **Duplicate Implementation Detection**:
   - Search for functions/components that appear in multiple phases
   - Flag any entity that is implemented more than once
   - Identify if the same file is modified in conflicting ways

2. **Dependency Chain Verification**:
   - Ensure Phase 1 creates foundations for Phase 2
   - Verify each phase builds on previous phases correctly
   - Check that no phase depends on future phases
   - Confirm the implementation order makes logical sense
   - Verify database schema changes come before code that uses them

3. **Progressive Enhancement Check**:
   - Verify the feature gradually comes together
   - Ensure no phase breaks functionality from previous phases
   - Check that each phase is independently testable
   - Confirm phases can be deployed incrementally when possible

4. **Task List Consistency**:
   - Verify all tasks follow the correct GFM format
   - Check that task hierarchies are logical
   - Ensure task descriptions are clear and actionable
   - Confirm task order matches the changes described in phase plans
   - Verify task numbering is consistent (1.1, 1.2, not 1.a, 1.b)

5. **Type Safety Verification**:
   - Ensure shared types are defined before they're used
   - Check that type definitions are complete
   - Verify type consistency across frontend and backend
   - Confirm no type mismatches between phases

### Step 5: Technical Correctness Review

Analyze the technical approach in each phase:

1. **Code Pattern Adherence**:
   - Server actions vs API routes usage
   - Authentication/authorization patterns
   - Database query patterns
   - UI component patterns (Server Components vs Client Components)
   - Next.js 15 app router conventions

2. **Best Practices Verification**:
   - Error handling approaches
   - Type safety maintenance
   - Performance considerations
   - Security implications
   - Input validation patterns

3. **Integration Points**:
   - How phases connect to existing code
   - API contracts between components
   - Database migration safety
   - UI/UX continuity
   - Proper use of existing utilities and helpers

4. **External Dependencies**:
   - Are new npm packages justified?
   - Are existing packages being used correctly?
   - Are package versions compatible?
   - Are packages well-maintained and documented?

### Step 6: Identify Issues and Inconsistencies

Create a detailed list of all problems found:

#### Critical Issues (Must Fix)
- Missing required functionality from spec
- Duplicate implementations across phases
- Type mismatches or schema conflicts
- Broken dependency chains
- Security vulnerabilities
- Tasks that don't map to phase plan changes

#### Major Issues (Should Fix)
- Incorrect implementation order
- Inconsistent patterns or approaches
- Missing error handling
- Incomplete task descriptions
- Missing file path references
- Task numbering errors

#### Minor Issues (Consider Fixing)
- Naming inconsistencies
- Documentation gaps
- Non-optimal implementation approaches
- Task list formatting issues
- Minor deviations from codebase patterns

### Step 7: Document All Issues

For every issue found:

1. **Document the issue clearly** with specific file and line references
2. **Explain the impact** of the issue on implementation
3. **Suggest potential solutions** for discussion
4. **Categorize by severity** (Critical/Major/Minor)
5. **Note dependencies** between issues if they exist
6. **Reference which phase(s)** are affected

Do NOT attempt to fix issues directly - all changes require discussion and approval.

### Step 8: Generate Comprehensive Review Report

Create a detailed review report with the following sections:

#### ✅ Review Summary
- Total phases reviewed: X
- Critical issues found: X
- Major issues found: X
- Minor issues found: X
- Overall assessment: [Brief summary]

#### 📋 Phase-by-Phase Review

For each phase:
- **Phase X: [Phase Name]** ([File: 003.X.md, Tasks: 003.X-TASKS.md])
  - ✅ Correctly implements: [list what's correct]
  - ⚠️ Issues found: [list any issues with severity]
  - 💡 Recommended fixes: [suggested solutions]
  - 📝 Task list quality: [assessment of task list]

#### 🔍 Cross-Phase Analysis
- Dependency chain: [VALID/ISSUES]
- Type consistency: [VALID/ISSUES]
- No duplicates: [VALID/ISSUES]
- Progressive enhancement: [VALID/ISSUES]
- Task-to-plan alignment: [VALID/ISSUES]

#### 🎯 Spec Alignment
- All spec requirements covered: [YES/NO - list missing items]
- No extra functionality added: [YES/NO - list extras]
- Research findings incorporated: [YES/NO - list gaps]

#### 🚨 Critical Issues Requiring Attention
[List any critical issues that must be addressed before implementation]

#### 📝 Recommendations
- Immediate actions needed
- Improvements for consideration
- Potential risks to monitor

#### ✅ Final Verdict

One of:
1. **APPROVED**: All phase plans and task lists are consistent and ready for implementation
2. **NEEDS MINOR REVISIONS**: Minor issues found that should be addressed before implementation
3. **NEEDS MAJOR REVISIONS**: Significant issues found that require plan updates
4. **BLOCKED**: Critical issues prevent implementation without substantial rework

Include specific next steps for any verdict other than clean APPROVED.

## Key Review Criteria

### Must Verify
- Every spec requirement appears in appropriate phase plan
- No functionality appears in multiple phase plans
- Order of phases is logical (schema → backend → frontend)
- All type definitions are consistent
- Database schema evolves correctly
- Dependencies flow in correct direction
- Task lists map 1:1 to phase plan changes
- Tasks are properly numbered and formatted
- Shared types are defined in Phase 1

### Red Flags to Watch For
- Same function defined in multiple phases
- Phase 2 depending on Phase 3 work
- Missing authentication/authorization
- Inconsistent error handling patterns
- Type mismatches between phases
- Missing critical business logic from spec
- Tasks without file path references
- Changes not mentioned in spec or research
- Task numbering inconsistencies (1.a instead of 1.1)
- Missing tasks for changes described in phase plans
- Extra tasks not corresponding to phase plan changes

## Important Reminders

1. **Read Everything First**: Load ALL phase plans and task lists before starting analysis
2. **Be Systematic**: Use TodoWrite to track your review progress
3. **Be Critical**: Look for logical errors, not just completeness
4. **Be Specific**: Include file paths and line numbers when reporting issues
5. **Report, Don't Fix**: Document all issues for discussion - do not make changes
6. **Document Everything**: Your review should be comprehensive and actionable
7. **Check Task Alignment**: Every phase plan change should have corresponding tasks
8. **Verify Spec Coverage**: Every spec requirement should be covered by some phase

Remember: Your thorough review identifies issues for discussion and resolution. The goal is to surface all problems so they can be addressed before implementation begins.
