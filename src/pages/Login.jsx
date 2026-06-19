import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Activity, ShieldCheck, Database, Mail } from 'lucide-react';
import FormInput from '../components/FormInput';
import { api } from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (localStorage.getItem('isAuthenticated') === 'true') {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.loginUser(username, password);
      if (data.success) {
        localStorage.setItem('isAuthenticated', 'true');
        navigate('/');
      } else {
        setError(data.message || 'Invalid username or password.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Connection to backend failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl bg-card rounded-2xl border border-border overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
      {/* Left Column: Branding and Illustration */}
      <div className="hidden md:flex md:col-span-6 bg-gradient-to-br from-primary/10 via-secondary to-background border-r border-border p-10 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>
        
        <div className="relative z-10 flex items-center space-x-3">
          <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
            <Cpu className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <span className="font-display text-xl font-bold text-text tracking-wide uppercase">IoT Portal</span>
        </div>

        <div className="relative z-10 space-y-6 my-auto py-8">
          <h2 className="text-3xl font-display font-bold text-text leading-tight">
            Industrial Asset <br />
            <span className="text-primary">Monitoring cockpit.</span>
          </h2>
          <p className="text-sm text-muted leading-relaxed max-w-sm">
            A secure telemetry acquisition hub with dynamic status derivation, real-time alert logs, and SMTP notification dispatch.
          </p>

          <div className="space-y-3 pt-4">
            <div className="flex items-center space-x-3 text-xs text-text font-medium">
              <ShieldCheck className="w-4 h-4 text-success" />
              <span>Role-based access controls (RBAC)</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-text font-medium">
              <Activity className="w-4 h-4 text-primary" />
              <span>Realistic telemetry drift simulation</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-text font-medium">
              <Database className="w-4 h-4 text-warning" />
              <span>Unified SQL telemetry storage</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[10px] text-muted font-medium uppercase tracking-wider">
          System version 2.4.0 • Connected
        </div>
      </div>

      {/* Right Column: Sign In Form */}
      <div className="col-span-12 md:col-span-6 p-8 sm:p-12 flex flex-col justify-center bg-card">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-text">Sign In</h1>
          <p className="text-sm text-muted mt-2">Enter credentials to access the IoT platform</p>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg text-sm text-center mb-6 font-medium animate-in fade-in duration-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label htmlFor="username" className="text-xs font-semibold text-text uppercase tracking-wider">Username</label>
            <input 
              type="text" 
              id="username" 
              name="username"
              placeholder="Enter username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-text placeholder-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-semibold text-text uppercase tracking-wider">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password"
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-text placeholder-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary py-3 rounded-lg text-sm font-semibold transition-all mt-4 flex items-center justify-center select-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : 'Sign In to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
