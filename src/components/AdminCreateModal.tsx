"use client";

import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function AdminCreateModal({ title, onClose, children }: Props) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 p-4 bg-black/80 backdrop-blur-md"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="card glass"
        style={{
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexShrink: 0 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} className="btn btn-ghost" style={{ borderRadius: "50%", padding: "0.5rem" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
          {children}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
