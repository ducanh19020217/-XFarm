'use client';

import * as React from 'react';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

const AdminUserContext = React.createContext<AdminUser | null>(null);

export function AdminUserProvider({
  user,
  children,
}: {
  user: AdminUser | null;
  children: React.ReactNode;
}) {
  return <AdminUserContext.Provider value={user}>{children}</AdminUserContext.Provider>;
}

export function useAdminUser() {
  return React.useContext(AdminUserContext);
}
