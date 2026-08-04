"use client";

// Internal, unlinked diagnostic page — not part of RefEval's product
// navigation. Exists solely to visually verify the Referee College Design
// System primitives (components/ui/*) render correctly against the new
// token layer, ahead of any screen being migrated onto them (Phase 3+).
// Safe to delete once that verification is no longer needed, or to keep as
// a living reference the way RefOps keeps its own /style-guide route.

import { useState } from "react";
import { Star, Inbox } from "lucide-react";
import { showToast } from "@/lib/toast";
import { Header } from "@/components/Header";
import { PageFrame } from "@/components/shell/PageFrame";
import type { RefEvalSession, Role, Screen } from "@/lib/types/auth";
import type { OrgPage } from "@/components/organisation/OrganisationScreen";
import type { NavContext } from "@/components/shell/nav";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FormField,
  Input,
  Modal,
  Select,
  Skeleton,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  Textarea,
  ToastViewport,
} from "@/components/ui";

const BUTTON_VARIANTS = ["primary", "secondary", "danger", "good", "ghost"] as const;
const BADGE_TONES = ["neutral", "accent", "good", "warn", "danger"] as const;

const ROLES: Role[] = ["super_admin", "admin", "educator", "referee", "viewer"];

function mockSession(role: Role): RefEvalSession {
  return {
    user: { id: "demo", email: "demo@refereecollegeofaustralia.com.au" },
    profile: { id: "demo", email: "demo@refereecollegeofaustralia.com.au", name: "Jamie Smith" },
    memberships: [{ organisationId: "org-demo", organisationName: "Demo Basketball Association", role }],
    activeOrganisation: { id: "org-demo", name: "Demo Basketball Association" },
    activeRole: role,
  };
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-bold text-text">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [role, setRole] = useState<Role>("admin");
  const [activeScreen, setActiveScreen] = useState<Screen>("educator");
  const [activeOrgPage, setActiveOrgPage] = useState<OrgPage>("dashboard");

  const navContext: NavContext = {
    role,
    homeScreen: role === "referee" ? "referee" : role === "viewer" ? "viewer" : "educator",
    isManagement: role === "educator" || role === "admin" || role === "super_admin",
    isAdmin: role === "admin" || role === "super_admin",
    isReferee: role === "referee",
    canViewClipLibrary: true,
    canAccessPlaylists: true,
    canViewAssignments: true,
    canViewGroups: true,
    unreadComments: 3,
  };

  return (
    <>
      <ToastViewport />

      {/* Real Header + Sidebar (Phase 2/6B) — same components production
          screens use, with a mock session + navContext so every role's full
          sidebar (grouped sections, Organisation submenu, badges) can be
          checked without needing live Supabase credentials for each role.
          Rendered at the top of the page (not nested inside <main> below) so
          the `.rcds-sidebar ~ *` desktop offset behaves exactly as it does on
          a real screen — this page IS the "screen content" sibling. */}
      <Header
        session={mockSession(role)}
        activeScreen={activeScreen}
        activeOrgPage={activeOrgPage}
        navContext={navContext}
        onNavigate={(screen, orgPage) => { setActiveScreen(screen); if (orgPage) setActiveOrgPage(orgPage); }}
        onHome={() => setActiveScreen("educator")}
        onAdmin={() => setActiveScreen("database")}
        onOrganisation={() => setActiveScreen("organisation")}
        onLearning={() => setActiveScreen("learning-hub")}
        onProfile={() => setActiveScreen("user-profile")}
        onNotifications={() => setActiveScreen("notifications")}
        onSearch={() => showToast("Search would open here (unchanged GlobalSearch overlay)", "info")}
        onLogout={() => showToast("Sign out is unchanged — not wired in this demo", "info")}
        unreadNotificationCount={3}
      />

      <main className="mx-auto grid max-w-4xl gap-12 p-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Referee College Design System — Phase 1 + 2
          </p>
          <h1 className="text-2xl font-bold text-text">RefEval component library &amp; shell</h1>
          <p className="mt-1 text-sm text-muted">
            Every primitive in components/ui/*, plus the Phase 2 app shell (Header + Sidebar) above
            using a mock session — nothing on this page is wired into a real RefEval screen.
          </p>
        </header>

        <Section
          title="Shell — role switcher"
          description="Toggle role to verify sidebar section/item visibility against components/shell/nav.ts (Reviews/Learning & Content: management roles; People/Organisation: admin+; Development: referee only). Resize below 1024px to see the mobile drawer."
        >
          <div className="flex flex-wrap items-center gap-2">
            {ROLES.map((r) => (
              <Button key={r} variant={r === role ? "primary" : "secondary"} size="sm" onClick={() => setRole(r)}>
                {r}
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Page framing (PageFrame)" description="New primitive, not yet wired into any production screen.">
          <div className="rounded-2xl border border-dashed border-border">
            <PageFrame
              title="Assignments"
              description="Reviews assigned to you this fortnight."
              actions={<Button size="sm">New assignment</Button>}
            >
              <p className="px-4 pb-4 text-sm text-muted sm:px-6 lg:px-8">
                Page content would render here — this preview only demonstrates the title/description/
                actions header pattern.
              </p>
            </PageFrame>
          </div>
        </Section>

        <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} size="md">
              {variant}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} size="sm">
              {variant} sm
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled>disabled</Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          {BADGE_TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Total clips</CardTitle>
                <CardDescription>This review period</CardDescription>
              </div>
              <Star size={18} className="text-accent" />
            </CardHeader>
            <CardContent className="text-3xl font-bold">128</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Accuracy</CardTitle>
                <CardDescription>Coded decisions</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-green-300">92%</CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Forms">
        <div className="grid max-w-sm gap-4">
          <FormField label="Reviewer name" required>
            <Input placeholder="Jane Smith" />
          </FormField>
          <FormField label="Assignment status" hint="Visible to the referee once submitted">
            <Select defaultValue="in-review">
              <option value="in-review">In review</option>
              <option value="done">Done</option>
              <option value="incorrect">Incorrect</option>
            </Select>
          </FormField>
          <FormField label="Feedback" error="Feedback is required before submitting">
            <Textarea placeholder="Positives, work-ons, next focus…" />
          </FormField>
        </div>
      </Section>

      <Section
        title="Table"
        description="Resize below 720px to see the responsive card-collapse behaviour (generalised from the existing referee reviews table pattern)."
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Game</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell data-label="Game">Tigers vs Hawks</TableCell>
              <TableCell data-label="Date">12 Jul 2026</TableCell>
              <TableCell data-label="Status">
                <Badge tone="warn">In review</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell data-label="Game">Eagles vs Wolves</TableCell>
              <TableCell data-label="Date">5 Jul 2026</TableCell>
              <TableCell data-label="Status">
                <Badge tone="good">Done</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Empty state">
        <EmptyState
          icon={<Inbox size={28} />}
          title="No reviews yet"
          description="Reviews you're assigned will appear here once an educator sends one."
          action={<Button variant="secondary" size="sm">Refresh</Button>}
        />
      </Section>

      <Section title="Modal">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <Modal
          open={modalOpen}
          title="Discard review?"
          description="This review has unsaved changes."
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setModalOpen(false)}>
                Discard
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted">
            Focus is trapped inside this dialog, Escape closes it, and background scroll is locked
            while it&apos;s open — try tabbing through it.
          </p>
        </Modal>
      </Section>

      <Section title="Toast">
        <div className="flex flex-wrap gap-3">
          <Button variant="good" onClick={() => showToast("Review submitted", "success")}>
            Trigger success
          </Button>
          <Button variant="danger" onClick={() => showToast("Could not save review", "error")}>
            Trigger error
          </Button>
          <Button variant="secondary" onClick={() => showToast("Autosaved 2 minutes ago", "info")}>
            Trigger info
          </Button>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs
          ariaLabel="Style guide demo tabs"
          tabs={[
            { id: "overview", label: "Overview", content: <p className="text-sm text-muted">Overview panel content.</p> },
            { id: "history", label: "History", content: <p className="text-sm text-muted">History panel content.</p> },
          ]}
        />
      </Section>

        <Section title="Spinner & Skeleton">
          <div className="flex items-center gap-6">
            <Spinner />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </Section>
      </main>
    </>
  );
}
