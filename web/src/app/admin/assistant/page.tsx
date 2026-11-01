"use client";

import { useSession } from "next-auth/react";
import AssistantChat from "@/components/AssistantChat";

export default function AdminAssistantPage() {
  const { data: session } = useSession();
  if (!session) return null;

  return (
    <div className="animate-fade-in">
      <AssistantChat
        role={session.user.role}
        userName={session.user.name ?? ""}
      />
    </div>
  );
}
