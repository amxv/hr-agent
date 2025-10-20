"use client";
import {
  AbstractChat,
  type ChatInit,
  type ChatState,
  type ChatStatus,
  type UIMessage,
} from "ai";
import { throttle } from "@/lib/stores/throttle";
import type { BaseChatStoreState, createBaseStore } from "./chat-store-base";

function subscribeToSlice<S, T>(
  store: {
    getState: () => S;
    subscribe: (listener: (state: S, prev: S) => void) => () => void;
  },
  selector: (s: S) => T,
  onChange: (next: T, prev: T) => void,
  isEqual: (a: T, b: T) => boolean = Object.is
) {
  let prevSelected = selector(store.getState());
  return store.subscribe((state) => {
    const nextSelected = selector(state);
    if (!isEqual(prevSelected, nextSelected)) {
      const prev = prevSelected;
      prevSelected = nextSelected;
      onChange(nextSelected, prev);
    }
  });
}

// Chat state implementation that bridges Zustand to ChatState interface
export class ZustandChatState<UI_MESSAGE extends UIMessage>
  implements ChatState<UI_MESSAGE>
{
  private readonly store: ReturnType<typeof createBaseStore<UI_MESSAGE>>;
  private readonly messagesCallbacks = new Set<() => void>();
  private readonly statusCallbacks = new Set<() => void>();
  private readonly errorCallbacks = new Set<() => void>();

  constructor(store: ReturnType<typeof createBaseStore<UI_MESSAGE>>) {
    this.store = store;

    subscribeToSlice<BaseChatStoreState<UI_MESSAGE>, UI_MESSAGE[]>(
      this.store,
      (s) => s._throttledMessages || s.messages,
      () => this.messagesCallbacks.forEach((cb) => cb())
    );
    subscribeToSlice<BaseChatStoreState<UI_MESSAGE>, ChatStatus>(
      this.store,
      (s) => s.status,
      () => this.statusCallbacks.forEach((cb) => cb())
    );
    subscribeToSlice<BaseChatStoreState<UI_MESSAGE>, Error | undefined>(
      this.store,
      (s) => s.error,
      () => this.errorCallbacks.forEach((cb) => cb())
    );
  }

  get messages(): UI_MESSAGE[] {
    return this.store.getState().messages;
  }
  set messages(newMessages: UI_MESSAGE[]) {
    this.store.getState().setMessages(newMessages);
  }
  get status(): ChatStatus {
    return this.store.getState().status;
  }
  set status(newStatus: ChatStatus) {
    this.store.getState().setStatus(newStatus);
  }
  get error(): Error | undefined {
    return this.store.getState().error;
  }
  set error(newError: Error | undefined) {
    this.store.getState().setError(newError);
  }
  pushMessage = (message: UI_MESSAGE) => {
    this.store.getState().pushMessage(message);
  };
  popMessage = () => {
    this.store.getState().popMessage();
  };
  replaceMessage = (index: number, message: UI_MESSAGE) => {
    this.store.getState().replaceMessage(index, message);
  };
  snapshot = <T,>(value: T): T => structuredClone(value);

  "~registerMessagesCallback" = (
    onChange: () => void,
    throttleWaitMs?: number
  ): (() => void) => {
    const callback = throttleWaitMs
      ? throttle(onChange, throttleWaitMs)
      : onChange;
    this.messagesCallbacks.add(callback);
    return () => {
      this.messagesCallbacks.delete(callback);
    };
  };
  "~registerStatusCallback" = (onChange: () => void): (() => void) => {
    this.statusCallbacks.add(onChange);
    return () => {
      this.statusCallbacks.delete(onChange);
    };
  };
  "~registerErrorCallback" = (onChange: () => void): (() => void) => {
    this.errorCallbacks.add(onChange);
    return () => {
      this.errorCallbacks.delete(onChange);
    };
  };
  get storeInstance() {
    return this.store;
  }
}

export class ZustandChat<
  UI_MESSAGE extends UIMessage,
> extends AbstractChat<UI_MESSAGE> {
  private readonly zustandState: ZustandChatState<UI_MESSAGE>;
  public store: ReturnType<typeof createBaseStore<UI_MESSAGE>>;

  constructor({
    messages,
    state,
    id,
    ...init
  }: ChatInit<UI_MESSAGE> & {
    state: ZustandChatState<UI_MESSAGE>;
    id?: string;
  }) {
    super({ ...init, id, state });
    this.zustandState = state;
    this.store = state.storeInstance;
  }

  "~registerMessagesCallback" = (
    onChange: () => void,
    throttleWaitMs?: number
  ): (() => void) =>
    this.zustandState["~registerMessagesCallback"](onChange, throttleWaitMs);
  "~registerStatusCallback" = (onChange: () => void): (() => void) =>
    this.zustandState["~registerStatusCallback"](onChange);
  "~registerErrorCallback" = (onChange: () => void): (() => void) =>
    this.zustandState["~registerErrorCallback"](onChange);
}
