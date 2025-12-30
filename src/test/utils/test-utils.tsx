import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import { I18nProvider } from "@/lib/hooks/I18nProvider";

/**
 * Custom render function that wraps components with necessary providers
 * Extend this as needed when you add providers (e.g., Theme, Router, etc.)
 */
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) => {
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return <I18nProvider lang="en">{children}</I18nProvider>;
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
};

export * from "@testing-library/react";
export { customRender as render };
