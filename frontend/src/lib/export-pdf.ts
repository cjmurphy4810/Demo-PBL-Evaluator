// PDF report generator — creates formatted audit-ready PDF from entitlement data

import jsPDF from "jspdf";
import type { Entitlement } from "../types/api";
import { evaluateRules } from "./rule-engine";
import { classifyTier } from "./tier-classifier";
import { evaluateRbac } from "./rbac-engine";

function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function generatePblRecommendations(flags: string[]): string[] {
  const map: Record<string, string> = {
    text_too_short: "Add more detail to the description.",
    high_gunning_fog: "Simplify sentence structure and reduce complex vocabulary.",
    long_sentences: "Break long sentences into shorter, clearer statements.",
    missing_conditions: "Add conditions or constraints for when this entitlement applies.",
    missing_business_justification: "Provide a clear business justification.",
    jargon_detected: "Replace technical jargon with plain business language.",
    high_passive_voice: "Rewrite passive voice sentences in active voice.",
    ambiguous_terms: "Replace vague terms with specifics.",
    complex_sentences: "Simplify complex sentences.",
    vague_resources: "Name specific resources instead of generic terms.",
    vague_scope: "Define exact permissions instead of broad access.",
    inconsistent_access_level: "Description mentions actions beyond the stated access level.",
  };
  return flags.map((f) => map[f] || f.replace(/_/g, " ")).filter(Boolean);
}

class ReportBuilder {
  private doc: jsPDF;
  private y: number;
  private pageWidth: number;
  private margin: number;
  private contentWidth: number;

  constructor() {
    this.doc = new jsPDF({ unit: "mm", format: "a4" });
    this.pageWidth = 210;
    this.margin = 15;
    this.contentWidth = this.pageWidth - 2 * this.margin;
    this.y = this.margin;
  }

  private checkPage(needed: number) {
    if (this.y + needed > 280) {
      this.doc.addPage();
      this.y = this.margin;
      this.addFooter();
    }
  }

  private addFooter() {
    const page = this.doc.getNumberOfPages();
    this.doc.setPage(page);
    this.doc.setFontSize(7);
    this.doc.setTextColor(150, 150, 150);
    this.doc.text(
      `PBL Evaluator - Entitlement Assessment Report | Page ${page}`,
      this.pageWidth / 2,
      290,
      { align: "center" },
    );
  }

  title(text: string) {
    this.doc.setFontSize(18);
    this.doc.setTextColor(17, 24, 39);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(text, this.margin, this.y);
    this.y += 8;
    this.doc.setDrawColor(37, 99, 235);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 6;
  }

  subtitle(text: string) {
    this.doc.setFontSize(11);
    this.doc.setTextColor(100, 100, 100);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(text, this.margin, this.y);
    this.y += 8;
  }

  sectionHeader(text: string) {
    this.checkPage(15);
    this.y += 3;
    this.doc.setFontSize(13);
    this.doc.setTextColor(30, 64, 175);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(text, this.margin, this.y);
    this.y += 5;
    this.doc.setDrawColor(209, 213, 219);
    this.doc.setLineWidth(0.2);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 5;
  }

  subHeader(text: string) {
    this.checkPage(10);
    this.doc.setFontSize(10);
    this.doc.setTextColor(55, 65, 81);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(text, this.margin, this.y);
    this.y += 5;
  }

  labelValue(label: string, value: string, indent = 0) {
    this.checkPage(7);
    this.doc.setFontSize(9);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(107, 114, 128);
    this.doc.text(label + ":", this.margin + indent, this.y);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(26, 26, 26);

    const labelWidth = this.doc.getTextWidth(label + ": ");
    const valueX = this.margin + indent + labelWidth;
    const maxWidth = this.contentWidth - indent - labelWidth;

    const lines = this.doc.splitTextToSize(value, maxWidth);
    this.doc.text(lines, valueX, this.y);
    this.y += lines.length * 4.5;
    this.y += 1;
  }

  wrappedText(text: string, indent = 0) {
    this.checkPage(8);
    this.doc.setFontSize(9);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(26, 26, 26);
    const lines = this.doc.splitTextToSize(text, this.contentWidth - indent);
    for (const line of lines) {
      this.checkPage(5);
      this.doc.text(line, this.margin + indent, this.y);
      this.y += 4.2;
    }
    this.y += 1;
  }

  scoreRow(label: string, score: number, weight: string) {
    this.checkPage(7);
    const barX = this.margin + 50;
    const barWidth = 80;
    const barHeight = 4;

    this.doc.setFontSize(8);
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(55, 65, 81);
    this.doc.text(label, this.margin + 2, this.y);

    // Background bar
    this.doc.setFillColor(229, 231, 235);
    this.doc.rect(barX, this.y - 3, barWidth, barHeight, "F");

    // Score bar
    const pct = Math.min(100, Math.max(0, score)) / 100;
    if (score >= 75) this.doc.setFillColor(34, 197, 94);
    else if (score >= 50) this.doc.setFillColor(234, 179, 8);
    else this.doc.setFillColor(239, 68, 68);
    this.doc.rect(barX, this.y - 3, barWidth * pct, barHeight, "F");

    // Score number
    this.doc.setFont("helvetica", "bold");
    this.doc.text(score.toFixed(0), barX + barWidth + 3, this.y);

    // Weight
    this.doc.setFont("helvetica", "normal");
    this.doc.setTextColor(150, 150, 150);
    this.doc.text(weight, barX + barWidth + 16, this.y);

    this.y += 6;
  }

  gradeBlock(score: number, grade: string, tier: string, method: string) {
    this.checkPage(15);

    // Score
    this.doc.setFontSize(24);
    this.doc.setFont("helvetica", "bold");
    this.doc.setTextColor(17, 24, 39);
    this.doc.text(score.toFixed(1), this.margin, this.y);

    // Grade badge
    const gradeX = this.margin + 28;
    const gradeColors: Record<string, [number, number, number]> = {
      A: [34, 197, 94], B: [59, 130, 246], C: [234, 179, 8],
      D: [249, 115, 22], F: [239, 68, 68],
    };
    const gc = gradeColors[grade] ?? [156, 163, 175];
    this.doc.setFillColor(gc[0], gc[1], gc[2]);
    this.doc.roundedRect(gradeX, this.y - 7, 10, 10, 2, 2, "F");
    this.doc.setFontSize(11);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(grade, gradeX + 3, this.y);

    // Tier badge
    const tierX = gradeX + 14;
    const tierColors: Record<string, [number, number, number]> = {
      critical: [239, 68, 68], high: [245, 158, 11],
      medium: [59, 130, 246], low: [16, 185, 129],
    };
    const tc = tierColors[tier] ?? [156, 163, 175];
    this.doc.setFillColor(tc[0], tc[1], tc[2]);
    const tierWidth = this.doc.getTextWidth(tier) + 8;
    this.doc.roundedRect(tierX, this.y - 7, tierWidth, 10, 2, 2, "F");
    this.doc.setFontSize(9);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(tier.charAt(0).toUpperCase() + tier.slice(1), tierX + 4, this.y);

    // Method
    this.doc.setFontSize(8);
    this.doc.setTextColor(150, 150, 150);
    this.doc.text(method, tierX + tierWidth + 5, this.y);

    this.y += 8;
  }

  finding(severity: string, category: string, description: string, recommendation: string) {
    this.checkPage(20);

    const colors: Record<string, [number, number, number]> = {
      critical: [239, 68, 68], high: [249, 115, 22],
      medium: [234, 179, 8], low: [59, 130, 246],
    };
    const c = colors[severity] ?? [156, 163, 175];

    // Severity badge
    this.doc.setFillColor(c[0], c[1], c[2]);
    this.doc.roundedRect(this.margin, this.y - 3, 18, 5, 1, 1, "F");
    this.doc.setFontSize(7);
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(severity.toUpperCase(), this.margin + 2, this.y);

    // Category
    this.doc.setFontSize(8);
    this.doc.setTextColor(55, 65, 81);
    this.doc.text(category, this.margin + 21, this.y);
    this.y += 5;

    // Description
    this.wrappedText(description, 2);

    // Recommendation
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8);
    this.doc.setTextColor(55, 65, 81);
    this.doc.text("Recommendation:", this.margin + 2, this.y);
    this.y += 4;
    this.doc.setFont("helvetica", "normal");
    this.wrappedText(recommendation, 4);
    this.y += 2;
  }

  separator() {
    this.y += 2;
    this.doc.setDrawColor(229, 231, 235);
    this.doc.setLineWidth(0.2);
    this.doc.line(this.margin, this.y, this.pageWidth - this.margin, this.y);
    this.y += 4;
  }

  pageBreak() {
    this.doc.addPage();
    this.y = this.margin;
    this.addFooter();
  }

  save(filename: string) {
    // Add footer to all pages
    const totalPages = this.doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(7);
      this.doc.setTextColor(150, 150, 150);
      this.doc.text(
        `PBL Evaluator - Entitlement Assessment Report | Page ${i} of ${totalPages}`,
        this.pageWidth / 2,
        290,
        { align: "center" },
      );
    }
    this.doc.save(filename);
  }
}

export function exportPDF(entitlements: Entitlement[]): void {
  const rpt = new ReportBuilder();

  // Cover page
  rpt.title("PBL Evaluator - Entitlement Assessment Report");
  rpt.subtitle(
    `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
  );
  rpt.subtitle(`Total Entitlements: ${entitlements.length}`);

  rpt.separator();

  // Summary table
  rpt.subHeader("Report Summary");

  let totalPblScore = 0;
  let totalRbacScore = 0;

  const summaryData = entitlements.map((ent) => {
    const pblRules = evaluateRules({
      description: ent.description,
      resource_name: ent.resource_name,
      access_level: ent.access_level,
      conditions: ent.conditions ?? undefined,
      business_justification: ent.business_justification ?? undefined,
      owner: ent.owner ?? undefined,
    });
    const tier = classifyTier(ent);
    const rbac = evaluateRbac({
      ...ent,
      conditions: ent.conditions ?? undefined,
      business_justification: ent.business_justification ?? undefined,
      owner: ent.owner ?? undefined,
    });

    totalPblScore += pblRules.rule_score;
    totalRbacScore += rbac.final_score;

    return { ent, pblRules, tier, rbac };
  });

  const avgPbl = entitlements.length > 0 ? totalPblScore / entitlements.length : 0;
  const avgRbac = entitlements.length > 0 ? totalRbacScore / entitlements.length : 0;

  rpt.labelValue("Average PBL Quality Score", `${avgPbl.toFixed(1)} / 100 (${gradeFromScore(avgPbl)})`);
  rpt.labelValue("Average RBAC Design Score", `${avgRbac.toFixed(1)} / 100 (${gradeFromScore(avgRbac)})`);

  rpt.separator();

  // Individual entitlement reports
  for (let i = 0; i < summaryData.length; i++) {
    const { ent, pblRules, tier, rbac } = summaryData[i];
    const pblGrade = gradeFromScore(pblRules.rule_score);
    const pblRecs = generatePblRecommendations(pblRules.flags);

    if (i > 0) rpt.pageBreak();

    rpt.sectionHeader(`${i + 1}. ${ent.name}`);

    // Entitlement details
    rpt.subHeader("Entitlement Details");
    rpt.labelValue("Name", ent.name);
    rpt.labelValue("Description", ent.description);
    rpt.labelValue("Resource", `${ent.resource_type} / ${ent.resource_name}`);
    rpt.labelValue("Access Level", ent.access_level);
    if (ent.roles && ent.roles.length > 0) {
      rpt.labelValue("Roles", ent.roles.join(", "));
    }
    if (ent.divisions && ent.divisions.length > 0) {
      rpt.labelValue("Divisions", ent.divisions.join(", "));
    }
    if (ent.conditions) rpt.labelValue("Conditions", ent.conditions);
    if (ent.business_justification) rpt.labelValue("Business Justification", ent.business_justification);
    if (ent.owner) rpt.labelValue("Owner", ent.owner);

    rpt.separator();

    // PBL Quality Review
    rpt.subHeader("PBL Quality Review");
    rpt.gradeBlock(pblRules.rule_score, pblGrade, tier.tier, "Rules Only");

    rpt.scoreRow("Readability", pblRules.readability_score, "(25%)");
    rpt.scoreRow("Completeness", pblRules.completeness_score, "(25%)");
    rpt.scoreRow("Clarity", pblRules.clarity_score, "(20%)");
    rpt.scoreRow("Specificity", pblRules.specificity_score, "(15%)");
    rpt.scoreRow("Consistency", pblRules.consistency_score, "(15%)");

    if (pblRules.flags.length > 0) {
      rpt.labelValue("Issues Found", pblRules.flags.map((f) => f.replace(/_/g, " ")).join(", "));
    }

    if (pblRecs.length > 0) {
      rpt.subHeader("PBL Recommendations");
      for (const rec of pblRecs) {
        rpt.wrappedText("- " + rec, 2);
      }
    }

    rpt.separator();

    // RBAC Design Review
    rpt.subHeader("RBAC Design Review");
    rpt.gradeBlock(rbac.final_score, rbac.quality_grade, rbac.risk_tier, "RBAC Design");

    rpt.scoreRow("Title-Desc Alignment", rbac.dimensions.title_description_alignment, "(25%)");
    rpt.scoreRow("Role Appropriateness", rbac.dimensions.role_appropriateness, "(25%)");
    rpt.scoreRow("Separation of Duties", rbac.dimensions.separation_of_duties, "(25%)");
    rpt.scoreRow("Scope Definition", rbac.dimensions.scope_definition, "(15%)");
    rpt.scoreRow("Division Relevance", rbac.dimensions.division_relevance, "(10%)");

    if (rbac.findings.length > 0) {
      rpt.subHeader("RBAC Findings");
      for (const f of rbac.findings) {
        rpt.finding(f.severity, f.category, f.description, f.recommendation);
      }
    } else {
      rpt.wrappedText("No RBAC design issues found. This entitlement aligns with separation of duties principles and role-based access control best practices.");
    }
  }

  rpt.save(`PBL_Evaluator_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Export a single entitlement as PDF
export function exportSinglePDF(ent: Entitlement): void {
  exportPDF([ent]);
}
