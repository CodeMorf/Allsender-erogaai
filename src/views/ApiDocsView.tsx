import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { ErogaLogo } from '../components/Logo.js';
import { 
  FileCode2, 
  Terminal, 
  Copy, 
  Check, 
  Key, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Code, 
  Layers, 
  Building2, 
  Receipt, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Play,
  Download,
  Webhook,
  RefreshCw,
  Cpu,
  CheckCircle2,
  FileCheck,
  Zap,
  Globe
} from 'lucide-react';

interface EndpointDoc {
  id: string;
  category: 'Receipts & OCR' | 'Erogaciones' | 'Catálogos' | 'DGII & Reportes' | 'Webhooks';
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  title: string;
  description: string;
  scopeRequired: string;
  requestHeaders: Record<string, string>;
  requestBody?: object;
  responseBody: object;
  curlExample: string;
  jsExample: string;
  reactExample: string;
  pythonExample: string;
  phpExample: string;
}

export const ApiDocsView: React.FC = () => {
  const { apiKeys, setActiveView, currentCompany, currentBranch } = useApp();
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('ocr-scan');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<'curl' | 'js' | 'react' | 'python' | 'php'>('curl');
  const [activeTab, setActiveTab] = useState<'endpoints' | 'webhooks' | 'playground'>('endpoints');

  // Interactive Test console state
  const [testApiKey, setTestApiKey] = useState<string>(apiKeys[0]?.key_prefix ? `${apiKeys[0].key_prefix}...` : 'eroga_live_sample_key');
  const [testEndpointPath, setTestEndpointPath] = useState<string>('/api/v1/health');
  const [testMethod, setTestMethod] = useState<string>('GET');
  const [testPayload, setTestPayload] = useState<string>('{}');
  const [testResponse, setTestResponse] = useState<{ status?: number; data?: any; timeMs?: number; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const endpoints: EndpointDoc[] = [
    {
      id: 'ocr-scan',
      category: 'Receipts & OCR',
      method: 'POST',
      path: '/api/v1/ocr/scan',
      title: 'Extracción Inteligente OCR de Comprobante Fiscal',
      description: 'Procesa una imagen de comprobante (factura, ticket de gasto) en Base64 o URL utilizando la IA de ErogaAI para extraer automáticamente NCF, RNC, montos, ITBIS, líneas de detalle y validación fiscal DGII.',
      scopeRequired: 'ocr:process',
      requestHeaders: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
      },
      requestBody: {
        image_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        image_url: 'https://cdn.empresa.com/facturas/fac-2026-001.jpg',
        mime_type: 'image/jpeg'
      },
      responseBody: {
        success: true,
        data: {
          supplier_name: 'Ferretería Americana SAS',
          supplier_rnc: '101002345',
          ncf: 'B0100004521',
          ncf_type: 'B01',
          date: '2026-08-25',
          subtotal: 15000.00,
          itbis_amount: 2700.00,
          legal_tip_amount: 0,
          total_amount: 17700.00,
          currency: 'DOP',
          document_type: 'FACTURA_CREDITO_FISCAL',
          confidence_score: 98,
          line_items: [
            {
              description: 'Pintura Acrílica Blanco Colonial Galón',
              quantity: 5,
              unit_price: 1800.00,
              itbis_rate: 18,
              total: 9000.00
            }
          ]
        },
        fiscal_validation: {
          is_valid_ncf: true,
          is_valid_rnc: true,
          rnc_status: 'ACTIVO'
        },
        meta: {
          provider_used: 'GEMINI',
          model_used: 'gemini-2.5-flash',
          confidence_score: 98
        }
      },
      curlExample: `curl -X POST https://app.eroga.ai/api/v1/ocr/scan \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -d '{
    "image_url": "https://cdn.empresa.com/facturas/fac-001.jpg"
  }'`,
      jsExample: `const response = await fetch('https://app.eroga.ai/api/v1/ocr/scan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
  },
  body: JSON.stringify({
    image_url: 'https://cdn.empresa.com/facturas/fac-001.jpg'
  })
});

const { data, fiscal_validation } = await response.json();
console.log('NCF Extraído:', data.ncf, 'RNC:', data.supplier_rnc);`,
      reactExample: `import React, { useState } from 'react';

export function ReceiptScanner() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const scanInvoice = async (base64Image) => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/ocr/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
        },
        body: JSON.stringify({ image_base64: base64Image })
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => scanInvoice(myBase64)}>
        {loading ? 'Analizando con IA...' : 'Escanear Comprobante'}
      </button>
      {result && <pre>{JSON.stringify(result.data, null, 2)}</pre>}
    </div>
  );
}`,
      pythonExample: `import requests

url = "https://app.eroga.ai/api/v1/ocr/scan"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx"
}
payload = {
    "image_url": "https://cdn.empresa.com/facturas/fac-001.jpg"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()
print("Datos extraídos:", data['data']['ncf'], data['data']['total_amount'])`,
      phpExample: `<?php
$ch = curl_init('https://app.eroga.ai/api/v1/ocr/scan');
$payload = json_encode([
    'image_url' => 'https://cdn.empresa.com/facturas/fac-001.jpg'
]);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
]);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
print_r($result['data']);
?>`
    },
    {
      id: 'receipts-lifecycle',
      category: 'Receipts & OCR',
      method: 'POST',
      path: '/api/v1/receipts/upload',
      title: 'Subir Comprobante (Paso 1 del ciclo asíncrono)',
      description: 'Carga una imagen o PDF de comprobante fiscal en el repositorio seguro de ErogaAI para su posterior procesamiento o trazabilidad documental.',
      scopeRequired: 'ocr:process',
      requestHeaders: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
      },
      requestBody: {
        file_name: 'factura_combustible_01.jpg',
        image_base64: 'data:image/jpeg;base64,...',
        mime_type: 'image/jpeg'
      },
      responseBody: {
        success: true,
        receipt_id: 'rcp_1772150000000_a1b2',
        status: 'UPLOADED',
        created_at: '2026-08-26T16:00:00.000Z',
        message: 'Comprobante cargado exitosamente. Puede proceder a procesarlo con IA.'
      },
      curlExample: `curl -X POST https://app.eroga.ai/api/v1/receipts/upload \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -d '{
    "file_name": "factura_01.jpg",
    "image_base64": "data:image/jpeg;base64,..."
  }'`,
      jsExample: `const res = await fetch('https://app.eroga.ai/api/v1/receipts/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
  },
  body: JSON.stringify({
    file_name: 'factura_01.jpg',
    image_base64: base64Data
  })
});
const { receipt_id } = await res.json();
console.log('Comprobante subido ID:', receipt_id);`,
      reactExample: `const uploadReceipt = async (file) => {
  const base64 = await fileToBase64(file);
  const res = await fetch('/api/v1/receipts/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
    },
    body: JSON.stringify({ file_name: file.name, image_base64: base64 })
  });
  return res.json();
};`,
      pythonExample: `import requests
res = requests.post(
    "https://app.eroga.ai/api/v1/receipts/upload",
    headers={"Authorization": "Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx"},
    json={"file_name": "factura_01.jpg", "image_base64": base64_str}
)
print(res.json())`,
      phpExample: `<?php
$ch = curl_init('https://app.eroga.ai/api/v1/receipts/upload');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['file_name' => 'factura.jpg', 'image_base64' => $base64]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = json_decode(curl_exec($ch), true);
?>`
    },
    {
      id: 'expenses-create',
      category: 'Erogaciones',
      method: 'POST',
      path: '/api/v1/expenses',
      title: 'Crear / Radicar Erogación',
      description: 'Registra un gasto corporativo en el sistema. Soporta cabecera Idempotency-Key para evitar duplicidad, así como formatos anidados y planos de montos e imputación contable.',
      scopeRequired: 'expenses:write',
      requestHeaders: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx',
        'Idempotency-Key': 'req_unique_guid_20260826_001'
      },
      requestBody: {
        external_id: 'ERP-INV-2026-0045',
        company_id: currentCompany?.id || 'comp_main',
        branch_id: currentBranch?.id || 'branch_main',
        supplier: {
          name: 'Estación de Servicios Texaco Piantini',
          rnc: '101998822'
        },
        document: {
          ncf: 'B0100008892',
          type: 'B01',
          date: '2026-08-26'
        },
        amounts: {
          subtotal_goods: 5000.00,
          subtotal_services: 0.00,
          itbis: 900.00,
          legal_tip: 0.00,
          other_taxes: 0.00,
          total: 5900.00,
          currency: 'DOP'
        },
        classification: {
          nature: 'GASTO_OPERATIVO',
          category: 'Combustibles y Lubricantes',
          dgii_code: '02'
        },
        payment_method: 'TARJETA_EMPRESARIAL',
        description: 'Combustible flota de despacho ruta norte'
      },
      responseBody: {
        success: true,
        message: 'Erogación radicada exitosamente.',
        data: {
          id: 'exp_1772150045_a9',
          external_id: 'ERP-INV-2026-0045',
          ncf: 'B0100008892',
          supplier_name: 'Estación de Servicios Texaco Piantini',
          total_amount: 5900.00,
          status: 'PENDIENTE_REVISION',
          created_at: '2026-08-26T16:05:00.000Z'
        }
      },
      curlExample: `curl -X POST https://app.eroga.ai/api/v1/expenses \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Idempotency-Key: req_guid_001" \\
  -d '{
    "company_id": "comp_main",
    "external_id": "ERP-INV-2026-0045",
    "supplier": { "name": "Texaco Piantini", "rnc": "101998822" },
    "document": { "ncf": "B0100008892", "type": "B01", "date": "2026-08-26" },
    "amounts": { "subtotal_goods": 5000.0, "itbis": 900.0, "total": 5900.0 },
    "classification": { "nature": "GASTO_OPERATIVO", "category": "Combustibles" }
  }'`,
      jsExample: `const res = await fetch('https://app.eroga.ai/api/v1/expenses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx',
    'Idempotency-Key': 'req_' + Date.now()
  },
  body: JSON.stringify({
    external_id: 'ERP-001',
    supplier: { name: 'Texaco', rnc: '101998822' },
    document: { ncf: 'B0100008892', type: 'B01', date: '2026-08-26' },
    amounts: { subtotal_goods: 5000, itbis: 900, total: 5900 }
  })
});
const { data } = await res.json();
console.log('Gasto creado ID:', data.id);`,
      reactExample: `const createExpense = async (expenseData) => {
  const res = await fetch('/api/v1/expenses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(expenseData)
  });
  return res.json();
};`,
      pythonExample: `import requests
import uuid

url = "https://app.eroga.ai/api/v1/expenses"
headers = {
    "Authorization": "Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx",
    "Idempotency-Key": str(uuid.uuid4()),
    "Content-Type": "application/json"
}
payload = {
    "external_id": "ERP-001",
    "supplier": {"name": "Texaco", "rnc": "101998822"},
    "document": {"ncf": "B0100008892", "type": "B01", "date": "2026-08-26"},
    "amounts": {"subtotal_goods": 5000.0, "itbis": 900.0, "total": 5900.0}
}
res = requests.post(url, json=payload, headers=headers)
print(res.json())`,
      phpExample: `<?php
$ch = curl_init('https://app.eroga.ai/api/v1/expenses');
$payload = [
    'external_id' => 'ERP-001',
    'supplier' => ['name' => 'Texaco', 'rnc' => '101998822'],
    'document' => ['ncf' => 'B0100008892', 'type' => 'B01', 'date' => '2026-08-26'],
    'amounts' => ['subtotal_goods' => 5000.0, 'itbis' => 900.0, 'total' => 5900.0]
];
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx',
    'Idempotency-Key: ' . uniqid('req_', true)
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = json_decode(curl_exec($ch), true);
?>`
    },
    {
      id: 'expenses-list',
      category: 'Erogaciones',
      method: 'GET',
      path: '/api/v1/expenses',
      title: 'Consultar y Filtrar Erogaciones',
      description: 'Obtiene el listado de erogaciones registradas en el tenant. Permite filtrar por empresa filial, sucursal o estado fiscal.',
      scopeRequired: 'expenses:read',
      requestHeaders: {
        'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
      },
      responseBody: {
        success: true,
        total: 1,
        data: [
          {
            id: 'exp_1772150045_a9',
            ncf: 'B0100008892',
            supplier_name: 'Estación de Servicios Texaco Piantini',
            supplier_rnc: '101998822',
            total_amount: 5900.00,
            status: 'APROBADO',
            date: '2026-08-26'
          }
        ]
      },
      curlExample: `curl -X GET "https://app.eroga.ai/api/v1/expenses?status=APROBADO" \\
  -H "Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx"`,
      jsExample: `const res = await fetch('https://app.eroga.ai/api/v1/expenses?status=APROBADO', {
  headers: { 'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx' }
});
const { data } = await res.json();
console.log('Gastos aprobados:', data);`,
      reactExample: `useEffect(() => {
  fetch('/api/v1/expenses?status=APROBADO', {
    headers: { 'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx' }
  })
  .then(res => res.json())
  .then(json => setExpenses(json.data));
}, []);`,
      pythonExample: `import requests
res = requests.get(
    "https://app.eroga.ai/api/v1/expenses",
    headers={"Authorization": "Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx"},
    params={"status": "APROBADO"}
)
print(res.json()['data'])`,
      phpExample: `<?php
$ch = curl_init('https://app.eroga.ai/api/v1/expenses?status=APROBADO');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = json_decode(curl_exec($ch), true);
?>`
    },
    {
      id: 'expenses-approve',
      category: 'Erogaciones',
      method: 'POST',
      path: '/api/v1/expenses/{id}/approve',
      title: 'Aprobar Erogación Fiscal',
      description: 'Aprueba formalmente un comprobante fiscal, actualizando su estatus y habilitándolo para la exportación contable o sincronización ERP.',
      scopeRequired: 'expenses:write',
      requestHeaders: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
      },
      requestBody: {
        reviewer_name: 'Director Financiero',
        notes: 'Aprobado conforme al presupuesto operativo Q3'
      },
      responseBody: {
        success: true,
        message: 'Erogación aprobada exitosamente.',
        data: {
          id: 'exp_1772150045_a9',
          status: 'APROBADO',
          reviewed_by: 'Director Financiero'
        }
      },
      curlExample: `curl -X POST https://app.eroga.ai/api/v1/expenses/exp_1772150045_a9/approve \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -d '{ "reviewer_name": "Finanzas", "notes": "Aprobado" }'`,
      jsExample: `const res = await fetch('https://app.eroga.ai/api/v1/expenses/exp_1772150045_a9/approve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
  },
  body: JSON.stringify({ reviewer_name: 'Auditor', notes: 'Validado' })
});`,
      reactExample: `const approveExpense = async (expenseId) => {
  const res = await fetch(\`/api/v1/expenses/\${expenseId}/approve\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
    },
    body: JSON.stringify({ reviewer_name: 'Administrador' })
  });
  return res.json();
};`,
      pythonExample: `import requests
res = requests.post(
    "https://app.eroga.ai/api/v1/expenses/exp_1772150045_a9/approve",
    headers={"Authorization": "Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx"},
    json={"reviewer_name": "Finanzas"}
)`,
      phpExample: `<?php
$ch = curl_init('https://app.eroga.ai/api/v1/expenses/exp_01/approve');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['reviewer_name' => 'Finanzas']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = json_decode(curl_exec($ch), true);
?>`
    },
    {
      id: 'catalogs-companies',
      category: 'Catálogos',
      method: 'GET',
      path: '/api/v1/companies',
      title: 'Consultar Empresas Filiales',
      description: 'Retorna las razones sociales, RNC y régimen tributario configurados en la organización para alimentar selectores y sincronización externa.',
      scopeRequired: 'companies:read',
      requestHeaders: {
        'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
      },
      responseBody: {
        success: true,
        data: [
          {
            id: 'comp_main',
            name: 'Mi Empresa Corporativa SAS',
            rnc: '131892412',
            currency: 'DOP',
            tax_regime: 'REGIMEN_GENERAL'
          }
        ]
      },
      curlExample: `curl -X GET https://app.eroga.ai/api/v1/companies \\
  -H "Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx"`,
      jsExample: `const res = await fetch('https://app.eroga.ai/api/v1/companies', {
  headers: { 'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx' }
});
const { data } = await res.json();`,
      reactExample: `const { data: companies } = useQuery(['companies'], () =>
  fetch('/api/v1/companies', {
    headers: { 'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx' }
  }).then(r => r.json())
);`,
      pythonExample: `import requests
res = requests.get("https://app.eroga.ai/api/v1/companies", headers={"Authorization": "Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx"})
print(res.json()['data'])`,
      phpExample: `<?php
$ch = curl_init('https://app.eroga.ai/api/v1/companies');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = json_decode(curl_exec($ch), true);
?>`
    },
    {
      id: 'reports-dgii-606',
      category: 'DGII & Reportes',
      method: 'GET',
      path: '/api/v1/reports/dgii-606',
      title: 'Exportar Estructura DGII Formato 606',
      description: 'Genera el informe fiscal 606 (compras de bienes y servicios) en formato JSON estructurado con todos los campos normativos requeridos por la DGII.',
      scopeRequired: 'dgii:export',
      requestHeaders: {
        'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx'
      },
      responseBody: {
        success: true,
        periodo: '202608',
        total_records: 120,
        total_amount: 1450000.00,
        total_itbis: 261000.00,
        data: [
          {
            rnc_cedula: '101002345',
            tipo_id: '1',
            tipo_bienes_servicios: '02',
            ncf: 'B0100004521',
            fecha_comprobante: '20260825',
            total_monto_facturado: 17700.00,
            itbis_facturado: 2700.00,
            forma_pago: '02'
          }
        ]
      },
      curlExample: `curl -X GET "https://app.eroga.ai/api/v1/reports/dgii-606" \\
  -H "Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx"`,
      jsExample: `const res = await fetch('https://app.eroga.ai/api/v1/reports/dgii-606', {
  headers: { 'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx' }
});
const report606 = await res.json();
console.log('Total facturado periodo:', report606.total_amount);`,
      reactExample: `const download606Report = async () => {
  const res = await fetch('/api/v1/reports/dgii-606', {
    headers: { 'Authorization': 'Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx' }
  });
  const data = await res.json();
  exportToJSONorExcel(data);
};`,
      pythonExample: `import requests
res = requests.get(
    "https://app.eroga.ai/api/v1/reports/dgii-606",
    headers={"Authorization": "Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx"}
)
print("Total 606:", res.json()['total_amount'])`,
      phpExample: `<?php
$ch = curl_init('https://app.eroga.ai/api/v1/reports/dgii-606');
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer eroga_live_xxxxxxxxxxxxxxxxxxxxxxxx']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$report = json_decode(curl_exec($ch), true);
?>`
    }
  ];

  const selectedEndpoint = endpoints.find(e => e.id === selectedEndpointId) || endpoints[0];

  const handleRunPlayground = async () => {
    setIsTesting(true);
    setTestResponse(null);
    const startTime = Date.now();
    try {
      let url = testEndpointPath;
      const options: RequestInit = {
        method: testMethod,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApiKey.trim()}`,
          'X-API-Key': testApiKey.trim()
        }
      };

      if (testMethod !== 'GET' && testMethod !== 'HEAD' && testPayload.trim()) {
        try {
          options.body = JSON.stringify(JSON.parse(testPayload));
        } catch {
          options.body = testPayload;
        }
      }

      const res = await fetch(url, options);
      const latency = Date.now() - startTime;
      let data: any;
      try {
        data = await res.json();
      } catch {
        data = await res.text();
      }

      setTestResponse({
        status: res.status,
        data,
        timeMs: latency
      });
    } catch (err: any) {
      setTestResponse({
        status: 500,
        error: err.message || 'Error de conexión de red',
        timeMs: Date.now() - startTime
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getSnippet = (ep: EndpointDoc) => {
    switch (activeLang) {
      case 'curl': return ep.curlExample;
      case 'js': return ep.jsExample;
      case 'react': return ep.reactExample;
      case 'python': return ep.pythonExample;
      case 'php': return ep.phpExample;
      default: return ep.curlExample;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-slate-950 border border-slate-700/80 items-center justify-center p-1 shrink-0 shadow-lg shadow-slate-950/40">
              <ErogaLogo size={38} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-full border border-emerald-200 dark:border-emerald-800">
                  <Globe className="w-3.5 h-3.5" /> API REST v1 Pública & Genérica
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono rounded">
                  OpenAPI 3.0.3
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Documentación de API</span>
                <span className="text-slate-900 dark:text-white">Eroga<span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-100 dark:to-white">AI</span></span>
              </h1>
              <p className="text-sm lg:text-base text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
                Integra el motor de captura de erogaciones, procesamiento OCR con IA y cumplimiento DGII 606 en cualquier ERP, CRM, backend o aplicación móvil externa.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/docs/openapi.yaml"
              download="openapi.yaml"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium rounded-xl transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              Descargar OpenAPI (.yaml)
            </a>
            <button
              onClick={() => setActiveView('api-keys')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
            >
              <Key className="w-4 h-4" />
              Gestionar API Keys
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 mt-6 pt-4">
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'endpoints'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Code className="w-4 h-4" /> Endpoints & Referencia
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'webhooks'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Webhook className="w-4 h-4" /> Webhooks & Eventos
          </button>
          <button
            onClick={() => {
              setActiveTab('playground');
              setTestEndpointPath(selectedEndpoint.path);
              setTestMethod(selectedEndpoint.method);
              setTestPayload(selectedEndpoint.requestBody ? JSON.stringify(selectedEndpoint.requestBody, null, 2) : '{}');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'playground'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Play className="w-4 h-4" /> API Playground Interactivo
          </button>
        </div>
      </div>

      {activeTab === 'endpoints' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Endpoints List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-3">
                Colección de Endpoints v1
              </h2>
              <div className="space-y-1">
                {endpoints.map((ep) => {
                  const isSelected = ep.id === selectedEndpoint.id;
                  const methodColor = 
                    ep.method === 'GET' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50' :
                    ep.method === 'POST' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50' :
                    ep.method === 'PATCH' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50' :
                    'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50';

                  return (
                    <button
                      key={ep.id}
                      onClick={() => setSelectedEndpointId(ep.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 ${
                        isSelected 
                          ? 'bg-slate-100 dark:bg-slate-800 border-l-4 border-emerald-500 font-medium' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded font-mono ${methodColor}`}>
                            {ep.method}
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                            {ep.path}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                          {ep.title}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-emerald-500 translate-x-1' : 'text-slate-400 opacity-50'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Authentication Notice */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="text-sm font-semibold">Autenticación Universal</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Todas las solicitudes deben incluir tu API Key activa mediante la cabecera estándar:
              </p>
              <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-xs text-emerald-400 border border-slate-800 break-all">
                Authorization: Bearer eroga_live_...
              </div>
              <p className="text-[11px] text-slate-400">
                También se admite la cabecera alternativa <code className="text-slate-300">X-API-Key: eroga_live_...</code>
              </p>
            </div>
          </div>

          {/* Endpoint Detail & Code Examples */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md font-mono ${
                  selectedEndpoint.method === 'GET' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50' :
                  selectedEndpoint.method === 'POST' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50' :
                  'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50'
                }`}>
                  {selectedEndpoint.method}
                </span>
                <span className="text-base font-mono font-semibold text-slate-900 dark:text-white">
                  {selectedEndpoint.path}
                </span>
                <span className="ml-auto text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full font-medium">
                  Scope: <code className="font-mono text-emerald-600 dark:text-emerald-400">{selectedEndpoint.scopeRequired}</code>
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {selectedEndpoint.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                {selectedEndpoint.description}
              </p>

              {/* Code Selector Tabs */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mb-6">
                <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {(['curl', 'js', 'react', 'python', 'php'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveLang(lang)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all uppercase ${
                          activeLang === lang
                            ? 'bg-emerald-500 text-white font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {lang === 'curl' ? 'cURL' : lang === 'js' ? 'Node / JS' : lang === 'react' ? 'React' : lang === 'python' ? 'Python' : 'PHP'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => copyToClipboard(getSnippet(selectedEndpoint), selectedEndpoint.id)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedSection === selectedEndpoint.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar código</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed max-h-96">
                  <code>{getSnippet(selectedEndpoint)}</code>
                </pre>
              </div>

              {/* Request Payload Schema */}
              {selectedEndpoint.requestBody && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    Cuerpo de la Solicitud (JSON Payload)
                  </h3>
                  <pre className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-300 overflow-x-auto">
                    {JSON.stringify(selectedEndpoint.requestBody, null, 2)}
                  </pre>
                </div>
              )}

              {/* Response Payload Schema */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Respuesta Exitosa (HTTP 200 / 201 OK)
                </h3>
                <pre className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-300 overflow-x-auto">
                  {JSON.stringify(selectedEndpoint.responseBody, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Arquitectura de Webhooks en Tiempo Real
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              ErogaAI despacha notificaciones HTTP POST inmediatas cuando ocurren eventos clave en el ciclo de vida de los comprobantes.
            </p>
          </div>

          {/* Event Catalog Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Evento</th>
                  <th className="p-3.5">Descripción</th>
                  <th className="p-3.5">Payload Principal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">expense.created</td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300">Se radicó un nuevo comprobante en el sistema.</td>
                  <td className="p-3.5 font-mono text-slate-500">ExpenseRecord con id, ncf, total</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">expense.approved</td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300">Un supervisor o auditor aprobó formalmente la erogación.</td>
                  <td className="p-3.5 font-mono text-slate-500">ExpenseRecord con reviewer_name, status=APROBADO</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-mono font-bold text-rose-600 dark:text-rose-400">expense.rejected</td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300">La erogación fue rechazada por inconsistencia fiscal.</td>
                  <td className="p-3.5 font-mono text-slate-500">ExpenseRecord con rejection_reason</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">receipt.processed</td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300">El motor de IA finalizó la extracción OCR del comprobante.</td>
                  <td className="p-3.5 font-mono text-slate-500">ReceiptRecord con extraction, fiscal_validation</td>
                </tr>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">expense.sync.completed</td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300">Comprobante exportado o sincronizado con éxito.</td>
                  <td className="p-3.5 font-mono text-slate-500">expense_id, sync_id, timestamp</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signature Verification */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Validación Criptográfica de Firma HMAC (X-ErogaAI-Signature)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Cada webhook enviado incluye la cabecera <code className="font-mono text-emerald-600 dark:text-emerald-400">X-ErogaAI-Signature</code> con el hash HMAC-SHA256 del cuerpo de la solicitud firmado con tu secreto de webhook.
            </p>
            <pre className="p-4 bg-slate-950 text-slate-200 border border-slate-800 rounded-xl font-mono text-xs overflow-x-auto">
{`// Ejemplo de validación en Node.js / Express
import crypto from 'crypto';

app.post('/webhooks/eroga-ai', (req, res) => {
  const signature = req.headers['x-erogaai-signature'];
  const secret = process.env.EROGAAI_WEBHOOK_SECRET;
  
  const hmac = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
    
  if (signature !== hmac) {
    return res.status(401).send('Firma inválida');
  }
  
  const { event, data } = req.body;
  if (event === 'expense.approved') {
    // Procesar en tu base de datos o sistema contable
  }
  res.status(200).send('OK');
});`}
            </pre>
          </div>
        </div>
      )}

      {/* Interactive Playground Tab */}
      {activeTab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls */}
          <div className="lg:col-span-6 space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500" />
              Consola de Prueba en Vivo
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                API Key de Prueba
              </label>
              <input
                type="text"
                value={testApiKey}
                onChange={(e) => setTestApiKey(e.target.value)}
                placeholder="eroga_live_xxxxxxxxxxxxxxxx"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Método
                </label>
                <select
                  value={testMethod}
                  onChange={(e) => setTestMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Endpoint Path
                </label>
                <input
                  type="text"
                  value={testEndpointPath}
                  onChange={(e) => setTestEndpointPath(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {testMethod !== 'GET' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cuerpo JSON (Payload)
                </label>
                <textarea
                  rows={6}
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={handleRunPlayground}
              disabled={isTesting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Ejecutando solicitud HTTP...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Enviar Solicitud
                </>
              )}
            </button>
          </div>

          {/* Response Viewer */}
          <div className="lg:col-span-6 space-y-3 bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-sm flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Respuesta del Servidor
              </span>
              {testResponse && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    (testResponse.status || 0) < 300 ? 'bg-emerald-900/80 text-emerald-400 border border-emerald-700' : 'bg-rose-900/80 text-rose-400 border border-rose-700'
                  }`}>
                    HTTP {testResponse.status}
                  </span>
                  <span className="text-slate-400">{testResponse.timeMs}ms</span>
                </div>
              )}
            </div>

            <div className="flex-1 bg-slate-950 rounded-xl p-4 font-mono text-xs overflow-auto max-h-[400px]">
              {testResponse ? (
                <pre className="text-slate-200">
                  {JSON.stringify(testResponse.data || testResponse.error, null, 2)}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 italic">
                  Presiona "Enviar Solicitud" para probar el endpoint contra el servidor en vivo.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
