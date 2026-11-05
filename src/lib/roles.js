const STAFF_ROLES = ['administración', 'administracion', 'administrador', 'administradora', 'supervisor', 'supervisora', 'coordinador', 'coordinadora'];
const ADMIN_ROLES = ['administración', 'administracion', 'administrador', 'administradora'];

const norm = (role) => (role || '').trim().toLowerCase();

export const isStaffRole = (role) => STAFF_ROLES.includes(norm(role));
export const isAdminRole = (role) => ADMIN_ROLES.includes(norm(role));
