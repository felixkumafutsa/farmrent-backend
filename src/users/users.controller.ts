import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createUserDto: any) {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Put(':id/profile-picture')
  @UseGuards(JwtAuthGuard)
  async updateProfilePicture(@Param('id') id: string, @Body() body: { profilePicture: string }) {
    return this.usersService.updateProfilePicture(id, body.profilePicture);
  }

  @Get('search/:query')
  async search(@Param('query') query: string) {
    return this.usersService.search(query);
  }

  @Get('stats')
  async getStats() {
    return this.usersService.getStats();
  }

  @Post('seed')
  async seedUsers() {
    return this.usersService.seedUsers();
  }

  @Post('seed-profiles')
  async seedProfiles() {
    const users = await this.usersService.findAll();
    
    for (const user of users) {
      if (user.role === 'VENDOR') {
        await this.usersService.createVendorProfile(user.id);
      } else if (user.role === 'FARMER') {
        await this.usersService.createFarmerProfile(user.id);
      }
    }

    return { message: 'User profiles seeded successfully' };
  }
}
