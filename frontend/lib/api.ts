const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081";

export type AuthMode = "login" | "register";

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SessionUser = {
  userId: string;
  email: string;
  treeId: string;
  rootPersonId: string;
  firstName: string;
  lastName: string;
};

export type TreeSummary = {
  id: string;
  ownerUserId: string;
  rootPerson: {
    id: string;
    firstName: string;
    lastName: string;
    note?: string;
    x: number;
    y: number;
  };
};

export type PersonNode = {
  id: string;
  firstName: string;
  lastName: string;
  note?: string;
  birthDate?: string;
  x: number;
  y: number;
  isRoot: boolean;
};

export type PersonRelationship = {
  id: string;
  parentPersonId: string;
  childPersonId: string;
};

export type TreeGraph = {
  treeId: string;
  rootPersonId: string;
  persons: PersonNode[];
  relationships: PersonRelationship[];
};

export type CreateRelativePayload = {
  anchorPersonId: string;
  relation: "parent" | "child";
  firstName: string;
  lastName: string;
  note?: string;
  birthDate?: string;
};

type ApiError = {
  error?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload;
}

export async function register(payload: RegisterPayload): Promise<SessionUser> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseResponse<{ user: SessionUser }>(response);
  return data.user;
}

export async function login(payload: LoginPayload): Promise<SessionUser> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseResponse<{ user: SessionUser }>(response);
  return data.user;
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to log out");
  }
}

export async function getCurrentSession(): Promise<SessionUser | null> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/me`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  const data = await parseResponse<{ user: SessionUser }>(response);
  return data.user;
}

export async function getCurrentTree(): Promise<TreeSummary | null> {
  const response = await fetch(`${API_BASE_URL}/v1/tree`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  const data = await parseResponse<{ tree: TreeSummary }>(response);
  return data.tree;
}

export async function getTreeGraph(): Promise<TreeGraph | null> {
  const response = await fetch(`${API_BASE_URL}/v1/tree/graph`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  const data = await parseResponse<{ graph: TreeGraph }>(response);
  return data.graph;
}

export async function createRelative(
  payload: CreateRelativePayload,
): Promise<TreeGraph> {
  const response = await fetch(`${API_BASE_URL}/v1/persons/relative`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await parseResponse<{ graph: TreeGraph }>(response);
  return data.graph;
}
