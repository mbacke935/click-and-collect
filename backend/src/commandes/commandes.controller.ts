import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { CommandesService } from './commandes.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateStatutDto } from './dto/update-statut.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('commandes')
export class CommandesController {
  constructor(private readonly commandesService: CommandesService) {}

  @Post()
  create(@Body() dto: CreateCommandeDto, @Request() req) {
    return this.commandesService.create(dto, req.user.userId);
  }

  @Get('me')
  findMine(@Request() req) {
    return this.commandesService.findByClient(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.commandesService.findOneForUser(id, req.user.userId, req.user.role);
  }

  @Get('boutique/:boutiqueId')
  findByBoutique(@Param('boutiqueId') boutiqueId: string, @Request() req) {
    return this.commandesService.findByBoutiqueForUser(boutiqueId, req.user.userId, req.user.role);
  }

  @Patch(':id/statut')
  updateStatut(@Param('id') id: string, @Body() dto: UpdateStatutDto, @Request() req) {
    return this.commandesService.updateStatut(id, dto, req.user.userId, req.user.role);
  }
}
