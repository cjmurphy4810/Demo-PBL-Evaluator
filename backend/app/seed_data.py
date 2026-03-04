"""Seed data with example entitlements spanning all quality grades and risk tiers."""

SEED_ENTITLEMENTS = [
    # Grade A, Tier Critical — excellent PBL, high risk
    {
        "name": "Production Database Administrator",
        "description": (
            "Full administrative access to the production PostgreSQL database cluster "
            "including read, write, delete, and schema modification privileges. "
            "This entitlement allows the holder to perform database maintenance, "
            "execute schema migrations, and respond to production incidents."
        ),
        "resource_type": "database",
        "resource_name": "payments-db-prod",
        "access_level": "admin",
        "conditions": (
            "Requires VPN connection, multi-factor authentication, and direct manager approval. "
            "All access is logged and reviewed monthly. "
            "Access is time-limited to 8 hours per session with automatic expiry."
        ),
        "business_justification": (
            "Required for database maintenance, schema migrations, and incident response "
            "by the Platform Engineering team. Without this access, production database "
            "issues cannot be resolved within SLA requirements."
        ),
        "owner": "Platform Engineering",
    },
    # Grade B, Tier High — good PBL, some gaps
    {
        "name": "Staging API Write Access",
        "description": (
            "Write access to the staging environment REST API endpoints for the "
            "order management service. Allows creating, updating, and deleting "
            "test orders and related entities."
        ),
        "resource_type": "application",
        "resource_name": "order-management-api-staging",
        "access_level": "write",
        "conditions": "Must be connected to corporate network. Access reviewed quarterly.",
        "business_justification": (
            "QA engineers need write access to staging APIs to perform integration "
            "testing and validate new features before production deployment."
        ),
        "owner": "QA Engineering",
    },
    # Grade C, Tier Medium — mediocre PBL
    {
        "name": "Analytics Dashboard Viewer",
        "description": (
            "Read access to the analytics dashboard. Users can view reports "
            "and export data as needed for various business purposes."
        ),
        "resource_type": "application",
        "resource_name": "analytics-dashboard",
        "access_level": "read",
        "conditions": None,
        "business_justification": "Business teams need to see analytics.",
        "owner": None,
    },
    # Grade D, Tier High — poor PBL, high risk hidden
    {
        "name": "DevOps Tooling",
        "description": (
            "R/W access to prod k8s ns via SA w/ RBAC binding. "
            "Includes various permissions for CI/CD and deployment tooling etc."
        ),
        "resource_type": "infrastructure",
        "resource_name": "k8s-prod-cluster",
        "access_level": "admin",
        "conditions": None,
        "business_justification": None,
        "owner": None,
    },
    # Grade F, Tier Critical — terrible PBL, very high risk
    {
        "name": "Root Access",
        "description": "Full access to everything. As needed.",
        "resource_type": "infrastructure",
        "resource_name": "all-production-systems",
        "access_level": "admin",
        "conditions": None,
        "business_justification": None,
        "owner": None,
    },
    # Grade A, Tier Low — excellent PBL, low risk
    {
        "name": "Internal Wiki Reader",
        "description": (
            "Read-only access to the company internal wiki hosted on Confluence. "
            "Allows viewing all published pages and spaces in the engineering "
            "and product documentation areas. Does not include access to "
            "restricted HR or finance spaces."
        ),
        "resource_type": "application",
        "resource_name": "confluence-internal-wiki",
        "access_level": "read",
        "conditions": (
            "Granted automatically to all full-time employees upon onboarding. "
            "Revoked upon offboarding. No additional approval required."
        ),
        "business_justification": (
            "All employees need access to internal documentation to perform their "
            "daily work effectively and stay informed about company processes."
        ),
        "owner": "IT Operations",
    },
]
