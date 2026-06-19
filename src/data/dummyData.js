export const devices = [
  {
    id: "DEV-1001",
    name: "HVAC Monitor 01",
    type: "Sensor",
    protocol: "MQTT",
    client: "Acme Corp",
    project: "Alpha Operations",
    site: "HQ Building",
    status: "Online",
    registeredDate: "2026-05-10",
    lastSeen: "2026-06-11T10:00:00Z"
  },
  {
    id: "DEV-1002",
    name: "Water Pressure Valve",
    type: "Actuator",
    protocol: "HTTP",
    client: "Global Tech",
    project: "Beta Facilities",
    site: "Site A",
    status: "Online",
    registeredDate: "2026-05-12",
    lastSeen: "2026-06-11T10:02:00Z"
  },
  {
    id: "DEV-1003",
    name: "Temp Sensor Basement",
    type: "Sensor",
    protocol: "MQTT",
    client: "Acme Corp",
    project: "Alpha Operations",
    site: "HQ Building",
    status: "Offline",
    registeredDate: "2026-05-15",
    lastSeen: "2026-06-10T08:00:00Z"
  },
  {
    id: "DEV-1004",
    name: "Smart Lighting Hub",
    type: "Hub",
    protocol: "HTTP",
    client: "Stark Industries",
    project: "Smart City",
    site: "Downtown Area",
    status: "Online",
    registeredDate: "2026-05-18",
    lastSeen: "2026-06-11T10:05:00Z"
  },
  {
    id: "DEV-1005",
    name: "Vibration Sensor Pump 3",
    type: "Sensor",
    protocol: "MQTT",
    client: "Global Tech",
    project: "Beta Facilities",
    site: "Site B",
    status: "Offline",
    registeredDate: "2026-05-20",
    lastSeen: "2026-06-09T14:00:00Z"
  },
  {
    id: "DEV-1006",
    name: "Flow Meter Main line",
    type: "Sensor",
    protocol: "MQTT",
    client: "Stark Industries",
    project: "Smart Water",
    site: "Plant 1",
    status: "Online",
    registeredDate: "2026-05-22",
    lastSeen: "2026-06-11T10:01:00Z"
  },
  {
    id: "DEV-1007",
    name: "Air Quality Monitor",
    type: "Sensor",
    protocol: "HTTP",
    client: "Acme Corp",
    project: "Alpha Operations",
    site: "HQ Building",
    status: "Online",
    registeredDate: "2026-05-25",
    lastSeen: "2026-06-11T10:03:00Z"
  },
  {
    id: "DEV-1008",
    name: "Security Camera Ent 1",
    type: "Camera",
    protocol: "HTTP",
    client: "Global Tech",
    project: "Security Setup",
    site: "Site A",
    status: "Online",
    registeredDate: "2026-05-28",
    lastSeen: "2026-06-11T10:04:00Z"
  },
  {
    id: "DEV-1009",
    name: "Backup Generator Monitor",
    type: "Sensor",
    protocol: "MQTT",
    client: "Stark Industries",
    project: "Smart City",
    site: "Uptown Substation",
    status: "Online",
    registeredDate: "2026-06-01",
    lastSeen: "2026-06-11T10:00:00Z"
  },
  {
    id: "DEV-1010",
    name: "Perimeter Motion Sensor",
    type: "Sensor",
    protocol: "MQTT",
    client: "Acme Corp",
    project: "Security Upgrade",
    site: "Warehouse 4",
    status: "Offline",
    registeredDate: "2026-06-05",
    lastSeen: "2026-06-08T12:00:00Z"
  }
];

export const alerts = [
  {
    id: "ALT-001",
    severity: "Critical",
    message: "Temperature exceeded threshold (35°C > 30°C)",
    deviceId: "DEV-1003",
    deviceName: "Temp Sensor Basement",
    date: "2026-06-11T09:45:00Z",
    status: "Active"
  },
  {
    id: "ALT-002",
    severity: "High",
    message: "Device offline for 24 hours",
    deviceId: "DEV-1005",
    deviceName: "Vibration Sensor Pump 3",
    date: "2026-06-10T14:00:00Z",
    status: "Active"
  },
  {
    id: "ALT-003",
    severity: "Medium",
    message: "Communication timeout (Latency > 500ms)",
    deviceId: "DEV-1008",
    deviceName: "Security Camera Ent 1",
    date: "2026-06-11T08:30:00Z",
    status: "Active"
  },
  {
    id: "ALT-004",
    severity: "Low",
    message: "Firmware update available",
    deviceId: "DEV-1001",
    deviceName: "HVAC Monitor 01",
    date: "2026-06-09T10:00:00Z",
    status: "Resolved"
  },
  {
    id: "ALT-005",
    severity: "Critical",
    message: "Perimeter breach detected",
    deviceId: "DEV-1010",
    deviceName: "Perimeter Motion Sensor",
    date: "2026-06-08T12:01:00Z",
    status: "Resolved"
  }
];

export const clients = ["Acme Corp", "Global Tech", "Stark Industries"];
export const projects = ["Alpha Operations", "Beta Facilities", "Smart City", "Security Setup", "Smart Water", "Security Upgrade"];

export const sensorReadings = {
  temperature: 32.4, // °C
  humidity: 58.2, // %
  pressure: 1012.5, // hPa
  battery: 85, // %
  lastUpdated: "2026-06-11T10:10:00Z"
};

export const dashboardSummary = {
  totalDevices: devices.length,
  onlineDevices: devices.filter(d => d.status === "Online").length,
  offlineDevices: devices.filter(d => d.status === "Offline").length,
  activeAlerts: alerts.filter(a => a.status === "Active").length
};
