import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Clock, CheckCircle, ArrowLeft } from 'lucide-react';

export const PendingApprovalPage: React.FC = () => {
  return (
    <Card className="animate-fade-in text-center">
      <div className="w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-6">
        <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Account Pending Approval
      </h1>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Thank you for registering with JudgeAI. Your account is currently under review.
        We'll notify you via email once your account has been approved.
      </p>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">
          What happens next?
        </h3>
        <ul className="space-y-3 text-left">
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Our team will review your application
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              You'll receive an email notification once approved
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              After approval, you can access all JudgeAI features
            </span>
          </li>
        </ul>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
        This process usually takes 24-48 hours during beta.
      </p>

      <Link to="/login">
        <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Login
        </Button>
      </Link>
    </Card>
  );
};
