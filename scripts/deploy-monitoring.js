const API_KEY = '3|Z9ONGBVmDXYwlI21qUcIAm5DftlphM1WCc3Vi8Nu58bbc2fc';
const BASE_URL = 'https://coolify.chamosbarber.com/api/v1';

async function deploy() {
    const payload = {
        project_uuid: 'wks0c0sskgk4s8848kkcwckk',
        environment_uuid: 'ns0ccgcc4s048wk48s0go0k8',
        server_uuid: 'mkgcsskcs0o4wsckk0ko4o8k',
        destination_uuid: 'lw0o88sc84cgckw0w04kksw',
        type: 'uptime-kuma',
        name: 'monitoring-kuma',
        description: 'Server Monitoring and Alerting',
        instant_deploy: true
    };

    try {
        console.log('Deploying Uptime Kuma...');
        const res = await fetch(`${BASE_URL}/services`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (res.ok) {
            console.log('SUCCESS: Uptime Kuma deployment initiated.');
        } else {
            // Si falla con 'uptime-kuma', intentar con 'uptimekuma'
            console.log('Retrying with type: uptimekuma...');
            payload.type = 'uptimekuma';
            const retryRes = await fetch(`${BASE_URL}/services`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const retryData = await retryRes.json();
            console.log('Retry Status:', retryRes.status);
            console.log('Retry Response:', JSON.stringify(retryData, null, 2));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

deploy();
