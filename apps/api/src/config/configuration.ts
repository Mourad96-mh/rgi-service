/**
 * Typed environment configuration. Every value the API needs comes from here — no
 * `process.env` reads scattered through the modules.
 */
export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  mongodbUri: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  corsOrigins: string[];
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    uploadPreset: string;
    folder: string;
  };
  whatsapp: {
    /** The shop handset that receives the "new order" alert. Digits only, no `+`. */
    to: string;
    /** CallMeBot key for that handset. Empty disables the notification entirely. */
    callmebotApiKey: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongodbUri:
    process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/rgiservice?replicaSet=rs0',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret_change_me',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET ?? 'rgi_service_products',
    folder: process.env.CLOUDINARY_FOLDER ?? 'rgi-service/products',
  },
  whatsapp: {
    // Defaults to the number the storefront already points every WhatsApp link at
    // (apps/web/src/lib/contact.ts) — the same inbox, so staff read one thread. Without a
    // key nothing is ever sent, so this default cannot leak an order by accident.
    to: process.env.SHOP_WHATSAPP_NUMBER ?? '212661827969',
    callmebotApiKey: process.env.CALLMEBOT_API_KEY ?? '',
  },
});
