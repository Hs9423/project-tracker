import { NotificationType } from '../enums/notification-type.enum';
import { EntityType } from '../enums/entity-type.enum';

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  entityType: EntityType | null;
  entityId: string | null;
  message: string;
  isRead: boolean;
  createdAt: Date;
}
