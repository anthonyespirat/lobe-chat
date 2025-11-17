import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { messageService } from '@/services/message';

import { useChatStore } from '../../../../store';
import './setup';
import { mockState } from './setup';

beforeEach(() => {
  vi.clearAllMocks();
  useChatStore.setState(mockState, false);
});

afterEach(() => {
  process.env.NEXT_PUBLIC_BASE_PATH = undefined;
  vi.restoreAllMocks();
});

describe('MessageOptimisticUpdateAction', () => {
  describe('optimisticUpdateMessageContent', () => {
    it('should call messageService.updateMessage with correct parameters', async () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = 'message-id';
      const newContent = 'Updated content';

      const spy = vi.spyOn(messageService, 'updateMessage');
      await act(async () => {
        await result.current.optimisticUpdateMessageContent(messageId, newContent);
      });

      expect(spy).toHaveBeenCalledWith(
        messageId,
        { content: newContent },
        { sessionId: 'session-id', topicId: 'topic-id' },
      );
    });

    it('should dispatch message update action', async () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = 'message-id';
      const newContent = 'Updated content';
      const internal_dispatchMessageSpy = vi.spyOn(result.current, 'internal_dispatchMessage');

      await act(async () => {
        await result.current.optimisticUpdateMessageContent(messageId, newContent);
      });

      expect(internal_dispatchMessageSpy).toHaveBeenCalledWith({
        id: messageId,
        type: 'updateMessage',
        value: { content: newContent },
      });
    });

    it('should replace messages after updating content', async () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = 'message-id';
      const newContent = 'Updated content';
      const replaceMessagesSpy = vi.spyOn(result.current, 'replaceMessages');

      await act(async () => {
        await result.current.optimisticUpdateMessageContent(messageId, newContent);
      });

      expect(replaceMessagesSpy).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          sessionId: 'session-id',
          topicId: 'topic-id',
        }),
      );
    });
  });

  describe('OptimisticUpdateContext isolation', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('optimisticUpdateMessageContent should use context sessionId/topicId', async () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = 'message-id';
      const content = 'Updated content';
      const contextSessionId = 'context-session-id';
      const contextTopicId = 'context-topic-id';

      const updateMessageSpy = vi.spyOn(messageService, 'updateMessage');

      await act(async () => {
        await result.current.optimisticUpdateMessageContent(messageId, content, undefined, {
          sessionId: contextSessionId,
          topicId: contextTopicId,
        });
      });

      expect(updateMessageSpy).toHaveBeenCalledWith(
        messageId,
        { content, tools: undefined },
        { sessionId: contextSessionId, topicId: contextTopicId },
      );
    });

    it('optimisticUpdateMessageError should use context sessionId/topicId', async () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = 'message-id';
      const error = { message: 'Error occurred', type: 'error' as any };
      const contextSessionId = 'context-session';
      const contextTopicId = 'context-topic';

      const updateMessageSpy = vi.spyOn(messageService, 'updateMessage');

      await act(async () => {
        await result.current.optimisticUpdateMessageError(messageId, error, {
          sessionId: contextSessionId,
          topicId: contextTopicId,
        });
      });

      expect(updateMessageSpy).toHaveBeenCalledWith(
        messageId,
        { error },
        { sessionId: contextSessionId, topicId: contextTopicId },
      );
    });

    it('optimisticDeleteMessage should use context sessionId/topicId', async () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = 'message-id';
      const contextSessionId = 'context-session';
      const contextTopicId = 'context-topic';

      const removeMessageSpy = vi.spyOn(messageService, 'removeMessage');

      await act(async () => {
        await result.current.optimisticDeleteMessage(messageId, {
          sessionId: contextSessionId,
          topicId: contextTopicId,
        });
      });

      expect(removeMessageSpy).toHaveBeenCalledWith(messageId, {
        sessionId: contextSessionId,
        topicId: contextTopicId,
      });
    });

    it('optimisticDeleteMessages should use context sessionId/topicId', async () => {
      const { result } = renderHook(() => useChatStore());
      const ids = ['id-1', 'id-2'];
      const contextSessionId = 'context-session';
      const contextTopicId = 'context-topic';

      const removeMessagesSpy = vi.spyOn(messageService, 'removeMessages');

      await act(async () => {
        await result.current.optimisticDeleteMessages(ids, {
          sessionId: contextSessionId,
          topicId: contextTopicId,
        });
      });

      expect(removeMessagesSpy).toHaveBeenCalledWith(ids, {
        sessionId: contextSessionId,
        topicId: contextTopicId,
      });
    });
  });
});
