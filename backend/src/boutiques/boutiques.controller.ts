import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { BoutiquesService } from './boutiques.service';
import { CreateBoutiqueDto } from './dto/create-boutique.dto';
import { UpdateBoutiqueDto } from './dto/update-boutique.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('boutiques')
export class BoutiquesController {
  constructor(private readonly boutiquesService: BoutiquesService) {}

  @Get() findAll() { return this.boutiquesService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.boutiquesService.findOne(id); }

  @UseGuards(JwtAuthGuard)
  @Get('me/boutiques') findMine(@Request() req) {
    return this.boutiquesService.findByCommercant(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMMERCANT, UserRole.ADMINISTRATEUR)
  @Post() create(@Body() dto: CreateBoutiqueDto, @Request() req) {
    return this.boutiquesService.create(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateBoutiqueDto, @Request() req) {
    return this.boutiquesService.update(id, dto, req.user.userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id') remove(@Param('id') id: string, @Request() req) {
    return this.boutiquesService.remove(id, req.user.userId, req.user.role);
  }
}