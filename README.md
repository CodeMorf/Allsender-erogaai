<div align="center">

# 🚀 Allsender ErogaAI SaaS

### *Plataforma Inteligente de Gestión de Erogaciones, OCR Fiscal y Cumplimiento DGII*

Desarrollado con ❤️ por **[CodeMorf](https://codemorf.tech/)**

[![Desarrollador - CodeMorf](https://img.shields.io/badge/Desarrollador-CodeMorf-00f2fe?style=for-the-badge&logo=codeforces&logoColor=white)](https://codemorf.tech/)
[![Website](https://img.shields.io/badge/Website-codemorf.tech-4f46e5?style=for-the-badge&logo=google-chrome&logoColor=white)](https://codemorf.tech/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-2.4-8e44ad?style=for-the-badge&logo=google)](https://ai.google.dev/)

</div>

---

## 🌟 Acerca del Proyecto

**Allsender ErogaAI SaaS** es una solución enterprise integral para la automatización, escaneo inteligente (OCR), clasificación contable y cumplimiento fiscal de erogaciones y comprobantes fiscales (NCF/e-NCF DGII) en la República Dominicana.

Diseñado e impulsado por **[CodeMorf Tech](https://codemorf.tech/)**, este sistema integra Inteligencia Artificial avanzada (Google Gemini AI), integración ERP multi-sede, reportes fiscales automáticos (606) y soporte para aplicaciones móviles (Capacitor/PWA).

---

## ✨ Características Principales

- 🧾 **Escaner OCR Inteligente con IA**: Extracción automática de NCF, RNC, fecha, subtotal, ITBIS y renglones de consumo utilizando Google Gemini.
- 🇩🇴 **Cumplimiento Fiscal DGII 606**: Validación de RNC/Cédula, NCF B01/B02/B14/B15/E31/E32 y exportación directa del reporte 606.
- 🏢 **Arquitectura Multi-Empresa & Multi-Sede**: Control centralizado para Holdings, sucursales y proyectos con control de acceso basado en roles (RBAC).
- 🔄 **Integración ERP Flex & API REST**: Sincronización automática de gastos contables con sistemas ERP externos mediante API Keys y Webhooks.
- 📊 **Consolidación de Costos & Centros de Costo**: Seguimiento analítico de presupuestos mensuales, gastos por vehículos, proyectos y categorías.
- 📱 **Soporte PWA y Móvil Offline**: Listo para ejecutarse como aplicación web progresiva y app nativa mediante Capacitor.

---

## 👨‍💻 Desarrollador

Este proyecto ha sido concebido, diseñado e implementado por **CodeMorf**:

- 🌐 **Sitio Web Oficial**: [https://codemorf.tech/](https://codemorf.tech/)
- ⚙️ **Especialidad**: Desarrollo de Software SaaS, Inteligencia Artificial, Soluciones Enterprise y Transformación Digital.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 19, TypeScript, Vite 6, TailwindCSS v4, Lucide Icons, Recharts, Motion.
- **Backend / API**: Node.js, Express, TSX, Esbuild.
- **IA / OCR**: `@google/genai` (Gemini API).
- **Móvil / Cross-Platform**: Capacitor TS, Service Worker PWA.

---

## 🚀 Inicio Rápido (Local)

### Requisitos Previos
- Node.js (v18+ recomendado)
- npm o bun

### Pasos para Ejecución

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/CodeMorf/Allsender-erogaai.git
   cd Allsender-erogaai
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno**:
   Crea un archivo `.env` basado en `.env.example`:
   ```env
   GEMINI_API_KEY="tu_gemini_api_key"
   APP_URL="http://localhost:3000"
   ```

4. **Iniciar Servidor de Desarrollo**:
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Smoke de integraciones externas en staging

El smoke real de AI y ERP es manual y solo debe ejecutarse contra un entorno de staging controlado. No guarda credenciales en el repositorio ni se ejecuta en el CI normal. Configure los secretos `E2E_SMOKE_*` en el Environment `staging` de GitHub y ejecute manualmente el workflow **ErogaAI External Integration Smoke**. El proveedor AI se prueba mediante su conexión real; el ERP se valida con el health endpoint seguro que indique el operador, sin iniciar una sincronización de comprobantes.

---

## 📄 Licencia y Créditos

Desarrollado por **[CodeMorf Tech](https://codemorf.tech/)**.  
Todos los derechos reservados © 2026.
