import type { RefEvalSession } from "@/lib/types/auth";

type Membership = RefEvalSession["memberships"][number];

function roleLabel(role: string) {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Administrator";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function OrganisationSelector({
  memberships,
  onSelect,
  onLogout,
}: {
  memberships: Membership[];
  onSelect: (membership: Membership) => void;
  onLogout: () => void;
}) {
  return (
    <div className="login-wrap">
      <section className="panel login-panel">
        <div className="login-logo-wrap">
          <img src="/rca-logo.png" alt="Referee College of Australia logo" className="login-logo" />
        </div>

        <p className="eyebrow">Select Organisation</p>
        <h1>Which organisation would you like to enter?</h1>
        <p className="hint" style={{ marginTop: 8 }}>
          Your account is linked to multiple organisations. Select one to continue.
        </p>

        <div className="form-stack" style={{ marginTop: 18 }}>
          {memberships.map((m) => (
            <button key={m.organisationId} className="primary" onClick={() => onSelect(m)}>
              {m.organisationName}
              <span className="hint" style={{ marginLeft: 8, fontWeight: "normal" }}>
                — {roleLabel(m.role)}
              </span>
            </button>
          ))}

          <button onClick={onLogout} style={{ marginTop: 8 }}>
            Back to Login
          </button>
        </div>
      </section>
    </div>
  );
}
