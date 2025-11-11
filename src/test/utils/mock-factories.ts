import { vi } from "vitest";

/**
 * Factory for creating mock Supabase client
 */
export const createMockSupabaseClient = () => ({
  auth: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  })),
});

/**
 * Factory for creating mock API responses
 */
export const createMockAPIResponse = <T>(data: T, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  headers: new Headers(),
});

/**
 * Factory for creating mock form events
 */
export const createMockFormEvent = <T extends HTMLElement>(
  values: Record<string, unknown> = {}
): React.FormEvent<T> => {
  const target = document.createElement("form") as unknown as HTMLFormElement;
  Object.keys(values).forEach((key) => {
    const input = document.createElement("input");
    input.name = key;
    input.value = String(values[key]);
    target.appendChild(input);
  });

  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    currentTarget: target,
    target,
  } as unknown as React.FormEvent<T>;
};
