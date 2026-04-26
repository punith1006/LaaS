import { Module } from '@nestjs/common';
import { NodeService } from './node.service';

@Module({
  providers: [NodeService],
  exports: [NodeService],
})
export class NodeModule {}
