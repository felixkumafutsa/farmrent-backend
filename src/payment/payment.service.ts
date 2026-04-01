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

    // Create payment record first (required for escrow transaction)
    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        amount: booking.totalPrice,
        transactionRef: `TXN-${Date.now()}`,
        provider,
        status: 'PENDING',
      },
    });

    // Create escrow transaction linked to payment
    const escrowTransaction = await this.prisma.escrowTransaction.create({
      data: {
        paymentId: payment.id,
        amount: booking.totalPrice,
        commission: 0,
        netAmount: 0,
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
        payment: {
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
        },
      },
    });

    if (!escrowTransaction) {
      throw new NotFoundException('Escrow transaction not found');
    }

    if (escrowTransaction.isReleased) {
      throw new BadRequestException('Payment already released');
    }

    // Calculate commission (5%)
    const commission = escrowTransaction.amount * 0.05;
    const netAmount = escrowTransaction.amount - commission;

    // Update escrow transaction
    const updatedTransaction = await this.prisma.escrowTransaction.update({
      where: { id: escrowTransactionId },
      data: {
        isReleased: true,
        commission,
        netAmount,
        releasedAt: new Date(),
      },
    });

    // Update payment status
    await this.prisma.payment.update({
      where: { id: escrowTransaction.paymentId },
      data: {
        status: 'SUCCESSFUL',
      },
    });

    // Create payout record for vendor
    const payout = await this.prisma.payout.create({
      data: {
        vendorId: escrowTransaction.payment.booking.equipment.vendorId,
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
        payment: {
          include: {
            booking: {
              include: {
                equipment: {
                  include: {
                    vendor: {
                      select: {
                        id: true,
                        user: {
                          select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                          },
                        },
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
        isReleased: false,
      },
      include: {
        payment: {
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
