import React from 'react'
import { usePublicConfig } from '@/hooks/usePublicConfig'
import { generalHours, hoursSentence } from '@/lib/business-hours'

/**
 * The shop's opening hours in one line, as configured in the admin panel.
 * While they are unknown it prints a dash, never "cerrado".
 */
const BusinessHoursText: React.FC = () => {
  const config = usePublicConfig()
  return <>Horario de atención: {hoursSentence(config ? generalHours(config) : null)}</>
}

export default BusinessHoursText
