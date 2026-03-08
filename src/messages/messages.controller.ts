import { Controller, Get, Post, Put, Param, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createMessageDto: any, @Request() req: any) {
    try {
      const user = req.user;
      return await this.messagesService.create(createMessageDto, user.id);
    } catch (error) {
      console.error('Message creation error:', error);
      throw new BadRequestException(`Failed to create message: ${error.message}`);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any) {
    try {
      const user = req.user;
      return await this.messagesService.findAll(user.id, user.role);
    } catch (error) {
      console.error('Messages fetch error:', error);
      throw new BadRequestException(`Failed to fetch messages: ${error.message}`);
    }
  }

  @Get('conversation/:userId')
  @UseGuards(JwtAuthGuard)
  async findConversation(@Param('userId') otherUserId: string, @Request() req: any) {
    try {
      const user = req.user;
      return await this.messagesService.findConversation(user.id, otherUserId);
    } catch (error) {
      console.error('Conversation fetch error:', error);
      throw new BadRequestException(`Failed to fetch conversation: ${error.message}`);
    }
  }

  @Get('unread/count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@Request() req: any) {
    try {
      const user = req.user;
      return await this.messagesService.getUnreadCount(user.id);
    } catch (error) {
      console.error('Unread count error:', error);
      throw new BadRequestException(`Failed to get unread count: ${error.message}`);
    }
  }

  @Put(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Param('id') messageId: string, @Request() req: any) {
    try {
      const user = req.user;
      return await this.messagesService.markAsRead(messageId, user.id);
    } catch (error) {
      console.error('Mark as read error:', error);
      throw new BadRequestException(`Failed to mark message as read: ${error.message}`);
    }
  }
}
