import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/api';
import { useLogin } from '../api';
import { createLoginSchema, type LoginFormValues } from '../model/login.schema';
import { LoginFormFields } from './LoginFormFields';

function mapLoginError(err: unknown, t: (k: string) => string): string {
  const status = getApiErrorStatus(err);
  if (status === 401) return t('auth.invalidCredentials');
  if (status === 429) return t('auth.tooManyRequests');
  return getApiErrorMessage(err) ?? t('common.error');
}

/** Error banner shown when the API rejects the login attempt. */
function LoginErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-launch-orange/10 border border-launch-orange/20 p-3 text-xs font-medium text-launch-orange tracking-[-0.01em]">
      {message}
    </div>
  );
}

/** Apple-styled login card component with Zod validation and Pricing Blue submit button. */
export function LoginForm() {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { mutate: login, isPending } = useLogin();

  const schema = useMemo(() => createLoginSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '', password: '' },
  });

  const onSubmit = (values: LoginFormValues) => {
    setErrorMessage(null);
    login(values, {
      onError: (err) => setErrorMessage(mapLoginError(err, t)),
    });
  };

  return (
    <Card className="w-full max-w-sm rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-2 shadow-none">
      <CardHeader className="space-y-1.5 text-center p-6 pb-2">
        <CardTitle className="text-2xl font-semibold font-sf-pro-display text-ink tracking-tight">
          {t('auth.title')}
        </CardTitle>
        <CardDescription className="text-xs text-slate tracking-[-0.01em]">
          {t('auth.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMessage && <LoginErrorBanner message={errorMessage} />}
          <LoginFormFields register={register} errors={errors} disabled={isPending} />
          <Button
            type="submit"
            className="w-full h-10 rounded-full bg-pricing-blue hover:bg-pricing-blue/90 text-white text-xs font-medium tracking-[-0.01em] mt-2 border-0 shadow-none cursor-pointer transition-colors"
            disabled={isPending}
          >
            {isPending ? t('auth.loggingIn') : t('auth.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
