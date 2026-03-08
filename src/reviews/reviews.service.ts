import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReview(bookingId: string, userId: string, rating: number, comment?: string) {
    // Check if booking exists and belongs to the user
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        farmer: true,
        equipment: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.farmerId !== userId) {
      throw new BadRequestException('You can only review bookings you made');
    }

    if (booking.status !== 'COMPLETED') {
      throw new BadRequestException('You can only review completed bookings');
    }

    // Check if review already exists
    const existingReview = await this.prisma.review.findUnique({
      where: { bookingId },
    });

    if (existingReview) {
      throw new BadRequestException('Review already exists for this booking');
    }

    // Create the review
    const review = await this.prisma.review.create({
      data: {
        bookingId,
        userId,
        rating,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        booking: {
          include: {
            equipment: {
              include: {
                vendor: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.transformReview(review);
  }

  async getEquipmentReviews(equipmentId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        booking: {
          equipmentId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        booking: {
          include: {
            equipment: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reviews.map(review => this.transformReview(review));
  }

  async getVendorReviews(vendorId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        booking: {
          equipment: {
            vendorId,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        booking: {
          include: {
            equipment: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reviews.map(review => this.transformReview(review));
  }

  async getVendorReviewStats(vendorId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        booking: {
          equipment: {
            vendorId,
          },
        },
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: [0, 0, 0, 0, 0],
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    const ratingDistribution = [0, 0, 0, 0, 0];
    reviews.forEach(review => {
      ratingDistribution[review.rating - 1]++;
    });

    return {
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution,
    };
  }

  async getEquipmentReviewStats(equipmentId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        booking: {
          equipmentId,
        },
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: [0, 0, 0, 0, 0],
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    const ratingDistribution = [0, 0, 0, 0, 0];
    reviews.forEach(review => {
      ratingDistribution[review.rating - 1]++;
    });

    return {
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution,
    };
  }

  async getUserReviews(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        booking: {
          include: {
            equipment: {
              include: {
                vendor: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
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

    return reviews.map(review => this.transformReview(review));
  }

  async updateReview(reviewId: string, userId: string, rating?: number, comment?: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new BadRequestException('You can only update your own reviews');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(rating && { rating }),
        ...(comment !== undefined && { comment }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        booking: {
          include: {
            equipment: {
              include: {
                vendor: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.transformReview(updatedReview);
  }

  async deleteReview(reviewId: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId) {
      throw new BadRequestException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    return { message: 'Review deleted successfully' };
  }

  async getAllReviews() {
    const reviews = await this.prisma.review.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        booking: {
          include: {
            equipment: {
              include: {
                vendor: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
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

    return reviews.map(review => this.transformReview(review));
  }

  private transformReview(review: any) {
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      user: review.user,
      equipment: review.booking?.equipment,
      vendor: review.booking?.equipment?.vendor,
    };
  }
}
