import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async create(createMessageDto: any, senderId: string) {
    try {
      const { receiverId, content, bookingId } = createMessageDto;

      // Validate receiver exists
      const receiver = await this.prisma.user.findUnique({
        where: { id: receiverId },
      });

      if (!receiver) {
        throw new NotFoundException('Receiver not found');
      }

      // If bookingId is provided, validate it exists and involves both users
      if (bookingId) {
        const booking = await this.prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            equipment: true,
          },
        });

        if (!booking) {
          throw new NotFoundException('Booking not found');
        }

        // Check if sender is either the farmer or the equipment vendor
        const isFarmer = booking.farmerId === senderId;
        const isVendor = booking.equipment.vendorId === senderId;

        if (!isFarmer && !isVendor) {
          throw new BadRequestException('You can only send messages for bookings you are involved in');
        }

        // Check if receiver is either the farmer or the equipment vendor
        const receiverIsFarmer = booking.farmerId === receiverId;
        const receiverIsVendor = booking.equipment.vendorId === receiverId;

        if (!receiverIsFarmer && !receiverIsVendor) {
          throw new BadRequestException('Receiver must be involved in this booking');
        }
      }

      const message = await this.prisma.message.create({
        data: {
          senderId,
          receiverId,
          content,
          bookingId: bookingId || null,
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          booking: {
            include: {
              equipment: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return this.transformMessage(message);
    } catch (error) {
      console.error('Message creation error:', error);
      throw new BadRequestException(`Failed to create message: ${error.message}`);
    }
  }

  async findAll(userId: string, userRole: string) {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          booking: {
            include: {
              equipment: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return messages.map(message => this.transformMessage(message));
    } catch (error) {
      console.error('Messages fetch error:', error);
      throw new BadRequestException(`Failed to fetch messages: ${error.message}`);
    }
  }

  async findConversation(userId: string, otherUserId: string) {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          booking: {
            include: {
              equipment: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return messages.map(message => this.transformMessage(message));
    } catch (error) {
      console.error('Conversation fetch error:', error);
      throw new BadRequestException(`Failed to fetch conversation: ${error.message}`);
    }
  }

  async markAsRead(messageId: string, userId: string) {
    try {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      if (message.receiverId !== userId) {
        throw new BadRequestException('You can only mark messages as read if you are the receiver');
      }

      const updatedMessage = await this.prisma.message.update({
        where: { id: messageId },
        data: { isRead: true },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          booking: {
            include: {
              equipment: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return this.transformMessage(updatedMessage);
    } catch (error) {
      console.error('Mark as read error:', error);
      throw new BadRequestException(`Failed to mark message as read: ${error.message}`);
    }
  }

  async getUnreadCount(userId: string) {
    try {
      const count = await this.prisma.message.count({
        where: {
          receiverId: userId,
          isRead: false,
        },
      });

      return { unreadCount: count };
    } catch (error) {
      console.error('Unread count error:', error);
      throw new BadRequestException(`Failed to get unread count: ${error.message}`);
    }
  }

  private transformMessage(message: any) {
    return {
      id: message.id,
      sender: message.sender,
      receiver: message.receiver,
      content: message.content,
      booking: message.booking,
      isRead: message.isRead,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
