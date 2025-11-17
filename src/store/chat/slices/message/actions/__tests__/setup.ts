import { vi } from 'vitest';

import { useChatStore } from '@/store/chat/store';

// Stub global fetch
vi.stubGlobal(
  'fetch',
  vi.fn(() => Promise.resolve(new Response('mock'))),
);

vi.mock('zustand/traditional');

// Mock services
vi.mock('@/services/message', () => ({
  messageService: {
    createMessage: vi.fn(() => Promise.resolve({ id: 'new-message-id', messages: [] })),
    getMessages: vi.fn(),
    removeAllMessages: vi.fn(() => Promise.resolve()),
    removeMessage: vi.fn(() => Promise.resolve({ messages: [], success: true })),
    removeMessages: vi.fn(() => Promise.resolve({ messages: [], success: true })),
    removeMessagesByAssistant: vi.fn(),
    updateMessage: vi.fn(() => Promise.resolve({ messages: [], success: true })),
    updateMessageError: vi.fn(),
    updateMessageMetadata: vi.fn(() => Promise.resolve({ messages: [], success: true })),
    updateMessagePluginError: vi.fn(() => Promise.resolve({ messages: [], success: true })),
    updateMessageRAG: vi.fn(() => Promise.resolve({ messages: [], success: true })),
  },
}));

vi.mock('@/services/topic', () => ({
  topicService: {
    createTopic: vi.fn(() => Promise.resolve()),
    removeTopic: vi.fn(() => Promise.resolve()),
  },
}));

export const realRefreshMessages = useChatStore.getState().refreshMessages;

// Default mock state
export const mockState = {
  activeId: 'session-id',
  activeTopicId: 'topic-id',
  internal_coreProcessMessage: vi.fn(),
  messages: [],
  refreshMessages: vi.fn(),
  refreshTopic: vi.fn(),
  saveToTopic: vi.fn(),
};
