import { TraceEventType, UIChatMessage } from '@lobechat/types';
import * as lobeUIModules from '@lobehub/ui';
import { act, renderHook } from '@testing-library/react';
import { Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { messageService } from '@/services/message';
import { topicService } from '@/services/topic';
import { messageMapKey } from '@/store/chat/utils/messageMapKey';

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

describe('MessagePublicApiAction', () => {
  describe('addAIMessage', () => {
    it('should return early if activeId is undefined', async () => {
      useChatStore.setState({ activeId: undefined });
      const { result } = renderHook(() => useChatStore());
      const updateMessageInputSpy = vi.spyOn(result.current, 'updateMessageInput');

      await act(async () => {
        await result.current.addAIMessage();
      });

      expect(messageService.createMessage).not.toHaveBeenCalled();
      expect(updateMessageInputSpy).not.toHaveBeenCalled();
    });

    it('should call optimisticCreateMessage with correct parameters', async () => {
      const inputMessage = 'Test input message';
      useChatStore.setState({ inputMessage });
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.addAIMessage();
      });

      expect(messageService.createMessage).toHaveBeenCalledWith({
        content: inputMessage,
        role: 'assistant',
        sessionId: mockState.activeId,
        topicId: mockState.activeTopicId,
      });
    });

    it('should call updateMessageInput with empty string', async () => {
      const { result } = renderHook(() => useChatStore());
      const updateMessageInputSpy = vi.spyOn(result.current, 'updateMessageInput');
      await act(async () => {
        await result.current.addAIMessage();
      });

      expect(updateMessageInputSpy).toHaveBeenCalledWith('');
    });
  });

  describe('addUserMessage', () => {
    it('should return early if activeId is undefined', async () => {
      useChatStore.setState({ activeId: undefined });
      const { result } = renderHook(() => useChatStore());
      const updateMessageInputSpy = vi.spyOn(result.current, 'updateMessageInput');

      await act(async () => {
        await result.current.addUserMessage({ message: 'test message' });
      });

      expect(messageService.createMessage).not.toHaveBeenCalled();
      expect(updateMessageInputSpy).not.toHaveBeenCalled();
    });

    it('should call optimisticCreateMessage with correct parameters', async () => {
      const message = 'Test user message';
      const fileList = ['file-id-1', 'file-id-2'];
      useChatStore.setState({
        activeId: mockState.activeId,
        activeTopicId: mockState.activeTopicId,
      });
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.addUserMessage({ message, fileList });
      });

      expect(messageService.createMessage).toHaveBeenCalledWith({
        content: message,
        files: fileList,
        role: 'user',
        sessionId: mockState.activeId,
        topicId: mockState.activeTopicId,
        threadId: undefined,
      });
    });

    it('should call optimisticCreateMessage with threadId when activeThreadId is set', async () => {
      const message = 'Test user message';
      const activeThreadId = 'thread-123';
      useChatStore.setState({
        activeId: mockState.activeId,
        activeTopicId: mockState.activeTopicId,
        activeThreadId,
      });
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.addUserMessage({ message });
      });

      expect(messageService.createMessage).toHaveBeenCalledWith({
        content: message,
        files: undefined,
        role: 'user',
        sessionId: mockState.activeId,
        topicId: mockState.activeTopicId,
        threadId: activeThreadId,
      });
    });

    it('should call updateMessageInput with empty string', async () => {
      const { result } = renderHook(() => useChatStore());
      const updateMessageInputSpy = vi.spyOn(result.current, 'updateMessageInput');

      await act(async () => {
        await result.current.addUserMessage({ message: 'test' });
      });

      expect(updateMessageInputSpy).toHaveBeenCalledWith('');
    });

    it('should handle message without fileList', async () => {
      const message = 'Test user message without files';
      useChatStore.setState({ activeId: mockState.activeId });
      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        await result.current.addUserMessage({ message });
      });

      expect(messageService.createMessage).toHaveBeenCalledWith({
        content: message,
        files: undefined,
        role: 'user',
        sessionId: mockState.activeId,
        topicId: mockState.activeTopicId,
        threadId: undefined,
      });
    });
  });

  describe('deleteMessage', () => {
    it('deleteMessage should remove a message by id', async () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = 'message-id';
      const deleteSpy = vi.spyOn(result.current, 'deleteMessage');
      const mockMessages = [{ id: 'other-message' }] as any;

      // Mock the service to return messages
      (messageService.removeMessages as Mock).mockResolvedValue({
        success: true,
        messages: mockMessages,
      });

      const replaceMessagesSpy = vi.spyOn(result.current, 'replaceMessages');

      act(() => {
        useChatStore.setState({
          activeId: 'session-id',
          activeTopicId: undefined,
          messagesMap: {
            [messageMapKey('session-id')]: [{ id: messageId } as UIChatMessage],
          },
        });
      });
      await act(async () => {
        await result.current.deleteMessage(messageId);
      });

      expect(deleteSpy).toHaveBeenCalledWith(messageId);
      expect(replaceMessagesSpy).toHaveBeenCalledWith(mockMessages, {
        sessionId: 'session-id',
        topicId: undefined,
      });
    });

    it('deleteMessage should remove the message only', async () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = 'message-id';
      const removeMessagesSpy = vi.spyOn(messageService, 'removeMessages');
      const mockMessages = [
        { id: '2', tool_call_id: 'tool1', role: 'tool' },
        { id: '3', tool_call_id: 'tool2', role: 'tool' },
      ] as any;

      // Mock the service to return remaining messages (orphaned tool messages)
      (messageService.removeMessages as Mock).mockResolvedValue({
        success: true,
        messages: mockMessages,
      });

      const replaceMessagesSpy = vi.spyOn(result.current, 'replaceMessages');

      act(() => {
        useChatStore.setState({
          activeId: 'session-id',
          activeTopicId: undefined,
          messagesMap: {
            [messageMapKey('session-id')]: [
              { id: messageId, tools: [{ id: 'tool1' }, { id: 'tool2' }] } as UIChatMessage,
              { id: '2', tool_call_id: 'tool1', role: 'tool' } as UIChatMessage,
              { id: '3', tool_call_id: 'tool2', role: 'tool' } as UIChatMessage,
            ],
          },
        });
      });
      await act(async () => {
        await result.current.deleteMessage(messageId);
      });

      // Only the message itself should be deleted, tool messages remain as orphaned
      expect(removeMessagesSpy).toHaveBeenCalledWith([messageId], {
        sessionId: 'session-id',
        topicId: undefined,
      });
      expect(replaceMessagesSpy).toHaveBeenCalledWith(mockMessages, {
        sessionId: 'session-id',
        topicId: undefined,
      });
    });

    it('deleteMessage should remove assistantGroup message with all children', async () => {
      const { result } = renderHook(() => useChatStore());
      const groupMessageId = 'group-message-id';
      const removeMessagesSpy = vi.spyOn(messageService, 'removeMessages');
      const mockMessages = [{ id: 'remaining-message' }] as any;

      // Mock the service to return messages
      (messageService.removeMessages as Mock).mockResolvedValue({
        success: true,
        messages: mockMessages,
      });

      const replaceMessagesSpy = vi.spyOn(result.current, 'replaceMessages');

      act(() => {
        useChatStore.setState({
          activeId: 'session-id',
          activeTopicId: undefined,
          messagesMap: {
            [messageMapKey('session-id')]: [
              {
                id: groupMessageId,
                role: 'assistantGroup',
                content: '',
                children: [
                  {
                    id: 'child-1',
                    content: 'Child 1',
                  },
                  {
                    id: 'child-2',
                    content: 'Child 2',
                  },
                ],
              } as UIChatMessage,
              { id: 'other-message', role: 'user', content: 'Other' } as UIChatMessage,
            ],
          },
        });
      });
      await act(async () => {
        await result.current.deleteMessage(groupMessageId);
      });

      expect(removeMessagesSpy).toHaveBeenCalledWith([groupMessageId, 'child-1', 'child-2'], {
        sessionId: 'session-id',
        topicId: undefined,
      });
      expect(replaceMessagesSpy).toHaveBeenCalledWith(mockMessages, {
        sessionId: 'session-id',
        topicId: undefined,
      });
    });

    it('deleteMessage should remove group message with children that have tool calls', async () => {
      const { result } = renderHook(() => useChatStore());
      const groupMessageId = 'group-message-id';
      const removeMessagesSpy = vi.spyOn(messageService, 'removeMessages');
      const mockMessages = [{ id: 'remaining-message' }] as any;

      // Mock the service to return messages
      (messageService.removeMessages as Mock).mockResolvedValue({
        success: true,
        messages: mockMessages,
      });

      const replaceMessagesSpy = vi.spyOn(result.current, 'replaceMessages');

      act(() => {
        useChatStore.setState({
          activeId: 'session-id',
          activeTopicId: undefined,
          messagesMap: {
            [messageMapKey('session-id')]: [
              {
                id: groupMessageId,
                role: 'assistantGroup',
                content: '',
                children: [
                  {
                    id: 'child-1',
                    content: 'Child with tools',
                    tools: [
                      {
                        id: 'tool1',
                        result: {
                          id: 'tool-result-1',
                          content: 'Tool result',
                        },
                      },
                    ],
                  },
                  {
                    id: 'child-2',
                    content: 'Child 2',
                  },
                ],
              } as UIChatMessage,
              { id: 'other-message', role: 'user', content: 'Other' } as UIChatMessage,
            ],
          },
        });
      });
      await act(async () => {
        await result.current.deleteMessage(groupMessageId);
      });

      // Should delete assistantGroup message + all children + tool results of children
      expect(removeMessagesSpy).toHaveBeenCalledWith(
        [groupMessageId, 'child-1', 'child-2', 'tool-result-1'],
        {
          sessionId: 'session-id',
          topicId: undefined,
        },
      );
      expect(replaceMessagesSpy).toHaveBeenCalledWith(mockMessages, {
        sessionId: 'session-id',
        topicId: undefined,
      });
    });
  });

  describe('copyMessage', () => {
    it('should call copyToClipboard with correct content', async () => {
      const messageId = 'message-id';
      const content = 'Test content';
      const { result } = renderHook(() => useChatStore());
      const copyToClipboardSpy = vi.spyOn(lobeUIModules, 'copyToClipboard');

      await act(async () => {
        await result.current.copyMessage(messageId, content);
      });

      expect(copyToClipboardSpy).toHaveBeenCalledWith(content);
    });

    it('should call internal_traceMessage with correct parameters', async () => {
      const messageId = 'message-id';
      const content = 'Test content';
      const { result } = renderHook(() => useChatStore());
      const internal_traceMessageSpy = vi.spyOn(result.current, 'internal_traceMessage');

      await act(async () => {
        await result.current.copyMessage(messageId, content);
      });

      expect(internal_traceMessageSpy).toHaveBeenCalledWith(messageId, {
        eventType: TraceEventType.CopyMessage,
      });
    });
  });

  describe('deleteToolMessage', () => {
    it('deleteMessage should remove a message by id', async () => {
      const messageId = 'message-id';
      const sessionId = 'session-id';
      const topicId = null;

      const rawMessages = [
        {
          id: messageId,
          role: 'assistant',
          tools: [{ id: 'tool1' }, { id: 'tool2' }],
        } as UIChatMessage,
        {
          id: '2',
          parentId: messageId,
          tool_call_id: 'tool1',
          role: 'tool',
        } as UIChatMessage,
        { id: '3', tool_call_id: 'tool2', role: 'tool' } as UIChatMessage,
      ];

      const key = messageMapKey(sessionId, topicId);
      act(() => {
        useChatStore.setState({
          activeId: sessionId,
          activeTopicId: topicId as unknown as string,
          dbMessagesMap: {
            [key]: rawMessages,
          },
          messagesMap: {
            [key]: rawMessages,
          },
        });
      });

      const { result } = renderHook(() => useChatStore());

      // Mock removeMessage to return the remaining messages after deletion
      // Note: tool1 is also removed from the assistant message's tools to reflect the concurrent update
      const remainingAfterDelete = [
        {
          id: messageId,
          role: 'assistant',
          tools: [{ id: 'tool2' }],
        } as UIChatMessage,
        { id: '3', tool_call_id: 'tool2', role: 'tool' } as UIChatMessage,
      ];

      // Mock updateMessage to return updated messages after tool removal
      const updatedMessages = [
        {
          id: messageId,
          role: 'assistant',
          tools: [{ id: 'tool2' }],
        } as UIChatMessage,
        { id: '3', tool_call_id: 'tool2', role: 'tool' } as UIChatMessage,
      ];

      const refreshToolsSpy = vi.spyOn(result.current, 'internal_refreshToUpdateMessageTools');
      const updateMessageSpy = vi
        .spyOn(messageService, 'updateMessage')
        .mockResolvedValue({ success: true, messages: updatedMessages });
      const removeMessageSpy = vi
        .spyOn(messageService, 'removeMessage')
        .mockResolvedValue({ success: true, messages: remainingAfterDelete });

      await act(async () => {
        await result.current.deleteToolMessage('2');
      });

      expect(removeMessageSpy).toHaveBeenCalled();
      expect(refreshToolsSpy).toHaveBeenCalledWith('message-id', undefined);
      expect(updateMessageSpy).toHaveBeenCalledWith(
        'message-id',
        {
          tools: [{ id: 'tool2' }],
        },
        {
          sessionId,
          topicId,
        },
      );
    });
  });

  describe('clearAllMessages', () => {
    it('clearAllMessages should remove all messages', async () => {
      const { result } = renderHook(() => useChatStore());
      const clearAllSpy = vi.spyOn(result.current, 'clearAllMessages');
      const replaceMessagesSpy = vi.spyOn(result.current, 'replaceMessages');

      await act(async () => {
        await result.current.clearAllMessages();
      });

      expect(clearAllSpy).toHaveBeenCalled();
      expect(replaceMessagesSpy).toHaveBeenCalledWith([]);
    });
  });

  describe('updateMessageInput', () => {
    it('updateMessageInput should update the input message state', () => {
      const { result } = renderHook(() => useChatStore());
      const newInputMessage = 'Updated message';
      act(() => {
        result.current.updateMessageInput(newInputMessage);
      });

      expect(result.current.inputMessage).toEqual(newInputMessage);
    });

    it('should not update state if message is the same as current inputMessage', () => {
      const inputMessage = 'Test input message';
      useChatStore.setState({ inputMessage });
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.updateMessageInput(inputMessage);
      });

      expect(result.current.inputMessage).toBe(inputMessage);
    });
  });

  describe('clearMessage', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      useChatStore.setState(mockState, false);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('clearMessage should remove messages from the active session and topic', async () => {
      const { result } = renderHook(() => useChatStore());
      const clearSpy = vi.spyOn(result.current, 'clearMessage');
      const switchTopicSpy = vi.spyOn(result.current, 'switchTopic');

      await act(async () => {
        await result.current.clearMessage();
      });

      expect(clearSpy).toHaveBeenCalled();
      expect(result.current.refreshMessages).toHaveBeenCalled();
      expect(result.current.refreshTopic).toHaveBeenCalled();
      expect(switchTopicSpy).toHaveBeenCalled();
    });

    it('should remove messages from the active session and topic, then refresh topics and messages', async () => {
      const { result } = renderHook(() => useChatStore());
      const switchTopicSpy = vi.spyOn(result.current, 'switchTopic');
      const refreshTopicSpy = vi.spyOn(result.current, 'refreshTopic');

      await act(async () => {
        await result.current.clearMessage();
      });

      expect(mockState.refreshMessages).toHaveBeenCalled();
      expect(refreshTopicSpy).toHaveBeenCalled();
      expect(switchTopicSpy).toHaveBeenCalled();

      expect(useChatStore.getState().activeTopicId).toBeNull();
    });

    it('should call removeTopic if there is an activeTopicId', async () => {
      const { result } = renderHook(() => useChatStore());
      const switchTopicSpy = vi.spyOn(result.current, 'switchTopic');
      const refreshTopicSpy = vi.spyOn(result.current, 'refreshTopic');

      await act(async () => {
        await result.current.clearMessage();
      });

      expect(mockState.activeTopicId).not.toBeUndefined();
      expect(refreshTopicSpy).toHaveBeenCalled();
      expect(mockState.refreshMessages).toHaveBeenCalled();
      expect(topicService.removeTopic).toHaveBeenCalledWith(mockState.activeTopicId);
      expect(switchTopicSpy).toHaveBeenCalled();
    });
  });

  describe('toggleMessageEditing', () => {
    it('should add message id to messageEditingIds when editing is true', () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = 'message-id';

      act(() => {
        result.current.toggleMessageEditing(messageId, true);
      });

      expect(result.current.messageEditingIds).toContain(messageId);
    });

    it('should remove message id from messageEditingIds when editing is false', () => {
      const { result } = renderHook(() => useChatStore());
      const messageId = 'abc';

      act(() => {
        result.current.toggleMessageEditing(messageId, true);
        result.current.toggleMessageEditing(messageId, false);
      });

      expect(result.current.messageEditingIds).not.toContain(messageId);
    });

    it('should update messageEditingIds correctly when enabling editing', () => {
      const messageId = 'message-id';
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.toggleMessageEditing(messageId, true);
      });

      expect(result.current.messageEditingIds).toContain(messageId);
    });

    it('should update messageEditingIds correctly when disabling editing', () => {
      const messageId = 'message-id';
      useChatStore.setState({ messageEditingIds: [messageId] });
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.toggleMessageEditing(messageId, false);
      });

      expect(result.current.messageEditingIds).not.toContain(messageId);
    });
  });

  describe('modifyMessageContent', () => {
    it('should call internal_traceMessage with correct parameters before updating', async () => {
      const messageId = 'message-id';
      const content = 'Updated content';
      const { result } = renderHook(() => useChatStore());

      const spy = vi.spyOn(result.current, 'internal_traceMessage');
      await act(async () => {
        await result.current.modifyMessageContent(messageId, content);
      });

      expect(spy).toHaveBeenCalledWith(messageId, {
        eventType: TraceEventType.ModifyMessage,
        nextContent: content,
      });
    });

    it('should call optimisticUpdateMessageContent with correct parameters', async () => {
      const messageId = 'message-id';
      const content = 'Updated content';
      const { result } = renderHook(() => useChatStore());

      const spy = vi.spyOn(result.current, 'internal_traceMessage');

      await act(async () => {
        await result.current.modifyMessageContent(messageId, content);
      });

      expect(spy).toHaveBeenCalledWith(messageId, {
        eventType: 'Modify Message',
        nextContent: 'Updated content',
      });
    });
  });
});
