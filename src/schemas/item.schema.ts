import { z } from 'zod';
export const geoPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number().gte(-180).lte(180), z.number().gte(-90).lte(90)]),
});
export const scanInputSchema = z.object({ location: geoPointSchema, note: z.string().max(500).optional() });
export const anomalyInputSchema = z.object({ location: geoPointSchema, note: z.string().min(1).max(500) });
export const loginInputSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
