"use client";

interface AdminMobileListItemProps {
  onClick?: () => void;
  children: React.ReactNode;
}

export function AdminMobileListItem({ onClick, children }: AdminMobileListItemProps) {
  return (
    <div
      onClick={onClick}
      className="card"
      style={{ display: "grid", gap: "0.625rem", cursor: onClick ? "pointer" : "default" }}
    >
      {children}
    </div>
  );
}

interface AdminMobileFieldProps {
  label: string;
  children: React.ReactNode;
}

export function AdminMobileField({ label, children }: AdminMobileFieldProps) {
  return (
    <div style={{ display: "grid", gap: "0.125rem" }}>
      <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {label}
      </span>
      <div style={{ fontSize: "0.875rem" }}>{children}</div>
    </div>
  );
}
