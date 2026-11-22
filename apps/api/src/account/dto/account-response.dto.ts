export class AccountResponseDto {
  id!: string;
  userId!: string;
  name!: string;
  currency!: string;
  openingBalanceCents!: number;
  isDefault!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
