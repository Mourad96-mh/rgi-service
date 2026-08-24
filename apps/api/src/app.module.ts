import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AttributeDefinitionsModule } from './modules/attribute-definitions/attribute-definitions.module';
import { ProductsModule } from './modules/products/products.module';
import { ConfiguratorModule } from './modules/configurator/configurator.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { MediaModule } from './modules/media/media.module';
import { HeroModule } from './modules/hero/hero.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      // Both the repo root .env and an api-local one, so a dev can override per app.
      envFilePath: ['.env', '../../.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodbUri'),
      }),
    }),
    /**
     * Global rate limit. Deliberately generous: it exists to stop scraping and runaway
     * clients, not to police browsing.
     *
     * 120/minute was too low for two reasons. Moroccan mobile users routinely share one
     * public IP behind carrier NAT, so a handful of customers browsing at once looked like
     * one abusive client and got « Too Many Requests » on the catalogue. And a static
     * export of the whole shop makes ~150 requests in a burst, which silently produced
     * empty category pages.
     *
     * Brute-force protection lives where it belongs — the per-route @Throttle on
     * auth (register 5/min, login 10/min, refresh 20/min), which this does not relax.
     */
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
    AuthModule,
    UsersModule,
    HealthModule,
    CategoriesModule,
    AttributeDefinitionsModule,
    ProductsModule,
    ConfiguratorModule,
    CartModule,
    OrdersModule,
    MediaModule,
    HeroModule,
    AdminModule,
  ],
  providers: [
    // Order matters: authenticate, then check the role, and rate-limit everything.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
