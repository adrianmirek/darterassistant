import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "./fields/PasswordInput";
import { useAuthApi } from "@/lib/hooks/useAuthApi";
import { createLoginSchema, type LoginFormData } from "@/lib/utils/validation.schemas";
import { I18nProvider, useTranslation } from "@/lib/hooks/I18nProvider";
import { type Language } from "@/lib/i18n";

interface LoginFormProps {
  lang: Language;
}

function LoginFormContent() {
  const { login } = useAuthApi();
  const t = useTranslation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(createLoginSchema(t)),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);

      toast.success(t("common.success"), {
        description: t("auth.loggingIn"),
      });

      setTimeout(() => {
        // eslint-disable-next-line react-compiler/react-compiler
        window.location.href = "/";
      }, 500);
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
          <h1 className="text-3xl font-bold tracking-tight">{t("common.welcome")}</h1>
          <p className="text-muted-foreground">{t("auth.loginSubtitle")}</p>
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
                    <PasswordInput
                      placeholder={t("auth.passwordPlaceholder")}
                      {...field}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end">
              <a href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                {t("auth.forgotPassword")}
              </a>
            </div>

            <Button type="submit" variant="gradient" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.loggingIn")}
                </>
              ) : (
                t("auth.signIn")
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">{t("auth.noAccount")} </span>
          <a href="/auth/register" className="text-primary hover:underline font-medium">
            {t("auth.signUp")}
          </a>
        </div>
      </div>

      <Toaster richColors position="top-right" />
    </>
  );
}

export default function LoginForm({ lang }: LoginFormProps) {
  return (
    <I18nProvider lang={lang}>
      <LoginFormContent />
    </I18nProvider>
  );
}
