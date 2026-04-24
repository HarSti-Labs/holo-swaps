import { UserCollection, CardStatus } from "@prisma/client";
import { prisma } from "@/config/prisma";
import {
  ICollectionRepository,
  CreateCollectionItemData,
  UpdateCollectionItemData,
} from "@/repositories/interfaces/ICollectionRepository";
import { PaginatedResult, PaginationParams } from "@/types";

const collectionInclude = {
  card: true,
  media: { orderBy: { order: "asc" as const } },
};

export class CollectionRepository implements ICollectionRepository {
  async findById(id: string): Promise<UserCollection | null> {
    return prisma.userCollection.findUnique({
      where: { id },
      include: collectionInclude,
    }) as unknown as UserCollection | null;
  }

  async findByUserId(
    userId: string,
    params: PaginationParams & { status?: CardStatus; q?: string }
  ): Promise<PaginatedResult<UserCollection>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(params.status && { status: params.status }),
      ...(params.q && {
        card: { name: { contains: params.q, mode: "insensitive" as const } },
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.userCollection.findMany({
        where,
        include: collectionInclude,
        skip,
        take: limit,
        orderBy: { card: { name: "asc" } },
      }),
      prisma.userCollection.count({ where }),
    ]);

    return {
      data: data as unknown as UserCollection[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAvailableForTrade(userId: string): Promise<UserCollection[]> {
    return prisma.userCollection.findMany({
      where: { userId, status: CardStatus.AVAILABLE },
      include: collectionInclude,
    }) as unknown as UserCollection[];
  }

  async create(data: CreateCollectionItemData): Promise<UserCollection> {
    const status =
      data.availableForTrade === false ? CardStatus.UNAVAILABLE : CardStatus.AVAILABLE;

    return prisma.userCollection.create({
      data: {
        userId: data.userId,
        cardId: data.cardId,
        condition: data.condition,
        isFoil: data.isFoil ?? false,
        isFirstEdition: data.isFirstEdition ?? false,
        language: data.language ?? "English",
        notes: data.notes,
        status,
        askingValueOverride: data.askingValueOverride,
        quantity: data.quantity ?? 1,
      },
      include: collectionInclude,
    }) as unknown as UserCollection;
  }

  async update(id: string, data: UpdateCollectionItemData): Promise<UserCollection> {
    const { availableForTrade, photos: _photos, ...rest } = data as UpdateCollectionItemData & { photos?: unknown };

    const updateData = {
      ...rest,
      ...(availableForTrade !== undefined && {
        status: availableForTrade ? CardStatus.AVAILABLE : CardStatus.UNAVAILABLE,
      }),
    };

    return prisma.userCollection.update({
      where: { id },
      data: updateData,
      include: collectionInclude,
    }) as unknown as UserCollection;
  }

  async updateMarketValue(id: string, value: number): Promise<UserCollection> {
    return prisma.userCollection.update({
      where: { id },
      data: { currentMarketValue: value, marketValueUpdatedAt: new Date() },
      include: collectionInclude,
    }) as unknown as UserCollection;
  }

  async delete(id: string): Promise<void> {
    await prisma.userCollection.delete({ where: { id } });
  }
}
