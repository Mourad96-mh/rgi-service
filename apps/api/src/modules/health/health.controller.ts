import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';

const MONGO_STATE: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      db: MONGO_STATE[this.connection.readyState] ?? 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  /** ROADMAP.md Phase 0 "done when": an authenticated health endpoint answers. */
  @Get('secure')
  secure(@CurrentUser() user: RequestUser) {
    return { status: 'ok', user };
  }

  @Roles('staff')
  @Get('staff')
  staffOnly(@CurrentUser() user: RequestUser) {
    return { status: 'ok', role: user.role };
  }
}
