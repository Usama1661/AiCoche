import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_ASSISTANT_TTS_VOICE,
  type AssistantTtsVoiceId,
  normalizeAssistantTtsVoice,
} from '@/src/lib/assistantTtsVoice';

type AssistantVoiceState = {
  voiceId: AssistantTtsVoiceId;
  setVoiceId: (id: AssistantTtsVoiceId) => void;
};

export const useAssistantVoiceStore = create<AssistantVoiceState>()(
  persist(
    (set) => ({
      voiceId: DEFAULT_ASSISTANT_TTS_VOICE,
      setVoiceId: (id) => set({ voiceId: normalizeAssistantTtsVoice(id) }),
    }),
    {
      name: 'aicoche-assistant-tts-voice',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ voiceId: s.voiceId }),
    }
  )
);

export { DEFAULT_ASSISTANT_TTS_VOICE, normalizeAssistantTtsVoice };
export type { AssistantTtsVoiceId };
