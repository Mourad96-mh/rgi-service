import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Match a request origin against the configured allowlist.
 *
 * An entry may be an exact origin (`https://rgiservice.ma`) or carry a single leading
 * wildcard (`https://*.vercel.app`). The wildcard matters in practice: Vercel gives every
 * deployment its own preview hostname, so an exact-match list would allow production and
 * silently break every preview build.
 *
 * A request with no `Origin` header (server-to-server, curl, health checks) is allowed —
 * CORS only governs browsers, and the storefront calls this API from Next's server too.
 */
function corsOriginChecker(allowed: string[]) {
  const exact = new Set(allowed.filter((o) => !o.includes('*')));
  const patterns = allowed
    .filter((o) => o.includes('*'))
    .map((o) => new RegExp('^' + o.split('*').map(escapeRegExp).join('[^.]+') + '$'));

  return (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {
    if (!origin) return cb(null, true);
    if (exact.has(origin) || patterns.some((re) => re.test(origin))) return cb(null, true);
    return cb(null, false);
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: corsOriginChecker(config.get<string[]>('corsOrigins') ?? []),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      // API_SPEC.md: errors are French and consistently shaped.
      validationError: { target: false, value: false },
    }),
  );

  // Bind on every interface: a PaaS (Render, Fly, a container) routes to the pod's own
  // address, and a server listening only on localhost fails its health check there.
  const port = config.get<number>('port') ?? 4000;
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`Rgi Service API en écoute sur le port ${port} (/api/v1)`);
}

void bootstrap();
