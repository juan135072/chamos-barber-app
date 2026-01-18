const API_KEY = '1|mc6SvuaBjPgOICmXbLC10PTk6eYvrOtrqzyj5UkFb9ee8f0a';
const BASE_URL = 'https://coolify.chamosbarber.com/api/v1';

async function discover() {
    const serverUuid = 'mkgcsskcs0o4wsckk0ko4o8k';
    const endpoints = [
        '/destinations',
        '/destinations/docker',
        `/servers/${serverUuid}/destinations`,
        `/servers/${serverUuid}/standalone-dockers`,
        `/servers/${serverUuid}/resources`,
        '/networks'
    ];

    for (const ep of endpoints) {
        try {
            const res = await fetch(`${BASE_URL}${ep}`, {
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
            });
            console.log(`Endpoint: ${ep} -> Status: ${res.status}`);
            if (res.ok) {
                const data = await res.json();
                console.log(`Data for ${ep}:`, JSON.stringify(data, null, 2));
            }
        } catch (e) {
            console.log(`Error on ${ep}: ${e.message}`);
        }
    }
}

discover();
