
import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface Notification {
  id: string;
  title: string;
  message: string;
  customerId: string;
  customerName: string;
  timestamp: Date;
  read: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private notificationSubject = new Subject<Notification>();
  private notifications: Notification[] = [];

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ✅ UNIQUEMENT pour nouveau dossier soumis
  emitNewDossierNotification(customerId: string, customerName: string, cin: string): void {
    const notification: Notification = {
      id: this.generateId(),
      title: ' Nouveau dossier soumis',
      message: `${customerName} (${cin}) a soumis son dossier d'ouverture de compte.`,
      customerId: customerId,
      customerName: customerName,
      timestamp: new Date(),
      read: false,
    };
    
    this.notifications.unshift(notification);
    
    // Garder seulement les 50 dernières notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    
    this.notificationSubject.next(notification);
    this.logger.log(`[SSE]  Nouveau dossier soumis: ${customerName}`);
  }

  getNotificationStream(): Observable<Notification> {
    return this.notificationSubject.asObservable();
  }

  getAllNotifications(): Notification[] {
    return this.notifications;
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
}