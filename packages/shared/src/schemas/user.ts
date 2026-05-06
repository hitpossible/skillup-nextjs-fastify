import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  fullName: z.string().min(1).max(255),
  locale: z.string().max(10).default("th"),
  roleIds: z.array(z.string()).min(1),
});

export const NotificationPrefsSchema = z.object({
  enrollment: z.boolean().optional(),
  courseUpdate: z.boolean().optional(),
  certificate: z.boolean().optional(),
  system: z.boolean().optional(),
});

export const UpdateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  locale: z.string().max(10).optional(),
  isActive: z.boolean().optional(),
  avatarUrl: z.string().optional().nullable(),
  notificationPrefs: NotificationPrefsSchema.optional().nullable(),
});

export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>;

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  avatarUrl: z.string().nullable(),
  locale: z.string(),
  isActive: z.boolean(),
  roles: z.array(z.string()),
  createdAt: z.string().datetime(),
});

export const PaginatedUsersSchema = z.object({
  data: z.array(UserResponseSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
