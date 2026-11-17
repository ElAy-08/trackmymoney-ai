import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../../generated/prisma/enums.js';

export class CategoryResponseDto {
  id!: string;
  userId!: string;
  name!: string;

  @ApiProperty({ enum: TransactionType, enumName: 'TransactionType' })
  type!: TransactionType;

  @ApiProperty({ type: String, nullable: true })
  color!: string | null;

  @ApiProperty({ type: String, nullable: true })
  icon!: string | null;

  @ApiProperty({ type: Date, nullable: true })
  archivedAt!: Date | null;

  createdAt!: Date;
}
