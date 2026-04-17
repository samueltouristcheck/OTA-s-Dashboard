import type { CSSProperties } from "react";

/**
 * Colores por fila vía estilos inline.
 * Clientes: matiz repartido en todo el círculo cromático según el nombre (más contraste entre marcas).
 */

function hashKey(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Matiz 0–359 estable por texto (no solo verdes/azules). */
function hueFromLabel(label: string): number {
  const k = label.trim().toLowerCase();
  if (!k) return 210;
  const h = hashKey(k);
  return (h * 47 + (h >>> 12) * 97 + (h >>> 24) * 13) % 360;
}

function clientHue(role: string, clienteNombre: string | null | undefined, username: string): number | null {
  if (role === "admin") return null;
  const key = (clienteNombre || username || "").trim().toLowerCase();
  if (!key) return null;
  return hueFromLabel(key);
}

export function registroUsoRowStyle(
  role: string,
  clienteNombre: string | null | undefined,
  username: string
): CSSProperties {
  const hue = clientHue(role, clienteNombre, username);
  if (hue == null) {
    return {
      backgroundColor: role === "admin" ? "hsl(215 18% 95%)" : "#ffffff",
      borderTop: "1px solid rgb(241 245 249)",
    };
  }
  const sat = 52 + (hashKey(clienteNombre || username || "") % 14);
  return {
    backgroundColor: `hsl(${hue} ${sat}% 84%)`,
    borderTop: "1px solid rgb(241 245 249)",
  };
}

export function registroUsoFirstCellStyle(
  role: string,
  clienteNombre: string | null | undefined,
  username: string
): CSSProperties {
  const hue = clientHue(role, clienteNombre, username);
  if (role === "admin") {
    return { borderLeft: "4px solid hsl(215 16% 68%)" };
  }
  if (hue == null) {
    return { borderLeft: "4px solid transparent" };
  }
  const satBar = 58 + (hashKey((clienteNombre || username) + "bar") % 14);
  return { borderLeft: `4px solid hsl(${hue} ${satBar}% 44%)` };
}
