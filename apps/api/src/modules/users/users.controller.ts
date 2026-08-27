import { Body, Controller, Patch, Put } from '@nestjs/common';
import type { User } from '@rgi/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateAddressesDto, UpdateProfileDto } from './dto/profile.dto';

/**
 * The customer's own record. Every route here acts on the caller — the id comes from the
 * token and never from the path, so there is no object to guess and no ownership check to
 * forget. Reading it stays on `GET /auth/me`, which already returns exactly this payload;
 * duplicating it here would be a second route to keep in step for nothing.
 *
 * The global `JwtAuthGuard` covers the controller: no `@Public()`, so an anonymous caller
 * gets 401 before any handler runs. No `@Roles(…)` either — a customer is the point.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me')
  async updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    return UsersService.toDto(await this.users.updateProfile(userId, dto));
  }

  @Put('me/addresses')
  async replaceAddresses(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateAddressesDto,
  ): Promise<User> {
    const addresses = dto.addresses.map((address) => ({
      ...address,
      isDefault: address.isDefault ?? false,
    }));
    return UsersService.toDto(await this.users.replaceAddresses(userId, addresses));
  }
}
