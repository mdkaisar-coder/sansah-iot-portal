import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import FormInput from '../components/FormInput';
import { Cpu, User, MapPin, Settings, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const sensorCategories = [
  'Temperature Sensor',
  'Humidity Sensor',
  'Pressure Sensor',
  'Air Quality Sensor',
  'Water Level Sensor',
  'Flow Sensor',
  'Motion Sensor',
  'Light Sensor',
  'Smoke Sensor',
  'Gas Sensor',
  'Vibration Sensor',
  'Soil Moisture Sensor',
  'Power Meter',
  'Battery Monitor',
  'GPS Tracker'
];

export default function RegisterDevice() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    type: 'Sensor',
    protocol: 'MQTT',
    project: '',
    site: '',
    status: 'Online',
    sensor_type: 'Temperature Sensor',
    client_name: '',
    client_email: '',
    client_phone: '',
    alert_enabled: 'true'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      device_name: formData.name,
      device_code: formData.id,
      device_type: formData.type,
      protocol: formData.protocol,
      project_name: formData.project,
      location: formData.site,
      status: formData.status,
      sensor_type: formData.sensor_type,
      client_name: formData.client_name,
      client_email: formData.client_email,
      client_phone: formData.client_phone,
      alert_enabled: formData.alert_enabled === 'true'
    };

    try {
      const data = await api.registerDevice(payload);
      if (data.success) {
        alert(`Device ${formData.name} registered successfully!`);
        handleReset();
        navigate('/devices');
      } else {
        setError(data.message || 'Failed to register device.');
      }
    } catch (err) {
      console.error('Connection Error:', err);
      setError(err.message || 'Connection to backend failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      id: '',
      type: 'Sensor',
      protocol: 'MQTT',
      project: '',
      site: '',
      status: 'Online',
      sensor_type: 'Temperature Sensor',
      client_name: '',
      client_email: '',
      client_phone: '',
      alert_enabled: 'true'
    });
    setError('');
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/devices" className="p-2 bg-card border border-border hover:bg-secondary rounded-lg transition-colors text-muted hover:text-text">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-text tracking-wide">ONBOARD NEW ASSET</h1>
            <p className="text-muted text-xs mt-1">Onboard a physical telemetry asset into the system inventory.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger p-4 rounded-xl text-sm font-medium shadow-soft">
          {error}
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Device Information */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-4">
            <h2 className="font-display text-sm font-bold text-text uppercase tracking-wider border-b border-border/50 pb-2 flex items-center">
              <Cpu className="w-4 h-4 mr-2 text-primary" />
              <span>Device Information</span>
            </h2>
            <div className="space-y-4">
              <FormInput 
                label="Device Name *" 
                name="name"
                placeholder="e.g. Warehouse Temperature Monitor" 
                value={formData.name}
                onChange={handleChange}
                required 
              />
              <FormInput 
                label="Device ID / Code *" 
                name="id"
                placeholder="e.g. DEV-TEMP-2026" 
                value={formData.id}
                onChange={handleChange}
                required 
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase">Device Type *</label>
                  <select 
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition-all cursor-pointer"
                  >
                    <option value="Sensor">Sensor</option>
                    <option value="Actuator">Actuator</option>
                    <option value="Gateway">Gateway</option>
                    <option value="Camera">Camera</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-muted uppercase">Protocol *</label>
                  <select 
                    name="protocol"
                    value={formData.protocol}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition-all cursor-pointer"
                  >
                    <option value="MQTT">MQTT</option>
                    <option value="HTTP">HTTP</option>
                    <option value="CoAP">CoAP</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-muted uppercase">Sensor Category *</label>
                <select 
                  name="sensor_type"
                  value={formData.sensor_type}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  {sensorCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Client Information */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-4">
            <h2 className="font-display text-sm font-bold text-text uppercase tracking-wider border-b border-border/50 pb-2 flex items-center">
              <User className="w-4 h-4 mr-2 text-primary" />
              <span>Client Details</span>
            </h2>
            <div className="space-y-4">
              <FormInput 
                label="Client Name *" 
                name="client_name"
                placeholder="e.g. Acme Industries Ltd" 
                value={formData.client_name}
                onChange={handleChange}
                required 
              />
              <FormInput 
                label="Client Email Address *" 
                name="client_email"
                type="email"
                placeholder="e.g. alerts-recipient@acme.com" 
                value={formData.client_email}
                onChange={handleChange}
                required 
              />
              <FormInput 
                label="Client Phone Number *" 
                name="client_phone"
                placeholder="e.g. +1 (555) 019-2834" 
                value={formData.client_phone}
                onChange={handleChange}
                required 
              />
            </div>
          </div>

          {/* Section 3: Project & Deployment Information */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-4">
            <h2 className="font-display text-sm font-bold text-text uppercase tracking-wider border-b border-border/50 pb-2 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-primary" />
              <span>Deployment & Site Details</span>
            </h2>
            <div className="space-y-4">
              <FormInput 
                label="Project Name *" 
                name="project"
                placeholder="e.g. Warehouse Climate Audit" 
                value={formData.project}
                onChange={handleChange}
                required 
              />
              <FormInput 
                label="Location / Site *" 
                name="site"
                placeholder="e.g. Facility A, Building 4, Hall 2" 
                value={formData.site}
                onChange={handleChange}
                required 
              />
            </div>
          </div>

          {/* Section 4: Configuration Settings */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-soft space-y-4">
            <h2 className="font-display text-sm font-bold text-text uppercase tracking-wider border-b border-border/50 pb-2 flex items-center">
              <Settings className="w-4 h-4 mr-2 text-primary" />
              <span>Engine Settings</span>
            </h2>
            <div className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-muted uppercase">Initial Status *</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-semibold text-muted uppercase">Enable Threshold Email Alerts *</label>
                <select 
                  name="alert_enabled"
                  value={formData.alert_enabled}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition-all cursor-pointer"
                >
                  <option value="true">Yes (Send Notifications)</option>
                  <option value="false">No (Mute Notifications)</option>
                </select>
                <span className="text-[10px] text-muted leading-relaxed">
                  When enabled, critical anomalies exceeding rules will trigger real-time SMTP emails to the client email and system admin.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons Action bar */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-border/50">
          <button 
            type="button" 
            onClick={handleReset}
            disabled={loading}
            className="btn-secondary"
          >
            Reset Fields
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary flex items-center space-x-2 min-w-[120px] justify-center"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : 'Save Device'}
          </button>
        </div>
      </form>
    </div>
  );
}
