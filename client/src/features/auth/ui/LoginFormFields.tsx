import { useTranslation } from 'react-i18next';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input, Label } from '@/shared/ui';
import type { LoginFormValues } from '../model/login.schema';

interface LoginFormFieldsProps {
  register: UseFormRegister<LoginFormValues>;
  errors: FieldErrors<LoginFormValues>;
  disabled: boolean;
}

/** Form inputs for phone number and password on the login form with Zod validation feedback. */
export function LoginFormFields({ register, errors, disabled }: LoginFormFieldsProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="phone">
          {t('auth.phone')}
        </Label>
        <Input
          id="phone"
          type="text"
          autoComplete="tel"
          placeholder={t('auth.phonePlaceholder')}
          disabled={disabled}
          className={errors.phone ? 'border-launch-orange focus-visible:ring-launch-orange/20' : ''}
          {...register('phone')}
        />
        {errors.phone && (
          <p className="text-xs text-launch-orange font-medium tracking-[-0.01em]">
            {errors.phone.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">
          {t('auth.password')}
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder={t('auth.passwordPlaceholder')}
          disabled={disabled}
          className={errors.password ? 'border-launch-orange focus-visible:ring-launch-orange/20' : ''}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-launch-orange font-medium tracking-[-0.01em]">
            {errors.password.message}
          </p>
        )}
      </div>
    </>
  );
}
