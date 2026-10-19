import { createZodDto } from 'nestjs-zod';
import { webshopCheckoutSchema, webshopOrderLookupSchema } from '@xfarm/shared';

export class WebshopCheckoutDto extends createZodDto(webshopCheckoutSchema) {}
export class WebshopOrderLookupDto extends createZodDto(webshopOrderLookupSchema) {}
