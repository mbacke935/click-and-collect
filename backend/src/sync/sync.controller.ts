import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncBatchDto } from './dto/sync-batch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  processBatch(@Body() dto: SyncBatchDto, @Request() req) {
    return this.syncService.processBatch(dto.events, req.user.userId, req.user.role);
  }

  // Le journal de synchronisation de toute la plateforme n'est consultable que par un admin.
  @UseGuards(AdminGuard)
  @Get()
  findAll() { return this.syncService.findAll(); }

  @UseGuards(AdminGuard)
  @Get('pending')
  findPending() { return this.syncService.findPending(); }

  @UseGuards(AdminGuard)
  @Get('stats')
  getStats() { return this.syncService.getStats(); }
}
