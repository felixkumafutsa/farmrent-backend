import { Controller, Get, Param, Post, Put, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createBookingDto: any, @Request() req: any) {
    try {
      const user = req.user;
      if (user.role !== 'FARMER') {
        throw new BadRequestException('Only farmers can create bookings');
      }
      return await this.bookingService.create(createBookingDto, user.id);
    } catch (error) {
      console.error('Booking creation error in controller:', error);
      throw new BadRequestException(error.message || 'Failed to create booking');
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any) {
    try {
      const user = req.user;
      return await this.bookingService.findAll(user);
    } catch (error) {
      console.error('Bookings fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch bookings');
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      return await this.bookingService.findOne(id, user);
    } catch (error) {
      console.error('Booking fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch booking');
    }
  }

  @Put(':id/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmBooking(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      if (user.role !== 'VENDOR') {
        throw new BadRequestException('Only vendors can confirm bookings');
      }
      return await this.bookingService.confirmBooking(id, user.id);
    } catch (error) {
      console.error('Booking confirmation error:', error);
      throw new BadRequestException(error.message || 'Failed to confirm booking');
    }
  }

  @Put(':id/reject')
  @UseGuards(JwtAuthGuard)
  async rejectBooking(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      if (user.role !== 'VENDOR') {
        throw new BadRequestException('Only vendors can reject bookings');
      }
      return await this.bookingService.rejectBooking(id, user.id);
    } catch (error) {
      console.error('Booking rejection error:', error);
      throw new BadRequestException(error.message || 'Failed to reject booking');
    }
  }

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelBooking(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      return await this.bookingService.cancelBooking(id, user);
    } catch (error) {
      console.error('Booking cancellation error:', error);
      throw new BadRequestException(error.message || 'Failed to cancel booking');
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateBookingDto: any, @Request() req: any) {
    try {
      const user = req.user;
      return await this.bookingService.update(id, updateBookingDto, user);
    } catch (error) {
      console.error('Booking update error:', error);
      throw new BadRequestException(error.message || 'Failed to update booking');
    }
  }
}
