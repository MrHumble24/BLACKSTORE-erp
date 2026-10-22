import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useUsers, type User } from '@/entities/user';
import { UserFormDialog } from '@/features/manage-users';
import { UsersTable } from './UsersTable';

interface UsersPageHeaderProps {
  onAddUser: () => void;
}

function UsersPageHeader({ onAddUser }: UsersPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-ink">
          {t('users.title')}
        </h1>
        <p className="text-xs text-slate tracking-[-0.01em]">{t('users.subtitle')}</p>
      </div>
      <Button
        onClick={onAddUser}
        className="gap-2 bg-pricing-blue hover:bg-[#0077ed] text-gallery-white rounded-full text-xs font-medium px-5 h-9 shrink-0 shadow-none border-0 cursor-pointer transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>{t('users.addUser')}</span>
      </Button>
    </div>
  );
}

/**
 * Users management page with Apple-styled layout and integrated user creation/editing.
 */
export function UsersPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data, isLoading } = useUsers(page, pageSize);
  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      <UsersPageHeader onAddUser={() => { setSelectedUser(null); setDialogOpen(true); }} />
      <UsersTable
        users={users}
        isLoading={isLoading}
        onEditUser={handleOpenEdit}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />
      <UserFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        user={selectedUser}
      />
    </div>
  );
}
