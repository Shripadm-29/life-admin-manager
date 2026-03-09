# Testing Guide - Life Admin Manager

## Quick Start

```bash
# Run all tests once (for CI/CD)
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

---

## Why These 6 Components?

We selected these 6 critical components based on **user impact** and **business logic**:

| Component | Reason |
|-----------|--------|
| **Login** | Authentication is the gatekeeper. A bug here breaks entire app access. |
| **Signup** | New user onboarding is critical. Form validation prevents bad data entry. |
| **TaskForm** | Core feature. Users create/edit tasks here. Complex form logic needs testing. |
| **TasksPage** | Main feature. Users view, search, filter, and manage tasks. High interaction volume. |
| **Dashboard** | Summary/stats page. Aggregates data and shows key metrics. |
| **AIPlanModal** | AI feature. Complex modal with multiple actions and state. |

**Excluded components** (Reminders, Documents, Profiles, etc.) can be tested later. Focus on high-impact areas first.

---

## Detailed Test Coverage by Component

### 1. Login Component (`src/app/components/testing/Login.test.tsx`)
**9 tests covering:**

- Form displays correctly (email input, password input, login button)
- User can enter credentials and submit the form
- Successful login navigates to dashboard
- Failed login shows "Invalid credentials" error
- Empty email validation shows required field error
- Empty password validation shows required field error
- Forgot password link is present and functional
- Signup link navigates to signup page
- Error message clears when user corrects form and resubmits

**Why:** Login is the authentication gateway. Any failure prevents users from accessing the app. Tests ensure credentials flow correctly and errors are clear.

---

### 2. Signup Component (`src/app/components/testing/Signup.test.tsx`)
**10 tests covering:**

- Form displays correctly (email, password, confirm password fields)
- User can fill form and submit with matching passwords
- Successful signup navigates to dashboard
- Password mismatch error prevents submission
- Empty email validation shows required field error
- Empty password validation shows required field error
- Empty confirm password validation shows required field error
- Failed signup shows "Failed to create account" error
- Login link navigates to login page
- Error message clears when user corrects and resubmits

**Why:** Signup validates user input during account creation. Tests ensure passwords match, required fields are enforced, and error handling is clear.

---

### 3. TaskForm Component (`src/app/components/testing/TaskForm.test.tsx`)
**14 tests covering:**

- Form displays all required fields (title, category, priority, status, date, notes)
- Default values are set correctly (Academic category, medium priority, todo status)
- User can change title and it updates
- User can change category selection
- User can change priority (low/medium/high)
- User can change status (todo/in_progress/completed)
- User can enter due date
- User can add notes/description
- File upload input is available
- Save/submit button is present
- Redirect to login if user is not authenticated
- Multiple categories exist in dropdown
- Date/time inputs work correctly

**Why:** TaskForm is the main way users create and edit tasks. Complex form with multiple fields, selects, and validations. Tests ensure all fields work independently and together.

---

### 4. TasksPage Component (`src/app/components/testing/TasksPage.test.tsx`)
**15 tests covering:**

- Page title "Tasks" displays
- Search input is available
- Category filter is available
- Priority filter is available
- "Add task" button is present
- User is redirected to login if not authenticated
- Tasks load from database and display
- Search filters tasks by title and notes
- Category filter shows only selected category
- Priority filter shows only selected priority
- User can toggle task completion status
- User can delete task with confirmation
- Completed tasks show different state
- Tasks are sorted by due date
- Error message shows if task load fails
- Empty state displays when no tasks exist

**Why:** TasksPage is the main feature. Users spend most time here viewing and managing tasks. Tests ensure filtering, searching, and task actions all work correctly.

---

### 5. Dashboard Component (`src/app/components/testing/Dashboard.test.tsx`)
**17 tests covering:**

- Dashboard title displays
- Welcome message displays
- Navigation component renders
- User is redirected to login if not authenticated
- "Total Tasks" count displays
- Upcoming tasks section displays
- Overdue tasks section displays
- Task statistics are calculated correctly
- Priority colors display (high=red, medium=yellow, low=green)
- Task due dates format correctly
- Action buttons exist for tasks
- Create new task button is present
- Loading state shows initially
- Error message displays on load failure
- Upcoming tasks limited to 5 items
- Upcoming tasks sorted by due date
- Completed tasks excluded from upcoming/overdue sections

**Why:** Dashboard aggregates data and shows critical stats. Tests ensure calculations are correct and overdue tasks are properly identified.

---

### 6. AIPlanModal Component (`src/app/components/testing/AIPlanModal.test.tsx`)
**16 tests covering:**

- Modal displays when open prop is true
- Modal does not display when open prop is false
- Task title shows in modal header
- Task due date displays when provided
- Plan items display with title and duration
- Checklist items display for each plan item
- Empty state shows when no plan items exist
- "Accept Plan" button is present and clickable
- "Regenerate" button is present and clickable
- "Skip" button is present and clickable
- Accept Plan calls onAccept callback with plan items
- Regenerate calls onRegenerate callback
- Skip calls onClose callback
- All buttons disable when loading=true
- Modal handles plan items without checklist
- Modal is scrollable when many items exist

**Why:** AIPlanModal is a complex modal with multiple actions. Tests ensure all buttons work, callbacks fire correctly, and loading states prevent double-submission.

---

## Coverage Targets

**Overall target: 60-85% coverage of critical paths**

| Component | Target | Focus Areas |
|-----------|--------|------------|
| Login | 90% | Authentication flow, validation, errors |
| Signup | 90% | User registration, password validation |
| TaskForm | 75% | Form fields, selects, date handling |
| TasksPage | 80% | Search, filters, task actions, sorting |
| Dashboard | 70% | Data aggregation, task grouping |
| AIPlanModal | 85% | Modal display, button actions, callbacks |

**Why not 100%?** Edge cases, styling, and implementation details aren't worth testing time.

---

## GitHub Actions Integration

Tests run automatically:
- On every push to `main` branch
- On every pull request to `main`
- Before building the application
- Test failures block merge to main

**Files:**
- `.github/workflows/ci.yml` - Runs `npm test`
- `.github/workflows/test-coverage.yml` - Optional coverage reporting

---

## File Organization

All test files located in:
```
src/app/components/testing/
  ├── Login.test.tsx
  ├── Signup.test.tsx
  ├── TaskForm.test.tsx
  ├── TasksPage.test.tsx
  ├── Dashboard.test.tsx
  ├── AIPlanModal.test.tsx
  └── README.md
```

Test discovery: Vitest finds files matching pattern `src/**/*.test.{ts,tsx}`
