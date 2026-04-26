import { Module } from '@nestjs/common';
import { ComputeService } from './compute.service';
import { ComputeController } from './compute.controller';
import { MailModule } from '../mail/mail.module';
import { NodeModule } from '../node/node.module';

@Module({
  imports: [MailModule, NodeModule],
  controllers: [ComputeController],
  providers: [ComputeService],
  exports: [ComputeService],
})
export class ComputeModule {}
