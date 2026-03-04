import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ConfigContextType {
    moneda: string;
    loading: boolean;
}

const ConfigContext = createContext<ConfigContextType>({
    moneda: 'CLP',
    loading: true
});

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [moneda, setMoneda] = useState('CLP');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data, error } = await supabase
                    .from('sitio_configuracion')
                    .select('valor')
                    .eq('clave', 'sitio_moneda')
                    .single() as any;

                if (data && data.valor) {
                    setMoneda(data.valor);
                }
            } catch (err) {
                console.error('Error fetching global config:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    return (
        <ConfigContext.Provider value={{ moneda, loading }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => useContext(ConfigContext);

export const useFormatCurrency = () => {
    const { moneda } = useConfig();

    return (amount: number | null | undefined): string => {
        if (amount === null || amount === undefined) return '';

        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: moneda || 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };
};
