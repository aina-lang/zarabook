import 'react-native-get-random-values';
import { install } from 'react-native-quick-crypto';
import { Buffer } from 'buffer';
import process from 'process';

// Install polyfills
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Polyfill for AbortSignal.prototype.throwIfAborted
if (typeof global.AbortSignal !== 'undefined' && typeof global.AbortSignal.prototype.throwIfAborted === 'undefined') {
  global.AbortSignal.prototype.throwIfAborted = function() {
    if (this.aborted) {
      throw this.reason;
    }
  };
}

// Polyfill for AbortSignal.timeout
if (typeof global.AbortSignal !== 'undefined' && typeof global.AbortSignal.timeout === 'undefined') {
  global.AbortSignal.timeout = function(ms: number) {
    const controller = new global.AbortController();
    setTimeout(() => controller.abort(new Error('The operation timed out.')), ms);
    return controller.signal;
  };
}

// Polyfill for AbortSignal.any
if (typeof global.AbortSignal !== 'undefined' && typeof global.AbortSignal.any === 'undefined') {
  global.AbortSignal.any = function(signals: AbortSignal[]) {
    const controller = new global.AbortController();
    
    const onAbort = (e: any) => {
      controller.abort(e.target.reason);
      for (const s of signals) {
        s.removeEventListener('abort', onAbort);
      }
    };

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }
    
    return controller.signal;
  };
}

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

if (typeof global.process === 'undefined') {
  global.process = process;
} else {
  try {
    const actualProcess = require('process');
    // Don't use Object.assign on global.process if it's already there and might be sealed
    if (global.process.env === undefined) {
      global.process.env = actualProcess.env;
    }
  } catch (e) {}
}

// Libp2p and other low-level deps often expect certain globals
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = ((fn: any, ...args: any[]) => setTimeout(fn, 0, ...args)) as any;
}

// TextEncoder/Decoder polyfills are usually provided by modern RN, but let's be safe
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// React Native does not have a comprehensive Event/EventTarget global by default
if (typeof global.Event === 'undefined' || typeof global.EventTarget === 'undefined') {
  require('event-target-polyfill');
}

if (typeof global.CustomEvent === 'undefined') {
  const BaseEvent = typeof global.Event === 'function' ? global.Event : class {};
  
  class CustomEvent extends BaseEvent {
    detail: any;
    constructor(type: string, options?: { detail?: any; bubbles?: boolean; cancelable?: boolean }) {
      super(type as any, options as any);
      this.detail = options?.detail;
    }
  }
  global.CustomEvent = CustomEvent as any;
}
