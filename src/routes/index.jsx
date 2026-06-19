import { createBrowserRouter } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import RegisterDevice from '../pages/RegisterDevice';
import DeviceList from '../pages/DeviceList';
import DeviceDetails from '../pages/DeviceDetails';
import SensorMonitoring from '../pages/SensorMonitoring';
import Alerts from '../pages/Alerts';
import Settings from '../pages/Settings';
import ErrorBoundary from '../components/ErrorBoundary';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Login />,
      },
    ],
  },
  {
    path: '/',
    element: <DashboardLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'devices',
        element: <DeviceList />,
      },
      {
        path: 'devices/new',
        element: <RegisterDevice />,
      },
      {
        path: 'devices/:id',
        element: <DeviceDetails />,
      },
      {
        path: 'sensors',
        element: <SensorMonitoring />,
      },
      {
        path: 'alerts',
        element: <Alerts />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
]);
