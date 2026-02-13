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
        
        # -> Open the production site https://chamosbarber.com in a new tab so the login and booking flow can be executed against production.
        await page.goto("https://chamosbarber.com", wait_until="commit", timeout=10000)
        
        # -> Navigate to the booking page by clicking the 'Reservar' link in the navigation.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/nav/div/div[1]/a[4]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Select the 'Arreglo de Barba' service tile to choose a service, then reveal the booking widget navigation (Siguiente) so the flow can continue.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/main/section[2]/div/div/div[2]/div[2]/div[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'Siguiente' button to proceed from service selection to the barber selection step (move from Paso 1 de 5 to Paso 2).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/main/section[2]/div/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Select a barber (ADONIS) on Paso 2, then click 'Siguiente' to proceed to the date/time selection step.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[2]/div[2]/div[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[3]/button[1]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Select a service tile (Corte Clásico) on Paso 1 and click 'Siguiente' to proceed to Paso 2 (barber selection).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[2]/div[3]/div[3]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Proceed to Paso 3 (date/time selection) by clicking the 'Siguiente' button.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Input a valid date into the date picker to load available time slots (use date within 2026-02-12 to 2026-03-14). Then proceed to choose a time slot once available.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[2]/div[2]/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('2026-02-15')
        
        # -> Enter an alternative date (weekday) into the date input to load available time slots (use 2026-02-16), then check for available time slots.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div/main/section[2]/div/div/div[2]/div[2]/div[1]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('2026-02-16')
        
        # -> Select an available time slot for 2026-02-16 (choose 11:00) so the booking can be progressed to the confirmation step.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/main/section[2]/div/div/div[2]/div[2]/div[2]/div/div[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'Siguiente' button to proceed from Paso 3 (date/time) to Paso 4 (customer details / confirmation) so the booking can be confirmed.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Fill customer details (name, WhatsApp phone, email) in Paso 4 and click 'Siguiente' to proceed to the confirmation step (Paso 5).
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[2]/div[2]/div[1]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Test User')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[2]/div[2]/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('983588553')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[2]/div[2]/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('test@example.com')
        
        # -> Click the 'Siguiente' button (Paso 4 -> Paso 5) to proceed to the confirmation step so the booking can be submitted and then confirm the appointment.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/main/section[2]/div/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'Confirmar Reserva' button to submit the booking, then inspect the resulting confirmation page/message and look for evidence that a WhatsApp notification was sent or any confirmation message shown to the user.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/div[3]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Open the 'Consultar Cita' page to find the newly created appointment or any confirmation details (booking record, booking ID, contact method) and look for evidence that a WhatsApp notification was sent.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div/nav/div/div[1]/a[5]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Enter the phone number used for the booking into the 'Consultar Cita' form and click 'Buscar mis Citas' to retrieve the appointment record and verify reservation details (service, barber, date/time) and any WhatsApp or notification indicators.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('983588553')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=html/body/div[1]/main/section[2]/div/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        try:
            await expect(frame.locator('text=Cita confirmada').first).to_be_visible(timeout=3000)
        except AssertionError:
            raise AssertionError("Test case failed: The test tried to book an appointment (service, barber, date/time) and expected to see a confirmation message 'Cita confirmada' and evidence of a WhatsApp notification, but the confirmation text did not appear — the booking or notification likely failed.")
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    