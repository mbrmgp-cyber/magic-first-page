import type { IdCardDesign } from "@/lib/idCardTemplates";

const TELUGU_FONT = '"Noto Sans Telugu", "Noto Sans Devanagari", system-ui, sans-serif';

// Renders society-added free-form texts and photos on top of the card.
// Positions are percentages so they stay in place at any card scale.
export function CustomOverlays({ design, side }: { design: IdCardDesign; side: "front" | "back" }) {
  const texts = (design.customTexts || []).filter((t) => t.side === side && t.text.trim());
  const images = (design.customImages || []).filter((i) => i.side === side && i.url);
  if (texts.length === 0 && images.length === 0) return null;
  return (
    <>
      {texts.map((t) => (
        <div
          key={t.id}
          style={{
            position: "absolute",
            left: `${t.x}%`,
            top: `${t.y}%`,
            transform: "translate(-50%, -50%)",
            fontFamily: `${t.font || "Noto Sans"}, ${TELUGU_FONT}`,
            fontSize: t.size,
            fontWeight: t.weight,
            color: t.color,
            whiteSpace: "nowrap",
            lineHeight: 1.2,
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          {t.text}
        </div>
      ))}
      {images.map((i) => (
        <img
          key={i.id}
          src={i.url}
          alt=""
          style={{
            position: "absolute",
            left: `${i.x}%`,
            top: `${i.y}%`,
            transform: "translate(-50%, -50%)",
            width: i.size,
            height: i.size,
            objectFit: "cover",
            borderRadius: i.round ? "50%" : 4,
            zIndex: 20,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}
