import { IsOptional, IsString } from 'class-validator';

export class MarkGoalDto {
  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
