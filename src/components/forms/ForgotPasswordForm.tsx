import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "sonner";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { useAuthApi } from "@/lib/hooks/useAuthApi";
import { createForgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/utils/validation.schemas";
import { I18nProvider, useTranslation } from "@/lib/hooks/I18nProvider";
import { type Language } from "@/lib/i18n";

interface ForgotPasswordFormProps {
  lang: Language;
}

function ForgotPasswordFormContent() {
  const { forgotPassword } = useAuthApi();
  const [isSuccess, setIsSuccess] = useState(false);
  const t = useTranslation();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(createForgotPasswordSchema(t)),
    defaultValues: {
      email: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const result = await forgotPassword(data);

      // Success - show confirmation
      setIsSuccess(true);
      toast.success(t("common.success"), {
        description: result.message || t("auth.resetLinkSent"),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("errors.generic");
      toast.error(t("common.error"), {
        description: errorMessage,
      });
    }
  };

  if (isSuccess) {
    return (
      <>
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{t("auth.forgotPasswordTitle")}</h1>
            <p className="text-muted-foreground">{t("auth.resetLinkSent")}</p>
            <p className="text-sm text-muted-foreground">{t("auth.forgotPasswordSubtitle")}</p>
          </div>

          <div className="space-y-4">
            <Button type="button" variant="outline" className="w-full" onClick={() => setIsSuccess(false)}>
              {t("common.reset")}
            </Button>

            <Button type="button" variant="ghost" className="w-full" asChild>
              <a href="/auth/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("auth.backToLogin")}
              </a>
            </Button>
          </div>
        </div>

        <Toaster richColors position="top-right" />
      </>
    );
  }

  return (
    <>
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t("auth.forgotPasswordTitle")}</h1>
          <p className="text-muted-foreground">{t("auth.forgotPasswordSubtitle")}</p>
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

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.sendingResetLink")}
                </>
              ) : (
                t("auth.sendResetLink")
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <Button type="button" variant="ghost" className="text-sm" asChild>
            <a href="/auth/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("auth.backToLogin")}
            </a>
          </Button>
        </div>
      </div>

      <Toaster richColors position="top-right" />
    </>
  );
}

export default function ForgotPasswordForm({ lang }: ForgotPasswordFormProps) {
  return (
    <I18nProvider lang={lang}>
      <ForgotPasswordFormContent />
    </I18nProvider>
  );
}
