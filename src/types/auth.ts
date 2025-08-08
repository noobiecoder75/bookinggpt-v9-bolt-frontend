export interface UserProfile {
  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
  role?: 'admin' | 'regular';
  avatar_url?: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  company?: string;
  phone?: string;
  role: 'admin' | 'regular';
  inviteToken?: string;
}

export interface ExtendedUser {
  id: string;
  email: string;
  user_metadata?: UserProfile;
  created_at?: string;
  email_confirmed_at?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
}