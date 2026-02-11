import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly expectedToken: string;

  constructor(private readonly configService: ConfigService) {
    // Get token from environment variable
    this.expectedToken = <string>this.configService.get<string>('AUTH_TOKEN');

    // Fallback for development/testing (never use in production!)
    if (!this.expectedToken) {
      console.warn(
        '⚠️  AUTH_TOKEN not set in environment. Using DEVELOPMENT fallback token.',
      );
      this.expectedToken = 'aspin_partner_demo_token_2026';
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    // 1. Check if token exists
    if (!token) {
      throw new UnauthorizedException({
        error: 'Unauthorized',
        message: 'Missing Authorization header',
        details: { required_format: 'Authorization: Bearer <token>' },
      });
    }

    // 2. Validate token against environment variable
    if (token !== this.expectedToken) {
      throw new UnauthorizedException({
        error: 'InvalidToken',
        message: 'Invalid or expired Bearer token',
        details: {
          token_provided: this.maskToken(token),
          expected_format: 'Authorization: Bearer <valid_token>',
        },
      });
    }

    // 3. Attach partner context to request for downstream services
    request['user'] = {
      partner_guid: this.configService.get<string>('PARTNER_GUID') || 'demo',
      token_validated: true,
      authenticated_at: new Date().toISOString(),
    };

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private maskToken(token: string): string {
    if (token.length <= 8) return '***';
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  }
}
