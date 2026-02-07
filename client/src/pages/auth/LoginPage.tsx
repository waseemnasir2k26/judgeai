import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Mail, Lock, AlertCircle, Clock, Scale } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pendingMessage, setPendingMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPendingMessage('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      // Handle pending account
      if (result.accountState === 'pending' || result.accountState === 'pending_approval') {
        setPendingMessage('Your account is pending admin approval. Please check back later.');
      } else if (result.accountState === 'suspended') {
        setError('Your account has been suspended. Please contact support.');
      } else if (result.accountState === 'rejected') {
        setError('Your account application was rejected. Please contact support.');
      } else if (result.accountState === 'unverified') {
        navigate('/verify-email', { state: { email } });
      } else {
        setError(result.message || 'Login failed');
      }
    }

    setIsLoading(false);
  };

  return (
    <Card className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Scale className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome Back
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Sign in to your JudgeAI account
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {pendingMessage && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-start gap-3">
          <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Account Pending Approval</p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">{pendingMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          leftIcon={<Mail className="w-5 h-5" />}
          required
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          leftIcon={<Lock className="w-5 h-5" />}
          required
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Remember me
            </span>
          </label>

          <Link
            to="/forgot-password"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          Sign In
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            Create one
          </Link>
        </p>
      </div>
    </Card>
  );
};
