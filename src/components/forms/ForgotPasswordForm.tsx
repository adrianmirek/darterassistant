import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Toaster, toast } from "sonner";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { useAuthApi } from "@/lib/hooks/useAuthApi";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/utils/validation.schemas";

export default function ForgotPasswordForm() {
  const { forgotPassword } = useAuthApi();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
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
      toast.success("Check your email", {
        description:
          result.message || "If an account exists with this email, you will receive password reset instructions.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error("Failed to send reset email", {
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
            <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
            <p className="text-muted-foreground">
              If an account exists with the email address you provided, you will receive password reset instructions
              shortly.
            </p>
            <p className="text-sm text-muted-foreground">
              Didn't receive an email? Check your spam folder or try again.
            </p>
          </div>

          <div className="space-y-4">
            <Button type="button" variant="outline" className="w-full" onClick={() => setIsSuccess(false)}>
              Try another email
            </Button>

            <Button type="button" variant="ghost" className="w-full" asChild>
              <a href="/auth/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
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
          <h1 className="text-3xl font-bold tracking-tight">Forgot password?</h1>
          <p className="text-muted-foreground">
            Enter your email address and we'll send you instructions to reset your password
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
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
                  Sending...
                </>
              ) : (
                "Send reset instructions"
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <Button type="button" variant="ghost" className="text-sm" asChild>
            <a href="/auth/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </a>
          </Button>
        </div>
      </div>

      <Toaster richColors position="top-right" />
    </>
  );
}
