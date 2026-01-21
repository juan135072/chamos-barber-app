import React, { useState, useEffect } from 'react'
import { COUNTRIES, normalizePhone, formatPhoneInput, getPhonePlaceholder, type CountryCode } from '../../lib/phone-utils'

interface PhoneInputProps {
    value: string
    onChange: (normalizedValue: string) => void
    label?: string
    required?: boolean
    className?: string
}

export default function PhoneInput({
    value,
    onChange,
    label,
    required = false,
    className = ''
}: PhoneInputProps) {
    // Intentar parsear el valor inicial para extraer el país
    const initialCountry = COUNTRIES.find(c => value.startsWith(c.code)) || COUNTRIES[0]
    const initialNumber = value.startsWith(initialCountry.code)
        ? value.slice(initialCountry.code.length)
        : value.replace(/\D/g, '')

    const [selectedCountry, setSelectedCountry] = useState(initialCountry)
    const [number, setNumber] = useState(initialNumber)

    useEffect(() => {
        // Actualizar el valor normalizado cuando cambia el país o el número
        const normalized = normalizePhone(number, selectedCountry.code)
        onChange(normalized)
    }, [selectedCountry, number])

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Solo permitir números
        const val = e.target.value.replace(/\D/g, '')
        const formatted = formatPhoneInput(val, selectedCountry.code)
        setNumber(formatted)
    }

    return (
        <div className={`phone-input-container ${className}`}>
            {label && <label className="form-label">{label}</label>}

            <div className="phone-input-wrapper">
                <select
                    className="country-select"
                    value={selectedCountry.code}
                    onChange={(e) => {
                        const country = COUNTRIES.find(c => c.code === e.target.value)
                        if (country) setSelectedCountry(country)
                    }}
                >
                    {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                        </option>
                    ))}
                </select>

                <input
                    type="tel"
                    className="number-input"
                    value={number}
                    onChange={handleNumberChange}
                    placeholder={selectedCountry.pattern}
                    required={required}
                    maxLength={selectedCountry.length}
                />
            </div>

            <style jsx>{`
        .phone-input-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
        }
        
        .phone-input-wrapper {
          display: flex;
          gap: 0;
          border: 2px solid var(--border-color, rgba(255,255,255,0.1));
          border-radius: var(--border-radius, 8px);
          overflow: hidden;
          background: var(--bg-secondary, #1a1a1a);
          transition: border-color 0.3s ease;
        }
        
        .phone-input-wrapper:focus-within {
          border-color: var(--accent-color, #D4AF37);
        }
        
        .country-select {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          border-right: 1px solid var(--border-color, rgba(255,255,255,0.1));
          color: white;
          padding: 0 0.75rem;
          font-family: inherit;
          cursor: pointer;
          font-size: 0.95rem;
          outline: none;
          min-width: 90px;
        }
        
        .country-select option {
          background: #1a1a1a;
          color: white;
        }
        
        .number-input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          padding: 0.75rem 1rem;
          font-family: 'monospace';
          font-size: 1.1rem;
          letter-spacing: 0.05em;
          outline: none;
        }
        
        .number-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
          font-family: 'Inter', sans-serif;
          letter-spacing: normal;
        }

        @media (max-width: 480px) {
          .country-select {
            min-width: 80px;
            padding: 0 0.5rem;
            font-size: 0.85rem;
          }
          .number-input {
            padding: 0.75rem 0.5rem;
            font-size: 1rem;
          }
        }
      `}</style>
        </div>
    )
}
