import { ExpenseRecord, ERPConfig } from '../src/types.ts';
import crypto from 'crypto';
import { decryptApiKey } from './encryption.ts';

export interface ERPSyncResult {
  success: boolean;
  synced_count: number;
  failed_count: number;
  synced_expenses: ExpenseRecord[];
  errors: string[];
}

/**
 * Sends Approved Expenses to External AllSender ERP System with Idempotency & Tracing
 */
export async function syncExpensesToAllSenderERP(
  orgId: string,
  config: ERPConfig,
  expenses: ExpenseRecord[]
): Promise<ERPSyncResult> {
  if (!config.is_enabled) {
    return {
      success: false,
      synced_count: 0,
      failed_count: 0,
      synced_expenses: [],
      errors: ['El módulo de sincronización AllSender ERP está desactivado.']
    };
  }

  // Filter ONLY APPROVED expenses per strict accounting rule
  const eligible = expenses.filter(e => e.status === 'APROBADO');

  if (eligible.length === 0) {
    return {
      success: true,
      synced_count: 0,
      failed_count: 0,
      synced_expenses: [],
      errors: []
    };
  }

  const synced: ExpenseRecord[] = [];
  const errors: string[] = [];
  const now = new Date().toISOString();

  for (const exp of eligible) {
    try {
      const idempotencyKey = exp.idempotency_key || `idemp_erp_${exp.id}_${exp.updated_at}`;

      if (!config.api_endpoint || !config.api_endpoint.startsWith('http')) {
        exp.erp_sync_status = 'ERROR_SYNC';
        exp.erp_sync_error = 'ENDPOINT_NO_CONFIGURADO: Debe configurar la URL de API de AllSender ERP.';
        errors.push(`Comprobante NCF ${exp.ncf}: URL de endpoint ERP no configurada.`);
        continue;
      }

      // Build external ERP payload
      const payload = {
        organization_id: orgId,
        invoice_number: exp.ncf,
        tax_id: exp.supplier_rnc,
        vendor_name: exp.supplier_name,
        issue_date: exp.expense_date || exp.date,
        subtotal: exp.subtotal,
        tax_amount: exp.itbis_amount,
        total_amount: exp.total_amount,
        currency: exp.currency,
        account_code: config.ledger_account_default || '6105-01-000',
        line_items: exp.line_items || []
      };

      let erpSyncId = `as_inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      let isSuccess = true;

      // Decrypt real API key for authorization
      let realApiKey = '';
      if (config.encrypted_api_key) {
        try {
          realApiKey = decryptApiKey(config.encrypted_api_key);
        } catch {
          realApiKey = config.api_key_masked;
        }
      }

      try {
        const res = await fetch(config.api_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${realApiKey}`,
            'Idempotency-Key': idempotencyKey,
            'X-ErogaAI-Org': orgId
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          isSuccess = false;
          const errorText = await res.text();
          throw new Error(`ERP returned HTTP ${res.status}: ${errorText.substring(0, 100)}`);
        }

        const responseData = await res.json().catch(() => ({}));
        erpSyncId = responseData.sync_id || erpSyncId;
      } catch (fetchErr: any) {
        isSuccess = false;
        exp.erp_sync_status = 'ERROR_SYNC';
        exp.erp_sync_error = fetchErr.message || 'Error de conexión HTTP con AllSender ERP';
        errors.push(`Comprobante NCF ${exp.ncf}: ${exp.erp_sync_error}`);
        continue;
      }

      if (isSuccess) {
        exp.status = 'SINCRONIZADO_ERP';
        exp.erp_sync_status = 'SINCRONIZADO';
        exp.erp_synced_at = now;
        exp.all_sender_sync_id = erpSyncId;
        exp.all_sender_synced_at = now;
        exp.erp_response_payload = JSON.stringify({ status: 'ACCEPTED', ledger_account: config.ledger_account_default, ncf: exp.ncf });
        exp.updated_at = now;
        synced.push(exp);
      }
    } catch (err: any) {
      exp.erp_sync_status = 'ERROR_SYNC';
      exp.erp_sync_error = err.message || 'Error en procesamiento ERP';
      errors.push(`Error en comprobante ${exp.id}: ${exp.erp_sync_error}`);
    }
  }

  return {
    success: errors.length === 0,
    synced_count: synced.length,
    failed_count: errors.length,
    synced_expenses: synced,
    errors
  };
}
