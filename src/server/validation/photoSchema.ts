import { z } from 'zod';

const base64ImageRegex = /^data:image\/\w+;base64,/;

const base64Image = z.string().refine(
  (val) => base64ImageRegex.test(val),
  { message: 'Must be a valid base64 data URI (data:image/*;base64,...)' }
);

export const savePhotoSchema = z.object({
  composedBase64: base64Image,
  photos: z.array(base64Image).max(10).default([]),
  userData: z.object({
    name: z.string().max(100).optional(),
    wa: z.string().max(20).optional(),
    email: z.string().email().max(255).optional().or(z.literal('')),
  }).default({}),
  template: z.string().max(50).default(''),
  filter: z.string().max(50).default(''),
  videoBase64: z.string().optional(),
});

export type SavePhotoInput = z.infer<typeof savePhotoSchema>;
