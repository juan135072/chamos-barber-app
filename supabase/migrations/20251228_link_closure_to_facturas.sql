-- Migration: Link facturas with cierres_caja
-- Date: 2025-12-28

-- Add column to link facturas to a specific closure
ALTER TABLE public.facturas 
ADD COLUMN IF NOT EXISTS cierre_caja_id UUID REFERENCES public.cierres_caja(id) ON DELETE SET NULL;

-- Index for faster filtering of "open" (unclosed) facturas
CREATE INDEX IF NOT EXISTS idx_facturas_cierre_caja_id ON public.facturas(cierre_caja_id);

-- Update RLS for facturas to ensure consistency (usually already handled by general policies)
-- But let's ensure admins can update the cierre_caja_id
CREATE POLICY "Admins can link facturas to closures" 
ON public.facturas FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE email = auth.jwt()->>'email' 
        AND (rol = 'admin' OR rol = 'cajero')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE email = auth.jwt()->>'email' 
        AND (rol = 'admin' OR rol = 'cajero')
    )
);

-- Note: Existing facturas will have NULL cierre_caja_id, 
-- which correctly identifies them as "not yet closed" in the old system logic.
