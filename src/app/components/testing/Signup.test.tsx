import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { Signup } from '../Signup';
import { useAuth } from '@/app/context/AuthContext';
import { useNavigate } from 'react-router';

vi.mock('@/app/context/AuthContext');
vi.mock('react-router', { spy: true });

// Main test suite for the Signup component
describe('Signup Component', () => {
  const mockSignup = vi.fn();
  const mockNavigate = vi.fn();

  // Setup mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      signup: mockSignup,
      login: vi.fn(),
      logout: vi.fn(),
      user: null,
      error: null,
    } as any);
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  // Test that the signup form renders correctly
  it('should render signup form with email, password, and confirm password fields', () => {
    // Render component
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    // Assert form fields presence
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('should render signup page title and subtitle', () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    expect(screen.getByText(/Life Admin Manager/i)).toBeInTheDocument();
    expect(screen.getByText(/Create your account/i)).toBeInTheDocument();
  });

  // Test form submission with correct credentials
  it('should submit form with correct credentials', async () => {
    // Setup mock response
    mockSignup.mockResolvedValue(true);
    const user = userEvent.setup();

    // Render component
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    // Trigger user input
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    // Assert signup call
    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith('newuser@example.com', 'password123', 'password123');
    });
  });

  it('should navigate to dashboard on successful signup', async () => {
    mockSignup.mockResolvedValue(true);
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show error when passwords do not match', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password456');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('should show validation error when email is empty', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all fields/i)).toBeInTheDocument();
    });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('should show validation error when password is empty', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all fields/i)).toBeInTheDocument();
    });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('should show validation error when confirm password is empty', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all fields/i)).toBeInTheDocument();
    });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('should show error on failed signup', async () => {
    mockSignup.mockResolvedValue(false);
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to create account/i)).toBeInTheDocument();
    });
  });

  it('should render login link', () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    const loginLink = screen.getByRole('link', { name: /Login/i });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('should clear error message when form is corrected', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    );

    // First attempt with mismatched passwords
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password456');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });

    // Fix the password
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement;
    await user.clear(confirmPasswordInput);
    await user.type(confirmPasswordInput, 'password123');

    mockSignup.mockResolvedValue(true);
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Passwords do not match/i)).not.toBeInTheDocument();
    });
  });
});
