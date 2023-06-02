import { Promisable } from "type-fest"

import { isObject } from "@dassie/lib-type-utils"

import type { Actor } from "./actor"
import { forArrayElement, forArrayIndex } from "./internal/actor-arrays"
import { DisposableLifecycle } from "./internal/lifecycle"
import { Mapped } from "./mapped"
import type { Factory, Reactor, RunOptions, UseOptions } from "./reactor"
import type { ReadonlySignal } from "./signal"
import type { Listener, ReadonlyTopic } from "./topic"

export class ActorContext extends DisposableLifecycle {
  constructor(
    /**
     * Name of the actor.
     *
     * @remarks
     *
     * This is automatically derived from the function name.
     */
    name: string,

    /**
     * Full path of the actor.
     *
     * @remarks
     *
     * The actor path is generated by concatenating the name of the actor with the names of all parent actors.
     */
    readonly path: string,

    /**
     * A reference to the current reactor.
     *
     * @remarks
     *
     * If you want to pass something to an external component to allow that component to interact with the reactive system, you can use this reference.
     */
    readonly reactor: Reactor,

    /**
     * Wake function. If called, the actor will be cleaned up and re-run.
     */
    readonly wake: () => void
  ) {
    super(name)
  }

  /**
   * Read the current value from a signal and automatically re-run the actor if the value changes.
   *
   * @remarks
   *
   * The way this works is that the {@link wake} function is registered as a listener on the signal. This will cause the actor to be re-run when the signal changes.
   *
   * To read a value without tracking, use {@link use} to get a reference and call `read()` on it.
   *
   * @param signalFactory - Reference to the signal's factory function.
   * @param selector - Used to select only part of the value from a given signal. This can be useful to avoid re-running the actor if only an irrelevant portion of the value has changed.
   * @param comparator - By default, the reactor checks for strict equality (`===`) to determine if the value has changed. This can be overridden by passing a custom comparator function.
   * @returns The current value of the signal, narrowed by the selector.
   */
  get<TState>(signalFactory: Factory<ReadonlySignal<TState>>): TState
  get<TState, TSelection>(
    signalFactory: Factory<ReadonlySignal<TState>>,
    selector: (state: TState) => TSelection,
    comparator?: (oldValue: TSelection, newValue: TSelection) => boolean
  ): TSelection
  get<TState, TSelection>(
    signalFactory: Factory<ReadonlySignal<TState>>,
    selector: (state: TState) => TSelection = (a) =>
      // Based on the overloaded function signature, the selector parameter may be omitted iff TMessage equals TSelection.
      // Therefore this cast is safe.
      a as unknown as TSelection,
    comparator: (a: TSelection, b: TSelection) => boolean = (a, b) => a === b
  ) {
    const notify = this.wake

    const handleTopicMessage = (message: TState) => {
      const newValue = selector(message)
      if (!comparator(value, newValue)) {
        // Once we have detected a change we can stop listening because once the actor re-runs it will create a new listener anyways.
        signal.off(handleTopicMessage)
        notify()
      }
    }

    const signal = this.use(signalFactory)
    const value = selector(signal.read())
    signal.on(this, handleTopicMessage)

    return value
  }

  /**
   * Convenience method for extracting specific keys from a signal.
   *
   * @remarks
   *
   * This method works like {@link get} but will automatically create the correct selector and comparator for the given keys. The actor will be re-run if any of the values for any of the keys change by strict equality.
   *
   * @param signal - Reference to the signal that should be queried.
   * @param keys - Tuple of keys that should be extracted from the signal.
   * @returns A filtered version of the signal state containing only the requested keys.
   */
  getKeys<TState, TKeys extends keyof TState>(
    signal: Factory<ReadonlySignal<TState>>,
    keys: readonly TKeys[]
  ): Pick<TState, TKeys> {
    return this.get(
      signal,
      (state) => {
        const result = {} as Pick<TState, TKeys>
        for (const key of keys) {
          result[key] = state[key]
        }
        return result
      },
      (a, b) => {
        for (const key of keys) {
          if (a[key] !== b[key]) {
            return false
          }
        }
        return true
      }
    )
  }

  /**
   * Re-run this actor if a message is emitted on the given topic.
   *
   * @remarks
   *
   * Note that the actor will not necessarily re-run once per event. If multiple events are emitted on the topic before the actor has re-run, it will only re-run once.
   *
   * @param topic - Reference to the topic's factory function.
   */
  subscribe<TMessage>(topic: Factory<ReadonlyTopic<TMessage>>) {
    this.once(topic, this.wake)
  }

  /**
   * Like {@link ReadonlyTopic.on} but will automatically manage disposing the subscription when the current actor is disposed.
   *
   * @param topic - Reference to the topic, i.e. the message factory function.
   * @param listener - A function that will be called every time a message is emitted on the topic.
   */
  on<TMessage>(
    topic: Factory<ReadonlyTopic<TMessage>>,
    listener: Listener<TMessage>
  ) {
    this.use(topic).on(this, listener)
  }

  /**
   * Like {@link ReadonlyTopic.once} but will automatically manage disposing the subscription when the current actor is disposed.
   *
   * @param topic - Reference to the topic, i.e. the message factory function.
   * @param listener - A function that will be called every time a message is emitted on the topic.
   */
  once<TMessage>(
    topic: Factory<ReadonlyTopic<TMessage>>,
    listener: Listener<TMessage>
  ) {
    this.use(topic).once(this, listener)
  }

  /**
   * Create a JS interval that will be automatically cancelled when the current actor is disposed.
   */
  interval(
    callback: () => Promisable<void>,
    intervalInMilliseconds?: number | undefined
  ) {
    if (this.isDisposed) return

    const interval = setInterval(() => {
      try {
        const result = callback()

        if (
          isObject(result) &&
          "catch" in result &&
          typeof result["catch"] === "function"
        ) {
          result["catch"]((error: unknown) => {
            console.error("error in interval callback", {
              actor: this.name,
              path: this.path,
              error,
            })
          })
        }
      } catch (error) {
        console.error("error in interval callback", {
          actor: this.name,
          path: this.path,
          error,
        })
      }
    }, intervalInMilliseconds)
    this.onCleanup(() => clearInterval(interval))
  }

  /**
   * Create a JS timeout that will be automatically cancelled when the current actor is disposed.
   */
  timeout(
    callback: () => void,
    delayInMilliseconds?: number | undefined
  ): void {
    if (this.isDisposed) return

    const timer = setTimeout(() => {
      try {
        callback()
      } catch (error) {
        console.error("error in timeout callback", {
          actor: this.name,
          path: this.path,
          error,
        })
      }
    }, delayInMilliseconds)
    this.onCleanup(() => clearTimeout(timer))
  }

  /**
   * Fetch a context value.
   *
   * @remarks
   *
   * If the value is not found, it will be instantiated by calling the factory function.
   *
   * @param factory - Factory function corresponding to the desired value.
   * @returns - Return value of the factory function.
   */
  use<TReturn>(factory: Factory<TReturn>, options?: UseOptions | undefined) {
    return this.reactor.use(factory, options)
  }

  /**
   * Instantiate an actor as a child of the current actor.
   *
   * @remarks
   *
   * When created using `run`, the actor will inherit the current actor's lifecycle, i.e. it will be disposed when the current actor is disposed.
   *
   * @param factory - Factory function of the actor to be instantiated.
   * @param properties - Properties to be passed to the actor behavior function as the second parameter.
   * @returns - Return value of the first invocation of the actor.
   */
  run<TReturn>(factory: Factory<Actor<TReturn>>): Actor<TReturn>
  run<TReturn, TProperties>(
    factory: Factory<Actor<TReturn, TProperties>>,
    properties: TProperties,
    options?: RunOptions | undefined
  ): Actor<TReturn, TProperties>
  run<TReturn, TProperties>(
    factory: Factory<Actor<TReturn, TProperties>>,
    properties?: TProperties | undefined,
    options?: RunOptions | undefined
  ) {
    return this.reactor.run(factory, properties!, {
      parentLifecycleScope: options?.parentLifecycleScope ?? this,
      pathPrefix: `${this.path}.`,
      ...options,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runMap(factory: Factory<Mapped<unknown, Actor<any>>>): void {
    const mapped = this.use(factory)
    for (const [, actor, mapLifecycle] of mapped) {
      const actorLifecycle = new DisposableLifecycle("")
      actorLifecycle.attachToParent(mapLifecycle)
      actorLifecycle.attachToParent(this)
      this.run(() => actor, undefined, { parentLifecycleScope: actorLifecycle })
    }

    mapped.additions.on(this, ([, actor, mapLifecycle]) => {
      const actorLifecycle = new DisposableLifecycle("")
      actorLifecycle.attachToParent(mapLifecycle)
      actorLifecycle.attachToParent(this)
      this.run(() => actor, undefined, { parentLifecycleScope: actorLifecycle })
    })
  }

  /**
   * Run an actor for each element of an array signal. When the array value changes, only the actors corresponding to changed elements will be re-run.
   */
  for<TElement, TReturn>(
    arraySignalFactory: Factory<ReadonlySignal<readonly TElement[]>>,
    actorFactory: Factory<Actor<TReturn, TElement>>
  ) {
    return forArrayElement(this, arraySignalFactory, actorFactory, this.name)
  }

  /**
   * Like {@link for} but compares elements based on their index in the array. Also passes the index to the actor.
   */
  forIndex<TElement, TReturn>(
    arraySignalFactory: Factory<ReadonlySignal<readonly TElement[]>>,
    actorFactory: Factory<
      Actor<TReturn, readonly [element: TElement, index: number]>
    >
  ) {
    return forArrayIndex(this, arraySignalFactory, actorFactory, this.name)
  }
}
