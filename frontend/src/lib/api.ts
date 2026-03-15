// Re-exports from local-store — all logic runs client-side in the browser
export {
  listEntitlements,
  getEntitlement,
  deleteEntitlement,
  evaluateInline,
  reEvaluate,
  getEvaluationHistory,
  getSummary,
} from "./local-store";
