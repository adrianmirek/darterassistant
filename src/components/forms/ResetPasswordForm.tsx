import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Toaster, toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PasswordInput } from './fields/PasswordInput';
import { PasswordStrengthIndicator } from './fields/PasswordStrengthIndicator';
import { useAuthApi } from '@/lib/hooks/useAuthApi';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/utils/validation.schemas';

interface ResetPasswordFormProps {
  token: string | null;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const { resetPassword } = useAuthApi();
  const [tokenError, setTokenError] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  const password = form.watch('password');

  useEffect(() => {
    // Validate token on component mount
    if (!token) {
      setTokenError('Invalid reset link. Please request a new password reset.');
    }
    
    // TODO: Validate token with backend
    // For now, just check if token exists
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error('Invalid reset token');
      return;
    }

    try {
      await resetPassword({
        token,
        password: data.password,
      });
      
      toast.success('Password reset successful!', {
        description: 'You can now sign in with your new password.',
      });
      
      setTimeout(() => {
        window.location.href = '/auth/login';
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error('Password reset failed', {
        description: errorMessage,
      });
    }
  };

  if (tokenError) {
    return (
      <>
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invalid or expired link</AlertTitle>
            <AlertDescription>
              {tokenError}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              asChild
            >
              <a href="/auth/forgot-password">
                Request new reset link
              </a>
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              asChild
            >
              <a href="/auth/login">
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
          <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
          <p className="text-muted-foreground">Enter your new password below</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <PasswordInput
                        placeholder="Create a strong password"
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
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Confirm your new password"
                      {...field}
                      disabled={form.formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                'Reset password'
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          <a href="/auth/login" className="text-muted-foreground hover:text-primary">
            Back to sign in
          </a>
        </div>
      </div>

      <Toaster richColors position="top-right" />
    </>
  );
}

