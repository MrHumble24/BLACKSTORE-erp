import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { PublicUser, userSelect } from '../common/auth-user';
import { ADMIN_ROLE } from '../common/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_COST = 10;

/** User accounts and roles (PRD FR-29). Users are deactivated, never deleted (BR-12). */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** One page of users, oldest first. */
  async findAll({ page, pageSize }: PaginationQueryDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: userSelect,
        orderBy: { id: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count(),
    ]);
    return { items, total, page, pageSize };
  }

  /** All roles, for the role picker. */
  findRoles() {
    return this.prisma.role.findMany({
      select: { id: true, name: true, permissions: true },
      orderBy: { id: 'asc' },
    });
  }

  /** Creates a user with a hashed password. Duplicate phone → 409 via the global filter. */
  async create(dto: CreateUserDto, actorId: number): Promise<PublicUser> {
    const { password, ...data } = dto;
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { ...data, passwordHash },
        select: userSelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'create', entity: 'User', entityId: user.id, after: user },
        tx,
      );
      return user;
    });
  }

  /** Updates a user; refuses to leave the shop without an active Admin. */
  async update(
    id: number,
    dto: UpdateUserDto,
    actorId: number,
  ): Promise<PublicUser> {
    const before = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!before) throw new NotFoundException('User not found');
    await this.assertNotLastAdmin(before, dto);

    const { password, ...data } = dto;
    const passwordHash = password
      ? await bcrypt.hash(password, BCRYPT_COST)
      : undefined;
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { ...data, passwordHash },
        select: userSelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'User', entityId: id, before, after: user },
        tx,
      );
      return user;
    });
  }

  /** 400 if this change deactivates or demotes the only active Admin. */
  // ponytail: check-then-write, two admins removing each other at the same instant could race; use a serializable transaction if that ever matters.
  private async assertNotLastAdmin(user: PublicUser, dto: UpdateUserDto) {
    const isActiveAdmin = user.isActive && user.role.name === ADMIN_ROLE;
    const deactivates = dto.isActive === false;
    const demotes = dto.roleId !== undefined && dto.roleId !== user.role.id;
    if (!isActiveAdmin || !(deactivates || demotes)) return;

    const otherAdmins = await this.prisma.user.count({
      where: {
        isActive: true,
        role: { name: ADMIN_ROLE },
        id: { not: user.id },
      },
    });
    if (otherAdmins === 0) {
      throw new BadRequestException(
        'Cannot deactivate or demote the last active Admin',
      );
    }
  }
}
