---
date: 2025-10-21 18:31:01
feature-slug: 001-admin-user-management
---

# Feature Specification: Admin User Management & Email/Password Authentication

This feature implements administrative capabilities and email/password authentication for the AI chat application. The system will use a simple email/password authentication system (removing existing OAuth providers). Administrators will be able to manage users through a dedicated dashboard with streamlined user creation including automatic password generation.

## 1. User Scenarios

### Primary User Story: Admin Managing Users

Sarah is an administrator at a company using the AI chat application. She logs into the admin dashboard using her email and password. She sees a list of all users in the system with their basic information. A new employee, John, has joined the company, so Sarah clicks "Add User" and enters John's email address (john@company.com). She chooses to let the system generate a random password, which is displayed to her. The system creates John's account. Sarah provides John with his email and generated password. Later, when an employee leaves the company, Sarah searches for their account and clicks "Remove User" to deactivate their access. The user's account is deactivated but their chat history is retained in the system.

### Primary User Story: Admin Creating User with Custom Password

Sarah needs to create an account for a contractor who requested a specific password. She clicks "Add User", enters the contractor's email, and manually provides a custom password instead of using the auto-generated one. The system creates the account with the custom password.

### Primary User Story: User Authentication

John receives his credentials from Sarah. He visits the application and sees a simple login page with email and password fields. He enters his credentials (john@company.com and the generated password) and accesses the chat application. If John forgets his password, he contacts Sarah, who can reset it for him through the admin dashboard.

### Primary User Story: Admin Editing User Details

Sarah notices that a user's email address has changed. She navigates to the user's row in the admin dashboard and clicks "Edit". She updates the user's email address and saves the changes.

### Acceptance Scenarios

#### Admin Dashboard Access
1. **Given** a user with admin privileges, **When** they navigate to the admin dashboard URL, **Then** they see the admin interface with user management options
2. **Given** a regular (non-admin) user, **When** they attempt to access the admin dashboard, **Then** they are denied access and redirected to the main application
3. **Given** an unauthenticated user, **When** they attempt to access the admin dashboard, **Then** they are redirected to the login page

#### User Addition
1. **Given** an admin on the dashboard, **When** they add a new user with an email and let the system generate a password, **Then** the user account is created with active status and the generated password is displayed to the admin
2. **Given** an admin on the dashboard, **When** they add a new user with an email and provide a custom password, **Then** the user account is created with active status using the custom password
3. **Given** an admin adding a user, **When** they provide an email that already exists, **Then** the system prevents creation and displays an error message
4. **Given** an admin who just created a user, **When** the system generates a password, **Then** the password is shown only once and the admin must copy it before proceeding

#### User Removal (Soft Delete)
1. **Given** an admin viewing the user list, **When** they remove a user, **Then** the user's account status changes to "inactive" and their chat history is retained
2. **Given** a removed (inactive) user, **When** they attempt to log in, **Then** they receive an error message indicating their account is no longer active
3. **Given** an admin, **When** they attempt to remove themselves, **Then** the system prevents the action and displays an error message
4. **Given** the last remaining admin account, **When** someone attempts to remove it, **Then** the system prevents the action and displays an error message

#### Password Authentication
1. **Given** a user with active status and valid credentials, **When** they enter correct email and password, **Then** they are logged into the application
2. **Given** a user, **When** they enter incorrect credentials, **Then** they receive an error message and remain on the login page
3. **Given** an inactive user, **When** they enter correct credentials, **Then** they receive an error message indicating their account is inactive

#### Admin Password Reset
1. **Given** an admin viewing the user list, **When** they click "Reset Password" for a user, **Then** they can set a new password for that user
2. **Given** an admin, **When** they reset a user's password, **Then** the user's old password is invalidated immediately

#### Admin Edit User Details
1. **Given** an admin viewing the user list, **When** they click "Edit" for a user, **Then** they can modify the user's email
2. **Given** an admin editing a user, **When** they change the email to one that already exists, **Then** the system prevents the change and displays an error message

### Edge Cases

- What happens when an admin tries to remove themselves? → System prevents this action
- What happens when the last admin is removed from the system? → System prevents this action
- What happens when a user is in an active chat session and their account is deactivated? → Session continues until expiration, but they cannot create new sessions
- How does the system handle duplicate emails? → System prevents creation/editing with duplicate emails
- What happens if multiple admins try to edit the same user simultaneously? → Last write wins (standard database behavior)
- What happens if an admin closes the browser before copying the generated password? → Password cannot be retrieved again; admin must reset the password
- What happens to the generated password if user creation fails (e.g., duplicate email)? → Password is discarded; new one generated on retry

## 2. Requirements

### Functional Requirements

#### Authentication & Authorization
- **FR-001**: System MUST support email/password authentication for all users
- **FR-002**: System MUST remove existing OAuth authentication (GitHub and Google providers)
- **FR-003**: System MUST identify certain users with an "admin" role that grants elevated privileges
- **FR-004**: System MUST securely hash and store passwords using industry-standard algorithms (bcrypt or similar)
- **FR-005**: System MUST prevent unauthorized access to admin functionality
- **FR-006**: System MUST create a default admin account with email "admin@example.com" and password "password" on system initialization
- **FR-007**: System MUST distinguish between "active" and "inactive" user accounts

#### Admin Dashboard
- **FR-008**: System MUST provide a dedicated admin dashboard interface accessible only to admin users
- **FR-009**: Admin dashboard MUST display a list of all registered users (both active and inactive)
- **FR-010**: Admin dashboard MUST show user information including email, role (admin/user), status (active/inactive), and creation date
- **FR-011**: Admin dashboard MUST provide search functionality to find users by email
- **FR-012**: Admin dashboard MUST display total user count

#### User Management - Adding Users
- **FR-013**: Admins MUST be able to add new users by providing an email address
- **FR-014**: System MUST allow admins to optionally provide a custom password when creating a user
- **FR-015**: System MUST generate a secure random password if the admin does not provide one
- **FR-016**: System MUST display the generated password to the admin immediately after user creation
- **FR-017**: System MUST display the generated password only once (cannot be retrieved later)
- **FR-018**: System MUST create new users with "active" status by default
- **FR-019**: System MUST prevent duplicate emails across all users
- **FR-020**: System MUST NOT allow self-service user registration (all accounts are admin-created)
- **FR-021**: System MUST NOT send email notifications when accounts are created

#### User Management - Removing Users
- **FR-022**: Admins MUST be able to deactivate users by changing their status to "inactive" (soft delete)
- **FR-023**: System MUST retain all user data (including chat history) when a user is deactivated
- **FR-024**: System MUST prevent inactive users from logging in
- **FR-025**: System MUST prevent admins from deactivating themselves
- **FR-026**: System MUST prevent deactivation of the last admin account in the system

#### User Management - Editing Users
- **FR-027**: Admins MUST be able to edit user email addresses
- **FR-028**: Admins MUST be able to reset user passwords to a new admin-specified password
- **FR-029**: System MUST enforce email uniqueness when editing user details
- **FR-030**: Admins MUST NOT be able to change user roles (promote/demote admin status)

#### Session Management
- **FR-031**: System MUST create authenticated sessions for users who successfully log in
- **FR-032**: System MUST invalidate sessions when users log out
- **FR-033**: Inactive users' existing sessions MUST remain valid until natural expiration

#### Password Generation
- **FR-034**: System MUST generate random passwords that are at least 16 characters long
- **FR-035**: System MUST generate passwords containing a mix of uppercase letters, lowercase letters, numbers, and special characters
- **FR-036**: Generated passwords MUST be cryptographically secure (using a CSPRNG)

### Non-Functional Requirements

- **NFR-001**: Password hashing MUST use bcrypt, scrypt, or Argon2 algorithms
- **NFR-002**: Login page MUST be simple and easy to use
- **NFR-003**: Admin dashboard MUST be responsive and work on desktop browsers

## 3. Key Entities

- **User**: Represents any person using the AI chat application. Has a unique identifier, email (unique), hashed password, role (admin or user), account status (active or inactive), creation timestamp, and last login timestamp. All authentication is done via email/password.

- **Admin**: A User with the role set to "admin". Has elevated privileges to access the admin dashboard and perform user management operations (add users with optional password generation, edit email addresses, deactivate users, reset passwords). Cannot change their own role or deactivate themselves.

- **Session**: Represents an authenticated user's active session in the application. Contains session identifier, user reference, creation time, and expiration time. BetterAuth manages session lifecycle.

- **Generated Password**: A cryptographically secure random password created by the system when an admin creates a user without specifying a custom password. Displayed once to the admin and cannot be retrieved later.

## 4. Out of Scope

The following are explicitly **NOT** part of this feature:

- Email verification for new accounts
- Self-service password reset via email
- Rate limiting on login attempts
- Account lockout after failed login attempts
- Audit logging of admin actions or authentication events
- Session timeout configuration
- User profile self-management
- Bulk user operations (bulk add/remove)
- Multiple admin permission levels (super admin vs regular admin)
- Account linking or multiple authentication methods per user
- Email notifications to users
- User activity tracking
- Advanced search/filtering in admin dashboard
- Pagination of user list
- Export/import user data
- Password complexity requirements
- Password expiration policies
