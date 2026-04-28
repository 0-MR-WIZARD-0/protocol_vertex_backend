import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  Matches,
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

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(
    /^((morning|day|evening)|(\d{2}:\d{2})|(\d{2}:\d{2}-\d{2}:\d{2}))$/,
    {
      each: true,
      message: 'Slot must be: morning | day | evening | HH:mm | HH:mm-HH:mm',
    },
  )
  slots: string[];

  @IsBoolean()
  isDream: boolean;

  @IsOptional()
  @IsString()
  dreamId?: string;
}
