import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  TablePagination,
  TableLoadingRow,
  TableEmptyRow,
} from '@/shared/ui';
import { type User } from '@/entities/user';
import { ToggleUserStatusButton } from '@/features/manage-users';

interface UserTableRowProps {
  user: User;
  onEdit: (user: User) => void;
}

/** Single row inside Apple-styled users table with Apple Blue edit action and quiet controls. */
function UserTableRow({ user, onEdit }: UserTableRowProps) {
  const { t } = useTranslation();

  return (
    <TableRow key={user.id} className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="font-medium text-ink tracking-[-0.016em]">{user.name}</TableCell>
      <TableCell className="text-slate text-xs tracking-[-0.01em]">{user.phone}</TableCell>
      <TableCell>
        <Badge variant={user.role.name === 'Admin' ? 'default' : 'secondary'} className="px-2.5 py-0.5 text-[11px]">
          {user.role.name === 'Admin' ? t('users.adminRole') : t('users.staffRole')}
        </Badge>
      </TableCell>
      <TableCell className="uppercase text-xs text-slate font-medium">{user.language}</TableCell>
      <TableCell>
        <Badge variant={user.isActive ? 'active' : 'destructive'} className="px-2.5 py-0.5 text-[11px]">
          {user.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      </TableCell>
      <TableCell className="text-right whitespace-nowrap min-w-[210px]">
        <div className="flex items-center justify-end gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(user)}
            className="h-7.5 px-3 rounded-full border-hairline-silver bg-gallery-white text-apple-blue hover:bg-studio-mist hover:border-apple-blue/50 text-xs font-medium gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <Pencil className="h-3 w-3 text-apple-blue" />
            <span>{t('common.edit')}</span>
          </Button>
          <ToggleUserStatusButton user={user} />
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Header row for the Apple-styled users table. */
function UsersTableHeader() {
  const { t } = useTranslation();

  return (
    <TableHeader>
      <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
        <TableHead>{t('users.name')}</TableHead>
        <TableHead>{t('users.phone')}</TableHead>
        <TableHead>{t('users.role')}</TableHead>
        <TableHead>{t('users.language')}</TableHead>
        <TableHead>{t('users.status')}</TableHead>
        <TableHead className="text-right whitespace-nowrap min-w-[210px]">{t('common.actions')}</TableHead>
      </TableRow>
    </TableHeader>
  );
}

interface UsersTableBodyProps {
  users: User[];
  isLoading: boolean;
  onEditUser: (user: User) => void;
}

/** Table body rendering loading, empty states, or user rows. */
function UsersTableBody({ users, isLoading, onEditUser }: UsersTableBodyProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <TableBody>
        <TableLoadingRow colSpan={6} />
      </TableBody>
    );
  }

  if (users.length === 0) {
    return (
      <TableBody>
        <TableEmptyRow colSpan={6} message={t('users.noUsers')} />
      </TableBody>
    );
  }

  return (
    <TableBody>
      {users.map((user) => (
        <UserTableRow key={user.id} user={user} onEdit={onEditUser} />
      ))}
    </TableBody>
  );
}

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  onEditUser: (user: User) => void;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (newPage: number) => void;
}

/** Apple-styled users table container with integrated footer pagination and 28px radius. */
export function UsersTable({
  users,
  isLoading,
  onEditUser,
  page,
  totalPages,
  total,
  onPageChange,
}: UsersTableProps) {
  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none">
      <Table>
        <UsersTableHeader />
        <UsersTableBody users={users} isLoading={isLoading} onEditUser={onEditUser} />
      </Table>
      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={onPageChange}
      />
    </div>
  );
}
