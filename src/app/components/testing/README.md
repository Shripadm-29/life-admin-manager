# Component Testing Suite

This directory contains comprehensive test suites for all critical components in the Life Admin Manager application.

## Test Files

### 1. Login.test.tsx
**Component:** `src/app/components/Login.tsx`
**Coverage:**
- Form rendering (email, password fields)
- Valid login submission
- Failed login handling
- Validation errors (empty fields)
- Error clearing on form update
- Navigation to signup
- Forgot password link

**Key Tests:**
- ✅ Mocks `useAuth()` hook to test login flow
- ✅ Mocks `useNavigate()` to verify navigation
- ✅ Tests user interactions with form
- ✅ Validates error handling

### 2. Signup.test.tsx
**Component:** `src/app/components/Signup.tsx`
**Coverage:**
- Form rendering (email, password, confirm password)
- Valid signup submission
- Password matching validation
- Validation errors for all fields
- Failed signup handling
- Error clearing on form correction
- Navigation to login

**Key Tests:**
- ✅ Validates password confirmation
- ✅ Tests all required field validations
- ✅ Mocks signup API call
- ✅ Tests navigation after signup

### 3. TaskForm.test.tsx
**Component:** `src/app/components/TaskForm.tsx`
**Coverage:**
- Form field rendering (title, category, priority, status, date, notes)
- Default values and state updates
- Category, priority, and status selection
- Date/time input handling
- File upload capability
- Form submission
- Authentication check
- Prefill handling from navigation state

**Key Tests:**
- ✅ Tests all form field types
- ✅ Validates select/dropdown functionality
- ✅ Checks authentication guards
- ✅ Tests form population with existing data

### 4. TasksPage.test.tsx
**Component:** `src/app/components/TasksPage.tsx`
**Coverage:**
- Task list display
- Search/filter functionality
- Category filter
- Priority filter
- Task completion toggle
- Task deletion with confirmation
- Due date sorting
- Empty state handling
- Error state handling
- Task count display

**Key Tests:**
- ✅ Tests Supabase integration
- ✅ Validates search and filtering
- ✅ Tests task lifecycle (complete, delete)
- ✅ Error and empty state handling

### 5. Dashboard.test.tsx
**Component:** `src/app/components/Dashboard.tsx`
**Coverage:**
- Dashboard statistics display
- Upcoming tasks section
- Overdue tasks section
- Task priority visualization
- Navigation integration
- Data aggregation
- Responsive layout
- Error handling

**Key Tests:**
- ✅ Tests task organization logic
- ✅ Validates upcoming vs overdue task sorting
- ✅ Tests priority color coding
- ✅ Verifies task count limitations (5 upcoming max)

### 6. AIPlanModal.test.tsx
**Component:** `src/app/components/AIPlanModal.tsx`
**Coverage:**
- Modal visibility control
- Plan item display
- Duration and checklist rendering
- Accept, Regenerate, Skip actions
- Loading states
- Empty state handling
- Accessibility

**Key Tests:**
- ✅ Tests all button actions
- ✅ Validates plan item rendering
- ✅ Tests loading states
- ✅ Verifies modal open/close behavior

## Running Tests

```bash
# Run all tests once (CI mode)
npm test

# Watch mode (development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- Login.test.tsx

# Run tests matching pattern
npm test -- --grep "should submit"
```

## Test Structure

All tests follow this pattern:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Component Name', () => {
  beforeEach(() => {
    // Setup mocks
  });

  it('should describe behavior', async () => {
    // Render component
    // Interact with component
    // Assert expectations
  });
});
```

## Mocking Strategy

### useAuth Hook
```typescript
vi.mock('@/app/context/AuthContext');
vi.mocked(useAuth).mockReturnValue({
  user: mockUser,
  login: mockLogin,
  signup: mockSignup,
  logout: mockLogout,
} as any);
```

### useNavigate Hook
```typescript
vi.mock('react-router', { spy: true });
vi.mocked(useNavigate).mockReturnValue(mockNavigate);
```

### Supabase
```typescript
vi.mock('@/lib/supabaseClient');
vi.mocked(supabase.from).mockReturnValue({ ... });
```

## Testing Best Practices Used

1. **Browser Mode**: Tests run in actual Chromium browser for realistic behavior
2. **User Interactions**: Using `userEvent.setup()` for natural user interactions
3. **Accessibility**: Testing via roles, labels, and semantic HTML
4. **Async Handling**: Using `waitFor()` for async operations
5. **Mocking**: Isolating external dependencies (Auth, API, Navigation)
6. **Assertions**: Testing behavior, not implementation details

## Coverage Goals

Target statistics:
- **Login**: ~90% coverage (critical auth flow)
- **Signup**: ~90% coverage (critical auth flow)
- **TaskForm**: ~75% coverage (complex form, file uploads)
- **TasksPage**: ~80% coverage (main feature)
- **Dashboard**: ~70% coverage (data aggregation)
- **AIPlanModal**: ~85% coverage (clear UI with modal)

Overall target: **60-80% code coverage**

## Common Testing Scenarios

### Testing Form Submission
```typescript
const user = userEvent.setup();
await user.type(screen.getByLabelText(/name/i), 'John');
await user.click(screen.getByRole('button', { name: /submit/i }));
expect(mockSubmit).toHaveBeenCalledWith(expect.any(Object));
```

### Testing Navigation
```typescript
const mockNavigate = vi.fn();
vi.mocked(useNavigate).mockReturnValue(mockNavigate);
// ... trigger navigation
expect(mockNavigate).toHaveBeenCalledWith('/path');
```

### Testing Async Operations
```typescript
await waitFor(() => {
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

### Testing Error States
```typescript
mockFetch.mockResolvedValue({ error: 'Failed' });
await userEvent.click(submitButton);
await waitFor(() => {
  expect(screen.getByText(/error/i)).toBeInTheDocument();
});
```

## Debugging Tests

```bash
# Verbose output
npm test -- --reporter=verbose

# Single test file
npm test -- src/app/components/testing/Login.test.tsx

# Interactive UI (watch mode with inspect)
npm run test:watch -- --inspect

# Show rendered DOM
import { screen, debug } from '@testing-library/react';
debug(screen.getByRole('button'));
```

## Adding New Tests

1. Create file in `src/app/components/testing/ComponentName.test.tsx`
2. Follow existing test structure
3. Mock external dependencies
4. Focus on user behavior, not implementation
5. Aim for 70-80% coverage of critical paths
6. Run `npm run test:watch` during development

## Troubleshooting

**"Cannot find module" errors**
- Check import paths use `@/` alias
- Verify component export is correct
- Check mock setup in beforeEach

**"Element not found" errors**
- Use `screen.debug()` to see DOM
- Check for async loading delays
- Use `waitFor()` for elements that appear later
- Verify correct role/label for query

**Timeout errors**
- Mock async functions properly
- Use `vi.fn().mockResolvedValue()`
- Increase timeout: `waitFor(() => {...}, { timeout: 5000 })`

**Navigation not working**
- Wrap component in `<BrowserRouter>`
- Mock `useNavigate` correctly
- Verify route paths match

## Next Steps

1. ✅ Run all tests: `npm test`
2. ✅ Check coverage: `npm run test:coverage`
3. ✅ Fix any failing tests
4. ✅ Add tests for other components as needed
5. ✅ Keep tests updated with component changes
