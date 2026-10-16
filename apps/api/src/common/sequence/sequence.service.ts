import { Injectable } from '@nestjs/common';
import { prisma } from '@xfarm/db';
import type { Prisma } from '@xfarm/db';

/**
 * Sinh mã từ bảng Sequence { key, year, current }.
 * - Mã theo năm (chứng từ, mùa vụ): `CY-2026-0001` → next / nextInTransaction.
 * - Mã không theo năm (danh mục: khu/lô, đàn): `AR-0001` → nextSimple / nextCode, lưu với year = 0.
 */
@Injectable()
export class SequenceService {
  async next(key: string): Promise<string> {
    return prisma.$transaction((tx) => this.nextInTransaction(tx, key));
  }

  async nextInTransaction(
    tx: Prisma.TransactionClient,
    key: string,
    year = new Date().getFullYear(),
  ): Promise<string> {
    const current = await this.increment(tx, key, year);
    return `${key}-${year}-${String(current).padStart(4, '0')}`;
  }

  async nextSimple(key: string, digits = 4): Promise<string> {
    const current = await prisma.$transaction((tx) => this.increment(tx, key, 0));
    return `${key}-${String(current).padStart(digits, '0')}`;
  }

  async nextCode(
    key: string,
    options?: { withYear?: boolean; tx?: Prisma.TransactionClient },
  ): Promise<string> {
    const tx = options?.tx;
    if (options?.withYear) {
      return tx ? this.nextInTransaction(tx, key) : this.next(key);
    }
    const current = tx
      ? await this.increment(tx, key, 0)
      : await prisma.$transaction((t) => this.increment(t, key, 0));
    return `${key}-${String(current).padStart(4, '0')}`;
  }

  private async increment(
    tx: Prisma.TransactionClient,
    key: string,
    year: number,
  ): Promise<number> {
    const sequence = await tx.sequence.upsert({
      where: { key_year: { key, year } },
      update: { current: { increment: 1 } },
      create: { key, year, current: 1 },
    });
    return sequence.current;
  }
}
