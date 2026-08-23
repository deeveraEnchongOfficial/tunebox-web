import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors/AppError';
import { ErrorCode } from '@/lib/errors/codes';

export const playlistService = {
  async list(userId: string) {
    return prisma.playlist.findMany({
      where: { userId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getById(id: string, userId: string) {
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        items: {
          include: { music: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!playlist || playlist.userId !== userId) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: 'Playlist not found.' });
    }
    return playlist;
  },

  async create(userId: string, data: { name: string; description?: string }) {
    return prisma.playlist.create({
      data: { userId, name: data.name, description: data.description },
    });
  },

  async update(id: string, userId: string, data: { name?: string; description?: string }) {
    await this.getById(id, userId);
    return prisma.playlist.update({ where: { id }, data });
  },

  async delete(id: string, userId: string) {
    await this.getById(id, userId);
    await prisma.playlist.delete({ where: { id } });
  },

  async addItem(playlistId: string, userId: string, musicId: string) {
    await this.getById(playlistId, userId);
    const music = await prisma.music.findUnique({ where: { id: musicId } });
    if (!music || music.userId !== userId) {
      throw new AppError({ code: ErrorCode.NOT_FOUND, message: 'Music not found.' });
    }

    const maxPos = await prisma.playlistItem.aggregate({
      where: { playlistId },
      _max: { position: true },
    });
    const position = (maxPos._max.position ?? -1) + 1;

    try {
      return await prisma.playlistItem.create({
        data: { playlistId, musicId, position },
      });
    } catch {
      throw new AppError({
        code: ErrorCode.DUPLICATE_MUSIC,
        message: 'Already in this playlist.',
      });
    }
  },

  async removeItem(playlistId: string, userId: string, musicId: string) {
    await this.getById(playlistId, userId);
    await prisma.playlistItem.delete({
      where: { playlistId_musicId: { playlistId, musicId } },
    });
  },

  async reorder(playlistId: string, userId: string, itemIds: string[]) {
    await this.getById(playlistId, userId);
    await prisma.$transaction(
      itemIds.map((id, index) =>
        prisma.playlistItem.update({ where: { id }, data: { position: index } }),
      ),
    );
  },
};
