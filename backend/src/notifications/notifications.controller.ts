
import { Controller, Get, Sse, Param, Patch, UseGuards } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { NotificationsService, Notification } from './notifications.service';
import { AdminJwtGuard } from '../admin/guards/admin-jwt.guard';

@Controller('admin/notifications')
@UseGuards(AdminJwtGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  sse(): Observable<MessageEvent> {
    return this.notificationsService.getNotificationStream().pipe(
      map((notification) => ({
        data: notification,
      } as MessageEvent)),
    );
  }

  @Get()
  getAllNotifications() {
    return {
      success: true,
      data: this.notificationsService.getAllNotifications(),
      unreadCount: this.notificationsService.getUnreadCount(),
    };
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    this.notificationsService.markAsRead(id);
    return { success: true };
  }

  @Patch('read-all')
  markAllAsRead() {
    this.notificationsService.markAllAsRead();
    return { success: true };
  }
}