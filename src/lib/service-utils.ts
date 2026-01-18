export function getServiceImage(category?: string, name?: string) {
    const cat = category?.toLowerCase() || ''
    const nom = name?.toLowerCase() || ''

    if (cat.includes('corte') || nom.includes('corte')) return '/images/servicios/corte_cabello_premium_1768743529185.png'
    if (cat.includes('barba') || nom.includes('barba')) return '/images/servicios/cuidado_barba_premium_1768743545741.png'
    if (cat.includes('facial') || cat.includes('tratamiento') || nom.includes('facial')) return '/images/servicios/tratamiento_facial_barberia_1768743560774.png'
    if (cat.includes('combo') || cat.includes('premium') || nom.includes('premium')) return '/images/servicios/combo_premium_chamos_1768743575347.png'

    // Fallback a corte si no se identifica
    return '/images/servicios/corte_cabello_premium_1768743529185.png'
}
