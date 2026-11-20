import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { mapValidationErrors } from '@/lib/auth/form-errors';
import {
  registerSchema,
  type RegisterFormValues,
} from '@/lib/auth/validation';
import { setSessionTokens } from '@/lib/auth/session-store';
import { api } from '@/lib/api/client';

export function RegisterPage() {
  const navigate = useNavigate();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  async function onSubmit(values: RegisterFormValues) {
    form.clearErrors('root.server');
    try {
      const { data, error, response } = await api.POST('/auth/register', {
        body: values,
      });

      if (response.ok && data) {
        setSessionTokens(data.accessToken, data.refreshToken);
        navigate('/', { replace: true });
        return;
      }

      if (response.status === 400) {
        const mapped = mapValidationErrors(
          error,
          ['name', 'email', 'password'],
          (field, message) => form.setError(field, { type: 'server', message }),
        );
        if (mapped === 0) {
          form.setError('root.server', {
            type: 'server',
            message: 'Please check the information you entered.',
          });
        }
      } else if (response.status === 409) {
        form.setError('email', {
          type: 'server',
          message: 'Email already taken.',
        });
      } else if (response.status === 429) {
        form.setError('root.server', {
          type: 'server',
          message: 'Too many attempts. Please wait a minute before trying again.',
        });
      } else {
        form.setError('root.server', {
          type: 'server',
          message: 'We could not create your account. Please try again.',
        });
      }
    } catch (error) {
      form.setError('root.server', {
        type: 'server',
        message:
          error instanceof TypeError
            ? 'Unable to reach the server. Check your connection and try again.'
            : 'We could not create your account. Please try again.',
      });
    }
  }

  const errors = form.formState.errors;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Start organizing your finances with TrackMyMoney AI.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Name
              </label>
              <input
                autoComplete="name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                id="name"
                type="text"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
                {...form.register('name')}
              />
              {errors.name?.message && (
                <p className="text-sm text-destructive" id="name-error">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                autoComplete="email"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                id="email"
                type="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...form.register('email')}
              />
              {errors.email?.message && (
                <p className="text-sm text-destructive" id="email-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <input
                autoComplete="new-password"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                id="password"
                type="password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...form.register('password')}
              />
              {errors.password?.message && (
                <p className="text-sm text-destructive" id="password-error">
                  {errors.password.message}
                </p>
              )}
            </div>

            {errors.root?.server?.message && (
              <p className="text-sm text-destructive" role="alert">
                {errors.root.server.message}
              </p>
            )}

            <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link className="font-medium text-foreground underline-offset-4 hover:underline" to="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
