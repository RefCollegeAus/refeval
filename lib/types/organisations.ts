export type OrganisationRecord = {
  id: string;
  name: string;
  status: "Active" | "Suspended";
  createdAt: string;
};
