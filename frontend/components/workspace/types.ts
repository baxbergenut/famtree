export type PersonDraft =
  | {
      mode: "create";
      personId: string;
      relation: "parent" | "child";
      firstName: string;
      lastName: string;
      note: string;
      birthDate: string;
      isRoot: boolean;
    }
  | {
      mode: "edit";
      personId: string;
      firstName: string;
      lastName: string;
      note: string;
      birthDate: string;
      isRoot: boolean;
    }
  | {
      mode: "delete";
      personId: string;
      firstName: string;
      lastName: string;
      note: string;
      birthDate: string;
      isRoot: boolean;
    };

export const emptyCreateDraft: PersonDraft = {
  mode: "create",
  personId: "",
  relation: "child",
  firstName: "",
  lastName: "",
  note: "",
  birthDate: "",
  isRoot: false,
};
