import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private messagesService: MessagesService
  ) {}

  async checkDueDates() {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Find bookings ending in the next 24 hours
      const endingSoonBookings = await this.prisma.booking.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            lte: tomorrow,
            gte: now,
          },
        },
        include: {
          farmer: true,
          equipment: {
            include: {
              vendor: true,
            },
          },
        },
      });

      // Find bookings ending in the next 3 days
      const endingSoonThreeDays = await this.prisma.booking.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            lte: threeDaysFromNow,
            gt: tomorrow,
          },
        },
        include: {
          farmer: true,
          equipment: {
            include: {
              vendor: true,
            },
          },
        },
      });

      // Find overdue bookings
      const overdueBookings = await this.prisma.booking.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            lt: now,
          },
        },
        include: {
          farmer: true,
          equipment: {
            include: {
              vendor: true,
            },
          },
        },
      });

      // Send notifications for each category
      for (const booking of endingSoonBookings) {
        await this.sendDueDateReminder(booking, '24_hours');
      }

      for (const booking of endingSoonThreeDays) {
        await this.sendDueDateReminder(booking, '3_days');
      }

      for (const booking of overdueBookings) {
        await this.sendOverdueNotification(booking);
      }

      return {
        endingSoon24h: endingSoonBookings.length,
        endingSoon3d: endingSoonThreeDays.length,
        overdue: overdueBookings.length,
      };
    } catch (error) {
      console.error('Due date check error:', error);
      throw new Error(`Failed to check due dates: ${error.message}`);
    }
  }

  private async sendDueDateReminder(booking: any, timeframe: string) {
    const hoursRemaining = Math.ceil(
      (new Date(booking.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60)
    );

    const message = timeframe === '24_hours' 
      ? `⚠️ Reminder: Your rental of "${booking.equipment.name}" ends in ${hoursRemaining} hours. Please prepare to return the equipment on time to avoid late fees.`
      : `📅 Reminder: Your rental of "${booking.equipment.name}" ends in 3 days. Please plan for equipment return.`;

    // Send message to farmer
    await this.messagesService.create({
      receiverId: booking.farmer.id,
      content: message,
      bookingId: booking.id,
    }, 'system');

    // Create notification
    await this.prisma.notification.create({
      data: {
        userId: booking.farmer.id,
        title: 'Equipment Return Reminder',
        message,
        type: 'BOOKING',
      },
    });

    // Also notify vendor
    const vendorMessage = timeframe === '24_hours'
      ? `⚠️ Reminder: ${booking.farmer.firstName} ${booking.farmer.lastName}'s rental of "${booking.equipment.name}" ends in ${hoursRemaining} hours.`
      : `📅 Reminder: ${booking.farmer.firstName} ${booking.farmer.lastName}'s rental of "${booking.equipment.name}" ends in 3 days.`;

    await this.messagesService.create({
      receiverId: booking.equipment.vendor.id,
      content: vendorMessage,
      bookingId: booking.id,
    }, 'system');

    await this.prisma.notification.create({
      data: {
        userId: booking.equipment.vendor.id,
        title: 'Rental Return Reminder',
        message: vendorMessage,
        type: 'BOOKING',
      },
    });
  }

  private async sendOverdueNotification(booking: any) {
    const daysOverdue = Math.ceil(
      (new Date().getTime() - new Date(booking.endDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const farmerMessage = `🚨 OVERDUE: Your rental of "${booking.equipment.name}" was due ${daysOverdue} days ago. Please return the equipment immediately to avoid additional charges. Contact ${booking.equipment.vendor.firstName} ${booking.equipment.vendor.lastName} to arrange return.`;

    // Send urgent message to farmer
    await this.messagesService.create({
      receiverId: booking.farmer.id,
      content: farmerMessage,
      bookingId: booking.id,
    }, 'system');

    await this.prisma.notification.create({
      data: {
        userId: booking.farmer.id,
        title: 'EQUIPMENT RETURN OVERDUE - URGENT',
        message: farmerMessage,
        type: 'BOOKING',
      },
    });

    // Notify vendor about overdue equipment
    const vendorMessage = `🚨 OVERDUE: ${booking.farmer.firstName} ${booking.farmer.lastName}'s rental of "${booking.equipment.name}" is ${daysOverdue} days overdue. Please contact the farmer to arrange immediate return.`;

    await this.messagesService.create({
      receiverId: booking.equipment.vendor.id,
      content: vendorMessage,
      bookingId: booking.id,
    }, 'system');

    await this.prisma.notification.create({
      data: {
        userId: booking.equipment.vendor.id,
        title: 'Equipment Overdue Notification',
        message: vendorMessage,
        type: 'BOOKING',
      },
    });

    // Consider updating booking status to OVERDUE
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'OVERDUE' as any },
    });
  }

  async getUserNotifications(userId: string) {
    try {
      const notifications = await this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return notifications;
    } catch (error) {
      console.error('Get notifications error:', error);
      throw new Error(`Failed to get notifications: ${error.message}`);
    }
  }

  async markNotificationAsRead(notificationId: string) {
    try {
      const notification = await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      return notification;
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  async getUnreadNotificationsCount(userId: string) {
    try {
      const count = await this.prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      return { unreadCount: count };
    } catch (error) {
      console.error('Get unread notifications count error:', error);
      throw new Error(`Failed to get unread notifications count: ${error.message}`);
    }
  }
}
