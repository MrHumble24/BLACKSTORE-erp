import { useTranslation } from 'react-i18next';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input, Label, SelectField } from '@/shared/ui';
import type { Role, Language } from '@/entities/user';
import type { UserFormValues } from '../model/user.schema';

interface NamePhoneProps {
  register: UseFormRegister<UserFormValues>;
  errors: FieldErrors<UserFormValues>;
  disabled: boolean;
}

/** Form inputs for user name and phone with Zod validation. */
export function UserNamePhoneFields({ register, errors, disabled }: NamePhoneProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="user-name">
          {t('users.name')}
        </Label>
        <Input
          id="user-name"
          placeholder={t('users.namePlaceholder')}
          disabled={disabled}
          className={errors.name ? 'border-launch-orange focus-visible:ring-launch-orange/20' : ''}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-launch-orange font-medium tracking-[-0.01em]">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="user-phone">
          {t('users.phone')}
        </Label>
        <Input
          id="user-phone"
          placeholder={t('auth.phonePlaceholder')}
          disabled={disabled}
          className={errors.phone ? 'border-launch-orange focus-visible:ring-launch-orange/20' : ''}
          {...register('phone')}
        />
        {errors.phone && (
          <p className="text-xs text-launch-orange font-medium tracking-[-0.01em]">{errors.phone.message}</p>
        )}
      </div>
    </>
  );
}

interface PasswordProps {
  register: UseFormRegister<UserFormValues>;
  errors: FieldErrors<UserFormValues>;
  isEditing: boolean;
  disabled: boolean;
}

/** Form input for user password with Zod validation. */
export function UserPasswordField({ register, errors, isEditing, disabled }: PasswordProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5">
      <Label htmlFor="user-password">
        {t('users.password')}
      </Label>
      <Input
        id="user-password"
        type="password"
        autoComplete="new-password"
        placeholder={t('users.passwordPlaceholder')}
        disabled={disabled}
        className={errors.password ? 'border-launch-orange focus-visible:ring-launch-orange/20' : ''}
        {...register('password')}
      />
      {errors.password && (
        <p className="text-xs text-launch-orange font-medium tracking-[-0.01em]">{errors.password.message}</p>
      )}
      {isEditing && (
        <p className="text-xs text-slate tracking-[-0.01em]">{t('users.passwordEditHelp')}</p>
      )}
    </div>
  );
}

interface RoleSelectProps {
  roleId: number;
  setRoleId: (v: number) => void;
  roles: Role[];
  error?: string;
  disabled: boolean;
}

/** Dropdown select for assigning a role to a user. */
export function UserRoleSelect({ roleId, setRoleId, roles, error, disabled }: RoleSelectProps) {
  const { t } = useTranslation();

  return (
    <SelectField
      label={t('users.role')}
      className="space-y-1.5"
      value={roleId ? String(roleId) : ''}
      onValueChange={(val) => setRoleId(Number(val))}
      disabled={disabled}
      placeholder={t('users.selectRole')}
      error={error}
      options={roles.map((role) => ({
        value: String(role.id),
        label: role.name === 'Admin' ? t('users.adminRole') : t('users.staffRole'),
      }))}
    />
  );
}

interface LanguageSelectProps {
  language: Language;
  setLanguage: (v: Language) => void;
  error?: string;
  disabled: boolean;
}

/** Dropdown select for user preferred language. */
export function UserLanguageSelect({ language, setLanguage, error, disabled }: LanguageSelectProps) {
  const { t } = useTranslation();

  return (
    <SelectField
      label={t('users.language')}
      className="space-y-1.5"
      value={language}
      onValueChange={(val) => setLanguage(val as Language)}
      disabled={disabled}
      placeholder={t('users.selectLanguage')}
      error={error}
      options={[
        { value: 'uz', label: "O'zbekcha" },
        { value: 'ru', label: 'Русский' },
      ]}
    />
  );
}
