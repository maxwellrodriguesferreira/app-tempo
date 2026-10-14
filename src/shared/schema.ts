import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(100),
  email: z.string().email('E-mail em formato inválido').max(150),
  password: z
    .string()
    .min(8, 'A senha deve possuir pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'A senha deve conter ao menos um número'),
});

export const loginSchema = z.object({
  email: z.string().email('E-mail em formato inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'user'], {
    errorMap: () => ({ message: 'Papel inválido. Deve ser admin ou user' }),
  }),
});

export const toggleBlockUserSchema = z.object({
  is_blocked: z.boolean(),
  reason: z.string().optional(),
});

export const weatherQuerySchema = z.object({
  city: z.string().min(1).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
});

export const addFavoriteSchema = z.object({
  city_name: z.string().min(1).max(100),
  state: z.string().max(50).optional(),
  country: z.string().default('Brasil'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
