# Cámara y lector de comprobantes — ErogaAI

Esta guía documenta el flujo productivo de captura de comprobantes, la vista previa de cámara y la cadena de extracción OCR. No describe datos simulados: el escáner trabaja con archivos o cámaras reales.

## Flujo funcional

1. El usuario autenticado abre el escáner desde ErogaAI.
2. Selecciona una imagen/PDF o inicia la cámara.
3. El navegador solicita permiso para usar la cámara cuando sea necesario.
4. ErogaAI captura la fotografía o lee el archivo seleccionado.
5. El backend procesa el documento con la cadena de proveedores configurada para la organización.
6. El usuario revisa los campos fiscales extraídos antes de aprobar el comprobante.

El endpoint de escaneo exige sesión y el permiso RBAC `expenses.create_ocr`. El contexto de organización se obtiene de la sesión del servidor.

## Vista previa de cámara

La cámara utiliza `navigator.mediaDevices.getUserMedia()` y nunca usa una imagen de demostración.

- En teléfonos y tabletas se solicita preferentemente la cámara trasera mediante `facingMode: environment`.
- En escritorio se solicita la cámara disponible sin forzar `facingMode`, evitando seleccionar dispositivos inexistentes o incompatibles.
- La resolución ideal solicitada es 1280 × 720.
- Si el dispositivo rechaza las restricciones preferidas, se intenta nuevamente con restricciones de video básicas.
- Los errores de permiso se muestran al usuario y no se ocultan con un fallback silencioso.

### Renderizado compatible

Algunos navegadores pueden entregar un `MediaStream` válido y reproducirlo en `<video>`, pero componer la capa acelerada como un rectángulo negro. ErogaAI mantiene el `<video>` activo y dibuja continuamente sus fotogramas sobre un `<canvas>` visible mediante `requestAnimationFrame()`.

Este mecanismo permite verificar y mostrar la imagen real de la cámara en Chrome, PWA, móvil, tableta y escritorio. Al capturar, se usa la resolución completa del video y se genera una imagen JPEG con calidad 0.85 para el procesamiento OCR.

Al cancelar, cerrar o capturar, ErogaAI detiene las pistas activas de la cámara.

## Cadena de extracción OCR

La cadena se ejecuta en este orden:

1. Proveedor principal activo configurado para la organización.
2. Proveedores secundarios activos de la misma organización.
3. Gemini de entorno, únicamente cuando no existen configuraciones activas del tenant y hay una clave de entorno disponible.
4. Tesseract.js local cuando no hay IA disponible o todos los proveedores configurados fallan.

Los proveedores de IA admitidos son Google Gemini, Groq, OpenAI y CodeMorf Cloud. Las configuraciones, claves cifradas, modelo y estado se mantienen tenant-scoped en PostgreSQL.

## Respaldo gratuito Tesseract.js

ErogaAI incluye `tesseract.js` 7 con los modelos:

- `spa`: español.
- `eng`: inglés.

El worker local se reutiliza entre solicitudes y procesa una tarea a la vez. Esto evita crear un proceso OCR pesado por cada comprobante y evita acceso concurrente al mismo worker.

### Formatos

| Formato | IA configurada | Tesseract local |
| --- | --- | --- |
| JPG/JPEG | Sí | Sí |
| PNG | Sí | Sí |
| WEBP | Sí | Sí |
| PDF | Sí | No; requiere un proveedor de IA activo |

### Campos interpretados localmente

- Nombre del proveedor.
- RNC o cédula.
- NCF/e-NCF compatible.
- Fecha.
- Subtotal.
- ITBIS.
- Propina legal.
- Total.
- Clasificación y categoría sugeridas.
- Texto OCR original.

El OCR local limita deliberadamente su confianza máxima a 70 y agrega una observación de revisión manual. RNC, NCF, fecha y montos deben validarse antes de aprobar el gasto.

## Configuración

La ruta de caché es opcional:

```env
TESSERACT_CACHE_PATH="./data/tesseract"
```

Si no se configura, ErogaAI usa `data/tesseract` dentro del directorio de trabajo. El proceso Node.js necesita permiso de escritura. Los archivos entrenados se descargan y almacenan en esa ruta la primera vez que se inicializa el worker.

No se necesita una API key para Tesseract. Las claves de proveedores externos continúan siendo opcionales y nunca deben incluirse en commits, capturas, logs ni documentación.

## Requisitos de producción para cámara

- Origen HTTPS válido. `getUserMedia()` no debe depender de HTTP público.
- Permiso de cámara concedido para el dominio de ErogaAI.
- Cámara disponible y no ocupada exclusivamente por otra aplicación.
- Navegador moderno con `navigator.mediaDevices.getUserMedia`.
- Política del navegador o dispositivo que permita cámara en la aplicación/PWA.
- Bundle frontend actualizado; después de un despliegue PWA puede ser necesario recargar la aplicación.

## Lista de verificación

### Backend

```bash
curl -fsS https://DOMINIO/api/health
curl -fsS https://DOMINIO/api/ready
```

`/api/ready` debe informar PostgreSQL en `ok` y Redis en `ok` cuando `REDIS_REQUIRED=true`.

### Cámara

1. Abrir el escáner.
2. Seleccionar **Tomar Foto con Cámara**.
3. Conceder el permiso en el navegador.
4. Confirmar que la pista se encuentra `live` y que el lienzo muestra fotogramas reales.
5. Capturar un comprobante de prueba autorizado.
6. Confirmar que la pista de cámara se detiene después de capturar o cancelar.

### OCR

1. Procesar una imagen JPG, PNG o WEBP con los proveedores de IA desactivados.
2. Confirmar que la respuesta identifica `provider_used` como `TESSERACT` y `model_used` como `tesseract.js-7-spa+eng`.
3. Revisar que la interfaz solicite validación manual de los datos extraídos.
4. Repetir con la IA habilitada y confirmar que el proveedor configurado conserva prioridad.

## Diagnóstico rápido

### La cámara no solicita permiso

- Confirmar que la página usa HTTPS.
- Revisar el permiso de cámara desde el icono de seguridad del navegador.
- Verificar que `navigator.mediaDevices.getUserMedia` esté disponible.

### La pista está activa, pero la vista se ve negra

- Confirmar que el bundle desplegado contiene el lienzo con la etiqueta `Vista previa en vivo de la cámara`.
- Recargar la PWA o cerrar y abrir nuevamente el escáner.
- Verificar que el `<video>` tenga `readyState` 4, tiempo avanzando y una pista `live`.
- Comprobar que el lienzo tenga dimensiones y píxeles distintos de negro.

### Tesseract tarda en el primer procesamiento

La primera inicialización puede descargar los modelos `spa` y `eng`. Los procesamientos siguientes reutilizan el caché y el worker activo.

### Un PDF falla cuando no hay IA

Es el comportamiento esperado. El respaldo local actual procesa imágenes; active un proveedor de IA para documentos PDF o convierta el documento autorizado a una imagen compatible antes de cargarlo.

## Evidencia de la corrección

La implementación se publicó en el commit `144f5c8479ea0eec44a560705a2d472ffc669eed`.

- Cámara validada con pista real 1280 × 720 a 30 FPS.
- Vista previa del lienzo validada con fotogramas no negros.
- Tesseract.js 7 validado con modelos español/inglés y reconocimiento real.
- TypeScript, Vitest, build, migraciones PostgreSQL y Playwright aprobados en GitHub Actions.
- Producción validada mediante `/api/health` y `/api/ready`.

Pipeline asociado: [ErogaAI CI — run 33231920746](https://github.com/CodeMorf/Allsender-erogaai/actions/runs/33231920746).
