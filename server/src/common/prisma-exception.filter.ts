import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';

/** Maps known Prisma errors to HTTP errors in one place, so services don't have to. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  override catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ) {
    super.catch(this.toHttp(exception) ?? exception, host);
  }

  private toHttp(
    e: Prisma.PrismaClientKnownRequestError,
  ): HttpException | null {
    switch (e.code) {
      case 'P2002':
        return new ConflictException(
          `Already exists: ${this.uniqueFields(e) ?? 'unique value'}`,
        );
      case 'P2003':
        return new BadRequestException('Referenced record does not exist');
      case 'P2025':
        return new NotFoundException('Record not found');
      default:
        return null;
    }
  }

  /** Column name(s) of the violated unique constraint, e.g. "phone". */
  private uniqueFields(e: Prisma.PrismaClientKnownRequestError) {
    const meta = e.meta as
      | {
          target?: string[] | string;
          driverAdapterError?: { cause?: { constraint?: { index?: string } } };
        }
      | undefined;
    if (meta?.target) return [meta.target].flat().join(', ');
    // Driver adapters report the index name, e.g. "User_phone_key" → "phone".
    return meta?.driverAdapterError?.cause?.constraint?.index
      ?.replace(/^[^_]+_/, '')
      .replace(/_key$/, '');
  }
}
