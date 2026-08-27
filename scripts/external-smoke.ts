import { request } from '@playwright/test';

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable requerida ${name}.`);
  return value;
};

const assertStatus = async (response: { status(): number }, expected: number, label: string): Promise<void> => {
  if (response.status() !== expected) throw new Error(`${label} falló con HTTP ${response.status()}.`);
};

async function main(): Promise<void> {
  if (process.env.E2E_EXTERNAL_SMOKE !== 'true') {
    throw new Error('Smoke externo deshabilitado. Use E2E_EXTERNAL_SMOKE=true únicamente contra staging controlado.');
  }

  const baseURL = required('E2E_SMOKE_BASE_URL').replace(/\/$/, '');
  const email = required('E2E_SMOKE_EMAIL');
  const password = required('E2E_SMOKE_PASSWORD');
  const providerType = required('E2E_SMOKE_AI_PROVIDER').toUpperCase();
  const model = required('E2E_SMOKE_AI_MODEL');
  const aiApiKey = required('E2E_SMOKE_AI_API_KEY');
  const erpHealthURL = required('E2E_SMOKE_ERP_HEALTH_URL');
  const erpApiKey = required('E2E_SMOKE_ERP_API_KEY');
  const erpHeaderName = process.env.E2E_SMOKE_ERP_AUTH_HEADER?.trim() || 'Authorization';
  const erpAuthScheme = process.env.E2E_SMOKE_ERP_AUTH_SCHEME?.trim() || 'Bearer';
  const erpAuthValue = erpAuthScheme.toLowerCase() === 'none' ? erpApiKey : `${erpAuthScheme} ${erpApiKey}`;

  const context = await request.newContext({ baseURL });
  try {
    const login = await context.post('/api/auth/login', { data: { email, password } });
    await assertStatus(login, 200, 'Login de smoke staging');

    const providerConfig = await context.post('/api/ai/providers', {
      data: {
        provider_type: providerType,
        name: `Staging smoke ${providerType}`,
        selected_model: model,
        api_key: aiApiKey,
        is_active: true,
        is_primary: false
      }
    });
    await assertStatus(providerConfig, 200, 'Persistencia del proveedor AI');
    const provider = await providerConfig.json() as { id?: string };
    if (!provider.id) throw new Error('La configuración AI no devolvió un identificador.');

    const aiTest = await context.post(`/api/ai/providers/${encodeURIComponent(provider.id)}/test`);
    await assertStatus(aiTest, 200, `Conexión real ${providerType}`);
    const aiResult = await aiTest.json() as { success?: boolean; status?: string };
    if (aiResult.success !== true || aiResult.status !== 'ONLINE') {
      throw new Error(`El proveedor ${providerType} no reportó estado ONLINE.`);
    }

    const erpHealth = await context.get(erpHealthURL, {
      headers: { [erpHeaderName]: erpAuthValue }
    });
    if (erpHealth.status() < 200 || erpHealth.status() >= 300) {
      throw new Error(`Health check ERP falló con HTTP ${erpHealth.status()}.`);
    }

    console.log(`External smoke OK: AI ${providerType}=ONLINE; ERP health HTTP ${erpHealth.status()}.`);
  } finally {
    await context.dispose();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'External smoke falló.');
  process.exitCode = 1;
});
