import { useEffect, useState } from 'react';
import { 
  User, 
  Mail, 
  Settings as SettingsIcon, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  Activity, 
  Server, 
  Send 
} from 'lucide-react';
import { api } from '../services/api';

export default function Settings() {
  // Section 1 State: Admin Credentials
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [credLoading, setCredLoading] = useState(false);
  const [credMessage, setCredMessage] = useState({ type: '', text: '' });

  // Section 2 State: Email & Alert settings
  const [adminEmail, setAdminEmail] = useState('');
  const [sendAdminEmails, setSendAdminEmails] = useState(true);
  const [sendClientEmails, setSendClientEmails] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState({ type: '', text: '' });
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState({ type: '', text: '' });

  // Section 3 State: System Status Indicators
  const [systemStatus, setSystemStatus] = useState({
    database: 'Checking...',
    smtp: 'Checking...',
    backend: 'Checking...'
  });
  const [statusLoading, setStatusLoading] = useState(false);

  // Initialize: Load Settings & Health Status
  const loadSettingsData = async () => {
    try {
      const res = await api.fetchSettings();
      if (res.success) {
        setAdminUsername(res.data.username || 'admin');
        setAdminEmail(res.data.admin_email || '');
        setSendAdminEmails(res.data.send_admin_emails !== false);
        setSendClientEmails(res.data.send_client_emails !== false);
      }
    } catch (err) {
      console.error('Failed to load Settings:', err);
      setCredMessage({ type: 'error', text: 'Failed to retrieve admin settings from backend.' });
    }
  };

  const loadSystemStatus = async () => {
    try {
      setStatusLoading(true);
      const res = await api.fetchSystemStatus();
      if (res.success) {
        setSystemStatus(res.data);
      } else {
        setSystemStatus({
          database: 'Disconnected',
          smtp: 'Disconnected',
          backend: 'Disconnected'
        });
      }
    } catch (err) {
      console.error('Failed to fetch status health check:', err);
      setSystemStatus({
        database: 'Disconnected',
        smtp: 'Disconnected',
        backend: 'Disconnected'
      });
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
    loadSystemStatus();
  }, []);

  // Submit Handler 1: Save Credentials
  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    setCredMessage({ type: '', text: '' });

    if (!adminUsername.trim()) {
      setCredMessage({ type: 'error', text: 'Username is required.' });
      return;
    }

    if (!adminPassword) {
      setCredMessage({ type: 'error', text: 'Password is required to update credentials.' });
      return;
    }

    if (adminPassword.length < 4) {
      setCredMessage({ type: 'error', text: 'Password must be at least 4 characters.' });
      return;
    }

    if (adminPassword !== confirmPassword) {
      setCredMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    try {
      setCredLoading(true);
      const res = await api.updateAdminSettings({
        username: adminUsername.trim(),
        password: adminPassword,
        confirmPassword: confirmPassword
      });

      if (res.success) {
        setCredMessage({ type: 'success', text: 'Admin credentials saved successfully.' });
        setAdminPassword('');
        setConfirmPassword('');
        // Reload settings values to verify
        await loadSettingsData();
      } else {
        setCredMessage({ type: 'error', text: res.message || 'Failed to save credentials.' });
      }
    } catch (err) {
      console.error(err);
      setCredMessage({ type: 'error', text: err.message || 'Server error occurred.' });
    } finally {
      setCredLoading(false);
    }
  };

  // Submit Handler 2: Save Email Settings
  const handleSaveEmailSettings = async (e) => {
    e.preventDefault();
    setEmailMessage({ type: '', text: '' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!adminEmail.trim() || !emailRegex.test(adminEmail.trim())) {
      setEmailMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    try {
      setEmailLoading(true);
      const res = await api.updateEmailSettings({
        admin_email: adminEmail.trim(),
        send_admin_emails: sendAdminEmails,
        send_client_emails: sendClientEmails
      });

      if (res.success) {
        setEmailMessage({ type: 'success', text: 'Email & Alert settings saved successfully.' });
        await loadSettingsData();
      } else {
        setEmailMessage({ type: 'error', text: res.message || 'Failed to save email settings.' });
      }
    } catch (err) {
      console.error(err);
      setEmailMessage({ type: 'error', text: err.message || 'Server error occurred.' });
    } finally {
      setEmailLoading(false);
    }
  };

  // Action Handler: Trigger SMTP Test Email
  const handleSendTestEmail = async () => {
    setTestEmailMessage({ type: '', text: '' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!adminEmail.trim() || !emailRegex.test(adminEmail.trim())) {
      setTestEmailMessage({ type: 'error', text: '✗ Please enter a valid email address first.' });
      return;
    }

    try {
      setTestEmailLoading(true);
      const res = await api.sendSettingsTestEmail({
        admin_email: adminEmail.trim()
      });

      if (res.success) {
        setTestEmailMessage({ type: 'success', text: '✓ Email sent successfully' });
      } else {
        setTestEmailMessage({ type: 'error', text: `✗ Email failed: ${res.message || 'SMTP delivery rejected'}` });
      }
    } catch (err) {
      console.error('Test Email error:', err);
      setTestEmailMessage({ type: 'error', text: `✗ Email failed: ${err.message || 'Nodemailer configuration error'}` });
    } finally {
      setTestEmailLoading(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text font-display uppercase tracking-wide">System Settings</h1>
          <p className="text-muted text-xs sm:text-sm mt-1">Configure portal login credentials, email notification settings, and check server status.</p>
        </div>
        <button 
          onClick={() => { loadSettingsData(); loadSystemStatus(); }}
          className="btn-secondary flex items-center space-x-2 text-xs py-2 px-4 select-none cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Settings</span>
        </button>
      </div>

      {/* Main Grid: Left Column Cards, Right Column Status panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* Left Column forms */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          
          {/* Card 1: Admin Account Credentials Settings */}
          <div className="bg-card border border-border rounded-xl p-6 sm:p-7 shadow-soft space-y-5">
            <div className="flex items-center space-x-2.5 border-b border-border/50 pb-3">
              <User className="w-5 h-5 text-primary" />
              <h2 className="font-display text-sm font-bold text-text uppercase tracking-wider">Admin Account Settings</h2>
            </div>

            {credMessage.text && (
              <div className={`p-3.5 rounded-lg border text-xs font-semibold ${
                credMessage.type === 'success' ? 'bg-success/15 border-success/20 text-success' : 'bg-danger/15 border-danger/25 text-danger'
              }`}>
                {credMessage.text}
              </div>
            )}

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-text uppercase tracking-wider">Admin Username</label>
                <input 
                  type="text" 
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin" 
                  className="bg-background border border-border rounded-lg px-3.5 py-2.5 text-xs text-text placeholder-muted/50 focus:outline-none focus:border-primary transition-all font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-text uppercase tracking-wider">New Password</label>
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="bg-background border border-border rounded-lg px-3.5 py-2.5 text-xs text-text placeholder-muted/50 focus:outline-none focus:border-primary transition-all font-semibold"
                    required
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-xs font-semibold text-text uppercase tracking-wider">Confirm Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="bg-background border border-border rounded-lg px-3.5 py-2.5 text-xs text-text placeholder-muted/50 focus:outline-none focus:border-primary transition-all font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={credLoading}
                  className="btn-primary flex items-center space-x-2 text-xs py-2.5 px-5 select-none font-bold uppercase tracking-wider cursor-pointer"
                >
                  {credLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Credentials</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Email & Alert Settings */}
          <div className="bg-card border border-border rounded-xl p-6 sm:p-7 shadow-soft space-y-5">
            <div className="flex items-center space-x-2.5 border-b border-border/50 pb-3">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="font-display text-sm font-bold text-text uppercase tracking-wider">Email & Alert Settings</h2>
            </div>

            {emailMessage.text && (
              <div className={`p-3.5 rounded-lg border text-xs font-semibold ${
                emailMessage.type === 'success' ? 'bg-success/15 border-success/20 text-success' : 'bg-danger/15 border-danger/25 text-danger'
              }`}>
                {emailMessage.text}
              </div>
            )}

            <form onSubmit={handleSaveEmailSettings} className="space-y-5">
              <div className="flex flex-col space-y-1">
                <label className="text-xs font-semibold text-text uppercase tracking-wider">Admin Alert Email</label>
                <input 
                  type="email" 
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@iotportal.local" 
                  className="bg-background border border-border rounded-lg px-3.5 py-2.5 text-xs text-text placeholder-muted/50 focus:outline-none focus:border-primary transition-all font-semibold font-mono"
                  required
                />
              </div>

              {/* Toggles Options */}
              <div className="space-y-3 pt-1">
                <label className="flex items-center space-x-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={sendAdminEmails}
                    onChange={(e) => setSendAdminEmails(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary bg-background focus:ring-primary focus:ring-offset-background cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-text uppercase tracking-wider block">Send Admin Alert Emails</span>
                    <span className="text-[10px] text-muted leading-tight">Forward system-wide anomaly alerts to the designated administrator email.</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={sendClientEmails}
                    onChange={(e) => setSendClientEmails(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary bg-background focus:ring-primary focus:ring-offset-background cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-text uppercase tracking-wider block">Send Client Alert Emails</span>
                    <span className="text-[10px] text-muted leading-tight">Deliver warning notifications to client emails registered under the device.</span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-3 border-t border-border/40">
                <div className="flex items-center space-x-3 flex-1">
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={testEmailLoading}
                    className="btn-secondary flex items-center space-x-2 text-xs py-2.5 px-4 font-bold uppercase tracking-wider w-full sm:w-auto justify-center select-none"
                  >
                    {testEmailLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Test Email</span>
                  </button>
                  
                  {testEmailMessage.text && (
                    <span className={`text-xs font-bold ${
                      testEmailMessage.type === 'success' ? 'text-success' : 'text-danger'
                    }`}>
                      {testEmailMessage.text}
                    </span>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={emailLoading}
                  className="btn-primary flex items-center space-x-2 text-xs py-2.5 px-5 font-bold uppercase tracking-wider justify-center select-none"
                >
                  {emailLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Email Settings</span>
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Column: System Status Panels */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-card border border-border rounded-xl p-5 shadow-soft space-y-5 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center space-x-2.5 text-text font-bold text-xs uppercase tracking-wider">
                <Activity className="w-4 h-4 text-primary" />
                <span>System Status</span>
              </div>
              
              <button 
                onClick={loadSystemStatus}
                disabled={statusLoading}
                className="p-1 hover:bg-secondary rounded-lg text-muted hover:text-text transition-colors border border-transparent hover:border-border cursor-pointer select-none"
                title="Refresh Health Checks"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 space-y-4">
              {/* Database Status Indicator */}
              <div className="bg-background border border-border/40 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-secondary text-primary rounded-lg border border-border/60">
                    <Database className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text uppercase tracking-wider block">Database Connection</span>
                    <span className="text-[10px] text-muted leading-tight font-medium">MySQL Pool Health Check</span>
                  </div>
                </div>
                
                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center ${
                  systemStatus.database === 'Connected' ? 'text-success' : 'text-danger'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    systemStatus.database === 'Connected' ? 'bg-success animate-pulse' : 'bg-danger'
                  }`}></span>
                  {systemStatus.database}
                </span>
              </div>

              {/* SMTP Status Indicator */}
              <div className="bg-background border border-border/40 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-secondary text-primary rounded-lg border border-border/60">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text uppercase tracking-wider block">SMTP Server</span>
                    <span className="text-[10px] text-muted leading-tight font-medium">Transporter Handshake</span>
                  </div>
                </div>
                
                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center ${
                  systemStatus.smtp === 'Connected' ? 'text-success' : 'text-danger'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    systemStatus.smtp === 'Connected' ? 'bg-success animate-pulse' : 'bg-danger'
                  }`}></span>
                  {systemStatus.smtp}
                </span>
              </div>

              {/* Backend API Status Indicator */}
              <div className="bg-background border border-border/40 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-secondary text-primary rounded-lg border border-border/60">
                    <Server className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text uppercase tracking-wider block">Backend API</span>
                    <span className="text-[10px] text-muted leading-tight font-medium">Express Server Health</span>
                  </div>
                </div>
                
                <span className="text-[10px] font-bold uppercase tracking-wider text-success flex items-center">
                  <span className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse"></span>
                  {systemStatus.backend}
                </span>
              </div>
            </div>

            <div className="text-[9px] text-muted font-mono leading-relaxed text-center border-t border-border/40 pt-3">
              Diagnostic polls run automatically on dashboard sync.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
