import { ItemCondition } from '@prisma/client';
import { IsEnum, IsObject, IsOptional } from 'class-validator';

/** Edit a device's condition or attributes; location and status change elsewhere. */
export class UpdateItemDto {
  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;

  // Full replacement set, validated against the category's attributes in the service.
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number>;
}
