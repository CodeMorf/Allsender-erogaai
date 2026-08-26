import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { 
  ExpenseClassification, 
  NcfType, 
  ReceiptExtraction, 
  LineItem 
} from '../types.js';
import { validateRNC, validateNCF, formatCurrency } from '../utils/formatters.js';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Fuel, 
  Laptop, 
  UtensilsCrossed, 
  Boxes, 
  FileText, 
  Zap,
  Eye
} from 'lucide-react';

export const ExpenseScannerModal: React.FC = () => {
  const { 
    isScannerOpen, 
    closeScanner, 
    createExpense, 
    currentCompany, 
    currentBranch, 
    currentUser, 
    aiProviders, 
    showToast 
  } = useApp();

  const [step, setStep] = useState<'SELECT_MODE' | 'CAMERA_ACTIVE' | 'PROCESSING' | 'REVIEW_FORM'>('SELECT_MODE');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'samples' | 'upload' | 'camera'>('samples');
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // AI Extraction Result & Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierRnc, setSupplierRnc] = useState('');
  const [ncf, setNcf] = useState('');
  const [ncfType, setNcfType] = useState<NcfType>('B01');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [documentType, setDocumentType] = useState<'FACTURA_CREDITO_FISCAL' | 'FACTURA_CONSUMO' | 'TICKET_POS' | 'COMPROBANTE_ELECTRONICO' | 'RECIBO'>('FACTURA_CREDITO_FISCAL');
  const [classification, setClassification] = useState<ExpenseClassification>('GASTO_OPERATIVO');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [itbisAmount, setItbisAmount] = useState(0);
  const [legalTipAmount, setLegalTipAmount] = useState(0);
  const [otherTaxes, setOtherTaxes] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'TARJETA_EMPRESARIAL' | 'EFECTIVO' | 'TRANSFERENCIA' | 'CAJA_CHICA'>('TARJETA_EMPRESARIAL');
  const [confidenceScore, setConfidenceScore] = useState(95);
  const [aiObservations, setAiObservations] = useState<string[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [processingStatus, setProcessingStatus] = useState<string>('Analizando comprobante...');

  // Active AI Provider info
  const activeProvider = aiProviders.find(p => p.is_primary && p.is_active) || aiProviders[0];

  // Stop camera when closing
  useEffect(() => {
    if (!isScannerOpen && cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (isScannerOpen) {
      setStep('SELECT_MODE');
      setSelectedImage(null);
      setCameraError(null);
    }
  }, [isScannerOpen]);

  if (!isScannerOpen) return null;

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStep('CAMERA_ACTIVE');
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError('No se pudo acceder a la cámara. Por favor autoriza los permisos o sube una imagen.');
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
      }
      processImageForOCR(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      processImageForOCR(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSampleSelect = (sampleType: 'gasolina' | 'computo' | 'restaurante' | 'supermercado') => {
    let sampleImg = '';
    if (sampleType === 'gasolina') sampleImg = 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80';
    if (sampleType === 'computo') sampleImg = 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80';
    if (sampleType === 'restaurante') sampleImg = 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=600&auto=format&fit=crop&q=80';
    if (sampleType === 'supermercado') sampleImg = 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&auto=format&fit=crop&q=80';

    processImageForOCR(sampleImg, sampleType);
  };

  const processImageForOCR = async (imageSrc: string, sampleType?: string) => {
    setSelectedImage(imageSrc);
    setStep('PROCESSING');
    setProcessingStatus('Inicializando motor de visión con IA...');

    try {
      setTimeout(() => setProcessingStatus('Extrayendo RNC, NCF y validando base DGII...'), 500);
      setTimeout(() => setProcessingStatus('Desglosando ITBIS (18%), Subtotal y Clasificación contable...'), 1100);

      const res = await fetch('/api/ai/ocr-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: imageSrc.startsWith('data:') ? imageSrc : undefined,
          image_url: imageSrc.startsWith('http') ? imageSrc : undefined,
          sample_type: sampleType
        })
      });

      if (!res.ok) {
        throw new Error('Fallo en la extracción de datos');
      }

      const data = await res.json();
      const ext: ReceiptExtraction = data.extraction;

      setSupplierName(ext.supplier_name || '');
      setSupplierRnc(ext.supplier_rnc || '');
      setNcf(ext.ncf || '');
      setNcfType(ext.ncf_type || 'B01');
      setDate(ext.date || new Date().toISOString().split('T')[0]);
      setDocumentType(ext.document_type || 'FACTURA_CREDITO_FISCAL');
      setClassification(ext.suggested_classification || 'GASTO_OPERATIVO');
      setExpenseCategory(ext.suggested_category || 'Gastos Generales');
      setSubtotal(ext.subtotal || 0);
      setItbisAmount(ext.itbis_amount || 0);
      setLegalTipAmount(ext.legal_tip_amount || 0);
      setOtherTaxes(ext.other_taxes || 0);
      setTotalAmount(ext.total_amount || 0);
      setConfidenceScore(ext.confidence_score || 95);
      setAiObservations(ext.observations || ['Documento procesado con éxito']);
      
      const parsedItems = (ext.line_items || []).map((li, idx) => ({
        id: `item-${idx}-${Date.now()}`,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        itbis_rate: li.itbis_rate || 18,
        total: li.total
      }));
      setLineItems(parsedItems.length > 0 ? parsedItems : [
        {
          id: `item-1`,
          description: ext.suggested_category || 'Gasto registrado',
          quantity: 1,
          unit_price: ext.subtotal || ext.total_amount,
          itbis_rate: 18,
          total: ext.total_amount
        }
      ]);

      setStep('REVIEW_FORM');
      showToast('success', 'Documento Escaneado', `Datos extraídos con ${ext.confidence_score}% de confianza.`);
    } catch (err: any) {
      console.error('Error processing OCR:', err);
      showToast('error', 'Error en OCR', 'No se pudo completar el análisis del documento. Puedes ingresar los datos manualmente.');
      setStep('REVIEW_FORM');
    }
  };

  const handleRecalculateTotals = (newSubtotal: number, newItbis: number, newTip: number, newOther: number) => {
    setSubtotal(newSubtotal);
    setItbisAmount(newItbis);
    setLegalTipAmount(newTip);
    setOtherTaxes(newOther);
    setTotalAmount(newSubtotal + newItbis + newTip + newOther);
  };

  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: 'Nuevo concepto',
      quantity: 1,
      unit_price: 0,
      itbis_rate: 18,
      total: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(i => i.id !== id));
  };

  const handleSaveExpense = async (status: 'BORRADOR' | 'PENDIENTE_REVISION' | 'APROBADO') => {
    try {
      await createExpense({
        date,
        supplier_name: supplierName,
        supplier_rnc: supplierRnc,
        ncf,
        ncf_type: ncfType,
        document_type: documentType,
        classification,
        expense_category: expenseCategory,
        subtotal: Number(subtotal),
        itbis_amount: Number(itbisAmount),
        legal_tip_amount: Number(legalTipAmount),
        other_taxes: Number(otherTaxes),
        total_amount: Number(totalAmount),
        currency: 'DOP',
        payment_method: paymentMethod,
        status,
        receipt_image_url: selectedImage || undefined,
        ai_confidence_score: confidenceScore,
        ai_provider_used: activeProvider?.provider_type || 'GEMINI',
        ai_model_used: activeProvider?.selected_model || 'gemini-2.5-flash',
        line_items: lineItems,
        approval_notes: status === 'APROBADO' ? 'Aprobación directa por Supervisor/Admin.' : undefined
      });
      closeScanner();
    } catch (err: any) {
      showToast('error', 'Error al Guardar', err.message);
    }
  };

  const rncValidation = validateRNC(supplierRnc);
  const ncfValidation = validateNCF(ncf);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        id="scanner-modal-container"
        className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {step === 'REVIEW_FORM' ? 'Verificación y Corrección de Erogación' : 'Capturar o Escanear Comprobante Fiscal'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Extracción inteligente con IA ({activeProvider?.name || 'Google Gemini Pro'})
              </p>
            </div>
          </div>
          <button
            onClick={closeScanner}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'SELECT_MODE' && (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                  onClick={() => setActiveTab('samples')}
                  className={`pb-3 font-semibold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === 'samples'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-500" />
                  Tickets de Prueba Rápida (1 Clic)
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`pb-3 font-semibold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === 'upload'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Subir Imagen / PDF
                </button>
                <button
                  onClick={() => {
                    setActiveTab('camera');
                    startCamera();
                  }}
                  className={`pb-3 font-semibold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === 'camera'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Tomar Foto con Cámara
                </button>
              </div>

              {/* Sample Tickets Grid */}
              {activeTab === 'samples' && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>
                      Prueba al instante la extracción OCR y clasificación con casos reales del sistema tributario dominicano (DGII):
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <button
                      id="btn-sample-fuel"
                      onClick={() => handleSampleSelect('gasolina')}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-blue-500 dark:hover:border-blue-500 transition-all text-left group shadow-xs hover:shadow-md cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base">
                          ⛽
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600">
                            Ticket Gasolina (Total Energies RD)
                          </h4>
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">NCF B01 • Exento de ITBIS (Art. 343)</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Combustible RD$ 3,500.00. La IA reconoce la exención tributaria dominicana automáticamente.
                      </p>
                    </button>

                    <button
                      id="btn-sample-activo"
                      onClick={() => handleSampleSelect('computo')}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-purple-500 dark:hover:border-purple-500 transition-all text-left group shadow-xs hover:shadow-md cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base">
                          💻
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600">
                            Factura Laptop (CECOMSA Santo Domingo)
                          </h4>
                          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">NCF B01 • Activo Fijo (Categoría 2 DGII)</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Laptop Dell RD$ 76,700.00 con ITBIS 18% (RD$ 11,700.00) y regla de activo depreciable.
                      </p>
                    </button>

                    <button
                      id="btn-sample-restaurant"
                      onClick={() => handleSampleSelect('restaurante')}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-left group shadow-xs hover:shadow-md cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base">
                          🍽️
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600">
                            Almuerzo Ejecutivo (Restaurante El Laurel)
                          </h4>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">NCF B01 • ITBIS 18% + Propina Ley 10%</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Total RD$ 5,376.00 con desglose legal exacto de Propina de Ley (Ley 5432) e ITBIS.
                      </p>
                    </button>

                    <button
                      id="btn-sample-inventory"
                      onClick={() => handleSampleSelect('supermercado')}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-amber-500 dark:hover:border-amber-500 transition-all text-left group shadow-xs hover:shadow-md cursor-pointer"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base">
                          🛒
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600">
                            Supermercado (La Sirena Churchill)
                          </h4>
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">e-CF E31 • Factura Electrónica DGII</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Insumos RD$ 9,735.00 con desglose de ítems (Café Santo Domingo, Papel Bond, Limpieza).
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center hover:border-blue-500 transition-all bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Arrastra tu factura o ticket aquí
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Soporta formatos JPG, PNG, WEBP o PDF hasta 20MB
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs cursor-pointer shadow-xs">
                    <FileText className="w-4 h-4" />
                    <span>Seleccionar Archivo Local</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Camera Tab Fallback if error */}
              {activeTab === 'camera' && cameraError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs">
                  <p className="font-semibold mb-1">Aviso de Cámara:</p>
                  <p>{cameraError}</p>
                </div>
              )}
            </div>
          )}

          {/* Step: Live Camera Active */}
          {step === 'CAMERA_ACTIVE' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-full max-w-lg bg-black rounded-2xl overflow-hidden aspect-[4/3] shadow-lg border border-slate-700">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Guide overlay */}
                <div className="absolute inset-8 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] text-white bg-black/60 px-2 py-1 rounded">
                    Encuadre el comprobante fiscal
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
                    setStep('SELECT_MODE');
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={captureCameraPhoto}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm shadow-lg shadow-blue-600/30"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capturar Fotografía</span>
                </button>
              </div>
            </div>
          )}

          {/* Step: Processing */}
          {step === 'PROCESSING' && (
            <div className="py-16 text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-blue-600/10 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Procesando Comprobante con IA
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {processingStatus}
                </p>
                <p className="text-[11px] text-slate-400">
                  Motor: {activeProvider?.name} ({activeProvider?.selected_model})
                </p>
              </div>
            </div>
          )}

          {/* Step: Review and Edit Form */}
          {step === 'REVIEW_FORM' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Image Preview & AI Summary */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      Comprobante Original
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300">
                      IA Score: {confidenceScore}%
                    </span>
                  </div>
                  {selectedImage ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 max-h-64 flex items-center justify-center">
                      <img
                        src={selectedImage}
                        alt="Comprobante"
                        className="max-h-64 w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-40 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-400">
                      Sin vista previa
                    </div>
                  )}
                </div>

                {/* AI Observations Box */}
                {aiObservations.length > 0 && (
                  <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Validación Automática IA:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {aiObservations.map((obs, idx) => (
                        <li key={idx}>{obs}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column: Editable Data Form */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Supplier Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Razón Social / Proveedor *
                    </label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={e => setSupplierName(e.target.value)}
                      placeholder="Nombre del emisor"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Supplier RNC with Live DGII validation */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        RNC / Cédula *
                      </label>
                      <span className={`text-[10px] font-semibold ${rncValidation.isValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {rncValidation.isValid ? '✓ Válido DGII' : 'Revisar'}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={supplierRnc}
                      onChange={e => setSupplierRnc(e.target.value)}
                      placeholder="000-00000-0"
                      className={`w-full px-3 py-2 text-xs rounded-lg border font-mono font-medium focus:outline-none focus:ring-2 ${
                        rncValidation.isValid 
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 text-slate-900 dark:text-slate-100 focus:ring-emerald-500' 
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-blue-500'
                      }`}
                    />
                  </div>

                  {/* NCF with live format validation */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        NCF / e-NCF *
                      </label>
                      <span className={`text-[10px] font-semibold ${ncfValidation.isValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {ncfValidation.isValid ? '✓ Estructura OK' : 'Revisar'}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={ncf}
                      onChange={e => {
                        const val = e.target.value.toUpperCase();
                        setNcf(val);
                        if (val.startsWith('B01')) setNcfType('B01');
                        else if (val.startsWith('B02')) setNcfType('B02');
                        else if (val.startsWith('E31')) setNcfType('E31');
                        else if (val.startsWith('E32')) setNcfType('E32');
                      }}
                      placeholder="B0100000001"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Classification */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Clasificación Contable *
                    </label>
                    <select
                      value={classification}
                      onChange={e => setClassification(e.target.value as ExpenseClassification)}
                      aria-label="Clasificación Contable"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="GASTO_OPERATIVO">Gasto Operativo</option>
                      <option value="COSTO_VENTA">Costo de Venta</option>
                      <option value="COMPRA_INVENTARIO">Compra para Inventario</option>
                      <option value="ACTIVO_FIJO">Activo Fijo</option>
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fecha del Documento *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Category */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Categoría / Concepto
                    </label>
                    <input
                      type="text"
                      value={expenseCategory}
                      onChange={e => setExpenseCategory(e.target.value)}
                      placeholder="Ej: Combustible, Mantenimiento, Suministros"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Líneas de Detalle
                    </span>
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Agregar Ítem
                    </button>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]">
                        <tr>
                          <th className="p-2">Descripción</th>
                          <th className="p-2 w-16 text-center">Cant.</th>
                          <th className="p-2 w-24 text-right">Precio</th>
                          <th className="p-2 w-24 text-right">Total</th>
                          <th className="p-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {lineItems.map(item => (
                          <tr key={item.id}>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={item.description}
                                onChange={e => {
                                  setLineItems(lineItems.map(i => i.id === item.id ? { ...i, description: e.target.value } : i));
                                }}
                                className="w-full px-1.5 py-1 text-xs bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={e => {
                                  const q = parseFloat(e.target.value) || 1;
                                  setLineItems(lineItems.map(i => i.id === item.id ? { ...i, quantity: q, total: q * i.unit_price } : i));
                                }}
                                className="w-full px-1.5 py-1 text-xs text-center bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-1.5 text-right">
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={e => {
                                  const p = parseFloat(e.target.value) || 0;
                                  setLineItems(lineItems.map(i => i.id === item.id ? { ...i, unit_price: p, total: i.quantity * p } : i));
                                }}
                                className="w-full px-1.5 py-1 text-xs text-right bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-1.5 text-right font-medium">
                              {formatCurrency(item.total, 'DOP')}
                            </td>
                            <td className="p-1.5 text-center">
                              <button
                                onClick={() => handleRemoveLineItem(item.id)}
                                className="text-slate-400 hover:text-rose-500"
                                aria-label="Eliminar ítem"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Monetary Totals Breakdown */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Subtotal Neto:</span>
                    <input
                      type="number"
                      value={subtotal}
                      onChange={e => handleRecalculateTotals(parseFloat(e.target.value) || 0, itbisAmount, legalTipAmount, otherTaxes)}
                      className="w-28 text-right font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>ITBIS (18%):</span>
                    <input
                      type="number"
                      value={itbisAmount}
                      onChange={e => handleRecalculateTotals(subtotal, parseFloat(e.target.value) || 0, legalTipAmount, otherTaxes)}
                      className="w-28 text-right font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Propina Legal (10%):</span>
                    <input
                      type="number"
                      value={legalTipAmount}
                      onChange={e => handleRecalculateTotals(subtotal, itbisAmount, parseFloat(e.target.value) || 0, otherTaxes)}
                      className="w-28 text-right font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm font-bold text-slate-900 dark:text-slate-100">
                    <span>Total RD$:</span>
                    <span className="text-base text-blue-600 dark:text-blue-400 font-mono">
                      {formatCurrency(totalAmount, 'DOP')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          {step === 'REVIEW_FORM' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('SELECT_MODE')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
              >
                Volver a Escanear
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  id="btn-save-draft"
                  onClick={() => handleSaveExpense('BORRADOR')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100"
                >
                  Guardar Borrador
                </button>

                <button
                  type="button"
                  id="btn-send-review"
                  onClick={() => handleSaveExpense('PENDIENTE_REVISION')}
                  className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-400 hover:bg-amber-500 rounded-lg shadow-xs"
                >
                  Enviar a Revisión
                </button>

                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERVISOR' || currentUser?.role === 'ACCOUNTANT') && (
                  <button
                    type="button"
                    id="btn-approve-direct"
                    onClick={() => handleSaveExpense('APROBADO')}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-600/30"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprobar Inmediatamente</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={closeScanner}
              className="ml-auto px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
