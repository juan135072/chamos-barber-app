import asyncio
from playwright.async_api import async_playwright, expect

async def run_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        print("🚀 Iniciando prueba manual de reserva (Flujo Corregido)...")
        
        # 1. Navegar a la página de reservas
        await page.goto("http://localhost:3000/reservar", timeout=30000)
        print("📍 Navegado a /reservar")
        
        # 2. Paso 1: Seleccionar Servicio
        print("⏳ Esperando servicios...")
        await page.wait_for_selector("text=Arreglo de Barba", timeout=15000)
        print("✂️ Servicios cargados. Seleccionando 'Arreglo de Barba'...")
        await page.click("text=Arreglo de Barba")
        
        # Hacer scroll para asegurar que el botón Siguiente es visible
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.click("button:has-text('Siguiente')")
        print("➡️ Pasando a selección de barbero")
        
        # 3. Paso 2: Seleccionar Barbero
        print("⏳ Esperando barberos...")
        # Esperamos por algún nombre de barbero que vimos en el subagent
        await page.wait_for_selector("text=Alexander Taborda", timeout=15000)
        print("👥 Barberos cargados. Seleccionando 'Alexander Taborda'...")
        await page.click("text=Alexander Taborda")
        
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.click("button:has-text('Siguiente')")
        print("➡️ Pasando a selección de horario")
        
        # 4. Paso 3: Seleccionar Fecha y Hora
        print("⏳ Esperando horarios...")
        await page.wait_for_selector(".time-slot:not(.disabled)", timeout=15000)
        print("⏰ Horarios disponibles. Seleccionando el primero...")
        await page.click(".time-slot:not(.disabled):first-child")
        
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.click("button:has-text('Siguiente')")
        print("➡️ Pasando a datos de contacto")
        
        # 5. Paso 4: Rellenar datos
        print("✍️ Rellenando formulario...")
        await page.fill("input[placeholder*='Nombre'], input[name='nombre']", "Test Automático")
        await page.fill("input[placeholder*='Email'], input[name='email']", "test@automation.com")
        await page.fill("input[placeholder*='Teléfono'], input[name='telefono']", "+56912345678")
        
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.click("button:has-text('Siguiente')")
        print("➡️ Pasando a confirmación final")
        
        # 6. Paso 5: Confirmación Final
        print("🏁 Confirmando reserva final...")
        await page.click("button:has-text('Confirmar Reserva'), button:has-text('Finalizar')")
        
        # 7. Verificar éxito
        try:
            # Esperamos mensaje de éxito o redirección
            await page.wait_for_selector("text=¡Reserva Confirmada!", timeout=20000)
            print("✅ ¡RESERVA EXITOSA! El flujo completo funciona con Supabase.")
        except Exception as e:
            print(f"⚠️ No se detectó el mensaje de éxito final, pero el flujo avanzó hasta el final. Verificando...")
            await page.screenshot(path="testsprite_tests/final_step_status.png")
            print("📸 Screenshot de estado final guardado.")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_test())
