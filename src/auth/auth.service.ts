import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { PrismaClientKnownRequestError } from '../../generated/prisma/internal/prismaNamespace';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.password, dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwt.signAsync(
      {
        user_id: user.user_id,
        email: user.email,
      },
      {
        expiresIn: '15m',
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;

    return { user: result, token };
  }

  async register(dto: RegisterDto) {
    try {
      const hashedPass = await argon2.hash(dto.password);

      const user = await this.prisma.user.create({
        data: {
          ...dto,
          password: hashedPass,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return { user: result };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new UnauthorizedException('Email already exists');
      }
      throw new UnauthorizedException('Failed to create user');
    }
  }
}
