import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      // Always show success to prevent email enumeration
      setSuccess(true);
    }

    setIsLoading(false);
  };

  if (success) {
    return (
      <Card className="animate-fade-in text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Check Your Email
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          If an account exists with {email}, you'll receive a password reset code shortly.
        </p>
        <Button onClick={() => navigate('/reset-password', { state: { email } })}>
          Enter Reset Code
        </Button>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Didn't receive the email? Check your spam folder or{' '}
          <button
            onClick={() => setSuccess(false)}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            try again
          </button>
        </p>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Forgot Password?
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Enter your email and we'll send you a reset code
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@gmail.com"
          leftIcon={<Mail className="w-5 h-5" />}
          required
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          Send Reset Code
        </Button>
      </form>

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Login
      </Link>
    </Card>
  );
};
