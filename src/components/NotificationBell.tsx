"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { getPendingSwapRequests, respondToSwapRequest } from "@/lib/actions/swaps";
import type { PendingSwapRequest } from "@/types/domain";
import { useToast } from "@/components/Toast";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<PendingSwapRequest[]>([]);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    try {
      const data = await getPendingSwapRequests();
      setRequests(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleRespond = async (id: number, accept: boolean) => {
    setRespondingId(id);
    try {
      await respondToSwapRequest(id, accept);
      showToast(accept ? "Troca aceita. O dia agora é seu." : "Pedido recusado.", "success");
      await load();
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Erro ao responder o pedido.", "error");
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          color: "var(--foreground)",
        }}
        aria-label="Notificações"
      >
        <Bell size={20} />
        {requests.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background: "#ef4444",
              border: "2px solid var(--background)",
            }}
          />
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
          <div
            className="card glass"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 0.5rem)",
              width: "320px",
              maxWidth: "90vw",
              maxHeight: "420px",
              overflowY: "auto",
              padding: "1rem",
              zIndex: 31,
              display: "grid",
              gap: "0.75rem",
            }}
          >
            <p style={{ fontWeight: 700, fontSize: "0.875rem" }}>Pedidos de troca</p>
            {requests.length === 0 && (
              <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", padding: "0.5rem 0" }}>
                Nenhum pedido pendente.
              </p>
            )}
            {requests.map((r) => (
              <div
                key={r.id}
                style={{ padding: "0.75rem", background: "var(--muted)", borderRadius: "var(--radius)", display: "grid", gap: "0.5rem" }}
              >
                <p style={{ fontSize: "0.8125rem" }}>
                  <strong>{r.requesterName}</strong> quer assumir seu dia{" "}
                  <strong>
                    {new Date(`${r.date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </strong>{" "}
                  ({r.startTime.slice(0, 5)}) — {r.scheduleName}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
                  {r.ministryName} · {r.sectorName}
                </p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => handleRespond(r.id, true)}
                    disabled={respondingId === r.id}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: "0.5rem", fontSize: "0.8125rem" }}
                  >
                    <Check size={16} /> Aceitar
                  </button>
                  <button
                    onClick={() => handleRespond(r.id, false)}
                    disabled={respondingId === r.id}
                    className="btn btn-ghost"
                    style={{ flex: 1, padding: "0.5rem", fontSize: "0.8125rem", color: "#ef4444" }}
                  >
                    <X size={16} /> Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
