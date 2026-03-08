import { Controller, Get, Put, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserNotifications(@Request() req: any) {
    try {
      const user = req.user;
      return await this.notificationService.getUserNotifications(user.id);
    } catch (error) {
      console.error('Get notifications error:', error);
      throw new BadRequestException(`Failed to get notifications: ${error.message}`);
    }
  }

  @Get('unread/count')
  @UseGuards(JwtAuthGuard)
  async getUnreadNotificationsCount(@Request() req: any) {
    try {
      const user = req.user;
      return await this.notificationService.getUnreadNotificationsCount(user.id);
    } catch (error) {
      console.error('Get unread notifications count error:', error);
      throw new BadRequestException(`Failed to get unread notifications count: ${error.message}`);
    }
  }

  @Put('check-due-dates')
  @UseGuards(JwtAuthGuard)
  async checkDueDates(@Request() req: any) {
    try {
      const user = req.user;
      if (user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can trigger due date checks');
      }
      return await this.notificationService.checkDueDates();
    } catch (error) {
      console.error('Check due dates error:', error);
      throw new BadRequestException(`Failed to check due dates: ${error.message}`);
    }
  }

  @Put(':id/read')
  @UseGuards(JwtAuthGuard)
  async markNotificationAsRead(@Param('id') notificationId: string, @Request() req: any) {
    try {
      return await this.notificationService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw new BadRequestException(`Failed to mark notification as read: ${error.message}`);
    }
  }
}
