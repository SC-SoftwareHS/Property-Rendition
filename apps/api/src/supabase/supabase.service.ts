import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ??
      this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!url || !key) {
      throw new Error(
        'Missing required Supabase env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)',
      );
    }

    this.client = createClient(url, key);
  }

  getClient() {
    return this.client;
  }
}
