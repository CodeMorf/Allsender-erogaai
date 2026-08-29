import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { 
  ExpenseClassification, 
  NcfType, 
  ReceiptExtraction, 
  LineItem,
  ReceiptSessionRecord,
  ExpenseRecord
} from '../types.js';
import { validateRNC, validateNCF, formatCurrency } from '../utils/formatters.js';
import { normalizeItbisRate } from '../utils/fiscalTaxes.ts';
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
  FileText, 
  Eye,
  ArrowUp,
  ArrowDown,
  Images
} from 'lucide-react';

interface CapturedSegment {
  id: string;
  segment_index: number;
  preview: string;
  file_name: string;
  mime_type: string;
  status: string;
}

function fiscalFingerprint(input: {
  supplierName: string;
  supplierRnc: string;
  ncf: string;
  ncfType: NcfType;
  subtotal: number;
  itbisAmount: number;
  legalTipAmount: number;
  otherTaxes: number;
  totalAmount: number;
  lineItems: LineItem[];
}): string {
  return JSON.stringify({
    supplierName: input.supplierName.trim(),
    supplierRnc: input.supplierRnc.replace(/\D/g, ''),
    ncf: input.ncf.replace(/[\s-]/g, '').toUpperCase(),
    ncfType: input.ncfType,
    subtotal: Number(input.subtotal),
    itbisAmount: Number(input.itbisAmount),
    legalTipAmount: Number(input.legalTipAmount),
    otherTaxes: Number(input.otherTaxes),
    totalAmount: Number(input.totalAmount),
    lineItems: input.lineItems.map(({ id: _id, ...item }) => item)
  });
}

export const ExpenseScannerModal: React.FC = () => {
  const { 
    isScannerOpen, 
    closeScanner, 
    createExpense, 
    currentUser, 
    aiProviders, 
    showToast 
  } = useApp();

  const [step, setStep] = useState<'SELECT_MODE' | 'CAMERA_ACTIVE' | 'SEGMENT_REVIEW' | 'PROCESSING' | 'REVIEW_FORM'>('SELECT_MODE');
  const [receiptSessionId, setReceiptSessionId] = useState<string | null>(null);
  const [segments, setSegments] = useState<CapturedSegment[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [replaceSegmentId, setReplaceSegmentId] = useState<string | null>(null);
  const [processedSession, setProcessedSession] = useState<ReceiptSessionRecord | null>(null);
  const [segmentSaving, setSegmentSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
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
  const [validationSnapshot, setValidationSnapshot] = useState<string | null>(null);

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
      setReceiptSessionId(null);
      setSegments([]);
      setActivePreviewIndex(0);
      setReplaceSegmentId(null);
      setProcessedSession(null);
      setCameraError(null);
      setValidationSnapshot(null);
    }
  }, [isScannerOpen]);

  // The video element is mounted only after CAMERA_ACTIVE renders. Attach the
  // stream after that render so the live camera is actually displayed.
  useEffect(() => {
    const video = videoRef.current;
    const preview = previewCanvasRef.current;
    if (!video || !preview || !cameraStream || step !== 'CAMERA_ACTIVE') return;

    video.srcObject = cameraStream;
    let animationFrameId: number | null = null;
    let previewStarted = false;

    const drawPreviewFrame = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth && video.videoHeight) {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const targetWidth = Math.max(640, Math.round(preview.clientWidth * pixelRatio));
        const targetHeight = Math.max(480, Math.round(preview.clientHeight * pixelRatio));

        if (preview.width !== targetWidth || preview.height !== targetHeight) {
          preview.width = targetWidth;
          preview.height = targetHeight;
        }

        const context = preview.getContext('2d');
        if (context) {
          const sourceRatio = video.videoWidth / video.videoHeight;
          const targetRatio = preview.width / preview.height;
          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = video.videoWidth;
          let sourceHeight = video.videoHeight;

          if (sourceRatio > targetRatio) {
            sourceWidth = video.videoHeight * targetRatio;
            sourceX = (video.videoWidth - sourceWidth) / 2;
          } else if (sourceRatio < targetRatio) {
            sourceHeight = video.videoWidth / targetRatio;
            sourceY = (video.videoHeight - sourceHeight) / 2;
          }

          context.drawImage(
            video,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            preview.width,
            preview.height
          );
        }
      }

      animationFrameId = window.requestAnimationFrame(drawPreviewFrame);
    };

    const startPreview = () => {
      if (previewStarted) return;
      previewStarted = true;
      drawPreviewFrame();
    };

    video.addEventListener('playing', startPreview);
    void video.play().then(startPreview).catch((error) => {
      console.warn('Camera video playback was deferred:', error);
      setCameraError('Toca nuevamente la cámara para iniciar la vista previa.');
    });

    return () => {
      video.removeEventListener('playing', startPreview);
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (video.srcObject === cameraStream) {
        video.srcObject = null;
      }
    };
  }, [cameraStream, step]);

  if (!isScannerOpen) return null;

  const startCamera = async () => {
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Este navegador no permite acceder a la cámara. Por favor sube una imagen.');
      return;
    }

    try {
      // Prefer the rear camera on phones, but do not force that constraint on
      // desktop browsers where it can select an unavailable/black device.
      const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
      const preferredConstraints: MediaStreamConstraints = {
        audio: false,
        video: isMobileDevice
          ? { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
      } catch (error: any) {
        // A camera may reject the preferred constraint even though another
        // usable camera is available. Retry only for device/constraint errors;
        // permission failures must remain visible to the user.
        if (!['NotFoundError', 'OverconstrainedError'].includes(error?.name)) {
          throw error;
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setCameraStream(stream);
      setStep('CAMERA_ACTIVE');
    } catch (err: any) {
      console.error('Camera error:', err);
      const message = err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
        ? 'Permite el acceso a la cámara en el navegador y vuelve a intentarlo.'
        : 'No se encontró una cámara disponible. Verifica el dispositivo o sube una imagen.';
      setCameraError(message);
    }
  };

  const readApiError = async (response: Response, fallback: string) => {
    try {
      const payload = await response.json();
      return payload.error || payload.message || fallback;
    } catch {
      return fallback;
    }
  };

  const ensureReceiptSession = async (): Promise<string> => {
    if (receiptSessionId) return receiptSessionId;
    const response = await fetch('/api/receipt-sessions', { method: 'POST' });
    if (!response.ok) throw new Error(await readApiError(response, 'No se pudo iniciar la sesión del comprobante.'));
    const payload = await response.json();
    const sessionId = payload.data?.id as string | undefined;
    if (!sessionId) throw new Error('El servidor no devolvió la sesión del comprobante.');
    setReceiptSessionId(sessionId);
    return sessionId;
  };

  const persistSegment = async (imageSrc: string, fileName: string, mimeType: string) => {
    setSegmentSaving(true);
    try {
      const sessionId = await ensureReceiptSession();
      const replacingId = replaceSegmentId;
      const endpoint = replacingId
        ? `/api/receipt-sessions/${sessionId}/segments/${replacingId}`
        : `/api/receipt-sessions/${sessionId}/segments`;
      const response = await fetch(endpoint, {
        method: replacingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageSrc, file_name: fileName, mime_type: mimeType })
      });
      if (!response.ok) throw new Error(await readApiError(response, 'No se pudo guardar el segmento.'));
      const payload = await response.json();

      if (replacingId) {
        const saved = payload.data;
        setSegments(current => current.map(segment => segment.id === replacingId
          ? { ...segment, preview: imageSrc, file_name: fileName, mime_type: mimeType, status: saved?.status || 'UPLOADED' }
          : segment));
        setReplaceSegmentId(null);
      } else {
        const session = payload.data as ReceiptSessionRecord;
        const saved = session.segments[session.segments.length - 1];
        setSegments(current => [...current, {
          id: saved.id,
          segment_index: saved.segment_index,
          preview: imageSrc,
          file_name: saved.file_name || fileName,
          mime_type: saved.mime_type || mimeType,
          status: saved.status
        }]);
        setActivePreviewIndex(session.segments.length - 1);
      }
      setStep('SEGMENT_REVIEW');
    } finally {
      setSegmentSaving(false);
    }
  };

  const captureCameraPhoto = async () => {
    const video = videoRef.current;
    if (!video || !cameraStream || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
      setCameraError('La cámara todavía está iniciando. Espera un momento e inténtalo de nuevo.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
      }
      try {
        await persistSegment(dataUrl, `segmento_${segments.length + 1}.jpg`, 'image/jpeg');
      } catch (error: any) {
        showToast('error', 'No se guardó la foto', error.message || 'Inténtalo nuevamente.');
        setStep(segments.length > 0 ? 'SEGMENT_REVIEW' : 'SELECT_MODE');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await persistSegment(base64, file.name, file.type || 'image/jpeg');
      } catch (error: any) {
        showToast('error', 'No se guardó el archivo', error.message || 'Inténtalo nuevamente.');
        setStep(segments.length > 0 ? 'SEGMENT_REVIEW' : 'SELECT_MODE');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const processReceiptSession = async () => {
    if (!receiptSessionId || segments.length === 0) return;
    setStep('PROCESSING');
    setProcessingStatus('Leyendo cada tramo con OCR local...');

    try {
      const providerTimer = window.setTimeout(() => setProcessingStatus('Consolidando líneas, solapes y totales fiscales...'), 700);
      const dgiiTimer = window.setTimeout(() => setProcessingStatus('Validando proveedor y estado de empresa...'), 1500);
      const res = await fetch(`/api/receipt-sessions/${receiptSessionId}/process`, { method: 'POST' });
      window.clearTimeout(providerTimer);
      window.clearTimeout(dgiiTimer);

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Fallo en la extracción de datos.'));
      }

      const data = await res.json();
      const session: ReceiptSessionRecord = data.data;
      const ext: ReceiptExtraction = session.extraction || {
        supplier_name: '', supplier_rnc: '', ncf: '', ncf_type: 'B01', date: new Date().toISOString().split('T')[0],
        document_type: 'RECIBO', subtotal: 0, itbis_amount: 0, legal_tip_amount: 0, other_taxes: 0, total_amount: 0,
        currency: 'DOP', suggested_classification: 'GASTO_OPERATIVO', suggested_category: '', confidence_score: 0, observations: [], line_items: []
      };
      setProcessedSession(session);
      setSegments(current => current.map(segment => {
        const processed = session.segments.find(item => item.id === segment.id);
        return processed ? { ...segment, status: processed.status } : segment;
      }));

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
      setConfidenceScore(ext.confidence_score || 0);
      setAiObservations(ext.observations || []);
      
      const parsedItems = (ext.line_items || []).map((li, idx) => ({
        id: `item-${idx}-${Date.now()}`,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        itbis_rate: normalizeItbisRate(li.itbis_rate),
        total: li.total,
        sku: li.sku,
        discount: li.discount,
        taxable_amount: li.taxable_amount,
        itbis_amount: li.itbis_amount,
        segment_index: li.segment_index,
        confidence: li.confidence,
        raw_text: li.raw_text
      }));
      setLineItems(parsedItems);
      setValidationSnapshot(fiscalFingerprint({
        supplierName: ext.supplier_name || '',
        supplierRnc: ext.supplier_rnc || '',
        ncf: ext.ncf || '',
        ncfType: ext.ncf_type || 'B01',
        subtotal: ext.subtotal || 0,
        itbisAmount: ext.itbis_amount || 0,
        legalTipAmount: ext.legal_tip_amount || 0,
        otherTaxes: ext.other_taxes || 0,
        totalAmount: ext.total_amount || 0,
        lineItems: parsedItems
      }));

      setStep('REVIEW_FORM');
      if (session.status === 'REVIEW_REQUIRED') {
        showToast('warning', 'Revisión necesaria', 'El comprobante fue leído, pero tiene datos que deben confirmarse.');
      } else {
        showToast('success', 'Documento escaneado', `Datos extraídos con ${ext.confidence_score}% de confianza.`);
      }
    } catch (err: any) {
      console.error('Error processing OCR:', err);
      showToast('error', 'Error en OCR', err.message || 'No se pudo completar el análisis del documento.');
      setStep('SEGMENT_REVIEW');
    }
  };

  const removeSegment = async (segmentId: string) => {
    if (!receiptSessionId) return;
    const response = await fetch(`/api/receipt-sessions/${receiptSessionId}/segments/${segmentId}`, { method: 'DELETE' });
    if (!response.ok) {
      showToast('error', 'No se eliminó el tramo', await readApiError(response, 'Inténtalo nuevamente.'));
      return;
    }
    setSegments(current => current.filter(segment => segment.id !== segmentId).map((segment, index) => ({ ...segment, segment_index: index })));
    setActivePreviewIndex(index => Math.max(0, Math.min(index, segments.length - 2)));
  };

  const reorderSegment = async (segmentId: string, direction: -1 | 1) => {
    if (!receiptSessionId) return;
    const fromIndex = segments.findIndex(segment => segment.id === segmentId);
    const toIndex = fromIndex + direction;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= segments.length) return;
    const reordered = [...segments];
    const [moving] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moving);
    const response = await fetch(`/api/receipt-sessions/${receiptSessionId}/segments/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segment_ids: reordered.map(segment => segment.id) })
    });
    if (!response.ok) {
      showToast('error', 'No se cambió el orden', await readApiError(response, 'Inténtalo nuevamente.'));
      return;
    }
    setSegments(reordered.map((segment, index) => ({ ...segment, segment_index: index })));
    setActivePreviewIndex(toIndex);
  };

  const repeatSegment = (segmentId: string) => {
    setReplaceSegmentId(segmentId);
    setActiveTab('camera');
    void startCamera();
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
      itbis_rate: 0,
      total: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(i => i.id !== id));
  };

  const handleSaveExpense = async (status: 'BORRADOR' | 'PENDIENTE_REVISION' | 'APROBADO') => {
    if (status === 'APROBADO' && !canApproveDirect) {
      showToast('warning', 'Revalidación requerida', 'Corrija los datos y vuelva a procesar el comprobante antes de aprobarlo.');
      return;
    }
    try {
      const reportedProvider = processedSession?.meta?.provider_used || activeProvider?.provider_type || 'TESSERACT';
      const aiProviderUsed: ExpenseRecord['ai_provider_used'] = ['GEMINI', 'GROQ', 'OPENAI', 'CODEMORF'].includes(reportedProvider)
        ? reportedProvider as ExpenseRecord['ai_provider_used']
        : 'TESSERACT';
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
        supplier_id: processedSession?.supplier_id,
        receipt_session_id: receiptSessionId || undefined,
        receipt_image_url: receiptSessionId && segments[0]
          ? `/api/receipt-sessions/${receiptSessionId}/segments/${segments[0].id}/image`
          : undefined,
        ai_confidence_score: confidenceScore,
        ai_provider_used: aiProviderUsed,
        ai_model_used: processedSession?.meta?.model_used || activeProvider?.selected_model || 'ocr-local',
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
  const currentFiscalFingerprint = fiscalFingerprint({ supplierName, supplierRnc, ncf, ncfType, subtotal, itbisAmount, legalTipAmount, otherTaxes, totalAmount, lineItems });
  const validationIsCurrent = validationSnapshot !== null && validationSnapshot === currentFiscalFingerprint;
  const supplierIsActive = processedSession?.supplier_resolution?.dgii_status === 'ACTIVO';
  const canApproveDirect = processedSession?.status === 'PROCESSED'
    && validationIsCurrent
    && processedSession.fiscal_validation?.is_valid === true
    && processedSession.reconciliation?.is_valid === true
    && supplierIsActive
    && ['ADMIN', 'SUPERVISOR', 'ACCOUNTANT'].includes(currentUser?.role || '');

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
                OCR local primero; IA solo cuando haga falta
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
                  onClick={() => setActiveTab('upload')}
                  className={`pb-3 font-semibold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'upload'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Subir Imagen / PDF / Foto
                </button>
                <button
                  onClick={() => {
                    setActiveTab('camera');
                    startCamera();
                  }}
                  className={`pb-3 font-semibold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'camera'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  Tomar Foto con Cámara
                </button>
              </div>

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
                  muted
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                />
                <canvas
                  ref={previewCanvasRef}
                  className="block w-full h-full"
                  aria-label="Vista previa en vivo de la cámara"
                />
                {/* Guide overlay */}
                <div className="absolute inset-8 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] text-white bg-black/60 px-2 py-1 rounded">
                    Encuadre el comprobante fiscal
                  </span>
                </div>
              </div>
              {cameraError && (
                <p className="w-full max-w-lg rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
                  {cameraError}
                </p>
              )}
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
                  disabled={segmentSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm shadow-lg shadow-blue-600/30"
                >
                  <Camera className="w-4 h-4" />
                  <span>{segmentSaving ? 'Guardando...' : replaceSegmentId ? 'Repetir Fotografía' : 'Capturar Fotografía'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Step: Multi-segment capture review */}
          {step === 'SEGMENT_REVIEW' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                <p className="font-bold">Comprobante largo: {segments.length} de 20 tramos</p>
                <p className="mt-1">En cada foto siguiente repite aproximadamente 15–20% del final anterior. ErogaAI elimina únicamente el solape consecutivo.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7">
                  <div className="relative min-h-72 rounded-2xl border border-slate-200 bg-slate-950 p-3 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                    {segments[activePreviewIndex]?.mime_type === 'application/pdf' ? (
                      <div className="text-center text-white">
                        <FileText className="mx-auto h-12 w-12" />
                        <p className="mt-2 text-xs font-semibold">{segments[activePreviewIndex]?.file_name}</p>
                      </div>
                    ) : (
                      <img
                        src={segments[activePreviewIndex]?.preview}
                        alt={`Tramo ${activePreviewIndex + 1}`}
                        className="max-h-[52vh] w-auto object-contain"
                      />
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white">
                      Tramo {activePreviewIndex + 1}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      <Images className="h-4 w-4 text-blue-600" /> Tramos capturados
                    </h3>
                    <span className="text-[11px] text-slate-500">Orden de lectura</span>
                  </div>
                  <div className="max-h-[47vh] space-y-2 overflow-y-auto pr-1">
                    {segments.map((segment, index) => (
                      <div
                        key={segment.id}
                        className={`flex items-center gap-2 rounded-xl border p-2 ${index === activePreviewIndex ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        <button type="button" onClick={() => setActivePreviewIndex(index)} className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                          {segment.mime_type === 'application/pdf' ? (
                            <FileText className="m-auto h-full w-6 text-white" />
                          ) : (
                            <img src={segment.preview} alt="" className="h-full w-full object-cover" />
                          )}
                        </button>
                        <button type="button" onClick={() => setActivePreviewIndex(index)} className="min-w-0 flex-1 text-left">
                          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Tramo {index + 1}</span>
                          <span className="block truncate text-[10px] text-slate-500">{segment.file_name}</span>
                          <span className={`text-[10px] font-semibold ${['FAILED', 'LOW_CONFIDENCE'].includes(segment.status) ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {segment.status === 'FAILED' ? '⚠ Falló' : segment.status === 'LOW_CONFIDENCE' ? '⚠ Foto borrosa o ambigua' : segment.status === 'OCR_COMPLETED' ? '✓ OCR completo' : '✓ Guardado'}
                          </span>
                        </button>
                        <div className="grid grid-cols-2 gap-1">
                          <button type="button" onClick={() => reorderSegment(segment.id, -1)} disabled={index === 0} aria-label="Subir tramo" className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => reorderSegment(segment.id, 1)} disabled={index === segments.length - 1} aria-label="Bajar tramo" className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"><ArrowDown className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => repeatSegment(segment.id)} aria-label="Repetir foto" className="rounded p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-950"><RefreshCw className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => removeSegment(segment.id)} aria-label="Eliminar tramo" className="rounded p-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setReplaceSegmentId(null); setActiveTab('camera'); void startCamera(); }} disabled={segments.length >= 20} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">
                    <Camera className="h-4 w-4" /> Agregar siguiente tramo
                  </button>
                  <label className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200 ${segments.length >= 20 ? 'pointer-events-none opacity-40' : 'cursor-pointer'}`}>
                    <Upload className="h-4 w-4" /> Subir otro tramo
                    <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <button type="button" onClick={processReceiptSession} disabled={segments.length === 0 || segmentSaving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
                  <Sparkles className="h-4 w-4" /> Finalizar y procesar
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
                  Procesando comprobante completo
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {processingStatus}
                </p>
                <p className="text-[11px] text-slate-400">
                  OCR local por tramo y verificación inteligente cuando sea necesaria
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
                      Comprobante completo ({segments.length} tramos)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300">
                      IA Score: {confidenceScore}%
                    </span>
                  </div>
                  {segments[activePreviewIndex] ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 max-h-64 flex items-center justify-center">
                      {segments[activePreviewIndex].mime_type === 'application/pdf' ? (
                        <div className="py-12 text-center text-white"><FileText className="mx-auto h-10 w-10" /><p className="mt-2 text-xs">{segments[activePreviewIndex].file_name}</p></div>
                      ) : (
                        <img
                          src={segments[activePreviewIndex].preview}
                          alt={`Tramo ${activePreviewIndex + 1}`}
                          className="max-h-64 w-auto object-contain"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="h-40 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-400">
                      Sin vista previa
                    </div>
                  )}
                  {segments.length > 1 && (
                    <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                      {segments.map((segment, index) => (
                        <button key={segment.id} type="button" onClick={() => setActivePreviewIndex(index)} className={`h-12 w-12 shrink-0 overflow-hidden rounded border-2 bg-slate-900 ${index === activePreviewIndex ? 'border-blue-500' : 'border-transparent'}`}>
                          {segment.mime_type === 'application/pdf' ? <FileText className="m-auto h-full w-5 text-white" /> : <img src={segment.preview} alt="" className="h-full w-full object-cover" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {processedSession && (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"><span className="block text-slate-500">Segmentos</span><strong>{processedSession.segments_count}</strong></div>
                    <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"><span className="block text-slate-500">Productos</span><strong>{lineItems.length}</strong></div>
                    <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"><span className="block text-slate-500">Solapes eliminados</span><strong>{processedSession.duplicates_removed}</strong></div>
                    <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"><span className="block text-slate-500">Cuadre matemático</span><strong className={processedSession.reconciliation?.is_valid ? 'text-emerald-600' : 'text-amber-600'}>{processedSession.reconciliation?.is_valid ? 'Correcto' : `Revisar ${formatCurrency(Math.abs(processedSession.reconciliation?.difference || 0), 'DOP')}`}</strong></div>
                    <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"><span className="block text-slate-500">Empresa</span><strong className={processedSession.supplier_resolution?.dgii_status === 'ACTIVO' ? 'text-emerald-600' : 'text-amber-600'}>{processedSession.supplier_resolution?.dgii_status || 'Sin validar'}</strong></div>
                    <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"><span className="block text-slate-500">Proveedor</span><strong className={['EXISTING', 'CREATED'].includes(processedSession.supplier_resolution?.status || '') ? 'text-emerald-600' : 'text-amber-600'}>{processedSession.supplier_resolution?.status === 'CREATED' ? 'Creado automáticamente' : processedSession.supplier_resolution?.status === 'EXISTING' ? 'Existente' : 'Pendiente de validación'}</strong></div>
                  </div>
                )}

                {processedSession && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-[11px] dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-2 flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Validación para aprobar
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <span className={processedSession.fiscal_validation?.rnc_valid ? 'text-emerald-600' : 'text-amber-600'}>{processedSession.fiscal_validation?.rnc_valid ? '✓ RNC válido' : '⚠ RNC por revisar'}</span>
                      <span className={processedSession.fiscal_validation?.ncf_valid ? 'text-emerald-600' : 'text-amber-600'}>{processedSession.fiscal_validation?.ncf_valid ? '✓ NCF válido' : '⚠ NCF por revisar'}</span>
                      <span className={processedSession.reconciliation?.is_valid ? 'text-emerald-600' : 'text-amber-600'}>{processedSession.reconciliation?.is_valid ? '✓ Montos cuadrados' : '⚠ Montos por revisar'}</span>
                      <span className={supplierIsActive ? 'text-emerald-600' : 'text-amber-600'}>{supplierIsActive ? '✓ Empresa activa' : '⚠ Empresa no activa'}</span>
                    </div>
                    {!validationIsCurrent && (
                      <p className="mt-2 flex items-start gap-1 text-amber-700 dark:text-amber-400"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Los datos fueron modificados después de la validación. Deben volver a validarse antes de aprobar.</p>
                    )}
                    {(processedSession.fiscal_validation?.errors || []).length > 0 && (
                      <p className="mt-2 text-rose-600 dark:text-rose-400">{processedSession.fiscal_validation?.errors.join(' ')}</p>
                    )}
                  </div>
                )}

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
                        const detectedType = (['B01', 'B02', 'B11', 'B14', 'B15', 'B16', 'E31', 'E32', 'E44', 'E45'] as NcfType[]).find(type => val.replace(/[\s-]/g, '').startsWith(type));
                        if (detectedType) setNcfType(detectedType);
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
                    <table className="w-full min-w-[620px] text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]">
                        <tr>
                          <th className="p-2">Descripción</th>
                          <th className="p-2 w-16 text-center">Cant.</th>
                          <th className="p-2 w-24 text-right">Precio</th>
                          <th className="p-2 w-20 text-right">Desc.</th>
                          <th className="p-2 w-16 text-right">ITBIS %</th>
                          <th className="p-2 w-24 text-right">Total</th>
                          <th className="p-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {lineItems.length === 0 && (
                          <tr><td colSpan={7} className="p-4 text-center text-[11px] text-amber-700 dark:text-amber-400">No se detectaron líneas de productos. Revise el comprobante o agregue los conceptos manualmente; ErogaAI no inventa líneas.</td></tr>
                        )}
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
                            <td className="p-1.5 text-right">
                              <input
                                type="number"
                                min="0"
                                value={item.discount ?? 0}
                                onChange={e => {
                                  const discount = parseFloat(e.target.value) || 0;
                                  setLineItems(lineItems.map(i => i.id === item.id ? { ...i, discount } : i));
                                }}
                                className="w-full px-1.5 py-1 text-xs text-right bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none"
                              />
                            </td>
                            <td className="p-1.5 text-right">
                              <input
                                type="number"
                                min="0"
                                value={item.itbis_rate ?? 0}
                                onChange={e => {
                                  const itbisRate = normalizeItbisRate(e.target.value);
                                  setLineItems(lineItems.map(i => i.id === item.id ? { ...i, itbis_rate: itbisRate } : i));
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
                    <span>ITBIS:</span>
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
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Otros impuestos:</span>
                    <input
                      type="number"
                      value={otherTaxes}
                      onChange={e => handleRecalculateTotals(subtotal, itbisAmount, legalTipAmount, parseFloat(e.target.value) || 0)}
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
                onClick={() => setStep('SEGMENT_REVIEW')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
              >
                Revisar tramos
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

                {processedSession?.status === 'PROCESSED' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERVISOR' || currentUser?.role === 'ACCOUNTANT') && (
                  <button
                    type="button"
                    id="btn-approve-direct"
                    onClick={() => handleSaveExpense('APROBADO')}
                    disabled={!canApproveDirect}
                    title={!canApproveDirect ? 'Los datos deben estar validados y el proveedor debe estar ACTIVO.' : undefined}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-40"
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
