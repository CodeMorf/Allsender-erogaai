# Resolución fiscal de proveedores

ErogaAI resuelve y enlaza el proveedor después de consolidar todos los tramos del comprobante. MegaPlus se utiliza desde el backend como fuente de consulta de datos publicados de contribuyentes; React nunca llama directamente al servicio externo.

## Flujo por RNC o cédula

1. El valor OCR se normaliza a dígitos.
2. Los validadores dominicanos comprueban RNC de 9 dígitos o cédula de 11 dígitos, incluido el dígito verificador.
3. Se busca por `organization_id + rnc_normalized` en PostgreSQL.
4. Si existe, se reutiliza el `supplier.id` sin consultar ni crear otro registro.
5. Si no existe, el backend consulta `GET https://rnc.megaplus.com.do/api/consulta?rnc={RNC}` con timeout configurable.
6. Una respuesta válida se busca una segunda vez en PostgreSQL justo antes del `CREATE`.
7. El índice único `@@unique([organization_id, rnc_normalized])` cierra la condición de carrera. Un `P2002` recupera el proveedor creado por la solicitud concurrente.

El mismo RNC puede existir una vez en cada tenant; no puede duplicarse dentro del mismo tenant.

## Cuando falta RNC

Un nombre suficientemente claro se consulta con `/api/consulta/nombre?buscar=`. Solo una coincidencia exacta normalizada continúa al flujo por RNC. `/api/consulta/nombres?buscar=` se reserva para sugerencias; una coincidencia parcial nunca crea automáticamente un proveedor.

## Estados y campos

Se guardan `rnc_normalized`, razón social, nombre comercial, categoría, régimen de pagos, actividad económica, administración local, indicador de facturación electrónica, licencias VHM, fuente, fecha de verificación y metadata de respuesta.

Estados internos:

- `ACTIVO`
- `SUSPENDIDO`
- `INACTIVO`
- `DADO_DE_BAJA`
- `NO_LOCALIZADO`
- `DESCONOCIDO`

El estado externo `SUSPENDIDO` se conserva como `SUSPENDIDO` y se presenta separado de `INACTIVO`. No se convierten estados DGII entre sí ni se usa `INACTIVO` como sustituto de `SUSPENDIDO`.

Una empresa distinta de `ACTIVO` obliga a revisión y no se aprueba automáticamente.

## Fallos externos

Se manejan HTTP 400, 404, 429, 500/5xx, timeout y error de red. Un 404 no crea proveedor. Una caída, rate limit o timeout devuelve `PENDING_VALIDATION`: el escaneo puede continuar para revisión, pero no se persiste un proveedor inventado o incompleto.

## Configuración

```env
DGII_PROVIDER_BASE_URL="https://rnc.megaplus.com.do"
DGII_PROVIDER_TIMEOUT_MS="7000"
```

No se necesita API key para el contrato público documentado actualmente. Si el proveedor cambia su contrato, la integración debe validarse en staging antes de desplegarla.
