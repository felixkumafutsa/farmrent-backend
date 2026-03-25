import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  async create(createBookingDto: any, farmerId: string) {
    try {
      console.log('Creating booking:', { createBookingDto, farmerId });
      
      // Validate input
      if (!createBookingDto.equipmentId || !createBookingDto.startDate || !createBookingDto.endDate) {
        throw new BadRequestException('Missing required fields: equipmentId, startDate, endDate');
      }

      // Check if equipment exists and is available
      const equipment = await this.prisma.equipment.findUnique({
        where: { id: createBookingDto.equipmentId },
      });

      if (!equipment) {
        throw new NotFoundException('Equipment not found');
      }

      if (!equipment.isAvailable) {
        throw new BadRequestException('Equipment is not available for booking');
      }

      console.log('Equipment found:', equipment);

      // Parse dates
      const startDate = new Date(createBookingDto.startDate);
      const endDate = new Date(createBookingDto.endDate);
      
      console.log('Parsed dates:', { startDate, endDate });

      // Check for overlapping bookings
      const overlappingBooking = await this.prisma.booking.findFirst({
        where: {
          equipmentId: createBookingDto.equipmentId,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.ACTIVE],
          },
          OR: [
            {
              startDate: {
                lte: endDate,
              },
              endDate: {
                gte: startDate,
              },
            },
          ],
        },
      });

      if (overlappingBooking) {
        throw new BadRequestException('Equipment is already booked for these dates');
      }

      // Calculate total price
      const days = Math.ceil(
        (endDate.getTime() - startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const totalPrice = days * equipment.pricePerDay;
      const depositAmount = equipment.deposit;

      console.log('Creating booking with data:', {
        equipmentId: createBookingDto.equipmentId,
        farmerId,
        startDate,
        endDate,
        totalPrice,
        depositAmount,
        status: BookingStatus.PENDING,
      });

      const booking = await this.prisma.booking.create({
        data: {
          equipmentId: createBookingDto.equipmentId,
          farmerId,
          startDate,
          endDate,
          totalPrice,
          depositAmount,
          status: BookingStatus.PENDING,
        },
        include: {
          equipment: {
            include: {
              category: true,
            },
          },
          farmer: true,
        },
      });

      console.log('Booking created successfully:', booking);
      return this.transformBooking(booking);
    } catch (error) {
      console.error('Booking creation error:', error);
      throw new BadRequestException(`Failed to create booking: ${error.message}`);
    }
  }

  async findAll(user?: any) {
    const where = user?.role === 'FARMER' 
      ? { farmerId: user.id }
      : user?.role === 'VENDOR'
      ? { equipment: { vendorId: user.id } }
      : {};

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        farmer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch equipment separately for bookings that have valid equipmentId
    const bookingIds = bookings
      .filter(booking => booking.equipmentId)
      .map(booking => booking.equipmentId);

    const equipmentMap = new Map();
    if (bookingIds.length > 0) {
      const equipment = await this.prisma.equipment.findMany({
        where: { id: { in: bookingIds } },
        include: { category: true },
      });
      equipment.forEach(eq => equipmentMap.set(eq.id, eq));
    }

    return bookings.map(booking => {
      const equipment = equipmentMap.get(booking.equipmentId);
      if (!equipment) {
        return {
          id: booking.id,
          equipment: {
            id: 'unknown',
            name: 'Equipment Deleted',
            category: { name: 'Unknown', id: 'unknown' },
            images: [],
            vendorId: 'unknown',
          },
          farmer: booking.farmer,
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalPrice: booking.totalPrice,
          depositAmount: booking.depositAmount,
          status: booking.status,
          createdAt: booking.createdAt,
          updatedAt: booking.updatedAt,
        };
      }
      return this.transformBooking({
        ...booking,
        equipment,
      });
    });
  }

  async findOne(id: string, user?: any) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        equipment: {
          include: {
            category: true,
            vendor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        farmer: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    if (user?.role === 'FARMER' && booking.farmerId !== user.id) {
      throw new NotFoundException('Booking not found');
    }
    if (user?.role === 'VENDOR' && booking.equipment.vendorId !== user.id) {
      throw new NotFoundException('Booking not found');
    }

    return this.transformBooking(booking);
  }

  async update(id: string, updateBookingDto: any, user?: any) {
    const booking = await this.findOne(id, user);

    try {
      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: updateBookingDto,
        include: {
          equipment: {
            include: {
              category: true, // Remove vendor to avoid null relationship errors
            },
          },
          farmer: true,
        },
      });

      return this.transformBooking(updatedBooking);
    } catch (error) {
      throw new NotFoundException('Booking not found');
    }
  }

  async confirmBooking(id: string, vendorId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { 
        equipment: true, // Only include equipment, not vendor
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check vendorId directly from equipment
    if (booking.equipment.vendorId !== vendorId) {
      throw new BadRequestException('You can only confirm bookings for your equipment');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking can only be confirmed when pending');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.APPROVED },
      include: {
        equipment: {
          include: {
            category: true, // Remove vendor to avoid null relationship errors
          },
        },
        farmer: true,
      },
    });

    return this.transformBooking(updatedBooking);
  }

  async rejectBooking(id: string, vendorId: string) {
    // First get the booking without equipment relationship
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check if the booking belongs to the vendor's equipment
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: booking.equipmentId },
      select: { vendorId: true },
    });

    if (!equipment || equipment.vendorId !== vendorId) {
      throw new BadRequestException('You can only reject bookings for your equipment');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Booking can only be rejected when pending');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.REJECTED },
      include: {
        equipment: {
          include: {
            category: true, // Remove vendor to avoid null relationship errors
          },
        },
        farmer: true,
      },
    });

    return this.transformBooking(updatedBooking);
  }

  async cancelBooking(id: string, user: any) {
    // First get the booking without equipment relationship
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    if (user.role === 'FARMER' && booking.farmerId !== user.id) {
      throw new BadRequestException('You can only cancel your own bookings');
    }
    
    // For vendors, we need to check the equipment vendorId
    if (user.role === 'VENDOR') {
      const equipment = await this.prisma.equipment.findUnique({
        where: { id: booking.equipmentId },
        select: { vendorId: true },
      });
      
      if (!equipment || equipment.vendorId !== user.id) {
        throw new BadRequestException('You can only cancel bookings for your equipment');
      }
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: {
        farmer: true,
      },
    });

    // Transform the booking without equipment relationship
    return {
      id: updatedBooking.id,
      equipment: {
        id: 'unknown',
        name: 'Equipment',
        category: { name: 'Unknown', id: 'unknown' },
        images: [],
        vendorId: 'unknown',
      },
      farmer: updatedBooking.farmer,
      startDate: updatedBooking.startDate,
      endDate: updatedBooking.endDate,
      totalPrice: updatedBooking.totalPrice,
      depositAmount: updatedBooking.depositAmount,
      status: updatedBooking.status,
      createdAt: updatedBooking.createdAt,
      updatedAt: updatedBooking.updatedAt,
    };
  }

  private transformBooking(booking: any) {
    return {
      id: booking.id,
      equipment: {
        id: booking.equipment.id,
        name: booking.equipment.name,
        category: booking.equipment.category,
        images: booking.equipment.images,
        vendorId: booking.equipment.vendorId,
        vendor: booking.equipment.vendor ? {
          id: booking.equipment.vendor.id,
          businessName: booking.equipment.vendor.businessName || 'Business Name',
          user: booking.equipment.vendor.user || {
            firstName: 'Unknown',
            lastName: 'Vendor',
          },
        } : null,
      },
      farmer: {
        id: booking.farmer.id,
        firstName: booking.farmer.firstName,
        lastName: booking.farmer.lastName,
        email: booking.farmer.email,
      },
      startDate: booking.startDate,
      endDate: booking.endDate,
      totalPrice: booking.totalPrice,
      depositAmount: booking.depositAmount,
      status: booking.status,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}
