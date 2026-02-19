import { Module } from '@nestjs/common';
import { RelatedEntitiesService } from './related-entities.service';
import { RelatedEntitiesController } from './related-entities.controller';

@Module({
  controllers: [RelatedEntitiesController],
  providers: [RelatedEntitiesService],
  exports: [RelatedEntitiesService],
})
export class RelatedEntitiesModule {}
