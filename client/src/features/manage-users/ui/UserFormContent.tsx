import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { DialogFormFooter } from '@/shared/ui';
import { getApiErrorMessage, getApiErrorStatus } from '@/shared/api';
import {
  useCreateUser,
  useUpdateUser,
  useRoles,
  type User,
} from '@/entities/user';
import { createUserFormSchema, type UserFormValues } from '../model/user.schema';
import {
  UserNamePhoneFields,
  UserPasswordField,
  UserRoleSelect,
  UserLanguageSelect,
} from './UserFormFields';

function handleApiError(err: unknown, t: (k: string) => string) {
  if (getApiErrorStatus(err) === 409) {
    toast.error(t('users.phoneConflict'));
  } else {
    toast.error(getApiErrorMessage(err) ?? t('common.error'));
  }
}

function useUserForm(user: User | null | undefined, onClose: () => void) {
  const { t } = useTranslation();
  const isEditing = Boolean(user);
  const { data: roles = [] } = useRoles();

  const { mutate: createUser, isPending: isCreating } = useCreateUser();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();

  const schema = useMemo(() => createUserFormSchema(isEditing, t), [isEditing, t]);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      password: '',
      roleId: user?.role.id ?? (roles[0]?.id || 0),
      language: user?.language ?? 'uz',
    },
  });

  const onSubmit = (values: UserFormValues) => {
    if (user) {
      const payload = {
        name: values.name.trim(),
        phone: values.phone.trim(),
        roleId: values.roleId,
        language: values.language,
        // Passwords are never trimmed — create and edit behave the same; the server validates.
        ...(values.password ? { password: values.password } : {}),
      };
      updateUser({ id: user.id, payload }, {
        onSuccess: () => { toast.success(t('users.updatedSuccess')); onClose(); },
        onError: (err) => handleApiError(err, t),
      });
    } else {
      createUser({
        name: values.name.trim(),
        phone: values.phone.trim(),
        password: values.password,
        roleId: values.roleId,
        language: values.language,
      }, {
        onSuccess: () => { toast.success(t('users.createdSuccess')); onClose(); },
        onError: (err) => handleApiError(err, t),
      });
    }
  };

  return { form, roles, isPending: isCreating || isUpdating, onSubmit };
}

interface UserFormContentProps {
  user?: User | null;
  onClose: () => void;
}

/** Form body handling user creation and edition with Zod validation. */
export function UserFormContent({ user, onClose }: UserFormContentProps) {
  const { form, roles, isPending, onSubmit } = useUserForm(user, onClose);
  const { register, handleSubmit, setValue, control, formState: { errors } } = form;

  // useWatch (not watch) so the role/language selects re-render on setValue.
  const currentRoleId = useWatch({ control, name: 'roleId' });
  const currentLanguage = useWatch({ control, name: 'language' });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
      <UserNamePhoneFields register={register} errors={errors} disabled={isPending} />
      <UserPasswordField register={register} errors={errors} isEditing={Boolean(user)} disabled={isPending} />
      <UserRoleSelect
        roleId={currentRoleId}
        setRoleId={(val) => setValue('roleId', val, { shouldValidate: true })}
        roles={roles}
        error={errors.roleId?.message}
        disabled={isPending}
      />
      <UserLanguageSelect
        language={currentLanguage}
        setLanguage={(val) => setValue('language', val, { shouldValidate: true })}
        error={errors.language?.message}
        disabled={isPending}
      />
      <DialogFormFooter onClose={onClose} isPending={isPending} />
    </form>
  );
}
