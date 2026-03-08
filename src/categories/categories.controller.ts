import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createCategory(@Body() createCategoryDto: any, @Request() req: any) {
    try {
      const user = req.user;
      if (user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can create categories');
      }

      const { name, description } = createCategoryDto;

      if (!name || name.trim() === '') {
        throw new BadRequestException('Category name is required');
      }

      return await this.categoriesService.createCategory(name.trim(), description);
    } catch (error) {
      console.error('Category creation error:', error);
      throw new BadRequestException(error.message || 'Failed to create category');
    }
  }

  @Get()
  async getAllCategories() {
    try {
      return await this.categoriesService.getAllCategories();
    } catch (error) {
      console.error('Categories fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch categories');
    }
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getCategoryStats(@Request() req: any) {
    try {
      const user = req.user;
      if (user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can access category stats');
      }

      return await this.categoriesService.getCategoryStats();
    } catch (error) {
      console.error('Category stats fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch category stats');
    }
  }

  @Get(':id')
  async getCategoryById(@Param('id') id: string) {
    try {
      return await this.categoriesService.getCategoryById(id);
    } catch (error) {
      console.error('Category fetch error:', error);
      throw new BadRequestException(error.message || 'Failed to fetch category');
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: any,
    @Request() req: any
  ) {
    try {
      const user = req.user;
      if (user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can update categories');
      }

      const { name, description } = updateCategoryDto;

      if (name && name.trim() === '') {
        throw new BadRequestException('Category name cannot be empty');
      }

      return await this.categoriesService.updateCategory(
        id,
        name ? name.trim() : undefined,
        description
      );
    } catch (error) {
      console.error('Category update error:', error);
      throw new BadRequestException(error.message || 'Failed to update category');
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteCategory(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      if (user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can delete categories');
      }

      return await this.categoriesService.deleteCategory(id);
    } catch (error) {
      console.error('Category deletion error:', error);
      throw new BadRequestException(error.message || 'Failed to delete category');
    }
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard)
  async seedCategories(@Request() req: any) {
    try {
      const user = req.user;
      if (user.role !== 'ADMIN') {
        throw new BadRequestException('Only admins can seed categories');
      }

      return await this.categoriesService.seedCategories();
    } catch (error) {
      console.error('Category seeding error:', error);
      throw new BadRequestException(error.message || 'Failed to seed categories');
    }
  }
}
