import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { AIConfig } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import {
  Settings,
  Key,
  Save,
  TestTube,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AIConfigPage: React.FC = () => {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const [formData, setFormData] = useState({
    openaiApiKey: '',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 4096,
    masterSystemPrompt: '',
    tonePrompts: {
      aggressive: '',
      professional: '',
      simple: '',
    },
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await adminApi.getAIConfig();
        const data = response.data.data.config;
        setConfig(data);
        setFormData({
          openaiApiKey: '',
          model: data.model,
          temperature: data.temperature,
          maxTokens: data.maxTokens,
          masterSystemPrompt: data.masterSystemPrompt,
          tonePrompts: data.tonePrompts,
        });
      } catch (error) {
        toast.error('Failed to load AI configuration');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave: any = {
        model: formData.model,
        temperature: formData.temperature,
        maxTokens: formData.maxTokens,
        masterSystemPrompt: formData.masterSystemPrompt,
        tonePrompts: formData.tonePrompts,
      };

      if (formData.openaiApiKey) {
        dataToSave.openaiApiKey = formData.openaiApiKey;
      }

      await adminApi.updateAIConfig(dataToSave);
      toast.success('Configuration saved');
      setFormData((prev) => ({ ...prev, openaiApiKey: '' }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const data: any = { model: formData.model };
      if (formData.openaiApiKey) {
        data.apiKey = formData.openaiApiKey;
      }

      await adminApi.testAIConfig(data);
      setTestResult('success');
      toast.success('AI configuration is valid');
    } catch (error) {
      setTestResult('error');
      toast.error('AI configuration test failed');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading configuration..." />;
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        AI Configuration
      </h1>

      {/* API Key Section */}
      <Card className="mb-6">
        <CardHeader>
          <span className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            OpenAI API Key
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={formData.openaiApiKey}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, openaiApiKey: e.target.value }))
                }
                placeholder={config?.hasApiKey ? 'Enter new key to update' : 'sk-...'}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
            </div>
            <Button
              variant="outline"
              onClick={handleTest}
              isLoading={isTesting}
              leftIcon={<TestTube className="w-4 h-4" />}
            >
              Test
            </Button>
          </div>
          {config?.hasApiKey && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              API key is configured
            </p>
          )}
          {testResult === 'success' && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Configuration test passed
            </p>
          )}
          {testResult === 'error' && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Configuration test failed
            </p>
          )}
        </CardContent>
      </Card>

      {/* Model Settings */}
      <Card className="mb-6">
        <CardHeader>
          <span className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Model Settings
          </span>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Model</label>
            <select
              value={formData.model}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, model: e.target.value }))
              }
              className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="gpt-4-turbo-preview">GPT-4 Turbo Preview</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-32k">GPT-4 32k</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16k</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Temperature: {formData.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  temperature: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Focused (0)</span>
              <span>Creative (2)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Max Tokens</label>
            <Input
              type="number"
              value={formData.maxTokens}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxTokens: parseInt(e.target.value) || 4096,
                }))
              }
              min={100}
              max={128000}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Prompts */}
      <Card className="mb-6">
        <CardHeader>Master System Prompt</CardHeader>
        <CardContent>
          <textarea
            value={formData.masterSystemPrompt}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                masterSystemPrompt: e.target.value,
              }))
            }
            rows={8}
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
            placeholder="Enter the master system prompt..."
          />
        </CardContent>
      </Card>

      {/* Tone Prompts */}
      <Card className="mb-6">
        <CardHeader>Tone-Specific Prompts</CardHeader>
        <CardContent className="space-y-6">
          {(['aggressive', 'professional', 'simple'] as const).map((tone) => (
            <div key={tone}>
              <label className="block text-sm font-medium mb-2 capitalize">
                {tone} Tone
              </label>
              <textarea
                value={formData.tonePrompts[tone]}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tonePrompts: {
                      ...prev.tonePrompts,
                      [tone]: e.target.value,
                    },
                  }))
                }
                rows={4}
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
                placeholder={`Enter the ${tone} tone prompt...`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
          size="lg"
        >
          Save Configuration
        </Button>
      </div>
    </div>
  );
};
