// Re-exports from local-store — all logic runs client-side in the browser
export {
  listEntitlements,
  getEntitlement,
  deleteEntitlement,
  evaluateInline,
  evaluateRbacInline,
  reEvaluate,
  reEvaluateRbac,
  getEvaluationHistory,
  getSummary,
} from "./local-store";
