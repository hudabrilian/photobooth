import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminDashboard } from './AdminDashboard';
import './styles/admin.css';

createRoot(document.getElementById('admin-root')!).render(
  <StrictMode>
    <AdminDashboard />
  </StrictMode>
);
