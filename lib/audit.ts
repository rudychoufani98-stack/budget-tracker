import { supabaseAdmin } from './supabase'

export async function writeAudit(
  action: string,
  entityType: string,
  entityId: string | null,
  actor: string | null,
  details?: Record<string, unknown>
) {
  try {
    await supabaseAdmin.from('audit_log').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      actor,
      details: details || null,
    })
  } catch {
    // Audit failures should never break the main flow
  }
}
