import { createZodDto } from 'nestjs-zod';
import { loginSchema } from '@xfarm/shared';

export class LoginDto extends createZodDto(loginSchema) {}
