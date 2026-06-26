export type OrganisationRecord = {
  id: string;
  name: string;
  status: "Active" | "Suspended";
  createdAt: string;
  timezone: string;
  brandColour: string;
  logoUrl: string | null;
};
