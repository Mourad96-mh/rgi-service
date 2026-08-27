import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

/**
 * Outbound notifications to the *shop*, not to customers. Kept in its own module so the
 * next channel (e-mail receipts, an SMS fallback) lands beside this one rather than inside
 * the orders service.
 */
@Module({
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class NotificationsModule {}
