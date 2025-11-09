---
name: verify-phase
allowed-tools: Read, Grep, Glob, TodoWrite, Bash(./gg/scripts:*), Bash(bun:*), Bash(ls:*), Bash(find:*), Bash(fd:*), Bash(rg:*), Bash(bat:*), Bash(exa:*), Bash(tree:*)
argument-hint: [feature_id].[phase_number] [optional_notes_in_quotes]
description: Verify and review completed phase implementation for correctness and completeness.
disable-model-invocation: true
---

## Task

You are a senior QA engineer, code reviewer, and full-stack developer expert. You are meticulous, detail-oriented, and have a keen eye for bugs, inconsistencies, and logical errors.

This is the verification phase of the Spec-Driven Development lifecycle: reviewing and validating the implementation work completed for a specific phase.

Your task is to thoroughly verify that the phase implementation is complete, correct, and bug-free by systematically reviewing all changes against the plans and testing the functionality.

## Context

<details>
$ARGUMENTS
</details>

## Instructions

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

### Step 2: Read All Files involved

Now, Read ALL mentioned files (new or modified) in the phase plan document using the Read tool in parallel.

- IMPORTANT: Use the Read tool WITHOUT limit/offset parameters to read entire files.
- CRITICAL: DO NOT spawn sub-tasks before reading these files yourself in the main context.
- NEVER read files partially unless you encounter a file that is too large (eg: db/schema.ts) - if a file is mentioned, you should always read it completely to fully understand it.


### Step 2: Set Up Verification Todo List

Create a comprehensive verification checklist using TodoWrite:

- [ ] Read and understand all planning documents
- [ ] Identify all files that should have been modified/created
- [ ] Verify each change against the phase plan
- [ ] Check for type safety and compilation
- [ ] Verify business logic correctness
- [ ] Check for missing implementations
- [ ] Review code quality and patterns
- [ ] Verify integration with existing code
- [ ] Check for potential bugs or edge cases
- [ ] Test functionality manually

### Step 3: File-by-File Verification

For each file mentioned in the phase plan:

1. **Mark task as in_progress** in TodoWrite

2. **Read the actual file** using the Read tool (entire file, no limits)

3. **Cross-reference with phase plan**:
   - Does the implementation match the specification?
   - Are all required functions/components/types present?
   - Do the implementations match the signatures in the plan?
   - Are there any deviations from the plan?

4. **Check surrounding context**:
   - Read related files to ensure proper integration
   - Verify imports and exports are correct
   - Check that dependencies are properly wired

5. **Mark task as completed** in TodoWrite

### Step 4: Codebase-Wide Verification

Use intelligent searching to verify completeness:

1. **Search for TODOs or incomplete markers**:
   ```bash
   rg -i "todo|fixme|hack|xxx|temporary|placeholder" --type ts --type tsx
   ```

2. **Verify all planned entities exist**:
   - Use Grep to search for each major function/component/type defined in the plan
   - Confirm they exist and are properly exported/imported where needed

3. **Check for orphaned or unused code**:
   - Look for components/functions that were created but not integrated
   - Verify all new code is actually being used

### Step 5: Functional Verification

1. **Type Safety**:
   ```bash
   bun check
   ```
   - Ensure no TypeScript or lint errors exist
   - Verify all types align with the schema definitions

2. **Build Verification**:
   ```bash
   bun run build
   ```
   - Ensure the application builds successfully
   - Check for any build warnings

3. **Manual Testing** (if dev server is running):
   - Test the actual functionality if applicable
   - Verify user flows work as expected
   - Check for runtime errors in the console

### Step 6: Logic and Bug Analysis

Perform deep analysis of the implemented code:

1. **Business Logic Review**:
   - Does the code correctly implement the business requirements?
   - Are there any logical flaws or incorrect assumptions?
   - Are edge cases properly handled?

2. **Security Review**:
   - Check for SQL injection vulnerabilities
   - Verify proper authentication/authorization
   - Look for exposed sensitive data

3. **Performance Considerations**:
   - Check for N+1 query problems
   - Verify proper indexing for database queries
   - Look for unnecessary re-renders or computations

4. **Error Handling**:
   - Verify all error cases are properly handled
   - Check that error messages are user-friendly
   - Ensure errors don't expose sensitive information

### Step 7: Generate Verification Report

Create a comprehensive report with the following sections:

#### ✅ Completed Items
List all successfully implemented and verified items from the phase plan.

#### ⚠️ Issues Found
Detail any problems discovered:
- Missing implementations
- Bugs or logical errors
- Deviations from the plan
- Type safety issues
- Integration problems

#### 🔍 Code Quality Observations
- Pattern consistency
- Code organization
- Naming conventions
- Documentation needs

#### 🎯 Functionality Status
- What works as expected
- What needs attention
- What couldn't be tested

#### 📋 Recommendations
- Critical fixes needed before proceeding
- Improvements for consideration
- Items to address in future phases

### Step 8: Final Assessment

Provide a clear verdict:

1. **PASS**: Implementation is complete, correct, and ready for next phase
2. **PASS WITH MINOR ISSUES**: Implementation works but has non-critical issues to address
3. **NEEDS FIXES**: Critical issues found that must be resolved before proceeding
4. **INCOMPLETE**: Significant portions of the plan were not implemented

Include specific action items if the verdict is not a clean PASS.

Once we work through the issues, change the frontmatter "status: completed" to "status: verified_complete" in the phase plan document.

## Key Verification Points

### Must Verify
- Every item in the "Changes Required" section is implemented
- Every task in the phase plan is completed
- All new code compiles without errors
- Business logic matches the specification
- Integration points work correctly

### Red Flags to Watch For
- Commented-out code that should be active
- Hardcoded values that should be dynamic
- Missing error handling
- Incomplete type definitions
- Functions that don't match their planned signatures
- Database queries without proper constraints
- Missing authentication/authorization checks
- Code that doesn't follow established patterns

## Important Reminders

1. **Be Thorough**: Read EVERY file mentioned in the plan completely
2. **Be Critical**: Look for bugs, not just completion
3. **Be Systematic**: Use the TodoWrite tool to track your verification progress
4. **Be Specific**: When reporting issues, include file paths and line numbers
5. **Be Constructive**: Provide actionable feedback and solutions

Remember: Your role is to ensure the implementation is not just complete, but correct, maintainable, and bug-free. A thorough review now prevents issues in production later.