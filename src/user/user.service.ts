import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}
  async updateUser(user_id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { user_id },
      data: dto,
    });
    return user;
  }
}
