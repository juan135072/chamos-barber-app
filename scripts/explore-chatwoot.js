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

async function exploreChatwoot() {
    if (!API_KEY || !BASE_URL) return;

    try {
        const projectsRes = await fetch(`${BASE_URL}/api/v1/projects`, {
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
        });
        const projects = await projectsRes.json();
        const chatwootProject = projects.find(p => p.name.toLowerCase().includes('chatwoot'));

        if (!chatwootProject) {
            console.log('No chatwoot project');
            return;
        }

        const projectDetailRes = await fetch(`${BASE_URL}/api/v1/projects/${chatwootProject.uuid}`, {
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Accept': 'application/json' }
        });
        const projectDetail = await projectDetailRes.json();

        for (const env of projectDetail.environments || []) {
            const resourcesRes = await fetch(`${BASE_URL}/api/v1/projects/${chatwootProject.uuid}/${env.name}/resources`, {
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
                if (res.fqdn) console.log(`🚀 Encontrado FQDN: ${res.fqdn}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

exploreChatwoot();
