import { act, renderHook, waitFor } from '@testing-library/react';
import { mutate } from 'swr';
import { Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { messageService } from '@/services/message';

import { useChatStore } from '../../../../store';
import './setup';
import { mockState, realRefreshMessages } from './setup';

beforeEach(() => {
  vi.mock('swr', async () => {
    const actual = await vi.importActual('swr');
    return {
      ...(actual as any),
      mutate: vi.fn(),
    };
  });
  vi.clearAllMocks();
  useChatStore.setState(mockState, false);
});

afterEach(() => {
  vi.resetAllMocks();
  process.env.NEXT_PUBLIC_BASE_PATH = undefined;
  vi.restoreAllMocks();
});

describe('MessageQueryAction', () => {
  describe('refreshMessages', () => {
    it('should refresh messages by calling mutate for both session and group types', async () => {
      useChatStore.setState({ refreshMessages: realRefreshMessages });

      const { result } = renderHook(() => useChatStore());
      const activeId = useChatStore.getState().activeId;
      const activeTopicId = useChatStore.getState().activeTopicId;

      await act(async () => {
        await result.current.refreshMessages();
      });

      expect(mutate).toHaveBeenCalledWith([
        'SWR_USE_FETCH_MESSAGES',
        activeId,
        activeTopicId,
        'session',
      ]);
      expect(mutate).toHaveBeenCalledWith([
        'SWR_USE_FETCH_MESSAGES',
        activeId,
        activeTopicId,
        'group',
      ]);
      expect(mutate).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during refreshing messages', async () => {
      useChatStore.setState({ refreshMessages: realRefreshMessages });
      const { result } = renderHook(() => useChatStore());

      (mutate as Mock).mockImplementation(() => {
        throw new Error('Mutate error');
      });

      await act(async () => {
        await expect(result.current.refreshMessages()).rejects.toThrow('Mutate error');
      });

      (mutate as Mock).mockReset();
    });
  });

  describe('useFetchMessages', () => {
    it('should fetch messages for given session and topic ids', async () => {
      const sessionId = 'session-id';
      const topicId = 'topic-id';
      const messages = [{ id: 'message-id', content: 'Hello' }];

      (messageService.getMessages as Mock).mockResolvedValue(messages);

      const { result } = renderHook(() =>
        useChatStore().useFetchMessages(true, sessionId, topicId),
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(messages);
      });
    });
  });
});
