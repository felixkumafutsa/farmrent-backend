import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EarningsService {
  constructor(private prisma: PrismaService) {}

  async getVendorEarnings(vendorId: string, period?: string) {
    try {
      const dateFilter = this.getDateFilter(period);
      
      const bookings = await this.prisma.booking.findMany({
        where: {
          equipment: {
            vendorId: vendorId,
          },
          status: {
            in: ['COMPLETED', 'ACTIVE'],
          },
          createdAt: dateFilter,
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
      });

      const totalEarnings = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
      const totalDeposits = bookings.reduce((sum, booking) => sum + booking.depositAmount, 0);
      const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;
      const activeBookings = bookings.filter(b => b.status === 'ACTIVE').length;

      // Monthly earnings data
      const monthlyEarnings = this.calculateMonthlyEarnings(bookings);
      
      // Equipment performance
      const equipmentPerformance = this.calculateEquipmentPerformance(bookings);

      return {
        summary: {
          totalEarnings,
          totalDeposits,
          completedBookings,
          activeBookings,
          averageBookingValue: bookings.length > 0 ? totalEarnings / bookings.length : 0,
        },
        monthlyEarnings,
        equipmentPerformance,
        recentBookings: bookings.slice(0, 10),
      };
    } catch (error) {
      console.error('Vendor earnings fetch error:', error);
      throw new Error(`Failed to fetch vendor earnings: ${error.message}`);
    }
  }

  async getFarmerSpending(farmerId: string, period?: string) {
    try {
      const dateFilter = this.getDateFilter(period);
      
      const bookings = await this.prisma.booking.findMany({
        where: {
          farmerId: farmerId,
          createdAt: dateFilter,
        },
        include: {
          equipment: {
            select: {
              id: true,
              name: true,
              pricePerDay: true,
              vendor: {
                select: {
                  id: true,
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
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const totalSpent = bookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
      const totalDeposits = bookings.reduce((sum, booking) => sum + booking.depositAmount, 0);
      const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;
      const activeBookings = bookings.filter(b => b.status === 'ACTIVE').length;
      const pendingBookings = bookings.filter(b => b.status === 'PENDING').length;

      // Monthly spending data
      const monthlySpending = this.calculateMonthlyEarnings(bookings);

      return {
        summary: {
          totalSpent,
          totalDeposits,
          completedBookings,
          activeBookings,
          pendingBookings,
          averageBookingValue: bookings.length > 0 ? totalSpent / bookings.length : 0,
        },
        monthlySpending,
        recentBookings: bookings.slice(0, 10),
      };
    } catch (error) {
      console.error('Farmer spending fetch error:', error);
      throw new Error(`Failed to fetch farmer spending: ${error.message}`);
    }
  }

  async getAdminAnalytics(period?: string) {
    try {
      const dateFilter = this.getDateFilter(period);
      
      const [
        totalBookings,
        totalUsers,
        totalEquipment,
        totalRevenue,
        activeBookings,
        completedBookings,
        pendingBookings,
      ] = await Promise.all([
        this.prisma.booking.count({
          where: { createdAt: dateFilter },
        }),
        this.prisma.user.count(),
        this.prisma.equipment.count(),
        this.prisma.booking.aggregate({
          where: {
            status: { in: ['COMPLETED', 'ACTIVE'] },
            createdAt: dateFilter,
          },
          _sum: { totalPrice: true },
        }),
        this.prisma.booking.count({
          where: { status: 'ACTIVE' },
        }),
        this.prisma.booking.count({
          where: { status: 'COMPLETED' },
        }),
        this.prisma.booking.count({
          where: { status: 'PENDING' },
        }),
      ]);

      const usersByRole = await this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      });

      const bookingsByStatus = await this.prisma.booking.groupBy({
        by: ['status'],
        _count: true,
        where: dateFilter ? { createdAt: { gte: dateFilter.gte } } : undefined,
      });

      const monthlyRevenue = await this.getMonthlyRevenue(dateFilter);

      return {
        overview: {
          totalBookings,
          totalUsers,
          totalEquipment,
          totalRevenue: totalRevenue._sum.totalPrice || 0,
          activeBookings,
          completedBookings,
          pendingBookings,
        },
        usersByRole,
        bookingsByStatus,
        monthlyRevenue,
      };
    } catch (error) {
      console.error('Admin analytics fetch error:', error);
      throw new Error(`Failed to fetch admin analytics: ${error.message}`);
    }
  }

  private getDateFilter(period?: string) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
    }

    return {
      gte: startDate,
    };
  }

  private calculateMonthlyEarnings(bookings: any[]) {
    const monthlyData = new Map();

    bookings.forEach(booking => {
      const date = new Date(booking.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          earnings: 0,
          bookings: 0,
        });
      }

      const data = monthlyData.get(monthKey);
      data.earnings += booking.totalPrice;
      data.bookings += 1;
    });

    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateEquipmentPerformance(bookings: any[]) {
    const equipmentMap = new Map();

    bookings.forEach(booking => {
      const equipmentId = booking.equipment.id;
      
      if (!equipmentMap.has(equipmentId)) {
        equipmentMap.set(equipmentId, {
          equipment: booking.equipment,
          totalEarnings: 0,
          totalBookings: 0,
          averageRating: 0,
        });
      }

      const data = equipmentMap.get(equipmentId);
      data.totalEarnings += booking.totalPrice;
      data.totalBookings += 1;
    });

    return Array.from(equipmentMap.values()).sort((a, b) => b.totalEarnings - a.totalEarnings);
  }

  private async getMonthlyRevenue(dateFilter: any) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { in: ['COMPLETED', 'ACTIVE'] },
        createdAt: dateFilter,
      },
      select: {
        totalPrice: true,
        createdAt: true,
      },
    });

    const monthlyData = new Map();

    bookings.forEach(booking => {
      const date = new Date(booking.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          revenue: 0,
        });
      }

      const data = monthlyData.get(monthKey);
      data.revenue += booking.totalPrice;
    });

    return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
  }
}
