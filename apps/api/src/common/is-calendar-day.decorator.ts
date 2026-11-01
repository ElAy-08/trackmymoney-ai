import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';

// Accepts only a real day written as YYYY-MM-DD 
export function IsCalendarDay() {
  return applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'must be a date like 2026-10-30',
    }),
    IsISO8601(
      { strict: true, strictSeparator: true },
      { message: 'must be a valid calendar date' },
    ),
  );
}