import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle, AlertCircle, Eye, EyeOff, Loader, ClipboardList } from 'lucide-react';
import type { EmailConfig } from '../services/api';
import { emailService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const EmailSettings: React.FC = () => {
  const auth = useAuth();
  const user = auth?.user;
  const isAdmin = user?.role === 'admin';

  const [config, setConfig] = useState<Partial<EmailConfig> & { mail_password?: string }>({
    mail_server: '',
    mail_port: 587,
    mail_use_tls: true,
    mail_username: '',
    mail_password: '',
    mail_default_sender: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [templates, setTemplates] = useState<Record<string, { subject: string; body: string }>>({});
  const [selectedStatus, setSelectedStatus] = useState<string>('Nouveau');
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [isTemplateModified, setIsTemplateModified] = useState(false);
  const [testingStatus, setTestingStatus] = useState<string | null>(null);

  const PIPELINE_STATUSES = [
    'Nouveau', 'Contacté', 'Répondu', 'Intéressé',
    'Démo planifiée', 'Démo réalisée', 'Client', 'Perdu'
  ];

  useEffect(() => {
    fetchConfig();
    fetchTemplates();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await emailService.getEmailConfig();
      if (response.success) {
        setConfig({
          ...response.config,
          mail_password: response.config.is_configured ? '********' : ''
        });
        setTestEmail(response.config.mail_default_sender || '');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to load email configuration' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await emailService.getEmailTemplates();
      if (response.success) {
        setTemplates(response.templates);
      }
    } catch (error: any) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleChange = (field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTemplateChange = (field: 'subject' | 'body', value: string) => {
    setTemplates(prev => ({
      ...prev,
      [selectedStatus]: {
        ...(prev[selectedStatus] || { subject: '', body: '' }),
        [field]: value
      }
    }));
    setIsTemplateModified(true);
  };

  const handleSaveTemplates = async () => {
    setSavingTemplates(true);
    try {
      console.log('DEBUG: Saving templates:', templates);
      const response = await emailService.updateEmailTemplates(templates);
      if (response.success) {
        setMessage({ type: 'success', text: 'Templates updated successfully!' });
        setIsTemplateModified(false);
        setTimeout(() => setMessage(null), 3000);
        return true;
      } else {
        console.error('DEBUG: Save failed:', response);
        setMessage({ type: 'error', text: response.message || 'Failed to save templates' });
        return false;
      }
    } catch (error: any) {
      console.error('DEBUG: Save exception:', error);
      setMessage({ type: 'error', text: 'Failed to save templates: ' + (error.message || 'Unknown error') });
      return false;
    } finally {
      setSavingTemplates(false);
    }
  };

  const handleSave = async () => {
    // Password is required only if not already configured, or if user is changing it
    if (!config.mail_server || !config.mail_username || (!config.is_configured && !config.mail_password)) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setSaving(true);
    try {
      const response = await emailService.updateEmailConfig({
        mail_server: config.mail_server!,
        mail_port: config.mail_port || 587,
        mail_use_tls: config.mail_use_tls !== false,
        mail_username: config.mail_username!,
        mail_password: config.mail_password === '********' ? undefined : config.mail_password, // Don't send dummy password
        mail_default_sender: config.mail_default_sender || config.mail_username!,
      });

      if (response.success) {
        setMessage({ type: 'success', text: 'Email configuration saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async (statusOverride?: string) => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address' });
      return;
    }

    if (statusOverride && isTemplateModified) {
      // Auto-save before testing
      const saved = await handleSaveTemplates();
      if (!saved) {
        if (!window.confirm('Failed to auto-save your latest changes. Standard test might use old template. Continue anyway?')) {
          return;
        }
      }
    }

    setTesting(true);
    if (statusOverride) setTestingStatus(statusOverride);

    try {
      const response = await emailService.testEmailConfig(testEmail, statusOverride);
      if (response.success) {
        setMessage({ type: 'success', text: response.message || 'Test email sent successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: response.message || 'Failed to send test email' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send test email' });
    } finally {
      setTesting(false);
      setTestingStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <Loader className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
            <Mail className="w-8 h-8 text-purple-500" />
            Email Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Configure SMTP settings and {isAdmin ? 'customize' : 'view'} email templates
          </p>
        </div>

        {!isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-bold">Template Access:</span> Only administrators can modify email templates. You can still configure SMTP settings.
            </p>
          </motion.div>
        )}

        <div className="role-based-content">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-8"
          >
            {/* Configuration Status */}
            <div className="mb-8 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                {config.is_configured ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-300">✓ SMTP Configured</p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        Emails will be sent via {config.mail_server}:{config.mail_port}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="font-semibold text-amber-700 dark:text-amber-300">⚠ SMTP Not Configured</p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Emails will be logged but not sent until you configure SMTP
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Forms */}
            <div className="space-y-6">
              {/* SMTP Server */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    SMTP Server *
                  </label>
                  <input
                    type="text"
                    value={config.mail_server || ''}
                    onChange={(e) => handleChange('mail_server', e.target.value)}
                    placeholder="e.g., smtp.gmail.com"
                    disabled={loading}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    SMTP Port *
                  </label>
                  <input
                    type="number"
                    value={config.mail_port || 587}
                    onChange={(e) => handleChange('mail_port', parseInt(e.target.value))}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Username/Email *
                  </label>
                  <input
                    type="email"
                    value={config.mail_username || ''}
                    onChange={(e) => handleChange('mail_username', e.target.value)}
                    placeholder="your-email@gmail.com"
                    disabled={loading}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={config.mail_password || ''}
                      onChange={(e) => handleChange('mail_password', e.target.value)}
                      placeholder={config.is_configured ? "******** (unchanged)" : "Enter App Password"}
                      disabled={loading}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Default Sender */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Default Sender Email
                </label>
                <input
                  type="email"
                  value={config.mail_default_sender || ''}
                  onChange={(e) => handleChange('mail_default_sender', e.target.value)}
                  placeholder="noreply@yourcompany.com"
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  This email will appear as the sender in all automated emails
                </p>
              </div>

              {/* TLS Checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="use-tls"
                  checked={config.mail_use_tls !== false}
                  onChange={(e) => handleChange('mail_use_tls', e.target.checked)}
                  disabled={!isAdmin}
                  className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="use-tls" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Use TLS Encryption
                </label>
              </div>
            </div>

            {/* Messages */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`mt-6 p-4 rounded-lg flex gap-3 ${message.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <p
                    className={`${message.type === 'success'
                      ? 'text-emerald-900 dark:text-emerald-200'
                      : 'text-red-900 dark:text-red-200'
                      }`}
                  >
                    {message.text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !isAdmin}
                className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader className="w-4 h-4 animate-spin" />}
                Save Configuration
              </button>
              <button
                onClick={() => handleTestEmail()}
                disabled={testing || !testEmail || !isAdmin}
                className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {testing && !testingStatus && <Loader className="w-4 h-4 animate-spin" />}
                Test SMTP Connection
              </button>
            </div>
          </motion.div>

          {/* Template Section - Admin Only */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-8 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-8"
            >
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                Template Customization
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Select Status Template
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PIPELINE_STATUSES.map((status) => (
                      <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedStatus === status
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                      >
                        {status}
                        {templates[status] ? (
                          <span className="ml-2 w-2 h-2 bg-emerald-500 rounded-full inline-block" title="Template configured" />
                        ) : (
                          <span className="ml-2 w-2 h-2 border border-slate-300 dark:border-slate-600 rounded-full inline-block" title="No template" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {templates[selectedStatus] && (
                  <motion.div
                    key={selectedStatus}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Email Subject
                      </label>
                      <input
                        type="text"
                        value={templates[selectedStatus].subject}
                        onChange={(e) => handleTemplateChange('subject', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Email Body
                      </label>
                      <textarea
                        rows={6}
                        value={templates[selectedStatus].body}
                        onChange={(e) => handleTemplateChange('body', e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                      />
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" />
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <p className="font-bold text-purple-600 dark:text-purple-400 mb-2">Available Placeholders (both formats supported):</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{school_name}"}</code> or <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{SchoolName}"}</code></div>
                          <div><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{contact_name}"}</code> or <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{ContactName}"}</code></div>
                          <div><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{email}"}</code> or <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{Email}"}</code></div>
                          <div><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{status}"}</code> or <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{Status}"}</code></div>
                          <div><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{contact_role}"}</code> or <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{ContactRole}"}</code></div>
                          <div><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{country}"}</code> or <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{Country}"}</code></div>
                          <div><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{your_name}"}</code> or <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{YourName}"}</code></div>
                          <div><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{company_name}"}</code> or <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{CompanyName}"}</code></div>
                          <div><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{demo_date}"}</code> or <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{"{DemoDate}"}</code></div>
                        </div>
                      </div>
                    </div>

                    {/* Preview of Email with Placeholders Replaced */}
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-3 uppercase tracking-wider">📧 Preview (with sample values)</p>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject:</p>
                          <div className="bg-white dark:bg-slate-900 p-2 rounded border border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-slate-100 font-mono text-xs">
                            {templates[selectedStatus]?.subject
                              ?.replace(/{school_name}/g, 'Test University')
                              ?.replace(/{{SchoolName}}/g, 'Test University')
                              ?.replace(/{contact_name}/g, 'Dr. Smith')
                              ?.replace(/{{ContactName}}/g, 'Dr. Smith')
                              ?.replace(/{email}/g, 'contact@test.edu')
                              ?.replace(/{{Email}}/g, 'contact@test.edu')
                              ?.replace(/{status}/g, selectedStatus)
                              ?.replace(/{{Status}}/g, selectedStatus)
                              ?.replace(/{contact_role}/g, 'Principal')
                              ?.replace(/{{ContactRole}}/g, 'Principal')
                              ?.replace(/{country}/g, 'France')
                              ?.replace(/{{Country}}/g, 'France')
                              ?.replace(/{{CompanyName}}/g, 'Expanzia')
                              ?.replace(/{{YourName}}/g, 'Adam')
                              ?.replace(/{{DemoDate}}/g, 'Next Week')
                              || '(no subject)'}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Body:</p>
                          <div className="bg-white dark:bg-slate-900 p-2 rounded border border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-slate-100 font-mono text-xs whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                            {templates[selectedStatus]?.body
                              ?.replace(/{school_name}/g, 'Test University')
                              ?.replace(/{{SchoolName}}/g, 'Test University')
                              ?.replace(/{contact_name}/g, 'Dr. Smith')
                              ?.replace(/{{ContactName}}/g, 'Dr. Smith')
                              ?.replace(/{email}/g, 'contact@test.edu')
                              ?.replace(/{{Email}}/g, 'contact@test.edu')
                              ?.replace(/{status}/g, selectedStatus)
                              ?.replace(/{{Status}}/g, selectedStatus)
                              ?.replace(/{contact_role}/g, 'Principal')
                              ?.replace(/{{ContactRole}}/g, 'Principal')
                              ?.replace(/{country}/g, 'France')
                              ?.replace(/{{Country}}/g, 'France')
                              ?.replace(/{{CompanyName}}/g, 'Expanzia')
                              ?.replace(/{{YourName}}/g, 'Adam')
                              ?.replace(/{{DemoDate}}/g, 'Next Week')
                              || '(no body)'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveTemplates}
                        disabled={savingTemplates}
                        className="flex-[2] px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {savingTemplates && <Loader className="w-4 h-4 animate-spin" />}
                        <div className="flex flex-col items-center">
                          <span>Save All Templates</span>
                          {isTemplateModified && (
                            <span className="text-[10px] uppercase tracking-wider opacity-80 animate-pulse font-bold">
                              • Unsaved Changes
                            </span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => handleTestEmail(selectedStatus)}
                        disabled={testing || !testEmail}
                        className="flex-1 px-4 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800"
                      >
                        {testingStatus === selectedStatus && <Loader className="w-4 h-4 animate-spin" />}
                        Test this Template
                      </button>
                    </div>
                  </motion.div>
                )}

                {!templates[selectedStatus] && (
                  <motion.div
                    key={`empty-${selectedStatus}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center"
                  >
                    <Mail className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      No email template configured for the <span className="font-bold">"{selectedStatus}"</span> status.
                    </p>
                    <button
                      onClick={() => {
                        setTemplates(prev => ({ ...prev, [selectedStatus]: { subject: '', body: '' } }));
                        setIsTemplateModified(true);
                      }}
                      className="px-6 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors font-medium"
                    >
                      Create Template
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6"
          >
            <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-3">Gmail Setup Instructions</h3>
            <ol className="text-sm text-purple-800 dark:text-purple-300 space-y-2 list-decimal list-inside">
              <li>Enable 2-Step Verification in your Google Account</li>
              <li>Generate an App Password in Google Account settings</li>
              <li>Use the App Password (16 characters) as your password above</li>
              <li>SMTP Server: <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">smtp.gmail.com</code></li>
              <li>Port: <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">587</code></li>
              <li>Keep "Use TLS Encryption" checked</li>
            </ol>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default EmailSettings;
