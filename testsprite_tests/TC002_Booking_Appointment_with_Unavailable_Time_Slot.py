import asyncio
from playwright import async_api

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)

        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass

        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3000
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # -> Open the booking page by clicking the 'Reservar Cita' link.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/main/section[1]/div[3]/div/a[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the booking page by clicking the 'Reservar Cita' link (use interactive element index 134).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[1]/div[3]/div/a[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Select a valid service (Arreglo de Barba) by clicking its service card/image.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/main/section[2]/div/div/div[2]/div[2]/div[1]/div[2]/img').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'Siguiente' button to proceed to the barber selection step (open barber list). Then select a barber.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/main/section[2]/div/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Select a barber by clicking the barber card (index 1099 for ADONIS RINCON), then click the 'Siguiente' button (index 739) to proceed to the time slot selection step.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[2]/div[2]/div[1]/img').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[3]/button[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'Siguiente' button to advance from Paso 1 to the barber selection step so a barber can be chosen (index 750).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Select barber 'ADONIS RINCON' by clicking its card (index 1340), then click 'Siguiente' (index 750) to proceed to time-slot selection.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[2]/div[2]/div[1]/img').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Set the date in the date input to a target date (attempt 2026-02-12) and click 'Siguiente' to proceed to the time-slot selection so unavailable/fully-booked slots can be inspected.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[2]/div[2]/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('2026-02-12')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[3]/button[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'Siguiente' button (index 750) to advance to Paso 3 (fecha) so a date can be (re)selected and time slots inspected for unavailable/fully-booked status.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        # -> Assertions: Verify unavailable time slot error is shown and no appointment was created
        err = frame.locator("text=No hay horarios disponibles para todos los servicios seleccionados")
        await err.wait_for(state="visible", timeout=5000)
        assert await err.is_visible(), "Expected error: 'No hay horarios disponibles para todos los servicios seleccionados' to be visible."
        
        # Optional additional message check (e.g. total time does not fit)
        total_time_msg = frame.locator("text=El tiempo total requerido")
        if await total_time_msg.count() > 0:
            assert await total_time_msg.is_visible(), "Expected the 'El tiempo total requerido' message to be visible when the slot is unavailable."
        
        # Ensure no booking confirmation/success messages are present (appointment was not created)
        possible_confirm_texts = ["Reserva confirmada", "Cita reservada", "Confirmación", "Reserva"]
        found_confirm = False
        for txt in possible_confirm_texts:
            if await frame.locator(f"text={txt}").count() > 0:
                found_confirm = True
                break
        assert not found_confirm, "Found a booking confirmation message despite the selected time slot being unavailable."
        
        # Ensure we remain on the booking step (should still show step indicator for Paso 3)
        step_indicator = frame.locator("text=/Paso\s*3/")
        assert await step_indicator.count() > 0, "Expected to remain on booking step (Paso 3) after attempting to book an unavailable slot."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    