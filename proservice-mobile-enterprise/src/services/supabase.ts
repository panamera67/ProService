import { createClient, SupabaseClient, SupabaseRealtimePayload } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

type EnvSource = Record<string, string | undefined>;
type EnvContainer = {
  process?: { env?: EnvSource };
  __ENV__?: EnvSource;
  env?: EnvSource;
};

const globalEnv: EnvContainer =
  (typeof globalThis !== 'undefined' ? (globalThis as EnvContainer) : {}) ?? {};

const envSources: EnvSource[] = [
  globalEnv.process?.env ?? {},
  globalEnv.__ENV__ ?? {},
  globalEnv.env ?? {}
];

const resolveEnvVar = (...keys: string[]): string => {
  for (const key of keys) {
    for (const source of envSources) {
      const value = source?.[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
  }

  throw new Error(
    `Missing environment variable. Tried keys: ${keys.join(', ')}. Ensure your mobile app exposes these values at build time.`
  );
};

const supabaseUrl = resolveEnvVar('EXPO_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
const supabaseAnonKey = resolveEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  },
  realtime: {
    params: {
      eventsPerSecond: 5
    }
  }
});

export interface Project {
  id: string;
  name: string;
  summary?: string | null;
  goal_amount?: number | null;
  collected_amount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  thumbnail_url?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export const getProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from<Project>('solar_projects')
    .select('*')
    .order('updated_at', { ascending: false, nullsFirst: false });

  if (error) {
    const typedError = new Error(error.message);
    (typedError as Error & { type?: string }).type = 'network';
    throw typedError;
  }

  return data ?? [];
};

export const subscribeToProjects = (
  callback: (payload: SupabaseRealtimePayload<Project>) => void
): RealtimeChannel => {
  const channel = supabase
    .channel('solar-projects-feed')
    .on<SupabaseRealtimePayload<Project>>(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'solar_projects' },
      (payload) => {
        try {
          callback(payload);
        } catch (error) {
          console.error('[subscribeToProjects] Listener error:', error);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime subscription established for solar_projects');
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('⚠️ Realtime subscription error for solar_projects');
      }
    });

  return channel;
};

export interface DonationPayload {
  projectId: string;
  amount: number;
  userEmail: string;
}

export interface DonationConfirmation {
  paymentIntentId: string;
}
