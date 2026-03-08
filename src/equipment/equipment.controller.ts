import { Controller, Get, Param, Post, Put, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { EquipmentSeedService } from './equipment-seed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('equipment')
export class EquipmentController {
  constructor(
    private readonly equipmentService: EquipmentService,
    private readonly equipmentSeedService: EquipmentSeedService
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any) {
    const user = req.user;
    return this.equipmentService.findAll(user);
  }

  @Get('my-equipment')
  @UseGuards(JwtAuthGuard)
  async findMyEquipment(@Request() req: any) {
    const user = req.user;
    return this.equipmentService.findMyEquipment(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.equipmentService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createEquipmentDto: any, @Request() req: any) {
    const user = req.user;
    // Add vendorId if user is a vendor
    if (user.role === 'VENDOR') {
      createEquipmentDto.vendorId = user.id;
    }
    return this.equipmentService.create(createEquipmentDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateEquipmentDto: any, @Request() req: any) {
    const user = req.user;
    // Only allow vendors to update their own equipment
    if (user.role === 'VENDOR') {
      const equipment = await this.equipmentService.findOne(id);
      if (equipment.vendorId !== user.id) {
        throw new Error('You can only update your own equipment');
      }
    }
    return this.equipmentService.update(id, updateEquipmentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req: any) {
    const user = req.user;
    // Only allow vendors to delete their own equipment
    if (user.role === 'VENDOR') {
      const equipment = await this.equipmentService.findOne(id);
      if (equipment.vendorId !== user.id) {
        throw new Error('You can only delete your own equipment');
      }
    }
    return this.equipmentService.remove(id);
  }

  @Get('category/:categoryId')
  async findByCategory(@Param('categoryId') categoryId: string) {
    return this.equipmentService.findByCategory(categoryId);
  }

  @Get('search/:query')
  async search(@Param('query') query: string) {
    return this.equipmentService.search(query);
  }

  @Post('seed')
  async seedEquipment() {
    return this.equipmentSeedService.seedEquipment();
  }
}
