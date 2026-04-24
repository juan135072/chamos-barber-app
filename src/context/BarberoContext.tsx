import React, { createContext, useContext } from 'react'

export interface BarberoProfile {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string
  instagram: string
  descripcion: string
  especialidades: string[] | null
  imagen_url: string
}

interface BarberoContextType {
  profile: BarberoProfile | null
  barberoId: string
  refetchProfile: () => void
  handleLogout: () => void
}

const BarberoContext = createContext<BarberoContextType>({
  profile: null,
  barberoId: '',
  refetchProfile: () => {},
  handleLogout: () => {},
})

export const BarberoProvider: React.FC<{
  value: BarberoContextType
  children: React.ReactNode
}> = ({ value, children }) => (
  <BarberoContext.Provider value={value}>
    {children}
  </BarberoContext.Provider>
)

export const useBarberoContext = () => useContext(BarberoContext)
