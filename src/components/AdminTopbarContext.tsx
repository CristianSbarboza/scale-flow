"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface AdminTopbarContextValue {
  action: ReactNode;
  setAction: (node: ReactNode) => void;
}

const AdminTopbarContext = createContext<AdminTopbarContextValue | null>(null);

export function AdminTopbarProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<ReactNode>(null);
  return (
    <AdminTopbarContext.Provider value={{ action, setAction }}>
      {children}
    </AdminTopbarContext.Provider>
  );
}

export function useAdminTopbar() {
  const ctx = useContext(AdminTopbarContext);
  if (!ctx) throw new Error("useAdminTopbar must be used within an AdminTopbarProvider");
  return ctx;
}
