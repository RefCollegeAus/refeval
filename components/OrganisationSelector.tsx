import type { RefEvalSession } from "@/lib/types/auth";
import { Badge, Button, Card } from "@/components/ui";

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
      <Card className="w-full max-w-[540px]">
        <div className="login-logo-wrap">
          <img src="/rca-logo.png" alt="Referee College of Australia logo" className="login-logo" />
        </div>

        <p className="text-xs font-bold uppercase tracking-wide text-accent">Select Organisation</p>
        <h1 className="text-xl font-bold tracking-tight text-text">Which organisation would you like to enter?</h1>
        <p className="mt-1 text-sm text-muted">
          Your account is linked to multiple organisations. Select one to continue.
        </p>

        <div className="grid gap-3 mt-4">
          {memberships.map((m) => (
            <Button
              key={m.organisationId}
              variant="secondary"
              className="w-full justify-between"
              onClick={() => onSelect(m)}
            >
              {m.organisationName}
              <Badge tone="neutral">{roleLabel(m.role)}</Badge>
            </Button>
          ))}

          <Button variant="ghost" className="mt-2" onClick={onLogout}>
            Back to Login
          </Button>
        </div>
      </Card>
    </div>
  );
}
