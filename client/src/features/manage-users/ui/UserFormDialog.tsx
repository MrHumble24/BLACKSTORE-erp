import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import type { User } from '@/entities/user';
import { UserFormContent } from './UserFormContent';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

/**
 * Dialog for creating a new user or editing an existing user.
 */
export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-8">
        <DialogHeader>
          <DialogTitle>
            {user ? t('users.editUser') : t('users.addUser')}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <UserFormContent
            key={user ? `edit-${user.id}` : 'create'}
            user={user}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
