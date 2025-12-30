import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "./fields/PasswordInput";
import { PasswordStrengthIndicator } from "./fields/PasswordStrengthIndicator";
import { useAuthApi } from "@/lib/hooks/useAuthApi";
import { createRegisterSchema, type RegisterFormData } from "@/lib/utils/validation.schemas";
import { I18nProvider, useTranslation } from "@/lib/hooks/I18nProvider";
import { type Language } from "@/lib/i18n";

interface RegisterFormProps {
  lang: Language;
}

function RegisterFormContent() {
  const { register } = useAuthApi();
  const t = useTranslation();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(createRegisterSchema(t)),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const password = form.watch("password");

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const result = await register({
        email: data.email,
        password: data.password,
      });

      // Check if email confirmation is required (session will be null)
      if (result.session === null) {
        toast.success(t("common.success"), {
          description: t("auth.registerSubtitle"),
        });
      } else {
        toast.success(t("common.success"), {
          description: t("auth.registerSubtitle"),
        });
      }

      setTimeout(() => {
        // eslint-disable-next-line react-compiler/react-compiler
        window.location.href = "/auth/login";
      }, 2500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("errors.generic");
      toast.error(t("common.error"), {
        description: errorMessage,
      });
    }
  };

  return (
    <>
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("auth.registerTitle")}</h1>
          <p className="text-muted-foreground">{t("auth.registerSubtitle")}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.email")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("auth.emailPlaceholder")}
                      {...field}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.password")}</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <PasswordInput
                        placeholder={t("auth.passwordPlaceholder")}
                        {...field}
                        disabled={form.formState.isSubmitting}
                      />
                      <PasswordStrengthIndicator password={password} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.confirmPassword")}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder={t("auth.confirmPasswordPlaceholder")}
                      {...field}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" variant="gradient" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.creatingAccount")}
                </>
              ) : (
                t("auth.registerTitle")
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">{t("auth.alreadyHaveAccount")} </span>
          <a href="/auth/login" className="text-primary hover:underline font-medium">
            {t("auth.signIn")}
          </a>
        </div>
      </div>

      <Toaster richColors position="top-right" />
    </>
  );
}

export default function RegisterForm({ lang }: RegisterFormProps) {
  return (
    <I18nProvider lang={lang}>
      <RegisterFormContent />
    </I18nProvider>
  );
}
