import { Module } from '@nestjs/common';
import { EquipmentController } from './equipment.controller';
import { EquipmentService } from './equipment.service';
import { EquipmentSeedService } from './equipment-seed.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EquipmentController],
  providers: [EquipmentService, EquipmentSeedService],
  exports: [EquipmentService, EquipmentSeedService],
})
export class EquipmentModule {}
