import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    fullName: z.string(),
    roles: z.array(z.string()),
  }),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
