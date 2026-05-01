import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useTenant } from './TenantContext';

interface ConfigContextType {
    moneda: string;
    loading: boolean;
}

const ConfigContext = createContext<ConfigContextType>({
    moneda: 'CLP',
    loading: true
});

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { tenant, loading } = useTenant();
    const moneda = tenant?.moneda || 'CLP';

    return (
        <ConfigContext.Provider value={{ moneda, loading }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => useContext(ConfigContext);

export const useFormatCurrency = () => {
    const { moneda } = useConfig();

    const formatter = useMemo(
        () => new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: moneda || 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }),
        [moneda]
    );

    return useCallback(
        (amount: number | null | undefined): string => {
            if (amount == null) return '';
            return formatter.format(amount);
        },
        [formatter]
    );
};
