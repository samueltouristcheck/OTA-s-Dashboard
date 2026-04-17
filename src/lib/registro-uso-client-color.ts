import type { CSSProperties } from "react";

/**
 * Colores por fila vía estilos inline (no depende del JIT de Tailwind).
 * Mismo cliente → mismo matiz; admins en gris azulado suave.
 */

const CLIENT_HUES = [199, 152, 262, 38, 346, 172, 239, 24, 187, 292, 88, 328];

function hashKey(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clientHue(role: string, clienteNombre: string | null | undefined, username: string): number | null {
  if (role === "admin") return null;
  const key = (clienteNombre || username || "").trim().toLowerCase();
  if (!key) return null;
  return CLIENT_HUES[hashKey(key) % CLIENT_HUES.length]!;
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
  return {
    backgroundColor: `hsl(${hue} 38% 93%)`,
    borderTop: "1px solid rgb(241 245 249)",
  };
}

/** Barra izquierda en la primera celda (más visible que solo el fondo). */
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
  return { borderLeft: `4px solid hsl(${hue} 48% 58%)` };
}
