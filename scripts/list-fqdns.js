const path = require('path');
const fs = require('fs');

const envFiles = ['.env.local', '.env'];
envFiles.forEach(file => {
    const envPath = path.join(__dirname, '..', file);
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
    }
});

const API_KEY = process.env.COOLIFY_API_KEY;
const BASE_URL = process.env.COOLIFY_URL;

async function listAllFQDNs() {
    if (!API_KEY || !BASE_URL) return;

    try {
        const projectsRes = await fetch(`${BASE_URL}/api/v1/projects`, {
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
        });
        const projects = await projectsRes.json();

        for (const project of projects) {
            console.log(`\n📂 Proyecto: ${project.name}`);
            const projectDetailRes = await fetch(`${BASE_URL}/api/v1/projects/${project.uuid}`, {
                headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
            });
            const projectDetail = await projectDetailRes.json();

            for (const env of projectDetail.environments || []) {
                const resourcesRes = await fetch(`${BASE_URL}/api/v1/projects/${project.uuid}/${env.name}/resources`, {
                    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
                });
                const resources = await resourcesRes.json();

                const allResources = [
                    ...(resources.applications || []),
                    ...(resources.services || []),
                    ...(resources.standalone_postgresqls || []),
                    ...(resources.standalone_redis || [])
                ];

                allResources.forEach(res => {
                    if (res.fqdn) console.log(`   🚀 ${res.name}: ${res.fqdn}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

listAllFQDNs();
