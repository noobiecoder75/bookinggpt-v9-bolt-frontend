import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from './SignupForm';
import { useAuth } from '../../hooks/useAuth';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth');

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('SignupForm', () => {
  const mockSignUp = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useAuth hook
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signUp: mockSignUp,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      signInAsAdmin: vi.fn(),
    });

    // Mock URL params
    delete window.location;
    window.location = { search: '' } as any;
  });

  it('renders signup form with all required fields', () => {
    render(<SignupForm />);

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('defaults to admin role', () => {
    render(<SignupForm />);

    const roleSelect = screen.getByLabelText(/account type/i);
    expect(roleSelect).toHaveValue('admin');
  });

  it('validates password strength', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    const passwordInput = screen.getByLabelText(/^password/i);
    await user.type(passwordInput, 'weak');

    await waitFor(() => {
      expect(screen.getByText('Very Weak')).toBeInTheDocument();
      expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
      expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await user.type(passwordInput, 'Password123!');
    await user.type(confirmPasswordInput, 'DifferentPassword');

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('shows password match confirmation when passwords match', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    await user.type(passwordInput, 'Password123!');
    await user.type(confirmPasswordInput, 'Password123!');

    await waitFor(() => {
      expect(screen.getByText('Passwords match')).toBeInTheDocument();
    });
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    // Fill out form
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('john@example.com', 'Password123!', {
        first_name: 'John',
        last_name: 'Doe',
        company: '',
        phone: '',
        role: 'admin',
        full_name: 'John Doe',
        invite_token: null,
      });
    });
  });

  it('handles invite token from URL params', () => {
    // Mock URL with invite token
    window.location.search = '?invite=test-token';
    
    render(<SignupForm />);

    // Should show invite info
    expect(screen.getByText("You've been invited!")).toBeInTheDocument();
    expect(screen.getByText(/has invited you to join as a/i)).toBeInTheDocument();
  });

  it('prevents submission with invalid password', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    // Fill out form with weak password
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'weak');
    await user.type(screen.getByLabelText(/confirm password/i), 'weak');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toBeDisabled();
  });

  it('prevents submission with mismatched passwords', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    // Fill out form with mismatched passwords
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPassword');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Mock signUp to return a promise that doesn't resolve immediately
    let resolveSignUp: () => void;
    const signUpPromise = new Promise<void>((resolve) => {
      resolveSignUp = resolve;
    });
    mockSignUp.mockReturnValue(signUpPromise);

    render(<SignupForm />);

    // Fill out form
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // Should show loading state
    expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();

    // Resolve the promise
    resolveSignUp!();
  });
});