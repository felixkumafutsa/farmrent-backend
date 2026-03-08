import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, Query, BadRequestException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(@Body() createReviewDto: any, @Request() req: any) {
    try {
      const { bookingId, rating, comment } = createReviewDto;
      const userId = req.user.id;

      if (!bookingId || !rating) {
        throw new BadRequestException('Booking ID and rating are required');
      }

      if (rating < 1 || rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      return await this.reviewsService.createReview(bookingId, userId, rating, comment);
    } catch (error) {
      console.error('Review creation error:', error);
      throw new BadRequestException(error.message || 'Failed to create review');
    }
  }

  @Get('equipment/:equipmentId')
  async getEquipmentReviews(@Param('equipmentId') equipmentId: string) {
    try {
      return await this.reviewsService.getEquipmentReviews(equipmentId);
    } catch (error) {
      console.error('Equipment reviews fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch equipment reviews');
    }
  }

  @Get('equipment/:equipmentId/stats')
  async getEquipmentReviewStats(@Param('equipmentId') equipmentId: string) {
    try {
      return await this.reviewsService.getEquipmentReviewStats(equipmentId);
    } catch (error) {
      console.error('Equipment review stats fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch equipment review stats');
    }
  }

  @Get('vendor/:vendorId')
  async getVendorReviews(@Param('vendorId') vendorId: string) {
    try {
      return await this.reviewsService.getVendorReviews(vendorId);
    } catch (error) {
      console.error('Vendor reviews fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch vendor reviews');
    }
  }

  @Get('vendor/:vendorId/stats')
  async getVendorReviewStats(@Param('vendorId') vendorId: string) {
    try {
      return await this.reviewsService.getVendorReviewStats(vendorId);
    } catch (error) {
      console.error('Vendor review stats fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch vendor review stats');
    }
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUserReviews(@Request() req: any) {
    try {
      const userId = req.user.id;
      return await this.reviewsService.getUserReviews(userId);
    } catch (error) {
      console.error('User reviews fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch user reviews');
    }
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  async getAllReviews(@Request() req: any) {
    try {
      const user = req.user;
      if (user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can access all reviews');
      }
      return await this.reviewsService.getAllReviews();
    } catch (error) {
      console.error('All reviews fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch all reviews');
    }
  }

  @Put(':reviewId')
  @UseGuards(JwtAuthGuard)
  async updateReview(
    @Param('reviewId') reviewId: string,
    @Body() updateReviewDto: any,
    @Request() req: any
  ) {
    try {
      const { rating, comment } = updateReviewDto;
      const userId = req.user.id;

      if (rating && (rating < 1 || rating > 5)) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      return await this.reviewsService.updateReview(reviewId, userId, rating, comment);
    } catch (error) {
      console.error('Review update error:', error);
      throw new BadRequestException(error.message || 'Failed to update review');
    }
  }

  @Delete(':reviewId')
  @UseGuards(JwtAuthGuard)
  async deleteReview(@Param('reviewId') reviewId: string, @Request() req: any) {
    try {
      const userId = req.user.id;
      return await this.reviewsService.deleteReview(reviewId, userId);
    } catch (error) {
      console.error('Review deletion error:', error);
      throw new BadRequestException(error.message || 'Failed to delete review');
    }
  }
}
