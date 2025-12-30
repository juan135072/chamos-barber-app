// ================================================
// Hook de React para manejo de permisos
// ================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { 
  supabase,
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

export function usePermissions() {
  const [usuario, setUsuario] = useState<UsuarioConPermisos | null>(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    cargarUsuario();
  }, []);

  const cargarUsuario = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUsuario(null);
        setCargando(false);
        return;
      }

      // Obtener datos del usuario con permisos
      const { data, error } = await supabase
        .from('usuarios_con_permisos')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error cargando permisos:', error);
        setUsuario(null);
      } else {
        setUsuario(data);
      }
    } catch (error) {
      console.error('Error en cargarUsuario:', error);
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

