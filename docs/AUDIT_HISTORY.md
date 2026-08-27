# Immutable Audit Trail — ErogaAI SaaS

## Overview

ErogaAI SaaS maintains an append-only audit trail for all business actions in compliance with financial auditing standards.

## Recorded Fields
- `id`
- `organization_id`
- `user_id`
- `user_name`
- `action` (CREAR_GASTO, APROBAR_GASTO, RECHAZAR_GASTO, EXPORTAR_606, SYNC_ERP, CREAR_USUARIO, CREAR_API_KEY, REVOCAR_API_KEY, etc.)
- `entity_type` (EXPENSE, USER, COMPANY, BRANCH, API_KEY, SETTINGS, ROLE)
- `entity_id`
- `details`
- `before_state`
- `after_state`
- `result` (SUCCESS / FAILED)
- `ip_address`
- `user_agent`
- `request_id`
- `created_at`

Audit logs are strictly read-only and cannot be edited or deleted via standard API endpoints.
