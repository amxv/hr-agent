---
date: 2025-11-11 22:45:00
feature-slug: 003-hr-tools-admin-integration
feature-id: 003
---

# HR Tools Admin Integration - Implementation Summary

## Feature Overview

Transform the 5 HR tools (Leave Balance, Benefits Info, HR Case, Team Availability, People Search) from hardcoded mock data to database-backed admin-managed data. Create a comprehensive admin panel at /admin/hr-data that serves as the "source of truth" for all HR data, enabling real-time demos where admins can edit employee information, leave balances, benefits plans, HR cases, and team availability, then immediately see those changes reflected in AI agent responses.

## Current State Analysis

**What exists now:**
- 5 fully implemented HR tools with hardcoded mock data in tool files
- Established admin panel architecture at /admin with CRUD patterns for users and documents
- Mature database layer with Drizzle ORM, PostgreSQL, and comprehensive query patterns
- Simple two-layer RBAC (admin/user roles) using Better Auth
- Type-safe tRPC layer with Zod validation
- Dialog-based CRUD UI patterns with React Hook Form

**What's missing:**
- Database tables for HR entities (employees, leave balances, benefits, cases, absences)
- Admin UI for managing HR data
- Connection between admin-managed data and tool queries
- Data seeding system for initial demo data

**Key constraints:**
- Must maintain same tool return structures for UI compatibility
- All admin operations require admin role (enforced by adminProcedure)
- Demo-focused: simplified validation, no complex workflows
- Follow existing patterns: dialog-based CRUD, tRPC procedures, centralized queries

## Desired End State

**After all phases complete:**
1. Admin users can navigate to /admin/hr-data and see a dashboard with 5 sections
2. Each section provides full CRUD operations for the respective HR data type
3. All HR data is persisted in PostgreSQL with proper relationships and indexes
4. The 5 HR tools query the database in real-time (no mock data)
5. Changes made in admin panel are immediately available to agent tools
6. Initial seed data matching current mock data structure is automatically loaded
7. "Reset to Defaults" button in admin dashboard restores original seed data

**How to verify:**
1. Login as admin and navigate to /admin/hr-data - see dashboard with summary stats
2. Edit an employee's job title in Employee Directory
3. Ask the agent to look up that employee - verify updated title appears
4. Modify a leave balance value for an employee
5. Ask the agent to check leave balance - verify updated value appears
6. Create a new HR case in admin panel
7. Ask the agent to list HR cases - verify new case appears
8. Click "Reset to Defaults" - verify all data reverts to original seed data

## What We're NOT Doing

- No bulk import/export functionality for HR data
- No optimistic locking or conflict resolution for concurrent edits (last-write-wins)
- No automatic leave accrual calculations or scheduling
- No separate "HR Admin" role (existing admin role has full access)
- No real-time UI updates via WebSockets (page refresh required)
- No complex approval workflows beyond basic approve/deny for leave requests
- No detailed audit log UI page (audit fields stored but not displayed in dedicated page)
- No email notifications for case updates or leave approvals
- No file attachments for HR cases
- No complex benefits enrollment workflows or re-enrollment processes

## Phase List

- Phase 1: Database Schema and Type Definitions
- Phase 2: Backend API and Data Layer
- Phase 3: Admin UI - Employee Management & Leave Balances
- Phase 4: Admin UI - Benefits, Cases, and Availability
- Phase 5: Tool Integration and Testing
