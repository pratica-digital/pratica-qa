import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { getRequestMetadata } from '../../common/http/request-metadata';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Parameters<typeof getRequestMetadata>[0],
  ) {
    return this.usersService.create(dto, user, getRequestMetadata(request));
  }

  @Roles(UserRole.ADMIN)
  @Get()
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Parameters<typeof getRequestMetadata>[0],
  ) {
    return this.usersService.update(id, dto, user, getRequestMetadata(request));
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/activate')
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Parameters<typeof getRequestMetadata>[0],
  ) {
    return this.usersService.activate(id, user, getRequestMetadata(request));
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/deactivate')
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Parameters<typeof getRequestMetadata>[0],
  ) {
    return this.usersService.deactivate(id, user, getRequestMetadata(request));
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/reset-password')
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Parameters<typeof getRequestMetadata>[0],
  ) {
    return this.usersService.resetPassword(id, user, getRequestMetadata(request));
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Parameters<typeof getRequestMetadata>[0],
  ) {
    return this.usersService.remove(id, user, getRequestMetadata(request));
  }
}
