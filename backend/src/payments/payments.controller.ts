import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SimulerPaiementDto } from './dto/simuler-paiement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('simuler')
  simuler(@Body() dto: SimulerPaiementDto, @Request() req) {
    return this.paymentsService.createPayment(dto.montant, 'XOF', '', req.user.email);
  }
}
