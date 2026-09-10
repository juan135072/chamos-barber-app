// ================================================
// Hook de React para manejo de permisos
// ================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  UsuarioConPermisos,
  tienePermiso,
  puedeAccederPOS,
  puedeAccederAdmin,
  puedeAnularFacturas,
  puedeCerrarCaja,
  puedeVerReportes,
  puedeEditarConfiguracion,
  puedeAccederRuta,
  getRutaPorDefecto,
  Permiso,
} from '@/lib/supabase';
import { getAppSession } from '@/lib/app-session';
import { getServerAccess } from '@/lib/server-access';

export function usePermissions() {
  const [usuario, setUsuario] = useState<UsuarioConPermisos | null>(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    cargarUsuario();
  }, []);

  const cargarUsuario = async () => {
    try {
      // Restore the Chamos session first. The access token lets our own server
      // validate the caller even if the httpOnly cookie is still being renewed.
      const session = await getAppSession();

      if (!session?.user?.email) {
        setUsuario(null);
        return;
      }

      // Role/access resolution is server-side. The browser no longer queries
      // admin_users or usuarios_con_permisos directly, avoiding legacy RLS
      // rules tied to the old Supabase auth UUID.
      const access = await getServerAccess(session.access_token);
      setUsuario(access.user as UsuarioConPermisos);
    } catch (error: any) {
      console.error('[permissions] Server access check failed:', {
        code: error?.code ?? null,
        status: error?.status ?? null,
        message: error?.message ?? String(error),
      });
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  };

  /**
   * Verifica un permiso específico
   */
  const verificarPermiso = (modulo: keyof Permiso, accion: string): boolean => {
    return tienePermiso(usuario, modulo, accion);
  };

  /**
   * Redirige al usuario a su ruta por defecto
   */
  const redirigirPorRol = () => {
    if (!usuario) {
      router.push('/chamos-acceso');
      return;
    }

    const rutaDefecto = getRutaPorDefecto(usuario.rol);
    router.push(rutaDefecto);
  };

  /**
   * Protege una ruta verificando permisos
   */
  const protegerRuta = (rutaRequerida: string) => {
    if (cargando) return;

    if (!usuario) {
      router.push('/chamos-acceso');
      return;
    }

    if (!puedeAccederRuta(usuario, rutaRequerida)) {
      // Redirigir a la ruta por defecto del usuario
      const rutaDefecto = getRutaPorDefecto(usuario.rol);
      router.push(rutaDefecto);
    }
  };

  return {
    usuario,
    cargando,

    // Funciones de verificación
    verificarPermiso,
    puedeAccederPOS: () => puedeAccederPOS(usuario),
    puedeAccederAdmin: () => puedeAccederAdmin(usuario),
    puedeAnularFacturas: () => puedeAnularFacturas(usuario),
    puedeCerrarCaja: () => puedeCerrarCaja(usuario),
    puedeVerReportes: () => puedeVerReportes(usuario),
    puedeEditarConfiguracion: () => puedeEditarConfiguracion(usuario),
    puedeAccederRuta: (ruta: string) => puedeAccederRuta(usuario, ruta),

    // Funciones de navegación
    redirigirPorRol,
    protegerRuta,

    // Estado
    esAdmin: usuario?.rol === 'admin',
    esCajero: usuario?.rol === 'cajero',
    esBarbero: usuario?.rol === 'barbero',
    estaActivo: usuario?.activo === true,
  };
}

/**
 * Hook para proteger una página completa
 */
export function useProtectedRoute(rutaRequerida: string) {
  const { protegerRuta, cargando } = usePermissions();

  useEffect(() => {
    protegerRuta(rutaRequerida);
  }, [cargando, rutaRequerida]);

  return { cargando };
}
