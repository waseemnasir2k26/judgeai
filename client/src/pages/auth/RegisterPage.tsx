import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Mail, Lock, User, AlertCircle, CheckCircle, Clock, Sparkles } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number', test: (p: string) => /\d/.test(p) },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const allRequirementsMet = passwordRequirements.every((req) =>
      req.test(formData.password)
    );
    if (!allRequirementsMet) {
      setError('Password does not meet all requirements');
      return;
    }

    setIsLoading(true);

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
    });

    if (result.success) {
      setIsSuccess(true);
    } else {
      setError(result.message || 'Registration failed');
    }

    setIsLoading(false);
  };

  // Success state - show pending approval message
  if (isSuccess) {
    return (
      <Card className="animate-fade-in text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Registration Successful!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
          Your account has been created and is <span className="font-semibold text-yellow-600">pending admin approval</span>.
          You'll be able to log in once your account is approved.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            We'll notify you via email once your account is approved. This usually happens within 24 hours.
          </p>
        </div>
        <Link to="/login">
          <Button variant="outline" className="w-full">
            Back to Login
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create Account
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Join JudgeAI Legal Intelligence Platform
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="John"
            leftIcon={<User className="w-5 h-5" />}
            required
          />
          <Input
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Doe"
            required
          />
        </div>

        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          leftIcon={<Mail className="w-5 h-5" />}
          required
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Create a strong password"
          leftIcon={<Lock className="w-5 h-5" />}
          required
        />

        {/* Password Requirements */}
        <div className="grid grid-cols-2 gap-2">
          {passwordRequirements.map((req) => {
            const met = req.test(formData.password);
            return (
              <div
                key={req.label}
                className={`flex items-center gap-2 text-xs ${
                  met
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <CheckCircle className={`w-3.5 h-3.5 ${met ? '' : 'opacity-30'}`} />
                {req.label}
              </div>
            );
          })}
        </div>

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your password"
          leftIcon={<Lock className="w-5 h-5" />}
          error={
            formData.confirmPassword &&
            formData.password !== formData.confirmPassword
              ? 'Passwords do not match'
              : undefined
          }
          required
        />

        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300">
          <strong>Note:</strong> New accounts require admin approval before you can log in.
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
        >
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
};
