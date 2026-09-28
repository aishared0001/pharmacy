import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  init: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,

  init: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({ session });
    if (session) await get().refreshProfile();
    set({ initializing: false });

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      set({ session: newSession });
      if (newSession) {
        await get().refreshProfile();
      } else {
        set({ profile: null });
      }
    });
  },

  refreshProfile: async () => {
    const session = get().session ?? (await supabase.auth.getSession()).data.session;
    if (!session) {
      set({ profile: null });
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    set({ profile: (data as Profile) ?? null });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
