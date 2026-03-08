import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async seedCategories() {
    const categories = [
      { name: 'Tractors', description: 'Agricultural tractors for farming operations' },
      { name: 'Plows', description: 'Equipment for soil preparation and cultivation' },
      { name: 'Harvesters', description: 'Machines for harvesting crops' },
      { name: 'Irrigation', description: 'Irrigation systems and water management equipment' },
      { name: 'Seeders', description: 'Equipment for planting seeds' },
      { name: 'Sprayers', description: 'Equipment for applying pesticides and fertilizers' },
    ];

    for (const category of categories) {
      await this.prisma.category.upsert({
        where: { name: category.name },
        update: category,
        create: category,
      });
    }

    return { message: 'Categories seeded successfully' };
  }

  async createCategory(name: string, description?: string) {
    // Check if category already exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { name },
    });

    if (existingCategory) {
      throw new BadRequestException('Category with this name already exists');
    }

    const category = await this.prisma.category.create({
      data: {
        name,
        description,
      },
    });

    return category;
  }

  async getAllCategories() {
    const categories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: {
            equipment: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return categories;
  }

  async getCategoryById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            equipment: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async updateCategory(id: string, name?: string, description?: string) {
    // Check if category exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    // Check if new name conflicts with existing category
    if (name && name !== existingCategory.name) {
      const nameConflict = await this.prisma.category.findUnique({
        where: { name },
      });

      if (nameConflict) {
        throw new BadRequestException('Category with this name already exists');
      }
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        _count: {
          select: {
            equipment: true,
          },
        },
      },
    });

    return updatedCategory;
  }

  async deleteCategory(id: string) {
    // Check if category exists
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            equipment: true,
          },
        },
      },
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has equipment
    if (existingCategory._count.equipment > 0) {
      throw new BadRequestException(
        `Cannot delete category. It has ${existingCategory._count.equipment} equipment items. Please reassign or delete the equipment first.`
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }

  async getCategoryStats() {
    const totalCategories = await this.prisma.category.count();
    
    const categoriesWithEquipmentCount = await this.prisma.category.findMany({
      include: {
        _count: {
          select: {
            equipment: true,
          },
        },
      },
    });

    const totalEquipmentInCategories = categoriesWithEquipmentCount.reduce(
      (sum, cat) => sum + cat._count.equipment,
      0
    );

    const emptyCategories = categoriesWithEquipmentCount.filter(
      cat => cat._count.equipment === 0
    ).length;

    return {
      totalCategories,
      categoriesWithEquipment: totalCategories - emptyCategories,
      emptyCategories,
      totalEquipmentInCategories,
    };
  }

  async findAll() {
    return this.prisma.category.findMany();
  }
}
