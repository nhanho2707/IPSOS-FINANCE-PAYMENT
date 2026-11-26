export const ROLES = {
  ADMIN: "Admin",
  FINANCE: "Finance",
  SCRIPTER: "Scripter",
  RESEARCHER: "Researcher",
  FIELD_MANAGER: "Field Manager",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ALL_ROLES: readonly Role[] = Object.values(ROLES);

// Mirrors the ensureUserHasRole middleware in backend/routes/api.php.
// The backend stays the source of truth; these only decide what the UI shows.
export const ROLE_ACCESS: Record<string, readonly Role[]> = {
  transactionsPage: [ROLES.ADMIN, ROLES.FINANCE],
  accountsPage: [ROLES.ADMIN],

  projectToggleDisabled: [ROLES.ADMIN],
  projectClone: [ROLES.ADMIN, ROLES.RESEARCHER, ROLES.SCRIPTER],
  projectEditInfo: [ROLES.ADMIN, ROLES.SCRIPTER],

  projectOverview: ALL_ROLES,
  projectQuotation: [ROLES.ADMIN, ROLES.RESEARCHER, ROLES.FIELD_MANAGER],
  quotationApprove: [ROLES.ADMIN, ROLES.RESEARCHER],
  quotationMutate: [ROLES.ADMIN, ROLES.RESEARCHER],
  projectAssignment: [ROLES.ADMIN, ROLES.RESEARCHER, ROLES.SCRIPTER, ROLES.FIELD_MANAGER],
  projectInterviewers: [ROLES.ADMIN, ROLES.FIELD_MANAGER, ROLES.FINANCE],
  projectGifts: [ROLES.ADMIN],
  projectTransactions: ALL_ROLES,
  projectTransactionStatistics: [ROLES.ADMIN, ROLES.FINANCE, ROLES.SCRIPTER],
  projectCatiSettings: [ROLES.ADMIN, ROLES.SCRIPTER, ROLES.FIELD_MANAGER],
  projectSettings: ALL_ROLES,
};

export const hasRole = (
  userRole: string | null | undefined,
  allowedRoles: readonly string[] | null | undefined
): boolean => {
  if (!allowedRoles) return true;
  if (!userRole) return false;
  const normalized = userRole.trim().toLowerCase();
  return allowedRoles.some((role) => role.toLowerCase() === normalized);
};

export interface Visibility {
  transactions: {
    components: {
      visible_deposited: boolean;
      visible_spent: boolean;
      visible_balance: boolean;
      visible_transactions: boolean;
      visible_merchantinfor: boolean;
      visible_transactionsmanager: boolean;
    };
  };
  employees: {
    functions: {
      visible_import_employees: boolean;
    };
  };
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export const BaseVisibility: Visibility = {
  transactions: {
    components: {
      visible_deposited: false,
      visible_spent: false,
      visible_balance: false,
      visible_transactions: false,
      visible_merchantinfor: false,
      visible_transactionsmanager: false,
    },
  },
  employees: {
    functions: {
      visible_import_employees: false,
    },
  },
};

const allTransactionComponents = {
  visible_deposited: true,
  visible_spent: true,
  visible_balance: true,
  visible_transactions: true,
  visible_merchantinfor: true,
  visible_transactionsmanager: true,
};

const RoleVisibilityOverride: Record<Role, DeepPartial<Visibility>> = {
  [ROLES.ADMIN]: {
    transactions: { components: allTransactionComponents },
    employees: { functions: { visible_import_employees: true } },
  },
  [ROLES.FINANCE]: {
    transactions: { components: allTransactionComponents },
  },
  [ROLES.SCRIPTER]: {},
  [ROLES.RESEARCHER]: {},
  [ROLES.FIELD_MANAGER]: {
    employees: { functions: { visible_import_employees: true } },
  },
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const deepMerge = <T>(base: T, override: DeepPartial<T> | undefined): T => {
  if (!override) return base;
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  Object.entries(override).forEach(([key, value]) => {
    const current = result[key];
    result[key] = isPlainObject(current) && isPlainObject(value)
      ? deepMerge(current, value)
      : value;
  });
  return result as T;
};

const findRole = (role: string | null | undefined): Role | undefined =>
  ALL_ROLES.find((r) => r.toLowerCase() === (role ?? "").trim().toLowerCase());

export const buildVisibility = (role: string | null | undefined): Visibility => {
  const matched = findRole(role);
  return deepMerge(BaseVisibility, matched ? RoleVisibilityOverride[matched] : undefined);
};

export const VisibilityConfig: Record<Role, Visibility> = ALL_ROLES.reduce(
  (config, role) => ({ ...config, [role]: buildVisibility(role) }),
  {} as Record<Role, Visibility>
);
