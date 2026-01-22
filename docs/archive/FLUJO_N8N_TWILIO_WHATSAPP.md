# 📱 FLUJO: N8N + TWILIO WHATSAPP
## Sistema de Notificaciones para Chamos Barber

**Fecha:** 2025-11-06  
**Estado:** Documentado (NO implementado)  
**Propósito:** Notificar a barberos cuando reciben nueva reserva

---

## 🎯 OBJETIVO

Enviar WhatsApp automático al barbero cuando un cliente crea una reserva, y que el barbero pueda aprobar/rechazar respondiendo al mensaje.

---

## 📊 FLUJO VISUAL SIMPLE

```
┌─────────────────────┐
│  Cliente Web        │
│  Crea Reserva       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  crear-cita.ts      │
│  Guarda en Supabase │
│  Llama N8N webhook  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  N8N (Coolify)      │
│  Workflow:          │
│  1. Recibe datos    │
│  2. Busca barbero   │
│  3. Busca servicio  │
│  4. Formatea msg    │
│  5. Envía Twilio    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Twilio API         │
│  (WhatsApp oficial) │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  WhatsApp Barbero   │
│  📱 Nueva reserva   │
│  [APROBAR/RECHAZAR] │
└─────────────────────┘
```

---

## 🔧 COMPONENTES NECESARIOS

### **1. N8N (Ya tienes ✅)**
- Self-hosted en Coolify
- Crea workflows visuales
- Conecta Supabase + Twilio

### **2. Twilio WhatsApp API**
- Servicio oficial de WhatsApp
- No requiere instalación
- Pay-per-message
- URL: https://www.twilio.com

### **3. Supabase (Ya tienes ✅)**
- Agregar campo: `barberos.telefono_whatsapp`
- Tabla opcional: `whatsapp_logs`

---

## 💰 COSTOS

```
N8N: $0 (self-hosted)
Twilio: $0.005 USD por mensaje

Ejemplo 2,000 reservas/mes:
- Notificación barbero: $10 USD
- Confirmación cliente: $10 USD
TOTAL: $20 USD/mes
```

---

## 📝 WORKFLOW N8N (5 NODOS)

```
[1] Webhook
     ↓
[2] Supabase: Get Barbero
     ↓
[3] Supabase: Get Servicio
     ↓
[4] Code: Formatear Mensaje
     ↓
[5] Twilio: Enviar WhatsApp
```

### **Mensaje que recibe el barbero:**

```
🔔 Nueva Reserva - Chamos Barber

Hola Carlos! 👋

Tienes una nueva reserva:

👤 Cliente: Juan Pérez
📱 Teléfono: +56912345678
✂️ Servicio: Corte Clásico
📅 Fecha: Lunes, 10 de noviembre de 2025
⏰ Hora: 14:00
💰 Valor: $10,000 CLP

¿Confirmas esta reserva?

Responde:
1️⃣ APROBAR
2️⃣ RECHAZAR
```

---

## 🔑 DATOS NECESARIOS PARA IMPLEMENTAR

### **Credenciales Twilio:**
```
Account SID: ACxxxxxxxxxx (obtener de Twilio)
Auth Token: xxxxxxxxxx (obtener de Twilio)
WhatsApp Number: whatsapp:+14155238886 (Twilio lo da)
```

### **Base de Datos:**
```sql
-- Agregar a tabla barberos:
ALTER TABLE barberos ADD COLUMN telefono_whatsapp VARCHAR(20);

-- Ejemplo:
UPDATE barberos 
SET telefono_whatsapp = '+56912345678' 
WHERE email = 'carlos@chamosbarber.com';
```

### **Webhook N8N:**
```
URL: https://n8n.tu-dominio.com/webhook/chamos-nueva-cita
Method: POST
Body: {
  cita_id, barbero_id, servicio_id,
  cliente_nombre, cliente_telefono,
  fecha, hora
}
```

---

## ✅ VENTAJAS DE ESTA SOLUCIÓN

- ✅ WhatsApp OFICIAL (sin riesgo de ban)
- ✅ N8N visual (fácil de mantener)
- ✅ Escalable (miles de mensajes)
- ✅ Pay-as-you-go (solo pagas lo que usas)
- ✅ Profesional y confiable

---

## ⚠️ IMPORTANTE

**NO usar Evolution API ni Baileys:**
- Alto riesgo de ban de WhatsApp
- Violan términos de servicio
- No recomendado para uso profesional

**Twilio es la solución oficial y segura.**

---

## 📚 RECURSOS

- Twilio: https://www.twilio.com/whatsapp
- N8N Docs: https://docs.n8n.io
- Documentación completa: Ver HISTORIAL_PROBLEMAS_RESUELTOS.md

---

## 🎯 CUANDO IMPLEMENTAR

1. Crear cuenta Twilio (15 min)
2. Crear workflow en N8N (30 min)
3. Modificar crear-cita.ts (15 min)
4. Actualizar Supabase (10 min)
5. Probar (10 min)

**Total: 1.5 horas**

---

**Estado:** Guardado para implementación futura  
**No se implementó nada en la app actual**

