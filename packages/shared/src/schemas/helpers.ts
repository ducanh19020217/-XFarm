import { z } from 'zod';

export const emptyToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

export const normalizeEmptyValues = (value: unknown): unknown => {
  if (typeof value === 'string') return emptyToUndefined(value);
  if (typeof value === 'number' && Number.isNaN(value)) return undefined;
  if (Array.isArray(value)) return value.map(normalizeEmptyValues);
  if (value instanceof Date || (value && typeof value !== 'object')) return value;
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeEmptyValues(entry)]),
    );
  }
  return value;
};

export const optionalString = () =>
  z.preprocess((val) => (val === null ? undefined : emptyToUndefined(val)), z.string().optional());

export const optionalNullableString = () =>
  z.preprocess(emptyToUndefined, z.string().nullable().optional());

export const optionalNumber = (schema = z.number()) =>
  z.preprocess((value) => {
    const normalized = emptyToUndefined(value);
    if (typeof normalized === 'number' && Number.isNaN(normalized)) return undefined;
    return typeof normalized === 'string' ? Number(normalized) : normalized;
  }, schema.nullable().optional());

export const optionalDate = () =>
  z.preprocess(emptyToUndefined, z.coerce.date().nullable().optional());

export const optionalBoolean = () =>
  z.preprocess((value) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return emptyToUndefined(value);
  }, z.boolean().optional());

export const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
