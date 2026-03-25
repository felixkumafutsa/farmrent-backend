import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: any) {
    try {
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      
      const user = await this.prisma.user.create({
        data: {
          ...createUserDto,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      throw new BadRequestException('Failed to create user');
    }
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Vendor analytics - track orders and products
  async getVendorAnalytics(vendorId: string) {
    const vendor = await this.prisma.user.findUnique({
      where: { id: vendorId, role: 'VENDOR' },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Count vendor's equipment (products)
    const equipmentCount = await this.prisma.equipment.count({
      where: { vendorId },
    });

    // Count vendor's bookings (orders)
    const bookingCount = await this.prisma.booking.count({
      where: {
        equipment: {
          vendorId,
        },
      },
    });

    // Get recent bookings
    const recentBookings = await this.prisma.booking.findMany({
      where: {
        equipment: {
          vendorId,
        },
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            pricePerDay: true,
          },
        },
        farmer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // Calculate total revenue
    const totalRevenue = await this.prisma.booking.aggregate({
      where: {
        equipment: {
          vendorId,
        },
        status: 'COMPLETED',
      },
      _sum: {
        totalPrice: true,
      },
    });

    return {
      vendor: {
        id: vendor.id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        email: vendor.email,
        role: vendor.role,
      },
      stats: {
        totalEquipment: equipmentCount,
        totalBookings: bookingCount,
        totalRevenue: totalRevenue._sum.totalPrice || 0,
        completedBookings: await this.prisma.booking.count({
          where: {
            equipment: { vendorId },
            status: 'COMPLETED',
          },
        }),
        pendingBookings: await this.prisma.booking.count({
          where: {
            equipment: { vendorId },
            status: 'PENDING',
          },
        }),
      },
      recentBookings,
    };
  }

  // Get all vendors with their stats
  async getAllVendorsWithStats() {
    const vendors = await this.prisma.user.findMany({
      where: { role: 'VENDOR' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    // Get stats for each vendor
    const vendorsWithStats = await Promise.all(
      vendors.map(async (vendor) => {
        const [equipmentCount, bookingCount, revenueData] = await Promise.all([
          this.prisma.equipment.count({
            where: { vendorId: vendor.id },
          }),
          this.prisma.booking.count({
            where: {
              equipment: { vendorId: vendor.id },
            },
          }),
          this.prisma.booking.aggregate({
            where: {
              equipment: { vendorId: vendor.id },
              status: 'COMPLETED',
            },
            _sum: { totalPrice: true },
          }),
        ]);

        return {
          ...vendor,
          stats: {
            totalEquipment: equipmentCount,
            totalBookings: bookingCount,
            totalRevenue: revenueData._sum.totalPrice || 0,
          },
        };
      }),
    );

    return vendorsWithStats;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user;
  }

  async update(id: string, updateUserDto: any) {
    try {
      const updateData: any = { ...updateUserDto };
      
      if (updateUserDto.password) {
        updateData.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
      return { message: 'User deleted successfully' };
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }

  async updateProfilePicture(id: string, profilePicture: string) {
    try {
      // Note: profilePicture field doesn't exist in schema, this would need to be added first
      throw new BadRequestException('Profile picture feature not implemented - field missing from schema');
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }

  async search(query: string) {
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const adminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } });
    const farmerCount = await this.prisma.user.count({ where: { role: 'FARMER' } });
    const vendorCount = await this.prisma.user.count({ where: { role: 'VENDOR' } });

    return {
      totalUsers,
      adminCount,
      farmerCount,
      vendorCount,
    };
  }

  async seedUsers() {
    const users = [
      {
        email: 'admin@farmrent.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: Role.ADMIN,
      },
      {
        email: 'farmer@farmrent.com',
        password: 'farmer123',
        firstName: 'John',
        lastName: 'Farmer',
        role: Role.FARMER,
      },
      {
        email: 'vendor@farmrent.com',
        password: 'vendor123',
        firstName: 'Jane',
        lastName: 'Vendor',
        role: Role.VENDOR,
      },
    ];

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      await this.prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          ...userData,
          password: hashedPassword,
        },
      });
    }

    return { message: 'Users seeded successfully' };
  }

  async createVendorProfile(userId: string) {
    return this.prisma.vendorProfile.create({
      data: {
        userId,
        businessName: 'AgriEquip Rentals',
        businessAddress: 'Lilongwe, Malawi',
        status: 'VERIFIED',
        commissionRate: 0.10,
        balance: 0,
      },
    });
  }

  async createFarmerProfile(userId: string) {
    // Note: FarmerProfile model doesn't exist in schema, creating user without profile
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: '+265 991 234 568',
      },
    });
  }
}
