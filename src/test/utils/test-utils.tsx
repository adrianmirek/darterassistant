import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";

/**
 * Custom render function that wraps components with necessary providers
 * Extend this as needed when you add providers (e.g., Theme, Router, etc.)
 */
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) => {
  // Add providers here as needed
  // const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  //   return <ThemeProvider>{children}</ThemeProvider>;
  // };

  return render(ui, { ...options });
};

export * from "@testing-library/react";
export { customRender as render };
