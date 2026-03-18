import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router';
import { Login } from '../Login';
import { useAuth } from '@/app/context/AuthContext';
import { useNavigate } from 'react-router';

vi.mock('@/app/context/AuthContext');
vi.mock('react-router', { spy: true });

// Main test suite for the Login component
describe('Login Component', () => {
  const mockLogin = vi.fn();
  const mockNavigate = vi.fn();

  // Setup mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      signup: vi.fn(),
      logout: vi.fn(),
      user: null,
      error: null,
    } as any);
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  // Test that the login form renders correctly
  it('should render login form with email and password fields', () => {
    // Render component
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    // Assert form fields presence
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('should render login page title and subtitle', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByText(/Life Admin Manager/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in to your account/i)).toBeInTheDocument();
  });

  // Test form submission with valid input
  it('should submit form with email and password', async () => {
    // Setup mock response
    mockLogin.mockResolvedValue(true);
    const user = userEvent.setup();

    // Render component
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    // Trigger user input
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Assert login call
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should navigate to dashboard on successful login', async () => {
    mockLogin.mockResolvedValue(true);
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show error message on failed login', async () => {
    mockLogin.mockResolvedValue(false);
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('should show validation error when email is empty', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all fields/i)).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should show validation error when password is empty', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please fill in all fields/i)).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should render forgot password link', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /Forgot password/i })).toBeInTheDocument();
  });

  it('should navigate to signup page when clicking signup link', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const signupLink = screen.getByRole('link', { name: /Sign up/i });
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('should clear error when form is updated', async () => {
    mockLogin.mockResolvedValue(false);
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    // First failed attempt
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });

    // Change password (should clear error on next submit)
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    await user.clear(passwordInput);
    await user.type(passwordInput, 'newpassword');

    mockLogin.mockResolvedValue(true);
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Invalid credentials/i)).not.toBeInTheDocument();
    });
  });
});
