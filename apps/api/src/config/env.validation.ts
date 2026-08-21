/**
 * Fail fast on a misconfigured environment. In production the secrets and the database
 * URI must be set explicitly — a default JWT secret in production is a security hole.
 */
const REQUIRED_IN_PRODUCTION = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CORS_ORIGINS',
];

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = (config.NODE_ENV as string) ?? 'development';

  if (nodeEnv === 'production') {
    const missing = REQUIRED_IN_PRODUCTION.filter((key) => !config[key]);
    if (missing.length) {
      throw new Error(
        `Variables d'environnement manquantes en production : ${missing.join(', ')}`,
      );
    }
  }

  const port = Number(config.PORT ?? 4000);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT invalide : ${String(config.PORT)}`);
  }

  return config;
}
