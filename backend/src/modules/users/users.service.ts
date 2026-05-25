import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { getPagination } from '../../common/dto/pagination-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublicUser, UsersRepository } from './repositories/users.repository';

const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS),
      role: dto.role,
      status: dto.status,
    });

    return this.usersRepository.toPublicUser(user);
  }

  async findAll(query: QueryUsersDto) {
    const pagination = getPagination(query);
    const filters = {
      search: query.search,
      role: query.role,
      status: query.status,
    };
    const [users, total] = await Promise.all([
      this.usersRepository.findMany({
        ...filters,
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.usersRepository.count(filters),
    ]);

    return {
      data: users.map((user) => this.usersRepository.toPublicUser(user)),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.take,
      },
    };
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.usersRepository.findById(id);

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return this.usersRepository.toPublicUser(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    await this.findOne(id);
    const user = await this.usersRepository.update(id, {
      name: dto.name,
      email: dto.email,
      password: dto.password ? await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS) : undefined,
      role: dto.role,
      status: dto.status,
    });

    return this.usersRepository.toPublicUser(user);
  }

  async remove(id: string): Promise<PublicUser> {
    await this.findOne(id);
    const user = await this.usersRepository.delete(id);
    return this.usersRepository.toPublicUser(user);
  }
}
