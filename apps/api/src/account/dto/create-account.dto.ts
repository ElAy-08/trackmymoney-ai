import { Transform } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    IsString,
    Matches,
    Max,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class CreateAccountDto {
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @MinLength(1)
    @MaxLength(60)
    name!: string;

    @IsOptional()
    @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter code like EUR' })
    currency?: string;

    @IsOptional()
    @IsInt()
    @Min(-2_000_000_000)
    @Max(2_000_000_000)
    openingBalanceCents?: number;
}