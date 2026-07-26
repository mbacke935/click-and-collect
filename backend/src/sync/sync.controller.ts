import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncBatchDto } from './dto/sync-batch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  processBatch(@Body() dto: SyncBatchDto, @Request() req) {
    return this.syncService.processBatch(dto.events, req.user.userId);
  }

  @Get()
  findAll() { return this.syncService.findAll(); }

  @Get('pending')
  findPending() { return this.syncService.findPending(); }

  @Get('stats')
  getStats() { return this.syncService.getStats(); }
}
