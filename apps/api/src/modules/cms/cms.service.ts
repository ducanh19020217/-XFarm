import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma, Prisma, PostStatus } from '@xfarm/db';
import { PUBLIC_SITE_SETTING_KEYS } from '@xfarm/shared';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
  CreatePostDto,
  UpdatePostDto,
  QueryPostDto,
  CreatePageDto,
  UpdatePageDto,
  QueryPageDto,
  QuerySiteSettingDto,
  PublicQueryProductDto,
  PublicQueryPostDto,
} from './cms.dto';
import { generateUniqueSlug, sanitizeHtmlContent, validateSettingValue } from './cms.utils';

@Injectable()
export class CmsService {
  // ==========================================
  // PRODUCTS (ADMIN)
  // ==========================================

  async findProducts(query: QueryProductDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.itemId) {
      where.itemId = query.itemId;
    }

    if (query.isPublished !== undefined) {
      where.isPublished = query.isPublished;
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      { sortOrder: 'asc' },
      { createdAt: 'desc' },
    ];

    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const dir = direction?.toLowerCase() === 'asc' ? 'asc' : 'desc';
      if (['name', 'slug', 'price', 'sortOrder', 'createdAt', 'updatedAt'].includes(field)) {
        orderBy = [{ [field]: dir }];
      }
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          item: {
            select: { id: true, sku: true, name: true, unit: true, isSellable: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findProductById(idOrSlug: string) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        item: {
          select: { id: true, sku: true, name: true, unit: true, isSellable: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    return product;
  }

  async createProduct(dto: CreateProductDto, userId?: string) {
    const item = await prisma.item.findUnique({
      where: { id: dto.itemId },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy vật tư/hàng hóa');
    }

    if (!item.isSellable) {
      throw new BadRequestException('Hàng hóa liên kết phải có cờ được bán (isSellable)');
    }

    const description = sanitizeHtmlContent(dto.description);
    const slug = await generateUniqueSlug('product', dto.slug?.trim() || dto.name);

    return prisma.product.create({
      data: {
        slug,
        name: dto.name,
        itemId: dto.itemId,
        description,
        price: new Prisma.Decimal(dto.price),
        unit: dto.unit,
        mediaIds: dto.mediaIds ?? [],
        isPublished: dto.isPublished ?? false,
        sortOrder: dto.sortOrder ?? 0,
        createdById: userId ?? null,
      },
      include: {
        item: {
          select: { id: true, sku: true, name: true, unit: true, isSellable: true },
        },
      },
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const existing = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    if (dto.itemId) {
      const item = await prisma.item.findUnique({
        where: { id: dto.itemId },
      });
      if (!item) {
        throw new NotFoundException('Không tìm thấy vật tư/hàng hóa');
      }
      if (!item.isSellable) {
        throw new BadRequestException('Hàng hóa liên kết phải có cờ được bán (isSellable)');
      }
    }

    let slug: string | undefined;
    if (dto.slug && dto.slug.trim() !== '') {
      slug = await generateUniqueSlug('product', dto.slug.trim(), existing.id);
    }

    let description: string | undefined;
    if (dto.description !== undefined) {
      description = sanitizeHtmlContent(dto.description);
    }

    return prisma.product.update({
      where: { id: existing.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(dto.itemId !== undefined ? { itemId: dto.itemId } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(dto.price !== undefined ? { price: new Prisma.Decimal(dto.price) } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.mediaIds !== undefined ? { mediaIds: dto.mediaIds } : {}),
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
      include: {
        item: {
          select: { id: true, sku: true, name: true, unit: true, isSellable: true },
        },
      },
    });
  }

  async deleteProduct(id: string) {
    const existing = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    await prisma.product.delete({
      where: { id: existing.id },
    });

    return { message: 'Đã xóa sản phẩm thành công' };
  }

  // ==========================================
  // POSTS (ADMIN)
  // ==========================================

  async findPosts(query: QueryPostDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PostWhereInput = {};

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status as PostStatus;
    }

    let orderBy: Prisma.PostOrderByWithRelationInput[] = [{ createdAt: 'desc' }];

    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const dir = direction?.toLowerCase() === 'asc' ? 'asc' : 'desc';
      if (['title', 'slug', 'status', 'publishedAt', 'createdAt', 'updatedAt'].includes(field)) {
        orderBy = [{ [field]: dir }];
      }
    }

    const [data, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
      }),
      prisma.post.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findPostById(idOrSlug: string) {
    const post = await prisma.post.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
    });

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    return post;
  }

  async createPost(dto: CreatePostDto, userId?: string) {
    const content = sanitizeHtmlContent(dto.content);
    const excerpt = sanitizeHtmlContent(dto.excerpt);
    const slug = await generateUniqueSlug('post', dto.slug?.trim() || dto.title);

    const status = (dto.status as PostStatus) || PostStatus.DRAFT;
    let publishedAt: Date | null = dto.publishedAt ? new Date(dto.publishedAt) : null;
    if (status === PostStatus.PUBLISHED && !publishedAt) {
      publishedAt = new Date();
    }

    return prisma.post.create({
      data: {
        slug,
        title: dto.title,
        excerpt,
        content,
        coverMediaId: dto.coverMediaId || null,
        status,
        publishedAt,
        createdById: userId || null,
      },
    });
  }

  async updatePost(id: string, dto: UpdatePostDto) {
    const existing = await prisma.post.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    let slug: string | undefined;
    if (dto.slug && dto.slug.trim() !== '') {
      slug = await generateUniqueSlug('post', dto.slug.trim(), existing.id);
    }

    let content: string | undefined;
    if (dto.content !== undefined) {
      content = sanitizeHtmlContent(dto.content);
    }

    let excerpt: string | undefined;
    if (dto.excerpt !== undefined) {
      excerpt = sanitizeHtmlContent(dto.excerpt);
    }

    const targetStatus = (dto.status as PostStatus) ?? existing.status;
    let publishedAt: Date | null | undefined =
      dto.publishedAt !== undefined
        ? dto.publishedAt
          ? new Date(dto.publishedAt)
          : null
        : undefined;

    if (targetStatus === PostStatus.PUBLISHED) {
      if (publishedAt === undefined && !existing.publishedAt) {
        publishedAt = new Date();
      } else if (publishedAt === null) {
        publishedAt = new Date();
      }
    }

    return prisma.post.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(excerpt !== undefined ? { excerpt } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(dto.coverMediaId !== undefined ? { coverMediaId: dto.coverMediaId || null } : {}),
        ...(dto.status !== undefined ? { status: targetStatus } : {}),
        ...(publishedAt !== undefined ? { publishedAt } : {}),
      },
    });
  }

  async deletePost(id: string) {
    const existing = await prisma.post.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    await prisma.post.delete({
      where: { id: existing.id },
    });

    return { message: 'Đã xóa bài viết thành công' };
  }

  // ==========================================
  // PAGES (ADMIN)
  // ==========================================

  async findPages(query: QueryPageDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PageWhereInput = {};

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.PageOrderByWithRelationInput[] = [{ createdAt: 'desc' }];

    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      const dir = direction?.toLowerCase() === 'asc' ? 'asc' : 'desc';
      if (['title', 'slug', 'createdAt', 'updatedAt'].includes(field)) {
        orderBy = [{ [field]: dir }];
      }
    }

    const [data, total] = await Promise.all([
      prisma.page.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
      }),
      prisma.page.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findPageById(idOrSlug: string) {
    const page = await prisma.page.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
    });

    if (!page) {
      throw new NotFoundException('Không tìm thấy trang');
    }

    return page;
  }

  async createPage(dto: CreatePageDto, userId?: string) {
    const content = sanitizeHtmlContent(dto.content);
    const slug = await generateUniqueSlug('page', dto.slug?.trim() || dto.title);

    return prisma.page.create({
      data: {
        slug,
        title: dto.title,
        content,
        createdById: userId || null,
      },
    });
  }

  async updatePage(id: string, dto: UpdatePageDto) {
    const existing = await prisma.page.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy trang');
    }

    let slug: string | undefined;
    if (dto.slug && dto.slug.trim() !== '') {
      slug = await generateUniqueSlug('page', dto.slug.trim(), existing.id);
    }

    let content: string | undefined;
    if (dto.content !== undefined) {
      content = sanitizeHtmlContent(dto.content);
    }

    return prisma.page.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(content !== undefined ? { content } : {}),
      },
    });
  }

  async deletePage(id: string) {
    const existing = await prisma.page.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy trang');
    }

    await prisma.page.delete({
      where: { id: existing.id },
    });

    return { message: 'Đã xóa trang thành công' };
  }

  // ==========================================
  // SITE SETTINGS (ADMIN)
  // ==========================================

  async findSiteSettings(query: QuerySiteSettingDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 50;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SiteSettingWhereInput = {};

    if (query.key) {
      where.key = { contains: query.key, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.siteSetting.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { key: 'asc' },
      }),
      prisma.siteSetting.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findSiteSettingByKey(key: string) {
    const setting = await prisma.siteSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Không tìm thấy cấu hình với key '${key}'`);
    }

    return setting;
  }

  async upsertSiteSetting(key: string, value: unknown) {
    const validatedValue = validateSettingValue(key, value);

    return prisma.siteSetting.upsert({
      where: { key },
      update: { value: validatedValue as Prisma.InputJsonValue },
      create: { key, value: validatedValue as Prisma.InputJsonValue },
    });
  }

  async deleteSiteSetting(key: string) {
    const setting = await prisma.siteSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Không tìm thấy cấu hình với key '${key}'`);
    }

    await prisma.siteSetting.delete({
      where: { key },
    });

    return { message: 'Đã xóa cấu hình thành công' };
  }

  // ==========================================
  // PUBLIC ENDPOINTS
  // ==========================================

  async findPublicProducts(query: PublicQueryProductDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {
      isPublished: true,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          slug: true,
          name: true,
          itemId: true,
          description: true,
          price: true,
          unit: true,
          mediaIds: true,
          sortOrder: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    const itemIds = products.map((product) => product.itemId);
    const balances = itemIds.length
      ? await prisma.$queryRaw<Array<{ itemId: string; onHand: Prisma.Decimal }>>(
          Prisma.sql`
            SELECT "itemId", COALESCE(SUM(quantity), 0) AS "onHand"
            FROM "stock_balances"
            WHERE "itemId" IN (${Prisma.join(itemIds)})
            GROUP BY "itemId"
          `,
        )
      : [];
    const inStockByItem = new Map(
      balances.map((balance) => [
        balance.itemId,
        new Prisma.Decimal(balance.onHand).greaterThan(0),
      ]),
    );

    const data = products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      mediaIds: p.mediaIds,
      sortOrder: p.sortOrder,
      price: Number(p.price),
      unit: p.unit,
      inStock: inStockByItem.get(p.itemId) ?? false,
    }));

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findPublicProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        itemId: true,
        description: true,
        price: true,
        unit: true,
        mediaIds: true,
        sortOrder: true,
        isPublished: true,
      },
    });

    if (!product || !product.isPublished) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // Query on-hand balance without leaking warehouse or cost
    const balances = await prisma.$queryRaw<Array<{ onHand: number }>>(Prisma.sql`
      SELECT COALESCE(SUM(quantity), 0)::float AS "onHand"
      FROM "stock_balances"
      WHERE "itemId" = ${product.itemId}
    `);

    const inStock = (balances[0]?.onHand ?? 0) > 0;

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      unit: product.unit,
      mediaIds: product.mediaIds,
      sortOrder: product.sortOrder,
      inStock,
    };
  }

  async findPublicPosts(query: PublicQueryPostDto) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PostWhereInput = {
      status: PostStatus.PUBLISHED,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverMediaId: true,
          publishedAt: true,
        },
      }),
      prisma.post.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async findPublicPostBySlug(slug: string) {
    const post = await prisma.post.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        coverMediaId: true,
        publishedAt: true,
        status: true,
      },
    });

    if (!post || post.status !== PostStatus.PUBLISHED) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverMediaId: post.coverMediaId,
      publishedAt: post.publishedAt,
    };
  }

  async findPublicPageBySlug(slug: string) {
    const page = await prisma.page.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!page) {
      throw new NotFoundException('Không tìm thấy trang');
    }

    return page;
  }

  async findPublicSiteSettings() {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: { in: [...PUBLIC_SITE_SETTING_KEYS] },
      },
    });

    const publicKeysSet = new Set<string>(PUBLIC_SITE_SETTING_KEYS);
    const data: Record<string, unknown> = {};
    for (const setting of settings) {
      if (publicKeysSet.has(setting.key)) {
        data[setting.key] = setting.value;
      }
    }

    return data;
  }
}
