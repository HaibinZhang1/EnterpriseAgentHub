import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SkillsModule } from '../skills/skills.module';
import { PackageStorageService } from './package-storage.service';
import { PublishingRepository } from './publishing.repository';
import { PublisherController } from './publisher.controller';
import { PublishingService } from './publishing.service';
import { ReviewerRoutingService } from './reviewer-routing.service';

@Module({
  imports: [AuthModule, SkillsModule],
  controllers: [PublisherController],
  providers: [PublishingService, PackageStorageService, PublishingRepository, ReviewerRoutingService],
  exports: [PublishingService],
})
export class PublishingModule {}
