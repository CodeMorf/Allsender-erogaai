# Escáner de comprobantes por tramos

ErogaAI puede capturar una factura o ticket largo en hasta 20 imágenes y procesarlas como un único comprobante. Cada imagen se conserva individualmente para poder revisar, reemplazar o eliminar solo el tramo borroso sin repetir todo el documento.

## Arquitectura

```text
Cámara o archivo
  -> ReceiptSession (tenant)
  -> ReceiptSegment[] (orden e imagen original)
  -> OCR local por tramo
  -> parser de encabezado, productos y totales
  -> deduplicación del solape consecutivo
  -> IA multiimagen solo si la confianza o el cuadre son insuficientes
  -> reconciliación matemática
  -> validación fiscal y resolución del proveedor
  -> Expense enlazado a receipt_session_id y supplier_id
```

`organization_id` siempre se deriva de la sesión web o de la API Key autenticada. No se acepta el tenant enviado en el cuerpo.

## Captura

1. `POST /api/receipt-sessions` crea una sesión en `CAPTURING`.
2. Cada foto se añade con `POST /api/receipt-sessions/:id/segments`.
3. La interfaz muestra miniaturas, orden, estado y permite reemplazar, eliminar o reordenar.
4. La captura no inicia OCR automáticamente. El usuario puede continuar fotografiando y después seleccionar **Finalizar y procesar**.
5. Para tickets largos, cada foto debe repetir aproximadamente 15–20% del final de la anterior.

Las imágenes permanecen en registros `ReceiptSegment`; el sistema no depende de una imagen gigante concatenada.

## Estados

Sesión:

- `CAPTURING`
- `PROCESSING`
- `REVIEW_REQUIRED`
- `PROCESSED`
- `FAILED`
- `SAVED`

Segmento:

- `UPLOADED`
- `OCR_PROCESSING`
- `OCR_COMPLETED`
- `LOW_CONFIDENCE`
- `FAILED`

## OCR y líneas de productos

El backend ejecuta Tesseract.js primero para JPG, PNG y WEBP. El parser local reconoce, entre otros, estos formatos:

```text
2 COCA COLA 2LT 95.00 190.00
COCA COLA 2LT 2 x 95.00 190.00
123456 ARROZ SELECTO 1 75.50
LECHE ENTERA
2 x 65.00 130.00
```

No se genera una línea ficticia cuando falta información. Si existe una descripción con monto explícito pero no una cantidad confiable, se usa cantidad 1 con una confianza menor y se conserva el texto OCR original.

PDF requiere un proveedor de IA activo porque el OCR local trabaja sobre imágenes.

## Deduplicación de solapes

`receipt-consolidator.service.ts` compara exclusivamente la cola de productos del segmento N con el inicio del segmento N+1, en una ventana máxima de ocho líneas. La equivalencia usa:

- SKU exacto cuando existe;
- descripción normalizada exacta o coincidencia difusa fuerte;
- cantidad, precio unitario y total dentro de tolerancia;
- posición cola/inicio y segmentos consecutivos.

Solo se elimina el prefijo coincidente del nuevo segmento. Un producto igual en segmentos no consecutivos se conserva, porque puede ser una compra legítimamente repetida.

## IA y validación matemática

La IA recibe conjuntamente las imágenes de la misma sesión cuando el OCR local no produce datos, algún tramo tiene baja confianza, la estructura es ambigua o el total no cuadra. El resultado estructurado vuelve a pasar por deduplicación y reconciliación; la IA no puede aprobar por sí sola un monto inconsistente.

La reconciliación calcula:

```text
suma de líneas - descuentos + ITBIS + propina + otros impuestos
```

Una diferencia absoluta de hasta RD$0.02 se acepta como redondeo. Una diferencia superior marca `REVIEW_REQUIRED` e informa los índices de tramos con líneas de baja confianza.

## Endpoints

| Método | Web | API Key (`ocr:process`) |
| --- | --- | --- |
| POST | `/api/receipt-sessions` | `/api/v1/receipt-sessions` |
| GET | `/api/receipt-sessions/:id` | `/api/v1/receipt-sessions/:id` |
| POST | `/api/receipt-sessions/:id/segments` | `/api/v1/receipt-sessions/:id/segments` |
| PUT | `/api/receipt-sessions/:id/segments/:segmentId` | `/api/v1/receipt-sessions/:id/segments/:segmentId` |
| DELETE | `/api/receipt-sessions/:id/segments/:segmentId` | `/api/v1/receipt-sessions/:id/segments/:segmentId` |
| PATCH | `/api/receipt-sessions/:id/segments/reorder` | `/api/v1/receipt-sessions/:id/segments/reorder` |
| GET | `/api/receipt-sessions/:id/segments/:segmentId/image` | `/api/v1/receipt-sessions/:id/segments/:segmentId/image` |
| POST | `/api/receipt-sessions/:id/process` | `/api/v1/receipt-sessions/:id/process` |

Las imágenes se sirven con `Cache-Control: private, no-store` y todas las consultas incluyen `organization_id`.
