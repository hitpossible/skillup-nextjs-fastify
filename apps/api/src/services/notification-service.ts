import type { FastifyInstance } from "fastify";

export async function listNotifications(
  app: FastifyInstance,
  userId: bigint,
  query: { page?: number; limit?: number }
) {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    app.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        isRead: true,
        createdAt: true,
      },
    }),
    app.prisma.notification.count({ where: { userId } }),
  ]);

  return {
    data: notifications.map((n) => ({
      id: n.id.toString(),
      type: n.type,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      unreadCount: await app.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    },
  };
}

export async function markNotificationRead(
  app: FastifyInstance,
  userId: bigint,
  notificationId: bigint
) {
  const existing = await app.prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true },
  });
  if (!existing) return null;

  const updated = await app.prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
    select: { id: true, isRead: true },
  });
  return { id: updated.id.toString(), isRead: updated.isRead };
}

export async function markAllNotificationsRead(
  app: FastifyInstance,
  userId: bigint
) {
  const result = await app.prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
}
