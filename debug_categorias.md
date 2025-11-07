# Debug del problema de filtros

## Problema detectado:

1. **BARBA**: "Barba" (singular) en BD vs "Barbas" (plural) en filtro
2. **TRATAMIENTOS**: "Tratamientos" aparece en ambos pero NO FILTRA

## Hipótesis:

Para Tratamientos, aunque se vea igual visualmente, puede haber:
- Espacios extra: "Tratamientos " vs "Tratamientos"
- Diferentes mayúsculas: "Tratamientos" vs "tratamientos"
- Caracteres especiales invisibles

## Necesitamos hacer:

1. Script SQL para ver EXACTAMENTE qué está guardado:
```sql
SELECT 
  nombre, 
  categoria,
  LENGTH(categoria) as longitud,
  categoria = 'tratamientos' as match_minusculas,
  LOWER(categoria) as categoria_lower
FROM servicios 
ORDER BY categoria;
```

Esto mostrará:
- Nombre del servicio
- Categoría exacta
- Longitud (detecta espacios extra)
- Si hace match exacto con 'tratamientos'
- Versión en minúsculas
