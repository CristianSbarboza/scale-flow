import { ImageResponse } from "next/og";

export const alt = "ScaleFlow — A escala da igreja feita em paz.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          backgroundColor: "#1b1a18",
          backgroundImage:
            "radial-gradient(circle at 18% 18%, rgba(249, 115, 22, 0.22), transparent 52%), radial-gradient(circle at 86% 80%, rgba(251, 146, 60, 0.14), transparent 48%)",
          color: "#ffffff",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "16px",
                backgroundColor: "#232120",
                border: "1px solid #34312e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f97316",
                fontSize: "28px",
                fontWeight: 700,
                fontFamily: "sans-serif",
              }}
            >
              S†F
            </div>
            <span
              style={{
                fontSize: "28px",
                letterSpacing: "0.06em",
                color: "#f97316",
                fontFamily: "sans-serif",
                fontWeight: 700,
              }}
            >
              ScaleFlow
            </span>
          </div>

          <div
            style={{
              padding: "10px 20px",
              borderRadius: "999px",
              backgroundColor: "#232120",
              border: "1px solid #34312e",
              color: "#a8a29e",
              fontSize: "16px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: "monospace",
            }}
          >
            GESTÃO MINISTERIAL · IA · WHATSAPP
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "940px" }}>
          <div
            style={{
              fontSize: "76px",
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <span>A escala da igreja feita</span>
            <span style={{ color: "#fdba74", fontStyle: "italic" }}>em paz.</span>
          </div>
          <div
            style={{
              fontSize: "27px",
              lineHeight: 1.45,
              color: "#a8a29e",
              fontFamily: "sans-serif",
              maxWidth: "820px",
            }}
          >
            Disponibilidade em um toque, rascunhos com a assistente Cale, trocas entre servos e lembretes automáticos no WhatsApp.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #34312e",
            paddingTop: "26px",
            color: "#a8a29e",
            fontSize: "18px",
            fontFamily: "sans-serif",
          }}
        >
          <span>Ministérios · Setores · Coordenadores · Servos</span>
          <span style={{ color: "#f97316", fontWeight: 600 }}>Menos planilha. Mais comunhão no altar.</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

