/**
 * =====================================================
 * 🚶 PANEL - WALK-IN CLIENTS
 * =====================================================
 * Panel para gestionar clientes que llegan sin reserva
 */

'use client'

import { useState, useEffect } from 'react'
import {
  UserPlus,
  Users,
  Calendar,
  TrendingUp,
  Search,
  Phone,
  Mail,
  Trash2,
  RefreshCw
} from 'lucide-react'
import {
  getAllWalkInClients,
  getWalkInStats,
  deleteWalkInClient,
  formatFecha,
  type WalkInClient
} from '@/lib/supabase-walkin'
import RegistrarWalkInModal from './RegistrarWalkInModal'

export default function WalkInClientsPanel() {
  const [clientes, setClientes] = useState<WalkInClient[]>([])
  const [stats, setStats] = useState({
    total: 0,
    hoy: 0,
    semana: 0,
    mes: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [clientesData, statsData] = await Promise.all([
        getAllWalkInClients(),
        getWalkInStats()
      ])

      setClientes(clientesData)
      setStats(statsData)
    } catch (err) {
      console.error('Error loading walk-in clients:', err)
      setError('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre}?`)) {
      return
    }

    try {
      await deleteWalkInClient(id)
      await loadData()
    } catch (err) {
      console.error('Error deleting walk-in client:', err)
      alert('Error al eliminar cliente')
    }
  }

  // Filtrar clientes por búsqueda
  const clientesFiltrados = clientes.filter((cliente) => {
    if (!searchTerm) return true

    const search = searchTerm.toLowerCase()
    return (
      cliente.nombre.toLowerCase().includes(search) ||
      cliente.telefono.includes(search) ||
      (cliente.email?.toLowerCase() || '').includes(search)
    )
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--accent-color)' }}
        ></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: 'var(--accent-color)' }}
          >
            Clientes Walk-In
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--text-primary)', opacity: 0.7 }}
          >
            Clientes que llegaron sin reserva
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--accent-color)',
            color: 'var(--bg-primary)'
          }}
        >
          <UserPlus className="w-5 h-5" />
          Registrar Cliente
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm"
                style={{ color: 'var(--text-primary)', opacity: 0.7 }}
              >
                Total Registrados
              </p>
              <p
                className="text-2xl font-bold mt-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {stats.total}
              </p>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--accent-color)' + '20' }}
            >
              <Users
                className="w-6 h-6"
                style={{ color: 'var(--accent-color)' }}
              />
            </div>
          </div>
        </div>

        {/* Hoy */}
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm"
                style={{ color: 'var(--text-primary)', opacity: 0.7 }}
              >
                Hoy
              </p>
              <p
                className="text-2xl font-bold mt-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {stats.hoy}
              </p>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#22c55e20' }}
            >
              <Calendar className="w-6 h-6" style={{ color: '#22c55e' }} />
            </div>
          </div>
        </div>

        {/* Esta Semana */}
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm"
                style={{ color: 'var(--text-primary)', opacity: 0.7 }}
              >
                Esta Semana
              </p>
              <p
                className="text-2xl font-bold mt-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {stats.semana}
              </p>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#3b82f620' }}
            >
              <TrendingUp className="w-6 h-6" style={{ color: '#3b82f6' }} />
            </div>
          </div>
        </div>

        {/* Este Mes */}
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-sm"
                style={{ color: 'var(--text-primary)', opacity: 0.7 }}
              >
                Este Mes
              </p>
              <p
                className="text-2xl font-bold mt-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {stats.mes}
              </p>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#f59e0b20' }}
            >
              <Calendar className="w-6 h-6" style={{ color: '#f59e0b' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Refresh */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
            style={{ color: 'var(--text-primary)', opacity: 0.5 }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
            style={{
              paddingLeft: '2.75rem',
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-lg border transition-opacity hover:opacity-70 flex items-center gap-2"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: '#ef444420',
            borderColor: '#ef4444',
            color: '#ef4444'
          }}
        >
          {error}
        </div>
      )}

      {/* Clientes List */}
      {clientesFiltrados.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
            opacity: 0.7
          }}
        >
          <Users className="w-12 h-12 mx-auto mb-4" style={{ opacity: 0.5 }} />
          <p>
            {searchTerm
              ? 'No se encontraron clientes con ese criterio'
              : 'No hay clientes walk-in registrados'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-lg font-medium"
              style={{
                backgroundColor: 'var(--accent-color)',
                color: 'var(--bg-primary)'
              }}
            >
              Registrar Primer Cliente
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div
            className="hidden md:block overflow-x-auto rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)'
            }}
          >
            <table className="min-w-full">
              <thead style={{ backgroundColor: 'var(--bg-primary)' }}>
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase"
                    style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                  >
                    Cliente
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase"
                    style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                  >
                    Contacto
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase"
                    style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                  >
                    Notas
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium uppercase"
                    style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                  >
                    Registrado
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium uppercase"
                    style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente, index) => (
                  <tr
                    key={cliente.id}
                    style={{
                      borderTop:
                        index > 0 ? '1px solid var(--border-color)' : 'none'
                    }}
                  >
                    <td className="px-6 py-4">
                      <div
                        className="text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {cliente.nombre}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4" style={{ opacity: 0.5 }} />
                        <span style={{ color: 'var(--text-primary)' }}>
                          {cliente.telefono}
                        </span>
                      </div>
                      {cliente.email && (
                        <div className="flex items-center gap-2 text-xs mt-1">
                          <Mail className="w-3 h-3" style={{ opacity: 0.5 }} />
                          <span
                            style={{
                              color: 'var(--text-primary)',
                              opacity: 0.7
                            }}
                          >
                            {cliente.email}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="text-sm max-w-xs truncate"
                        style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                      >
                        {cliente.notas || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className="text-sm"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {formatFecha(cliente.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          handleDelete(cliente.id, cliente.nombre)
                        }
                        className="p-2 rounded-lg transition-opacity hover:opacity-70"
                        style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {clientesFiltrados.map((cliente) => (
              <div
                key={cliente.id}
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p
                      className="font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {cliente.nombre}
                    </p>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <Phone className="w-3 h-3" style={{ opacity: 0.5 }} />
                      <span
                        style={{
                          color: 'var(--text-primary)',
                          opacity: 0.7
                        }}
                      >
                        {cliente.telefono}
                      </span>
                    </div>
                    {cliente.email && (
                      <div className="flex items-center gap-2 text-xs mt-1">
                        <Mail className="w-3 h-3" style={{ opacity: 0.5 }} />
                        <span
                          style={{
                            color: 'var(--text-primary)',
                            opacity: 0.7
                          }}
                        >
                          {cliente.email}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(cliente.id, cliente.nombre)}
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {cliente.notas && (
                  <div
                    className="text-sm mb-2 p-2 rounded"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      opacity: 0.8
                    }}
                  >
                    {cliente.notas}
                  </div>
                )}
                <div
                  className="text-xs"
                  style={{ color: 'var(--text-primary)', opacity: 0.6 }}
                >
                  Registrado: {formatFecha(cliente.created_at)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      <RegistrarWalkInModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  )
}
