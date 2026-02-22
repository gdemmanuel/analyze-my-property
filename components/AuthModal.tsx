import React, { useState } from 'react';
import { X, Mail, Lock } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { useToast } from './ui/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, modal opens in this mode (e.g. 'signup' when user must sign up to underwrite) */
  initialMode?: 'signin' | 'signup' | 'reset';
  onOpenTos?: () => void;
  onOpenPrivacy?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'signin', onOpenTos, onOpenPrivacy }) => {
  const toast = useToast();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);

  // When modal opens, apply initialMode so e.g. "Underwrite" can open signup directly
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setTosAccepted(false);
    }
  }, [isOpen, initialMode]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tosAccepted, setTosAccepted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`,
        });

        if (resetError) throw resetError;

        setMessage('Check your email for a password reset link!');
        toast.success('Password reset email sent! Check your inbox.');
        setEmail('');
        setLoading(false);
        return;
      }

      if (mode === 'signup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        setMessage('Check your email for the confirmation link!');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        
        // Auto-close after showing message
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'reset' ? 'Reset Password' : mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-600 mt-1">
            {mode === 'reset'
              ? 'Enter your email and we\'ll send you a reset link'
              : mode === 'signin'
              ? 'Sign in to access your saved properties'
              : 'Sign up to save your property analyses'}
          </p>
        </div>

        {/* Error/Message display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password (hidden in reset mode) */}
          {mode !== 'reset' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Confirm Password (signup only) */}
          {mode === 'signup' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* TOS consent checkbox (signup only) */}
          {mode === 'signup' && (
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
              />
              <span className="text-xs text-slate-500 leading-relaxed">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => onOpenTos?.()}
                  className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
                >
                  Terms of Service
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={() => onOpenPrivacy?.()}
                  className="text-blue-600 hover:text-blue-700 underline underline-offset-2"
                >
                  Privacy Policy
                </button>
                . I understand that analysis results are AI-generated estimates and not financial advice.
              </span>
            </label>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || (mode === 'signup' && !tosAccepted)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Loading...' : mode === 'reset' ? 'Send Reset Link' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        {/* Divider and Google Sign In (hidden in reset mode) */}
        {mode !== 'reset' && (
          <>
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-sm text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
          </>
        )}

        {/* Toggle mode */}
        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">
            {mode === 'reset' ? 'Remember your password? ' : mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
              setMessage(null);
            }}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {mode === 'reset' ? 'Sign in' : mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </div>

        {/* Forgot password (signin only) */}
        {mode === 'signin' && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode('reset');
                setError(null);
                setMessage(null);
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Forgot your password?
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
