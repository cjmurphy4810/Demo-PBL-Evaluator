export default function Guide() {
  return (
    <div className="space-y-10 max-w-4xl">
      <h1 className="text-2xl font-bold">User Guide</h1>

      {/* How to Use */}
      <Section title="How to Use the PBL Evaluator">
        <ol className="list-decimal list-inside space-y-3 text-gray-700">
          <li>
            <strong>Navigate to the Evaluate tab.</strong> This is where you
            submit entitlement definitions for quality scoring.
          </li>
          <li>
            <strong>Fill in the entitlement form.</strong> Provide the
            entitlement name, a plain-language description of what access it
            grants, the resource type and name, access level, any conditions or
            constraints, a business justification, and the responsible owner.
          </li>
          <li>
            <strong>Click Evaluate.</strong> The engine analyzes your
            entitlement text across five quality dimensions and returns a score,
            letter grade (A through F), risk tier classification, and specific
            recommendations for improvement.
          </li>
          <li>
            <strong>Review the results.</strong> Each dimension score tells you
            where the language is strong and where it needs work. The Score
            Explanation section provides plain-language guidance on exactly what
            to change and why.
          </li>
          <li>
            <strong>Iterate and improve.</strong> Update your entitlement
            language based on the recommendations, then re-evaluate to see your
            improved score. The goal is to produce entitlement definitions that
            any business stakeholder can read and understand.
          </li>
          <li>
            <strong>Review saved records.</strong> Visit the Entitlements tab to
            see all previously evaluated entitlements. Click any record to view
            its current evaluation detail, or click Re-evaluate to rescore it.
          </li>
          <li>
            <strong>Track trends on the Dashboard.</strong> The Dashboard shows
            aggregate quality distribution and risk tier breakdowns across all
            your evaluated entitlements.
          </li>
        </ol>
      </Section>

      {/* Data Privacy */}
      <Section title="Data Privacy and Security">
        <div className="space-y-4 text-gray-700">
          <p>
            <strong>Your data never leaves your device.</strong> The PBL
            Evaluator runs entirely in your web browser. All entitlement data
            you enter is stored in your browser's local storage on the specific
            device and browser you are using. No data is transmitted to any
            external server, cloud service, or third party.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">
              Key Privacy Facts
            </h4>
            <ul className="list-disc list-inside space-y-1 text-blue-900 text-sm">
              <li>
                All evaluation logic executes locally in your browser — no API
                calls are made
              </li>
              <li>
                Data is stored in browser local storage, accessible only on the
                device and browser where it was created
              </li>
              <li>
                Clearing your browser data or local storage will remove all
                saved entitlement records
              </li>
              <li>
                Records created on one device will not appear on another device
                — each browser instance is independent
              </li>
              <li>
                The application code is hosted on GitHub Pages as static files
                — it contains no server-side processing
              </li>
            </ul>
          </div>
        </div>
      </Section>

      {/* PBL Quality Evaluation Engine */}
      <Section title="PBL Quality Evaluation Engine">
        <div className="space-y-6 text-gray-700">
          <p>
            The PBL Quality Evaluation Engine assesses entitlement definitions
            against industry-recognized standards for access control
            documentation. The methodology is grounded in principles from{" "}
            <strong>ISO/IEC 27001:2022</strong> (Information Security
            Management — Access Control, Annex A.9),{" "}
            <strong>NIST SP 800-53</strong> (Security and Privacy Controls —
            AC-1 through AC-25), and{" "}
            <strong>COBIT 2019</strong> (DSS05 — Manage Security Services).
            These frameworks emphasize that access entitlements must be
            documented in language that is clear, complete, specific, and
            consistently understood by both technical and non-technical
            stakeholders.
          </p>

          {/* Dimensions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Five Scoring Dimensions
            </h3>
            <p className="mb-4">
              Each entitlement is scored across five dimensions, weighted to
              reflect their relative importance in producing high-quality,
              auditable access documentation:
            </p>
            <div className="space-y-4">
              <DimensionCard
                name="Readability"
                weight={25}
                description="Measures how easily the entitlement text can be read and understood by a non-technical business stakeholder. Based on the Flesch Reading Ease formula and Gunning Fog Index — established linguistic metrics used in regulatory and compliance documentation. Penalizes overly complex sentence structures, high syllable counts, and excessively long sentences."
              />
              <DimensionCard
                name="Completeness"
                weight={25}
                description="Evaluates whether all essential components of an entitlement definition are present: resource identification, access level specification, conditions/constraints, business justification, and ownership assignment. Aligned with ISO 27001 A.9.1.1 which requires access control policies to clearly define the scope and conditions of each access right."
              />
              <DimensionCard
                name="Clarity"
                weight={20}
                description="Assesses whether the language avoids jargon, ambiguous terms, passive voice constructions, and overly complex sentence structures. NIST SP 800-53 AC-1 requires access policies to be 'understandable by all relevant stakeholders.' This dimension penalizes technical acronyms, vague terms like 'various' or 'as needed,' and sentences that obscure who is doing what."
              />
              <DimensionCard
                name="Specificity"
                weight={15}
                description="Determines whether the entitlement names concrete resources, systems, and boundaries rather than using vague references like 'the system' or 'broad access.' Specific entitlements support the principle of least privilege (NIST AC-6) by clearly delineating exactly what is granted and what is excluded."
              />
              <DimensionCard
                name="Consistency"
                weight={15}
                description="Checks for terminology consistency within the entitlement text — mixing abbreviations with full forms (e.g., 'db' and 'database' in the same definition), or describing write/delete actions for a read-only access level. Inconsistent language creates audit risk and can lead to access provisioning errors."
              />
            </div>
          </div>

          {/* Grading Scale */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Quality Grading Scale
            </h3>
            <p className="mb-3">
              The weighted composite score maps to a letter grade reflecting
              overall entitlement documentation quality:
            </p>
            <div className="grid grid-cols-5 gap-2 text-center text-sm">
              <GradeCard grade="A" range="90-100" color="bg-green-100 text-green-800 border-green-300" label="Excellent" />
              <GradeCard grade="B" range="75-89" color="bg-blue-100 text-blue-800 border-blue-300" label="Good" />
              <GradeCard grade="C" range="60-74" color="bg-yellow-100 text-yellow-800 border-yellow-300" label="Adequate" />
              <GradeCard grade="D" range="40-59" color="bg-orange-100 text-orange-800 border-orange-300" label="Poor" />
              <GradeCard grade="F" range="0-39" color="bg-red-100 text-red-800 border-red-300" label="Failing" />
            </div>
          </div>

          {/* Risk Tier Classification */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Risk Tier Classification
            </h3>
            <p className="mb-3">
              Independent of the quality grade, each entitlement is classified
              into a risk tier based on the sensitivity of the resources, the
              breadth of access granted, and whether adequate safeguards
              (conditions and justifications) are documented. This aligns with
              NIST's risk-based approach to access control and ISO 27001's
              requirement to classify information assets by sensitivity.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <TierCard tier="Critical" color="bg-red-50 border-red-300 text-red-800" review="Monthly review required" description="Production systems, PII, financial data, credentials, or superadmin-level access" />
              <TierCard tier="High" color="bg-amber-50 border-amber-300 text-amber-800" review="Quarterly review required" description="Staging environments, databases, deployment pipelines, or service accounts" />
              <TierCard tier="Medium" color="bg-blue-50 border-blue-300 text-blue-800" review="Semi-annual review" description="Moderate access levels with adequate safeguards documented" />
              <TierCard tier="Low" color="bg-green-50 border-green-300 text-green-800" review="Annual review" description="Read-only or view-level access to non-sensitive resources" />
            </div>
          </div>

          {/* Composite Scoring */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Composite Score Calculation
            </h3>
            <p>
              The final quality score is computed as a weighted average of all
              five dimensions:
            </p>
            <div className="bg-gray-50 border rounded-lg p-4 mt-3 font-mono text-sm text-center">
              Final Score = (Readability x 0.25) + (Completeness x 0.25) +
              (Clarity x 0.20) + (Specificity x 0.15) + (Consistency x 0.15)
            </div>
            <p className="mt-3">
              This weighting reflects that readability and completeness are the
              most foundational elements of a well-documented entitlement — if
              stakeholders cannot read or understand the definition, or if
              critical fields are missing, the entitlement fails its core
              purpose regardless of how specific or consistent it may be.
            </p>
          </div>
        </div>
      </Section>

      {/* RBAC Design Review Engine */}
      <Section title="RBAC Design Review Engine">
        <div className="space-y-6 text-gray-700">
          <p>
            The RBAC Design Review mode evaluates entitlement definitions from a{" "}
            <strong>role-based access control (RBAC) design quality</strong>{" "}
            perspective. While PBL Quality Review focuses on how well the
            entitlement is written, RBAC Design Review assesses whether the
            entitlement is correctly designed from a security and governance
            standpoint.
          </p>

          <p>
            This evaluation is grounded in the{" "}
            <strong>ISACA CISA Review Manual</strong> (Chapter 5 — Protection
            of Information Assets, specifically Separation of Duties and
            Logical Access Controls), <strong>NIST SP 800-53 AC-5</strong>{" "}
            (Separation of Duties), <strong>AC-6</strong> (Least Privilege),
            and <strong>ISO 27001 A.9.2</strong> (User Access Management).
          </p>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Five RBAC Dimensions
            </h3>
            <div className="space-y-4">
              <DimensionCard
                name="Title-Description Alignment"
                weight={25}
                description="Evaluates whether the entitlement's name accurately reflects what the description says it does. Mismatches between title and description are a leading cause of incorrect access provisioning and failed certification reviews. If the title says 'Wholesale Users Only' but the description is vague about who can use it, this is flagged as a critical design defect."
              />
              <DimensionCard
                name="Role Appropriateness"
                weight={25}
                description="Assesses whether the assigned roles are appropriate for the access level granted. A Developer with admin access, a Business Analyst with write privileges, or an Auditor with modify permissions all represent potential violations of least-privilege principles (NIST AC-6). Each role has expected access patterns, and deviations are flagged with specific remediation guidance."
              />
              <DimensionCard
                name="Separation of Duties"
                weight={25}
                description="Identifies role combinations within a single entitlement that violate separation of duties principles per ISACA CISA guidelines. For example, assigning both Developer and Tester roles to the same entitlement undermines independent testing validation. Developer and Auditor combinations compromise audit independence. Each conflict is evaluated against the CISA SoD matrix with severity ratings."
              />
              <DimensionCard
                name="Scope Definition"
                weight={15}
                description="Evaluates whether the entitlement clearly defines access boundaries. Overly permissive language ('full control,' 'unrestricted') is flagged. External roles (Customer, Vendor) without explicit conditions represent critical gaps per NIST AC-17 (Remote Access). Well-scoped entitlements specify exactly what actions are permitted within what boundaries."
              />
              <DimensionCard
                name="Division Relevance"
                weight={10}
                description="Checks whether the entitlement is appropriately scoped to specific business divisions. Entitlements spanning too many divisions suggest overly broad access that is difficult to certify and review. Division assignment supports proper governance routing during access certification campaigns."
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Separation of Duties (ISACA CISA)
            </h3>
            <p className="mb-3">
              Per the ISACA CISA Review Manual, separation of duties is a key
              control to prevent fraud, errors, and conflicts of interest. The
              principle requires that no single individual or role should
              control all phases of a business process. In the context of
              entitlement design, this means certain role combinations within
              a single entitlement are inherently risky:
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
              <h4 className="font-semibold text-red-800 mb-2">
                Key SoD Conflict Examples
              </h4>
              <ul className="list-disc list-inside space-y-1 text-red-900">
                <li>
                  <strong>Developer + Tester:</strong> The person writing
                  the code should not be the person validating it
                </li>
                <li>
                  <strong>Developer + Security Admin:</strong> Development
                  and security gate-keeping must be independent
                </li>
                <li>
                  <strong>System Admin + Auditor:</strong> You cannot
                  independently audit systems you administer
                </li>
                <li>
                  <strong>Database Admin + Developer:</strong> Combined
                  access allows uncontrolled data and schema changes
                </li>
                <li>
                  <strong>External Customer/Vendor + Any Admin:</strong>{" "}
                  External parties must never hold administrative
                  privileges
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              How to Use Both Review Modes
            </h3>
            <p>
              The PBL Evaluator provides two complementary review modes
              accessible via the toggle on the Evaluate page:
            </p>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800">
                  PBL Quality Review
                </h4>
                <p className="text-sm text-blue-900 mt-1">
                  Use when writing or rewriting entitlement definitions to
                  ensure the language is clear, complete, and
                  understandable by non-technical stakeholders. Best for
                  entitlement authors drafting new definitions.
                </p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-800">
                  RBAC Design Review
                </h4>
                <p className="text-sm text-indigo-900 mt-1">
                  Use when reviewing entitlement design for security and
                  compliance. Checks role assignments, separation of
                  duties, and title-description alignment. Best for
                  entitlement owners during certification reviews.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              RBAC Score Calculation
            </h3>
            <div className="bg-gray-50 border rounded-lg p-4 font-mono text-sm text-center">
              Final Score = (Title-Desc Alignment x 0.25) + (Role
              Appropriateness x 0.25) + (Separation of Duties x 0.25) +
              (Scope Definition x 0.15) + (Division Relevance x 0.10)
            </div>
            <p className="mt-3">
              The three highest-weighted dimensions (25% each) reflect the
              most critical RBAC design requirements: the entitlement must
              be accurately named, assigned to appropriate roles, and free
              of separation-of-duties conflicts. These are the areas where
              design flaws create the greatest operational and compliance
              risk.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DimensionCard({
  name,
  weight,
  description,
}: {
  name: string;
  weight: number;
  description: string;
}) {
  return (
    <div className="bg-gray-50 border rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-semibold text-gray-900">{name}</h4>
        <span className="text-xs font-medium bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
          {weight}% weight
        </span>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function GradeCard({
  grade,
  range,
  color,
  label,
}: {
  grade: string;
  range: string;
  color: string;
  label: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="text-2xl font-bold">{grade}</div>
      <div className="text-xs font-medium">{range}</div>
      <div className="text-xs mt-1">{label}</div>
    </div>
  );
}

function TierCard({
  tier,
  color,
  review,
  description,
}: {
  tier: string;
  color: string;
  review: string;
  description: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="font-semibold">{tier}</div>
      <div className="text-xs mt-1">{description}</div>
      <div className="text-xs font-medium mt-2">{review}</div>
    </div>
  );
}
