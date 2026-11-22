import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums.js';

export class PublicUserDto {
  id!: string;
  email!: string;
  name!: string;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;

  createdAt!: Date;
}

export class TokensResponseDto {
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}

export class AuthResponseDto {
  user!: PublicUserDto;
  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}
