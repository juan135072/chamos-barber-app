import { useState } from 'react'

interface OpenRegisterModalProps {
    onOpen: (monto: number) => Promise<void>
    usuario: any
}

export default function OpenRegisterModal({ onOpen, usuario }: OpenRegisterModalProps) {
    const [monto, setMonto] = useState('0')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const montoNum = parseFloat(monto)
        if (isNaN(montoNum) || montoNum < 0) {
            alert('Por favor ingresa un monto válido')
            return
        }

        try {
            setLoading(true)
            await onOpen(montoNum)
        } catch (error) {
            alert('Error al abrir la caja')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-amber-500/30 bg-[#1a1a1a]">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/40">
                        <i className="fas fa-cash-register text-4xl text-amber-500"></i>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Apertura de Caja</h2>
                    <p className="text-gray-400 mb-8">
                        Hola <span className="text-amber-500 font-semibold">{usuario?.nombre}</span>, para comenzar a vender debes ingresar el fondo inicial de caja.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-amber-500/50">
                                <span className="text-xl font-bold">$</span>
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                className="block w-full pl-10 pr-4 py-4 bg-black/50 border border-amber-500/30 rounded-xl text-2xl font-bold text-center text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all placeholder:text-gray-700"
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold text-lg rounded-xl shadow-lg shadow-amber-500/20 transform active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                                <i className="fas fa-unlock"></i>
                            )}
                            ABRIR CAJA DEL SISTEMA
                        </button>
                    </form>

                    <p className="mt-8 text-xs text-gray-500 flex items-center justify-center gap-2">
                        <i className="fas fa-info-circle"></i>
                        Recuerda que esto no abre el cajón físico automáticamente.
                    </p>
                </div>
            </div>
        </div>
    )
}
