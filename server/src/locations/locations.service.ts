import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

const locationSelect = {
  id: true,
  name: true,
  type: true,
  isActive: true,
} satisfies Prisma.LocationSelect;

/** Stock locations (warehouses and shops). Deactivated, never deleted (BR-12). */
@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Pick-list of locations; active only unless all=true. */
  findAll(all: boolean) {
    return this.prisma.location.findMany({
      where: all ? {} : { isActive: true },
      select: locationSelect,
      orderBy: { id: 'asc' },
    });
  }

  /** Creates a location. Duplicate name → 409 via the global filter. */
  create(dto: CreateLocationDto, actorId: number) {
    return this.prisma.$transaction(async (tx) => {
      const location = await tx.location.create({
        data: dto,
        select: locationSelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'create', entity: 'Location', entityId: location.id, after: location },
        tx,
      );
      return location;
    });
  }

  /** Updates a location; duplicate name → 409 via the global filter. */
  async update(id: number, dto: UpdateLocationDto, actorId: number) {
    const before = await this.prisma.location.findUnique({
      where: { id },
      select: locationSelect,
    });
    if (!before) throw new NotFoundException('Location not found');
    return this.prisma.$transaction(async (tx) => {
      const location = await tx.location.update({
        where: { id },
        data: dto,
        select: locationSelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'Location', entityId: id, before, after: location },
        tx,
      );
      return location;
    });
  }
}
