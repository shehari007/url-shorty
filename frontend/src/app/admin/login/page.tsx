import type { Metadata } from 'next';
import { LoginForm } from '@/components/admin/LoginForm';

export const metadata: Metadata = {
  title: 'Admin Sign In',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLoginPage() {
  return <LoginForm />;
}
