import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  async create(createEquipmentDto: any) {
    try {
      const equipment = await this.prisma.equipment.create({
        data: {
          ...createEquipmentDto,
          categoryId: createEquipmentDto.categoryId,
        },
        include: {
          category: true,
        },
      });

      return this.transformEquipment(equipment);
    } catch (error) {
      throw new BadRequestException('Failed to create equipment');
    }
  }

  async findAll(user?: any) {
    const where = user?.role === 'VENDOR' ? { vendorId: user.id } : {};
    
    const equipment = await this.prisma.equipment.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return equipment.map(item => this.transformEquipment(item));
  }

  async findMyEquipment(vendorId: string) {
    const equipment = await this.prisma.equipment.findMany({
      where: { vendorId },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return equipment.map(item => this.transformEquipment(item));
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    return this.transformEquipment(equipment);
  }

  async update(id: string, updateEquipmentDto: any) {
    try {
      const equipment = await this.prisma.equipment.update({
        where: { id },
        data: {
          ...updateEquipmentDto,
          categoryId: updateEquipmentDto.categoryId,
        },
        include: {
          category: true,
        },
      });

      return this.transformEquipment(equipment);
    } catch (error) {
      throw new NotFoundException('Equipment not found');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.equipment.delete({
        where: { id },
      });
      return { message: 'Equipment deleted successfully' };
    } catch (error) {
      throw new NotFoundException('Equipment not found');
    }
  }

  async findByCategory(categoryId: string) {
    const equipment = await this.prisma.equipment.findMany({
      where: { categoryId },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return equipment.map(item => this.transformEquipment(item));
  }

  async search(query: string) {
    const equipment = await this.prisma.equipment.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return equipment.map(item => this.transformEquipment(item));
  }

  private transformEquipment(equipment: any) {
    return {
      id: equipment.id,
      name: equipment.name,
      description: equipment.description,
      pricePerDay: equipment.pricePerDay,
      pricePerWeek: equipment.pricePerWeek,
      deposit: equipment.deposit,
      location: equipment.location,
      images: equipment.images || [],
      isAvailable: equipment.isAvailable,
      condition: equipment.condition,
      category: {
        id: equipment.category.id,
        name: equipment.category.name,
      },
      vendorId: equipment.vendorId, // Add vendorId to the response
      vendor: {
        businessName: 'AgriEquip Rentals', // Mock vendor name for now
        rating: 4.5, // Mock rating for now
      },
      createdAt: equipment.createdAt,
      updatedAt: equipment.updatedAt,
    };
  }
}
