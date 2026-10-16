import { z } from 'zod';
import { paginationSchema } from './pagination';
import { optionalString } from './helpers';

export const PUBLIC_SITE_SETTING_KEYS = [
  'farm.name',
  'farm.slogan',
  'farm.about',
  'contact.phone',
  'contact.email',
  'contact.address',
  'social.facebook',
  'social.zalo',
  'social.youtube',
  'home.banners',
  'bank.vietqr',
] as const;

export const createSiteSettingSchema = z.object({ key: z.string().min(1), value: z.unknown() });
export const updateSiteSettingSchema = z.object({ value: z.unknown() });
export const querySiteSettingSchema = paginationSchema.extend({ key: optionalString() });

export type CreateSiteSettingInput = z.infer<typeof createSiteSettingSchema>;
export type UpdateSiteSettingInput = z.infer<typeof updateSiteSettingSchema>;
export type QuerySiteSettingInput = z.infer<typeof querySiteSettingSchema>;
