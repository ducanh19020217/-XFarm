import { z } from 'zod';

export const activityMaterialsSchema = z.object({
  materials: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.coerce.number().positive('Số lượng phải lớn hơn 0'),
      }),
    )
    .min(1, 'Cần ít nhất một vật tư'),
});
export type ActivityMaterialsInput = z.infer<typeof activityMaterialsSchema>;
export const createActivityMaterialsSchema = activityMaterialsSchema;
