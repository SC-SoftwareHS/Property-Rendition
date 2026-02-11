import { Inject } from '@nestjs/common';
import { DRIZZLE } from './database.module';

export const InjectDrizzle = () => Inject(DRIZZLE);
