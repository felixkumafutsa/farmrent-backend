import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EquipmentSeedService {
  constructor(private prisma: PrismaService) {}

  async seedEquipment() {
    // Get vendor user
    const vendorUser = await this.prisma.user.findFirst({
      where: { role: 'VENDOR' },
    });

    if (!vendorUser) {
      throw new Error('No vendor user found. Please seed users first.');
    }

    // Get or create vendor profile
    let vendorProfile = await this.prisma.vendorProfile.findFirst({
      where: { userId: vendorUser.id },
    });

    if (!vendorProfile) {
      vendorProfile = await this.prisma.vendorProfile.create({
        data: {
          userId: vendorUser.id,
          businessName: 'AgriEquip Rentals',
          businessAddress: 'Lilongwe, Malawi',
          status: 'VERIFIED',
          commissionRate: 0.10,
          balance: 0,
        },
      });
    }

    // Get categories
    const categories = await this.prisma.category.findMany();
    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.name] = cat.id;
      return acc;
    }, {} as Record<string, string>);

    const equipmentData = [
      {
        name: 'John Deere 5075E Tractor',
        description: 'Reliable 75HP tractor perfect for medium-sized farms. Comes with various attachments.',
        pricePerDay: 150,
        pricePerWeek: 900,
        deposit: 500,
        location: 'Lilongwe, Malawi',
        images: ['tractor1.jpg'],
        isAvailable: true,
        condition: 'Excellent',
        categoryId: categoryMap['Tractors'],
        vendorId: vendorProfile.id,
      },
      {
        name: 'Case IH Puma 210',
        description: 'Powerful 210HP tractor for large-scale farming operations.',
        pricePerDay: 280,
        pricePerWeek: 1680,
        deposit: 1000,
        location: 'Blantyre, Malawi',
        images: ['tractor2.jpg'],
        isAvailable: true,
        condition: 'Good',
        categoryId: categoryMap['Tractors'],
        vendorId: vendorProfile.id,
      },
      {
        name: 'Kuhn Multi-Master 153',
        description: 'Versatile plow suitable for various soil types and conditions.',
        pricePerDay: 80,
        pricePerWeek: 480,
        deposit: 200,
        location: 'Mzuzu, Malawi',
        images: ['plow1.jpg'],
        isAvailable: false,
        condition: 'Very Good',
        categoryId: categoryMap['Plows'],
        vendorId: vendorProfile.id,
      },
      {
        name: 'John Deere S690 Harvester',
        description: 'High-capacity combine harvester for efficient grain harvesting.',
        pricePerDay: 450,
        pricePerWeek: 2700,
        deposit: 2000,
        location: 'Lilongwe, Malawi',
        images: ['harvester1.jpg'],
        isAvailable: true,
        condition: 'Excellent',
        categoryId: categoryMap['Harvesters'],
        vendorId: vendorProfile.id,
      },
      {
        name: 'Irrigation Pump System',
        description: 'Complete irrigation system with pumps and pipes for 10 hectares.',
        pricePerDay: 120,
        pricePerWeek: 720,
        deposit: 400,
        location: 'Blantyre, Malawi',
        images: ['irrigation1.jpg'],
        isAvailable: true,
        condition: 'Good',
        categoryId: categoryMap['Irrigation'],
        vendorId: vendorProfile.id,
      },
      {
        name: 'Seed Drill 12-Row',
        description: 'Precision seed drill for accurate planting and optimal seed placement.',
        pricePerDay: 95,
        pricePerWeek: 570,
        deposit: 300,
        location: 'Mzuzu, Malawi',
        images: ['seeder1.jpg'],
        isAvailable: true,
        condition: 'Very Good',
        categoryId: categoryMap['Seeders'],
        vendorId: vendorProfile.id,
      },
    ];

    for (const equipment of equipmentData) {
      await this.prisma.equipment.create({
        data: equipment,
      });
    }

    return { message: 'Equipment seeded successfully' };
  }
}
