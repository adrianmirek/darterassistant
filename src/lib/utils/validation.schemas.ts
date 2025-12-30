import * as z from "zod";

// Type for translation function
type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

// Factory functions that create schemas with translations
export const createEmailSchema = (t: TranslateFn) => z.string().email(t("auth.emailInvalid"));

export const createPasswordSchema = (t: TranslateFn) =>
  z
    .string()
    .min(8, t("auth.passwordMinLength"))
    .regex(/[A-Z]/, t("auth.passwordUppercase"))
    .regex(/[a-z]/, t("auth.passwordLowercase"))
    .regex(/[0-9]/, t("auth.passwordNumber"));

export const createSimplePasswordSchema = (t: TranslateFn) => z.string().min(8, t("auth.passwordMinLength"));

// Factory functions for composed schemas
export const createLoginSchema = (t: TranslateFn) =>
  z.object({
    email: createEmailSchema(t),
    password: createSimplePasswordSchema(t), // Less strict for login
  });

export const createRegisterSchema = (t: TranslateFn) =>
  z
    .object({
      email: createEmailSchema(t),
      password: createPasswordSchema(t),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.passwordsNotMatch"),
      path: ["confirmPassword"],
    });

export const createResetPasswordSchema = (t: TranslateFn) =>
  z
    .object({
      password: createPasswordSchema(t),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.passwordsNotMatch"),
      path: ["confirmPassword"],
    });

export const createForgotPasswordSchema = (t: TranslateFn) =>
  z.object({
    email: createEmailSchema(t),
  });

// Export types for use in components
export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;
export type ResetPasswordFormData = z.infer<ReturnType<typeof createResetPasswordSchema>>;
export type ForgotPasswordFormData = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
