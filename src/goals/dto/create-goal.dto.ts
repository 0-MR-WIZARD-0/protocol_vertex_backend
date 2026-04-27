import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export enum RepeatType {
  DAILY = 'DAILY',
  WEEKDAYS = 'WEEKDAYS',
  WEEKENDS = 'WEEKENDS',
  CUSTOM = 'CUSTOM',
}

export class CreateGoalDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  startDate: string;

  @IsString()
  deadline: string;

  @IsEnum(RepeatType)
  repeatType: RepeatType;

  @IsOptional()
  repeatDays?: number[];

  @IsInt()
  timesPerDay: number;

  @IsBoolean()
  isDream: boolean;

  @IsOptional()
  @IsString()
  dreamId?: string;
}
