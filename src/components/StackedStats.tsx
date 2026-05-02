"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Church, Users, Calendar, Layers } from "lucide-react";

interface StatsData {
  ministries: number;
  sectors: number;
  servants: number;
  schedules: number;
}

export function StackedStats({ data }: { data: StatsData }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const stats = [
    { label: "Ministérios", value: data.ministries.toString(), icon: Church, color: "var(--primary)" },
    { label: "Setores", value: data.sectors.toString(), icon: Layers, color: "var(--secondary)" },
    { label: "Servos", value: data.servants.toString(), icon: Users, color: "var(--accent)" },
    { label: "Escalas Ativas", value: data.schedules.toString(), icon: Calendar, color: "#10b981" },
  ];

  return (
    <div 
      style={{ 
        position: 'relative', 
        height: isExpanded ? 'auto' : '200px', 
        marginBottom: '2.5rem',
        cursor: 'pointer'
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div 
        className={isExpanded ? "grid" : ""} 
        style={{ 
          display: isExpanded ? 'grid' : 'block',
          gridTemplateColumns: isExpanded ? 'repeat(auto-fit, minmax(240px, 1fr))' : 'none',
          gap: '1.5rem',
          position: 'relative',
          height: '100%'
        }}
      >
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            layout
            initial={false}
            animate={{
              x: isExpanded ? 0 : index * 40,
              y: isExpanded ? 0 : index * 10,
              rotate: isExpanded ? 0 : index * 2,
              zIndex: isExpanded ? 1 : 10 - index,
              scale: isExpanded ? 1 : 1 - index * 0.02,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="card glass"
            style={{
              position: isExpanded ? 'relative' : 'absolute',
              width: isExpanded ? '100%' : '300px',
              top: 0,
              left: 0,
              boxShadow: isExpanded ? 'none' : '0 10px 30px rgba(0,0,0,0.3)',
              userSelect: 'none'
            }}
          >
            <div className="flex justify-between" style={{ marginBottom: '1rem' }}>
              <div style={{ 
                background: stat.color, 
                padding: '0.5rem', 
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <stat.icon size={24} color="white" />
              </div>
              {!isExpanded && index === 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>VER RESUMO</span>
              )}
            </div>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>{stat.label}</p>
            <h3 style={{ fontSize: '2rem' }}>{stat.value}</h3>
          </motion.div>
        ))}
      </div>
      
      {!isExpanded && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ 
            position: 'absolute', 
            bottom: '-20px', 
            left: '0', 
            fontSize: '0.75rem', 
            color: 'var(--muted-foreground)',
            fontStyle: 'italic'
          }}
        >
          Clique para expandir estatísticas
        </motion.div>
      )}
    </div>
  );
}
