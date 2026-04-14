import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SupportService, CreateSupportTicketDto } from './support.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Req() req: any,
    @Body() createTicketDto: CreateSupportTicketDto,
  ) {
    const result = await this.supportService.createTicket(
      req.user.id,
      createTicketDto,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('tickets/list')
  @HttpCode(HttpStatus.OK)
  async getUserTickets(@Req() req: any) {
    const tickets = await this.supportService.getUserTickets(req.user.id);
    return {
      success: true,
      data: tickets,
    };
  }
}
