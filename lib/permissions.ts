// ================================================
// Sistema de Permisos - Helpers TypeScript
// ================================================

export type Rol = 'admin' | 'cajero' | 'barbero';

export interface Permiso {
  pos?: {
    cobrar?: boolean;
    anular?: boolean;
    ver_reportes?: boolean;
    cerrar_caja?: boolean;
  };
  admin?: {
    ver?: boolean;
    editar?: boolean;
    eliminar?: boolean;
  };
  configuracion?: {
    editar?: boolean;
  };
  reportes?: {
    ver_todos?: boolean;
    exportar?: boolean;
  };
}

export interface RolPermiso {
  id: string;
  rol: Rol;
  nombre_display: string;
  descripcion: string;
  permisos: Permiso;
  created_at: string;
}

export interface UsuarioConPermisos {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  telefono?: string;
  barbero_id?: string;
  rol_nombre?: string;
  rol_descripcion?: string;
  permisos?: Permiso;
  rol_created_at?: string;
}

// ================================================
// Definición de permisos por rol
// ================================================

export const PERMISOS_POR_ROL: Record<Rol, Permiso> = {
  admin: {
    pos: {
      cobrar: true,
      anular: true,
      ver_reportes: true,
      cerrar_caja: true,
    },
    admin: {
      ver: true,
      editar: true,
      eliminar: true,
    },
    configuracion: {
      editar: true,
    },
    reportes: {
      ver_todos: true,
      exportar: true,
    },
  },
  cajero: {
    pos: {
      cobrar: true,
      anular: false,
      ver_reportes: false,
      cerrar_caja: true,
    },
    admin: {
      ver: false,
      editar: false,
      eliminar: false,
    },
    configuracion: {
      editar: false,
    },
    reportes: {
      ver_todos: false,
      exportar: false,
    },
  },
  barbero: {
    pos: {
      cobrar: true,
      anular: false,
      ver_reportes: false,
      cerrar_caja: false,
    },
    admin: {
      ver: false,
      editar: false,
      eliminar: false,
    },
    configuracion: {
      editar: false,
    },
    reportes: {
      ver_todos: false,
      exportar: false,
    },
  },
};

// ================================================
// Funciones de verificación de permisos
// ================================================

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function tienePermiso(
  usuario: UsuarioConPermisos | null,
  modulo: keyof Permiso,
  accion: string
): boolean {
  if (!usuario || !usuario.activo) return false;

  // Admin tiene acceso a todo
  if (usuario.rol === 'admin') return true;

  // Obtener permisos del usuario (desde la DB o local)
  const permisos = usuario.permisos || PERMISOS_POR_ROL[usuario.rol];
  
  if (!permisos || !permisos[modulo]) return false;

  const moduloPermisos = permisos[modulo] as Record<string, boolean>;
  return moduloPermisos[accion] === true;
}

/**
 * Verifica si un usuario puede acceder al POS
 */
export function puedeAccederPOS(usuario: UsuarioConPermisos | null): boolean {
  return tienePermiso(usuario, 'pos', 'cobrar');
}

/**
 * Verifica si un usuario puede acceder al panel admin
 */
export function puedeAccederAdmin(usuario: UsuarioConPermisos | null): boolean {
  return tienePermiso(usuario, 'admin', 'ver');
}

/**
 * Verifica si un usuario puede anular facturas
 */
export function puedeAnularFacturas(usuario: UsuarioConPermisos | null): boolean {
  return tienePermiso(usuario, 'pos', 'anular');
}

/**
 * Verifica si un usuario puede cerrar caja
 */
export function puedeCerrarCaja(usuario: UsuarioConPermisos | null): boolean {
  return tienePermiso(usuario, 'pos', 'cerrar_caja');
}

/**
 * Verifica si un usuario puede ver reportes completos
 */
export function puedeVerReportes(usuario: UsuarioConPermisos | null): boolean {
  return tienePermiso(usuario, 'reportes', 'ver_todos');
}

/**
 * Verifica si un usuario puede editar configuración
 */
export function puedeEditarConfiguracion(usuario: UsuarioConPermisos | null): boolean {
  return tienePermiso(usuario, 'configuracion', 'editar');
}

// ================================================
// Funciones de redirección por rol
// ================================================

/**
 * Obtiene la ruta por defecto según el rol del usuario
 */
export function getRutaPorDefecto(rol: Rol): string {
  switch (rol) {
    case 'admin':
      return '/admin';
    case 'cajero':
      return '/pos';
    case 'barbero':
      return '/barbero-panel';
    default:
      return '/';
  }
}

/**
 * Verifica si un usuario puede acceder a una ruta específica
 */
export function puedeAccederRuta(
  usuario: UsuarioConPermisos | null,
  ruta: string
): boolean {
  if (!usuario || !usuario.activo) return false;

  // Rutas públicas
  if (ruta === '/' || ruta.startsWith('/reservar') || ruta.startsWith('/consultar')) {
    return true;
  }

  // Admin puede acceder a todo
  if (usuario.rol === 'admin') return true;

  // Rutas específicas por rol
  if (ruta.startsWith('/admin')) {
    return puedeAccederAdmin(usuario);
  }

  if (ruta.startsWith('/pos')) {
    return puedeAccederPOS(usuario);
  }

  if (ruta.startsWith('/barbero-panel')) {
    return usuario.rol === 'barbero';
  }

  return false;
}

// ================================================
// Utilidades de UI
// ================================================

/**
 * Obtiene el color del badge según el rol
 */
export function getColorRol(rol: Rol): string {
  switch (rol) {
    case 'admin':
      return 'bg-red-100 text-red-800';
    case 'cajero':
      return 'bg-blue-100 text-blue-800';
    case 'barbero':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Obtiene el icono según el rol
 */
export function getIconoRol(rol: Rol): string {
  switch (rol) {
    case 'admin':
      return '👑';
    case 'cajero':
      return '💰';
    case 'barbero':
      return '✂️';
    default:
      return '👤';
  }
}
