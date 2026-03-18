# Testing Practices Documentation

## Overview

This document outlines the comprehensive testing strategy implemented for the Life Admin Manager application. Our testing suite focuses on component testing to ensure code quality, functionality, and user experience.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Stack](#testing-stack)
3. [Project Structure](#project-structure)
4. [Component Testing](#component-testing)
5. [E2E Testing](#e2e-testing)
6. [Running Tests](#running-tests)
7. [Writing New Tests](#writing-new-tests)
8. [Best Practices](#best-practices)
9. [Continuous Integration](#continuous-integration)
10. [Troubleshooting](#troubleshooting)

---

## Testing Philosophy

Our testing approach follows these core principles:

1. **Comprehensive Coverage**: Test all major components and user flows
2. **Maintainability**: Write clear, readable tests that serve as documentation
3. **Reliability**: Tests should be deterministic and not flaky
4. **Speed**: Component tests should run quickly
5. **Impact-Focused**: Focus on high-impact areas like Authentication, Task Management, and AI features

---

## Testing Stack

### Component Testing
- **Vitest**: Fast component test framework with Vite integration
- **React Testing Library**: Component testing with user-centric queries
- **@testing-library/jest-dom**: Custom matchers for DOM assertions
- **@testing-library/user-event**: Simulate user interactions
- **happy-dom**: Lightweight DOM implementation for faster tests

### E2E Testing (Planned)
- **Playwright**: Modern browser automation for E2E tests
- Supports multiple browsers (Chromium, Firefox, WebKit)

---

## Project Structure

```text
life-admin-manager/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── testing/              # Component tests
│   │   │   │   ├── AIPlanModal.test.tsx
│   │   │   │   ├── Dashboard.test.tsx
│   │   │   │   ├── Login.test.tsx
│   │   │   │   ├── Signup.test.tsx
│   │   │   │   ├── TaskForm.test.tsx
│   │   │   │   └── TasksPage.test.tsx
│   │   │   ├── AIPlanModal.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── [other components...]
│   │   └── [other app files...]
│   ├── test/
│   │   └── setup.ts                  # Vitest global setup
│   └── [other source files...]
├── e2e/                              # Planned E2E tests
├── vitest.config.ts                  # Vitest configuration
└── package.json
```

---

## Component Testing

### What We Test

Component tests focus on individual React components and their behavior:

1. **Rendering**: Components render without crashing
2. **User Interactions**: Click, input, form submissions
3. **Conditional Rendering**: Components show/hide based on conditions
4. **State Management**: Local state responds correctly to events
5. **Routing**: Mocking navigation correctly
6. **API/Database Mocks**: Mock external dependencies like Supabase and AuthContext

### Components Covered

We focus on 6 critical components based on user impact and business logic:

- **Login**: Authentication form, validation, credentials flow and error boundaries.
- **Signup**: User registration, password matching, required fields enforcement.
- **TaskForm**: Task creation/editing flow, default values, form fields, and selects.
- **TasksPage**: Task listings, search bar inputs, filtering by category and priority, and task actions (toggle complete, delete).
- **Dashboard**: Data aggregation, calculations for upcoming/overdue tasks, loading states, and statistics.
- **AIPlanModal**: Complex modal states, plan items rendering, checklist generation, and dynamic callback actions (accept, regenerate, skip).

### Example Component Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { ComponentName } from '../ComponentName';
import { useAuth } from '@/app/context/AuthContext';
import { useNavigate } from 'react-router';
import * as supabaseModule from '@/lib/supabaseClient';

// Mock dependencies
vi.mock('@/app/context/AuthContext');
vi.mock('react-router', { spy: true });
vi.mock('@/lib/supabaseClient');

describe('ComponentName', () => {
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      error: null,
    } as any);
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <ComponentName />
      </BrowserRouter>
    );
  };

  it('should render successfully', () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /title/i })).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    const button = screen.getByRole('button', { name: /submit/i });
    await user.click(button);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});
```

### Mocking Strategy

1. **Supabase**: Mock authentication and database operations via `@/lib/supabaseClient`
2. **React Router**: Mock navigation functions (`useNavigate`, `BrowserRouter`)
3. **AuthContext**: Provide mock user context and auth functions via `@/app/context/AuthContext`

---

## E2E Testing

### Overview

E2E testing is planned for the future to validate complete user workflows. Playwright is configured as our tool of choice.

### What We Will Test

1. **Authentication Flow**: Sign in, sign up, session management
2. **Navigation**: Page routing, side navigation, redirects
3. **User Journeys**: Complete task creation to completion workflows
4. **Protected Routes**: Access control and redirects

### Example Planned E2E Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should sign in successfully', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

---

## Running Tests

### Component Tests

```bash
# Run all component tests (CI mode)
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Playwright E2E Tests (Planned)

*(Note: Playwright tests are currently in development. Once available in the `e2e/` folder, use the following commands)*

```bash
# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run tests with UI
npx playwright test --ui
```

---

## Writing New Tests

### Adding Component Tests

1. **Create Test File**: Place `[ComponentName].test.tsx` inside `src/app/components/testing/`
2. **Import Dependencies**: Import testing utilities (`vitest`, `@testing-library/react`, etc.)
3. **Mock External Dependencies**: Use `vi.mock()` for supabase, router, contexts
4. **Write Test Cases**: Use `describe` and `it` blocks
5. **Use Testing Library Queries**: Prefer `userEvent` over `fireEvent` and user-centric queries (`getByRole`, etc.)

---

## Best Practices

### General

1. **Test Behavior, Not Implementation**: Focus on what users see and do
2. **Keep Tests Independent**: Each test should run in isolation (use `beforeEach`)
3. **Clean Up**: Reset mocks using `vi.clearAllMocks()`

### Component Testing

1. **Use Testing Library Queries**: Prefer `getByRole`, `getByLabelText`, `getByText`
2. **Mock External Calls**: Avoid real Supabase database requests in component tests
3. **Test Accessibility**: Use ARIA labels and semantic HTML for selection

### Query Priority (Testing Library)

Use queries in this order of preference:

1. **Accessible to Everyone**
   - `getByRole`
   - `getByLabelText`
   - `getByPlaceholderText`
   - `getByText`

2. **Semantic Queries**
   - `getByAltText`
   - `getByTitle`

3. **Test IDs** (last resort)
   - `getByTestId`

---

## Continuous Integration

### GitHub Actions Integration

Tests run automatically:
- On every push to `main` branch
- On every pull request to `main`
- Before building the application
- Test failures block merge to main

**Files:**
- `.github/workflows/ci.yml` - Runs `npm test`
- `.github/workflows/test-coverage.yml` - Optional coverage reporting

---

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "document is not defined"
- **Solution**: Check `vitest.config.ts` has `happy-dom` set as environment

**Issue**: Async state updates failing
- **Solution**: Use `waitFor` from Testing Library when expecting a DOM change to occur asynchronously

**Issue**: Mocks not resetting
- **Solution**: Ensure `vi.clearAllMocks()` is called in `beforeEach` block

### Debug Tips

```typescript
// Print DOM structure
import { screen } from '@testing-library/react';
screen.debug();

// Use logRoles to see available roles
import { logRoles } from '@testing-library/dom';
logRoles(document.body);
```

---

## Coverage Goals

### Component Test Coverage Target: 60-85%

Aim for these component-specific targets:
- **Login**: 90%
- **Signup**: 90%
- **TaskForm**: 75%
- **TasksPage**: 80%
- **Dashboard**: 70%
- **AIPlanModal**: 85%

---

## Testing Checklist

### Before Submitting PR

- [ ] All component tests pass locally (`npm test`)
- [ ] New features have tests added in `src/app/components/testing/`
- [ ] Mock resets properly without leakage
- [ ] No console errors in tests
- [ ] Tests run successfully in CI pipelines

---

*Last Updated: March 2026*
