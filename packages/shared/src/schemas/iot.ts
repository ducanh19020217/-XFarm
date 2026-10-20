import { z } from 'zod';
import { optionalString } from './helpers';

export const iotReadingItemSchema = z.object({
  value: z.number({ required_error: 'Giá trị đọc không được để trống' }),
  recordedAt: z
    .string()
    .datetime({ offset: true, message: 'Thời gian recordedAt phải theo định dạng ISO-8601' })
    .optional(),
});

export const iotReadingsSchema = z.object({
  readings: z
    .array(iotReadingItemSchema)
    .min(1, 'Danh sách readings phải có từ 1 đến 500 phần tử')
    .max(500, 'Danh sách readings tối đa 500 phần tử'),
});

export const queryTimeseriesSchema = z
  .object({
    areaId: optionalString(),
    sensorId: optionalString(),
    from: z.coerce.date({ required_error: 'Thời gian bắt đầu (from) không được để trống' }),
    to: z.coerce.date({ required_error: 'Thời gian kết thúc (to) không được để trống' }),
    bucket: z.enum(['5m', '1h', '1d'], {
      errorMap: () => ({ message: 'Bucket phải là 5m, 1h hoặc 1d' }),
    }),
  })
  .refine((data) => Boolean(data.areaId || data.sensorId), {
    message: 'Phải chỉ định ít nhất areaId hoặc sensorId',
    path: ['sensorId'],
  })
  .refine((data) => data.from <= data.to, {
    message: 'Thời gian bắt đầu (from) phải trước hoặc bằng thời gian kết thúc (to)',
    path: ['from'],
  });

export type IotReadingItem = z.infer<typeof iotReadingItemSchema>;
export type IotReadingsInput = z.infer<typeof iotReadingsSchema>;
export type QueryTimeseriesInput = z.infer<typeof queryTimeseriesSchema>;
export type TimeseriesBucket = z.infer<typeof queryTimeseriesSchema>['bucket'];
