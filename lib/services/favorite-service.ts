import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors/AppError';
import { ErrorCode } from '@/lib/errors/codes';

export const favoriteService = {
  async toggle(userId: string, musicId: string) {
    const music = await prisma.music.findUnique({ where: { id: musicId } });
    if (!music || music.userId !== userId) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: 'Music not found.' });
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_musicId: { userId, musicId } },
    });
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }
    await prisma.favorite.create({ data: { userId, musicId } });
    return { favorited: true };
  },

  async list(userId: string) {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { music: true },
      orderBy: { createdAt: 'desc' },
    });
    return favorites.map((f) => f.music);
  },

  async isFavorite(userId: string, musicId: string) {
    const fav = await prisma.favorite.findUnique({
      where: { userId_musicId: { userId, musicId } },
    });
    return !!fav;
  },
};
