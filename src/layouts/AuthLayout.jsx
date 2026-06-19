import { Outlet } from 'react-router-dom';
import ConnectionStatusBanner from '../components/ConnectionStatusBanner';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <ConnectionStatusBanner />
      <div className="flex-grow flex flex-col justify-center items-center p-4">
        <Outlet />
      </div>
    </div>
  );
}
