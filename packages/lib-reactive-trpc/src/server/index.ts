import { type Observable, observable } from "@trpc/server/observable"

import {
  Action,
  ActorContext,
  type Factory,
  InferChanges,
  type Reactor,
  ReadonlySignal,
  type ReadonlyTopic,
  Store,
} from "@dassie/lib-reactive"

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ReactiveContext = { reactor: Reactor }

export const subscribeToTopic = <TMessage>(
  sig: ActorContext,
  topicFactory: Factory<ReadonlyTopic<TMessage>>
): Observable<TMessage, unknown> => {
  return observable<TMessage>((emit) => {
    const topic = sig.use(topicFactory)
    const listener = (message: TMessage) => {
      emit.next(message)
    }
    topic.on(sig, listener)
    return () => {
      topic.off(listener)
    }
  })
}

export const subscribeToSignal = <TValue>(
  sig: ActorContext,
  signalFactory: Factory<ReadonlySignal<TValue>>
): Observable<TValue, unknown> => {
  return observable<TValue>((emit) => {
    const signal = sig.use(signalFactory)
    const listener = (value: TValue) => {
      emit.next(value)
    }
    signal.on(sig, listener)
    listener(signal.read())
    return () => {
      signal.off(listener)
    }
  })
}

export type StoreMessage<
  TState,
  TActions extends Record<string, Action<TState>>
> =
  | { type: "initial"; value: TState }
  | { type: "change"; value: InferChanges<TActions> }

export const subscribeToStore = <
  TState,
  TActions extends Record<string, Action<TState>>
>(
  sig: ActorContext,
  storeFactory: Factory<Store<TState, TActions>>
): Observable<StoreMessage<TState, TActions>, never> => {
  return observable<StoreMessage<TState, TActions>, never>((emit) => {
    const store = sig.use(storeFactory)
    const listener = (change: InferChanges<TActions>) => {
      emit.next({ type: "change", value: change })
    }
    store.changes.on(sig, listener)

    emit.next({ type: "initial", value: store.read() })
  })
}
