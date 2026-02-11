import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken, createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { AuthUser } from './decorators/current-user.decorator';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);
  private readonly secretKey: string;
  private readonly clerkClient: ReturnType<typeof createClerkClient>;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) {
      throw new Error('Missing required env var: CLERK_SECRET_KEY');
    }
    this.secretKey = secretKey;
    this.clerkClient = createClerkClient({ secretKey });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const verifiedToken = await verifyToken(token, {
        secretKey: this.secretKey,
      });
      const clerkUserId = verifiedToken.sub;

      let user = await this.authService.findUserByClerkId(clerkUserId);

      if (!user) {
        // Auto-provision: fetch user details from Clerk and create firm + user
        this.logger.log(`Auto-provisioning user ${clerkUserId}`);
        const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
        const email = clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkUserId}@unknown`;

        user = await this.authService.autoProvision(
          clerkUserId,
          email,
          clerkUser.firstName ?? undefined,
          clerkUser.lastName ?? undefined,
        );
      }

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' && token ? token : null;
  }
}
