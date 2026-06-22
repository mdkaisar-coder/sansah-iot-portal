import { useState, useEffect } from 'react';
import { api } from '../services/api';

/**
 * Custom hook to poll telemetry metrics and alarm states on a given interval (default: 5000ms).
 */
export function useTelemetryPolling(deviceId, deviceStatus, intervalMs = 5000) {
  const [telemetry, setTelemetry] = useState({});
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!deviceId) return;

    // Clear previous states
    setTelemetry({});
    setHistory([]);
    setLastUpdated(null);
    setError('');

    // Skip polling if the device is offline
    const isOffline = (deviceStatus || '').toLowerCase() === 'offline';
    if (isOffline) {
      setLoading(false);
      return;
    }

    const poll = async () => {
      try {
        setLoading(true);

        // 1. Fetch live telemetry data
        const sensorsData = await api.fetchSensors(deviceId);
        if (sensorsData.success && sensorsData.data.length > 0) {
          setHistory(sensorsData.data);
          const readings = {};
          let latestTime = null;

          sensorsData.data.forEach((row) => {
            if (!readings[row.sensor_name]) {
              readings[row.sensor_name] = row.sensor_value;
              const rowTime = new Date(row.recorded_at);
              if (!latestTime || rowTime > latestTime) {
                latestTime = rowTime;
              }
            }
          });

          setTelemetry(readings);
          if (latestTime) {
            setLastUpdated(latestTime);
          }
        }

        // 2. Fetch live alerts
        const alertsData = await api.fetchAlerts({ device_id: deviceId });
        if (alertsData.success) {
          const activeList = alertsData.data.filter((a) => a.status !== 'Resolved');
          setActiveAlerts(activeList);
        }
        setError('');
      } catch (err) {
        console.error('Failed to poll telemetry details:', err);
        setError('Failed to refresh live telemetry updates.');
      } finally {
        setLoading(false);
      }
    };

    poll();
    const timerId = setInterval(poll, intervalMs);

    return () => clearInterval(timerId);
  }, [deviceId, deviceStatus, intervalMs]);

  return {
    telemetry,
    activeAlerts,
    history,
    lastUpdated,
    loading,
    error
  };
}
