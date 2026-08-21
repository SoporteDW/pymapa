/**
 * Analítica de interacción provisional (POC-02, sección 13; POC-03, sección 15).
 * Registra eventos en memoria y en localStorage para facilitar la validación
 * del prototipo. No envía datos a ningún servicio externo.
 */

export type EventoInteraccion =
  | "vista_abierta"
  | "perfil_guardado"
  | "diagnostico_iniciado"
  | "paso_completado"
  | "diagnostico_completado"
  | "resultados_generados"
  | "dimension_abierta"
  | "accion_abierta"
  | "accion_iniciada"
  | "accion_completada"
  | "datos_demo_cargados"
  | "datos_reiniciados"
  | "ruta_invalida"
  // Eventos técnicos del sistema de diagnóstico (POC-03, sección 15).
  | "diagnostic_started"
  | "question_answered"
  | "diagnostic_paused"
  | "diagnostic_resumed"
  | "diagnostic_completed"
  | "diagnostic_error"
  // Eventos técnicos del motor de conocimiento (POC-04, sección 16).
  | "engine_executed"
  | "engine_error"
  // Eventos de resultados, prioridades y fichas de acción (POC-05).
  | "results_viewed"
  | "results_error"
  | "results_scenario_loaded"
  | "action_card_opened"
  | "action_filters_changed"
  | "traceability_opened"
  // Eventos de roadmap, ejecución y seguimiento (POC-06, sección 19).
  | "roadmap_generated"
  | "roadmap_demo_loaded"
  | "roadmap_viewed"
  | "roadmap_view_changed"
  | "roadmap_filters_changed"
  | "roadmap_action_opened"
  | "roadmap_state_changed"
  | "roadmap_step_toggled"
  | "roadmap_progress_updated"
  | "roadmap_action_blocked"
  | "roadmap_action_unblocked"
  | "roadmap_action_discarded"
  | "roadmap_action_rescheduled"
  | "roadmap_phase_changed"
  | "roadmap_note_added"
  | "roadmap_evidence_added"
  // Eventos de dashboard e indicadores (POC-07, secciones 6 y 9).
  | "dashboard_viewed"
  | "dashboard_error"
  | "dashboard_filters_changed"
  | "dashboard_filters_reset"
  | "dashboard_kpi_opened"
  | "dashboard_dimension_opened"
  | "dashboard_alerts_viewed"
  | "dashboard_next_action_opened"
  // Eventos de integración, datos simulados y persistencia (POC-08).
  | "integration_profile_loaded"
  | "integration_consistency_checked"
  | "integration_session_exported"
  | "integration_session_restored"
  | "integration_session_reset"
  | "integration_error"
  // Eventos del Modo Demostración controlado (iteración de refinamiento).
  | "demo_mode_started"
  | "demo_mode_exited"
  | "demo_stage_autofilled"
  // Eventos del Diagnóstico Inteligente · E-commerce (POC E-commerce v0.1).
  | "kb_diagnosis_opened"
  | "kb_question_answered"
  | "kb_diagnosis_evaluated"
  | "kb_finding_traced"
  | "kb_demo_dataset_loaded"
  | "kb_diagnosis_reset"
  | "kb_initiative_created"
  | "kb_conversation_query"
  // Eventos de suficiencia y evidencias documentales (Macroentrega 1 · B2/B3).
  | "sufficiency_evaluated"
  | "evidence_requested"
  | "evidence_uploaded"
  | "evidence_analyzed"
  | "clarification_answered"
  // Eventos del workspace de ejecución guiada (Macroentrega 2 · B4/B5/B6).
  | "workspace_opened"
  | "workspace_started"
  | "workspace_step_toggled"
  | "workspace_delivery_submitted"
  | "workspace_delivery_reviewed"
  | "workspace_checklist_activated"
  | "workspace_checklist_marked"
  | "hero_scenario_activated"
  // Macroentrega 3 · seguimiento, colaboración y apoyo humano.
  | "workspace_activity_reopened"
  | "workspace_followup_activity_created"
  | "workspace_evidence_linked"
  | "seguimiento_created"
  | "seguimiento_milestone_recorded"
  | "seguimiento_evaluated"
  | "seguimiento_decision_applied"
  | "delegation_created"
  | "delegation_status_changed"
  | "human_support_suggested"
  | "human_support_booked"
  | "human_support_closed";



const STORAGE_KEY = "pyme-digital-eventos-v1";
const MAX_EVENTOS = 100;

export interface RegistroEvento {
  evento: EventoInteraccion;
  detalle?: Record<string, string | number | boolean> | undefined;
  fecha: string;
}

export function registrarEvento(
  evento: EventoInteraccion,
  detalle?: Record<string, string | number | boolean>
) {
  const registro: RegistroEvento = { evento, detalle, fecha: new Date().toISOString() };
  if (typeof window === "undefined") return;
  try {
    const previo = window.localStorage.getItem(STORAGE_KEY);
    const lista: RegistroEvento[] = previo ? JSON.parse(previo) : [];
    lista.unshift(registro);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(0, MAX_EVENTOS)));
  } catch {
    // La analítica provisional nunca debe bloquear la navegación.
  }
}

export function leerEventos(): RegistroEvento[] {
  if (typeof window === "undefined") return [];
  try {
    const previo = window.localStorage.getItem(STORAGE_KEY);
    return previo ? (JSON.parse(previo) as RegistroEvento[]) : [];
  } catch {
    return [];
  }
}
