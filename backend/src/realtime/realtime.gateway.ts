import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BoutiquesService } from '../boutiques/boutiques.service';
import { Commande } from '../commandes/entities/commande.entity';

interface JwtPayload {
  sub: string;
  role: string;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly boutiquesService: BoutiquesService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    try {
      const payload = this.jwtService.verify<JwtPayload>(token as string);
      client.join(`client:${payload.sub}`);
      if (payload.role === 'commercant') {
        const boutiques = await this.boutiquesService.findByCommercant(payload.sub);
        boutiques.forEach((b) => client.join(`boutique:${b.id}`));
      }
    } catch {
      this.logger.warn(`Connexion WebSocket refusée (token invalide) : ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client déconnecté : ${client.id}`);
  }

  emitCommandeUpdate(commande: Commande) {
    const payload = {
      id: commande.id,
      statut: commande.statut,
      boutique_id: commande.boutique_id,
      client_id: commande.client_id,
      billet: commande.billet,
    };
    this.server.to(`client:${commande.client_id}`).emit('commande:update', payload);
    this.server.to(`boutique:${commande.boutique_id}`).emit('commande:update', payload);
  }
}
