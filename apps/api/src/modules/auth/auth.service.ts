import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { prisma } from '@xfarm/db';
import { getEnv } from '../../config/env.config';
import { LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(@Inject(JwtService) private jwtService: JwtService) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async login(dto: LoginDto) {
    const env = getEnv();
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      await argon2.hash(dto.password);
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    // Generate JWT access token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as unknown as number,
    });

    // Generate Refresh Token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        employeeId: user.employeeId,
      },
    };
  }

  async refresh(rawRefreshToken: string) {
    const env = getEnv();
    const tokenHash = this.hashToken(rawRefreshToken);

    const result = await prisma.$transaction(async (tx) => {
      const existingToken = await tx.refreshToken.findFirst({
        where: { tokenHash },
      });

      if (!existingToken) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      const now = new Date();
      const gracePeriodMs = 30 * 1000;

      if (existingToken.revokedAt) {
        if (now.getTime() - existingToken.revokedAt.getTime() <= gracePeriodMs) {
          throw new UnauthorizedException('Refresh token đã được sử dụng');
        }

        await tx.refreshToken.updateMany({
          where: { userId: existingToken.userId, revokedAt: null },
          data: { revokedAt: now },
        });
        return { revokedAll: true as const };
      }

      if (existingToken.expiresAt < now) {
        throw new UnauthorizedException('Refresh token đã hết hạn');
      }

      const user = await tx.user.findUnique({
        where: { id: existingToken.userId },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
      }

      // Conditional update makes rotation atomic when multiple requests race.
      const revoked = await tx.refreshToken.updateMany({
        where: { id: existingToken.id, revokedAt: null },
        data: { revokedAt: now },
      });

      if (revoked.count !== 1) {
        const racedToken = await tx.refreshToken.findUnique({
          where: { id: existingToken.id },
        });
        if (
          racedToken?.revokedAt &&
          now.getTime() - racedToken.revokedAt.getTime() <= gracePeriodMs
        ) {
          throw new UnauthorizedException('Refresh token đã được sử dụng');
        }

        if (racedToken) {
          await tx.refreshToken.updateMany({
            where: { userId: racedToken.userId, revokedAt: null },
            data: { revokedAt: now },
          });
          return { revokedAll: true as const };
        }
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
      const newTokenHash = this.hashToken(newRawRefreshToken);
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 7);

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          expiresAt,
        },
      });

      return { user, newRawRefreshToken };
    });

    if ('revokedAll' in result) {
      throw new UnauthorizedException(
        'Phát hiện token đã bị thu hồi trước đó. Toàn bộ phiên đăng nhập đã bị hủy.',
      );
    }

    const { user, newRawRefreshToken } = result;

    // Generate new access token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as unknown as number,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
      },
    };
  }

  async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị vô hiệu hóa');
    }

    return user;
  }
}
