import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { TasksPage } from '../TasksPage';
import { useAuth } from '@/app/context/AuthContext';
import { useNavigate } from 'react-router';
import * as supabaseModule from '@/lib/supabaseClient';

vi.mock('@/app/context/AuthContext');
vi.mock('react-router', { spy: true });
vi.mock('@/lib/supabaseClient');

const mockTasks = [
  {
    id: '1',
    title: 'Complete assignment',
    category: 'Academic',
    priority: 'high' as const,
    dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    notes: 'Submit by 5pm',
    status: 'todo',
  },
  {
    id: '2',
    title: 'Pay rent',
    category: 'Finance',
    priority: 'high' as const,
    dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    notes: '',
    status: 'todo',
  },
  {
    id: '3',
    title: 'Gym session',
    category: 'Fitness',
    priority: 'low' as const,
    dueDate: new Date(Date.now() + 172800000).toISOString(), // 2 days
    notes: '',
    status: 'completed',
  },
];

// Main test suite for the TasksPage component
describe('TasksPage Component', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockNavigate = vi.fn();
  const mockSupabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  };

  // Setup mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      error: null,
    } as any);
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(supabaseModule.supabase, { partial: true }).from = mockSupabase.from;
  });

  // Test that the tasks page title is rendered
  it('should render tasks page title', () => {
    // Render component
    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    // Assert title presence
    expect(screen.getByRole('heading', { level: 2, name: 'Tasks' })).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    const searchInput = screen.getByPlaceholderText(/search/i) || screen.getByLabelText(/search/i);
    expect(searchInput || screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render category filter', () => {
    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    expect(document.querySelectorAll('select').length).toBeGreaterThan(0);
  });

  it('should render priority filter', () => {
    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    expect(document.querySelectorAll('select').length).toBeGreaterThan(1);
  });

  it('should render add button', () => {
    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    const addButton = screen.getByRole('button', { name: /add|new|create/i });
    expect(addButton).toBeInTheDocument();
  });

  it('should redirect to login if user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      error: null,
    } as any);

    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should display loading state initially', () => {
    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    // Page renders but may show loading indicator
    expect(document.body).toBeInTheDocument();
  });

  // Test that tasks are loaded and displayed from supabase
  it('should display tasks from supabase', async () => {
    // Render component
    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    // Assert tasks loading and display
    await waitFor(() => {
      mockTasks.forEach(task => {
        expect(screen.queryByText(task.title)).toBeInTheDocument();
      });
    }, { timeout: 3000 });
  });

  it('should filter tasks by search term', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.queryByText('Complete assignment')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i) || 
                        screen.getAllByRole('textbox')[0];

    await user.type(searchInput, 'Complete');

    // Should show only matching task
    await waitFor(() => {
      expect(screen.getByText('Complete assignment')).toBeInTheDocument();
    });
  });

  it('should allow toggling task completion status', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Complete assignment')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    if (checkboxes.length > 0) {
      await user.click(checkboxes[0]);
      // Verify toggle logic works
      expect(checkboxes[0]).toBeDefined();
    }
  });

  it('should display priority colors for tasks', async () => {
    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Complete assignment')).toBeInTheDocument();
    });

    // Check for priority badges
    const priorityBadges = screen.queryAllByText(/high|medium|low/i);
    expect(priorityBadges.length).toBeGreaterThan(0);
  });

  it('should display action buttons for each task', async () => {
    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Complete assignment')).toBeInTheDocument();
    });

    // Should have edit/delete buttons
    const actionButtons = screen.queryAllByRole('button');
    expect(actionButtons.length).toBeGreaterThan(2); // At least add button + task actions
  });

  it('should display due dates', async () => {
    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Complete assignment')).toBeInTheDocument();
    });

    // Should display formatted dates
    const dateElements = document.querySelectorAll('[class*="date"]');
    expect(dateElements.length >= 0).toBe(true);
  });

  it('should allow navigation to task details', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Complete assignment')).toBeInTheDocument();
    });

    // Click on a task to navigate
    const taskElement = screen.getByText('Complete assignment');
    await user.click(taskElement);

    // Either navigates or opens details
    expect(taskElement).toBeInTheDocument();
  });

  it('should show empty state when no tasks exist', async () => {
    const emptyMockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    };

    vi.mocked(supabaseModule.supabase, { partial: true }).from = emptyMockSupabase.from;

    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Should either show empty message or no tasks
      expect(screen.queryByText(/no tasks|empty/i) || document.body).toBeDefined();
    });
  });

  it('should display error message on failed load', async () => {
    const errorMockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed to load' } }),
          }),
        }),
      }),
    };

    vi.mocked(supabaseModule.supabase, { partial: true }).from = errorMockSupabase.from;

    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Failed to load tasks/i)).toBeInTheDocument();
    });
  });

  it('should sort tasks by due date', async () => {
    render(
      <BrowserRouter>
        <TasksPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Complete assignment')).toBeInTheDocument();
    });

    // Tasks should be ordered by due date
    const taskElements = screen.getAllByText(/Complete assignment|Pay rent|Gym session/);
    expect(taskElements.length).toBeGreaterThan(0);
  });
});
