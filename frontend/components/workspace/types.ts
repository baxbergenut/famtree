export type RelativeDraft = {
  anchorPersonId: string;
  relation: "parent" | "child";
  firstName: string;
  lastName: string;
  note: string;
  birthDate: string;
};

export const emptyDraft: RelativeDraft = {
  anchorPersonId: "",
  relation: "child",
  firstName: "",
  lastName: "",
  note: "",
  birthDate: "",
};
