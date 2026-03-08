import { Controller, Get, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { EarningsService } from './earnings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('earnings')
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get('vendor')
  @UseGuards(JwtAuthGuard)
  async getVendorEarnings(@Query('period') period: string, @Request() req: any) {
    try {
      const user = req.user;
      if (user.role !== 'VENDOR') {
        throw new BadRequestException('Only vendors can access vendor earnings');
      }
      return await this.earningsService.getVendorEarnings(user.id, period);
    } catch (error) {
      console.error('Vendor earnings error:', error);
      throw new BadRequestException(`Failed to fetch vendor earnings: ${error.message}`);
    }
  }

  @Get('farmer')
  @UseGuards(JwtAuthGuard)
  async getFarmerSpending(@Query('period') period: string, @Request() req: any) {
    try {
      const user = req.user;
      if (user.role !== 'FARMER') {
        throw new BadRequestException('Only farmers can access farmer spending');
      }
      return await this.earningsService.getFarmerSpending(user.id, period);
    } catch (error) {
      console.error('Farmer spending error:', error);
      throw new BadRequestException(`Failed to fetch farmer spending: ${error.message}`);
    }
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  async getAdminAnalytics(@Query('period') period: string, @Request() req: any) {
    try {
      const user = req.user;
      if (user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can access admin analytics');
      }
      return await this.earningsService.getAdminAnalytics(period);
    } catch (error) {
      console.error('Admin analytics error:', error);
      throw new BadRequestException(`Failed to fetch admin analytics: ${error.message}`);
    }
  }
}
