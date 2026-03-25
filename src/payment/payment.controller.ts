import { Controller, Get, Post, Put, Param, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('escrow/:bookingId')
  @UseGuards(JwtAuthGuard)
  async createEscrowTransaction(
    @Param('bookingId') bookingId: string,
    @Body() createPaymentDto: any,
    @Request() req: any
  ) {
    try {
      const { amount, provider } = createPaymentDto;
      const user = req.user;

      // Only farmers can make payments
      if (user.role !== 'FARMER') {
        throw new BadRequestException('Only farmers can make payments');
      }

      return await this.paymentService.createEscrowTransaction(bookingId, amount, provider);
    } catch (error) {
      console.error('Escrow creation error:', error);
      throw new BadRequestException(error.message || 'Failed to create escrow transaction');
    }
  }

  @Put('release/:escrowTransactionId')
  @UseGuards(JwtAuthGuard)
  async releasePaymentToVendor(
    @Param('escrowTransactionId') escrowTransactionId: string,
    @Request() req: any
  ) {
    try {
      const user = req.user;

      // Only admins can release payments
      if (user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can release payments');
      }

      return await this.paymentService.releasePaymentToVendor(escrowTransactionId, user.id);
    } catch (error) {
      console.error('Payment release error:', error);
      throw new BadRequestException(error.message || 'Failed to release payment');
    }
  }

  @Get('escrow/all')
  @UseGuards(JwtAuthGuard)
  async getAllEscrowTransactions(@Request() req: any) {
    try {
      const user = req.user;

      // Only admins can view all escrow transactions
      if (user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can view escrow transactions');
      }

      return await this.paymentService.getAllEscrowTransactions();
    } catch (error) {
      console.error('Escrow transactions fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch escrow transactions');
    }
  }

  @Get('escrow/pending')
  @UseGuards(JwtAuthGuard)
  async getPendingEscrowTransactions(@Request() req: any) {
    try {
      const user = req.user;

      // Only admins can view pending escrow transactions
      if (user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can view pending escrow transactions');
      }

      return await this.paymentService.getPendingEscrowTransactions();
    } catch (error) {
      console.error('Pending escrow transactions fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch pending escrow transactions');
    }
  }

  @Get('payouts/:vendorId')
  @UseGuards(JwtAuthGuard)
  async getVendorPayouts(
    @Param('vendorId') vendorId: string,
    @Request() req: any
  ) {
    try {
      const user = req.user;

      // Vendors can only view their own payouts, admins can view any
      if (user.role !== 'ADMIN' && user.id !== vendorId) {
        throw new BadRequestException('You can only view your own payouts');
      }

      return await this.paymentService.getVendorPayouts(vendorId);
    } catch (error) {
      console.error('Vendor payouts fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch vendor payouts');
    }
  }
}
