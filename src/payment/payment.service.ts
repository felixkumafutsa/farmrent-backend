import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  // Create escrow transaction for booking
  async createEscrowTransaction(bookingId: string, amount: number, provider: string = 'AIRTEL_MONEY') {
    // Check if booking exists
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        equipment: {
          include: {
            vendor: true,
          },
        },
        farmer: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Create escrow transaction
    const escrowTransaction = await this.prisma.escrowTransaction.create({
      data: {
        bookingId,
        amount: booking.totalPrice, // Use booking price as escrow amount
        provider,
        status: 'PENDING',
      },
    });

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        amount: booking.totalPrice,
        transactionRef: escrowTransaction.id,
        status: 'PENDING',
      },
    });

    return {
      escrowTransaction,
      payment,
      booking,
    };
  }

  // Release payment to vendor
  async releasePaymentToVendor(escrowTransactionId: string, adminId: string) {
    const escrowTransaction = await this.prisma.escrowTransaction.findUnique({
      where: { id: escrowTransactionId },
      include: {
        booking: {
          include: {
            equipment: {
              include: {
                vendor: true,
              },
            },
          },
        },
      },
    });

    if (!escrowTransaction) {
      throw new NotFoundException('Escrow transaction not found');
    }

    if (escrowTransaction.status !== 'PENDING') {
      throw new BadRequestException('Payment can only be released from pending transactions');
    }

    // Calculate commission (5%)
    const commission = escrowTransaction.amount * 0.05;
    const netAmount = escrowTransaction.amount - commission;

    // Update escrow transaction
    const updatedTransaction = await this.prisma.escrowTransaction.update({
      where: { id: escrowTransactionId },
      data: {
        status: 'RELEASED',
        commission,
        netAmount,
        releasedAt: new Date(),
      },
    });

    // Update payment status
    await this.prisma.payment.update({
      where: { transactionRef: escrowTransactionId },
      data: {
        status: 'COMPLETED',
      },
    });

    // Create payout record for vendor
    const payout = await this.prisma.payout.create({
      data: {
        vendorId: escrowTransaction.booking.equipment.vendorId,
        amount: netAmount,
        status: 'COMPLETED',
      },
    });

    return {
      escrowTransaction: updatedTransaction,
      payout,
      commission,
      netAmount,
    };
  }

  // Get all escrow transactions (admin only)
  async getAllEscrowTransactions() {
    return this.prisma.escrowTransaction.findMany({
      include: {
        booking: {
          include: {
            equipment: {
              include: {
                vendor: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get vendor payouts
  async getVendorPayouts(vendorId: string) {
    return this.prisma.payout.findMany({
      where: { vendorId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get pending escrow transactions
  async getPendingEscrowTransactions() {
    return this.prisma.escrowTransaction.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        booking: {
          include: {
            equipment: {
              include: {
                vendor: true,
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
