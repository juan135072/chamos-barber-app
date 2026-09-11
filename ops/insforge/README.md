# InsForge repair, 2026-09-11

The running InsForge 2.1.5 backend contained an earlier local modification that
commented out conversion of verified project API keys into PostgREST admin JWTs.
Valid server requests consequently returned `PGRST301` (HTTP 401).

The repair restores only this assignment, inside the successful `verifyApiKey`
branch of `backend/src/services/database/postgrest-proxy.service.ts` and the
compiled `/app/dist/server.js`:

```ts
axiosConfig.headers.authorization = `Bearer ${this.adminToken}`;
```

The patched build is saved on the authorized server as
`chamos-insforge:20260911`. Its Dockerfile and patched files live in
`/data/coolify/patches/insforge-20260911/`. The image retains the deployed InsForge
version; it does not silently upgrade the database platform. Apply app migrations
before allowing the repaired admin API key to serve the updated application.

Original database dumps, configuration and source backups are stored under
`/root/chamos-audit-20260911/`, accessible only to root. No credentials are stored
in this repository. For a future InsForge upgrade, rebuild and validate against
the new upstream source; do not reuse a compiled bundle from a different version.
