/** Usuarios con permisos de super admin: crear/editar/eliminar usuarios y clientes */
export const SUPER_ADMINS = ["admin@2ota.com", "Alexandra", "Samuel", "alexandra@ota.com", "samuel@ota.com"];

export function isSuperAdmin(payload: { email?: string } | null): boolean {
  return !!payload?.email && SUPER_ADMINS.includes(payload.email);
}
