// ==UserScript==
// @name         Code Helpers: GitHub PR list — Accepted PRs
// @namespace    https://github.com/NorthIsUp/userscripts/github-pr-list-accepted
// @version      1.1.1
// @description  Tints accepted pull requests green and collapses them to one line on a repo's PR list — "accepted" being GitHub's review decision (code owners) or your own approval.
// @icon         data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @icon64       data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2264%22%20height=%2264%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @match        https://github.com/*/*/pulls*
// @run-at       document-idle
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.listValues
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/github-pr-list-accepted.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/github-pr-list-accepted.user.js
// ==/UserScript==

(function () {
  'use strict';

  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  function abtoa(buf) {
    return btoa(
      new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
  }
  function atoab(str) {
    return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  }
  async function compress(input, compressionFormat, outputType = "string") {
    var _a;
    const byteArray = input instanceof Uint8Array ? input : new TextEncoder().encode((_a = input == null ? void 0 : input.toString()) != null ? _a : String(input));
    const comp = new CompressionStream(compressionFormat);
    const writer = comp.writable.getWriter();
    writer.write(byteArray);
    writer.close();
    const uintArr = new Uint8Array(await new Response(comp.readable).arrayBuffer());
    return outputType === "arrayBuffer" ? uintArr : abtoa(uintArr);
  }
  async function decompress(input, compressionFormat, outputType = "string") {
    var _a;
    const byteArray = input instanceof Uint8Array ? input : atoab((_a = input == null ? void 0 : input.toString()) != null ? _a : String(input));
    const decomp = new DecompressionStream(compressionFormat);
    const writer = decomp.writable.getWriter();
    writer.write(byteArray);
    writer.close();
    const uintArr = new Uint8Array(await new Response(decomp.readable).arrayBuffer());
    return outputType === "arrayBuffer" ? uintArr : new TextDecoder().decode(uintArr);
  }
  var DatedError = class extends Error {
    constructor(message, options) {
      super(message, options);
      __publicField(this, "date");
      this.name = this.constructor.name;
      this.date = /* @__PURE__ */ new Date();
    }
  };
  var MigrationError = class extends DatedError {
    constructor(message, options) {
      super(message, options);
      this.name = "MigrationError";
    }
  };
  var createNanoEvents = () => ({
    emit(event, ...args) {
      for (let callbacks = this.events[event] || [], i = 0, length = callbacks.length; i < length; i++) {
        callbacks[i](...args);
      }
    },
    events: {},
    on(event, cb) {
      var _a;
      ((_a = this.events)[event] || (_a[event] = [])).push(cb);
      return () => {
        var _a2;
        this.events[event] = (_a2 = this.events[event]) == null ? void 0 : _a2.filter((i) => cb !== i);
      };
    }
  });
  var PicoEmitter = class {
    /**
     * ⚠️ You cannot instantiate `PicoEmitter` directly, it's only meant for extending in your own classes. If you want a standalone emitter, use `NanoEmitter` instead.
     */
    constructor(options = {}) {
      /**
       * The nanoevents emitter instance used internally.  
       * ⚠️ You should use the protected method `emitEvent()` instead of emitting directly through this, as it updates the catch-up memory for any events listed in `catchUpEvents`. Only use `this.events.emit()` if you're not using `catchUpEvents` or are doing manual memory management.
       */
      __publicField(this, "events", createNanoEvents());
      __publicField(this, "eventUnsubscribes", []);
      __publicField(this, "emitterOptions");
      /** Stores the latest arguments for each emitted event that's listed in `catchUpEvents`. */
      __publicField(this, "catchUpMemory", /* @__PURE__ */ new Map());
      this.emitterOptions = {
        ...options
      };
    }
    //#region emitEvent
    /**
     * Emits an event on this instance.  
     * You should use this over `this.events.emit()` in subclasses as it updates the catch-up memory for any event listed in `catchUpEvents`, so that listeners attached after emitting can still receive the latest value.
     */
    emitEvent(event, ...args) {
      var _a;
      if ((_a = this.emitterOptions.catchUpEvents) == null ? void 0 : _a.includes(event))
        this.catchUpMemory.set(event, args);
      this.events.emit(event, ...args);
    }
    //#region on
    /**
     * Subscribes to an event and calls the callback when it's emitted.  
     * If the event has already been emitted and is listed in `catchUpEvents`, the callback will be called immediately with the latest emitted arguments (catch-up behaviour).
     * @param event The event to subscribe to. Use `as "_"` in case your event names aren't thoroughly typed (like when using a template literal, e.g. \`event-${val}\` as "_")
     * @returns Returns a function that can be called to unsubscribe the event listener
     * @example ```ts
     * const emitter = new PicoEmitter<{
     *   foo: (bar: string) => void;
     * }>({
     *   publicEmit: true,
     * });
     * 
     * let i = 0;
     * const unsub = emitter.on("foo", (bar) => {
     *   // unsubscribe after 10 events:
     *   if(++i === 10) unsub();
     *   console.log(bar);
     * });
     * 
     * emitter.emit("foo", "bar");
     * ```
     */
    on(event, cb) {
      let unsub;
      const unsubProxy = () => {
        if (!unsub)
          return;
        unsub();
        this.eventUnsubscribes = this.eventUnsubscribes.filter((u) => u !== unsub);
      };
      unsub = this.events.on(event, cb);
      this.eventUnsubscribes.push(unsub);
      const memory = this.catchUpMemory.get(event);
      if (memory)
        cb(...memory);
      return unsubProxy;
    }
    //#region once
    /**
     * Subscribes to an event and calls the callback or resolves the Promise only once when it's emitted.  
     * If the event has already been emitted and is listed in `catchUpEvents`, the callback will be called immediately with the latest emitted arguments (catch-up behaviour).
     * @param event The event to subscribe to. Use `as "_"` in case your event names aren't thoroughly typed (like when using a template literal, e.g. \`event-${val}\` as "_")
     * @param cb The callback to call when the event is emitted - if provided or not, the returned Promise will resolve with the event arguments
     * @returns Returns a Promise that resolves with the event arguments when the event is emitted
     * @example ```ts
     * const emitter = new PicoEmitter<{
     *   foo: (bar: string) => void;
     * }>();
     * 
     * // Promise syntax:
     * const [bar] = await emitter.once("foo");
     * console.log(bar);
     * 
     * // Callback syntax:
     * emitter.once("foo", (bar) => console.log(bar));
     * ```
     */
    once(event, cb) {
      const memory = this.catchUpMemory.get(event);
      if (memory) {
        const args = memory;
        cb == null ? void 0 : cb(...args);
        return Promise.resolve(args);
      }
      return new Promise((resolve) => {
        let unsub;
        const onceProxy = ((...args) => {
          cb == null ? void 0 : cb(...args);
          unsub == null ? void 0 : unsub();
          resolve(args);
        });
        unsub = this.events.on(event, onceProxy);
        this.eventUnsubscribes.push(unsub);
      });
    }
    //#region onMulti
    /**
     * Allows subscribing to multiple events and calling the callback only when one of, all of, or a subset of the events are emitted, either continuously or only once.  
     * If any of the events have already been emitted and are listed in `catchUpEvents`, the callback will be called immediately if the criteria are met, with the latest emitted arguments (catch-up behaviour).
     * @param options An object or array of objects with the following properties:  
     * `callback` (required) is the function that will be called when the conditions are met.  
     *   
     * Set `once` to true to call the callback only once for the first event (or set of events) that match the criteria, then stop listening.  
     * If `signal` is provided, the subscription will be canceled when the given signal is aborted.  
     *   
     * If `oneOf` is used, the callback will be called when any of the matching events are emitted.  
     * If `allOf` is used, the callback will be called after all of the matching events are emitted at least once, then any time any of them are emitted.  
     * If both `oneOf` and `allOf` are used together, the callback will be called when any of the `oneOf` events are emitted AND all of the `allOf` events have been emitted at least once.  
     * At least one of `oneOf` or `allOf` must be provided.  
     *   
     * @returns Returns a function that can be called to unsubscribe all listeners created by this call. Alternatively, pass an `AbortSignal` to all options objects to achieve the same effect or for finer control.
     */
    onMulti(options) {
      const allUnsubs = [];
      const unsubAll = () => {
        for (const unsub of allUnsubs)
          unsub();
        allUnsubs.splice(0, allUnsubs.length);
        this.eventUnsubscribes = this.eventUnsubscribes.filter((u) => !allUnsubs.includes(u));
      };
      for (const opts of Array.isArray(options) ? options : [options]) {
        const optsWithDefaults = {
          allOf: [],
          oneOf: [],
          once: false,
          ...opts
        };
        const {
          oneOf,
          allOf,
          once,
          signal,
          callback
        } = optsWithDefaults;
        if (signal == null ? void 0 : signal.aborted)
          return unsubAll;
        if (oneOf.length === 0 && allOf.length === 0)
          throw new TypeError("PicoEmitter.onMulti(): Either `oneOf` or `allOf` or both must be provided in the options");
        const curEvtUnsubs = [];
        const checkUnsubAllEvt = (force = false) => {
          if (!(signal == null ? void 0 : signal.aborted) && !force)
            return;
          for (const unsub of curEvtUnsubs)
            unsub();
          curEvtUnsubs.splice(0, curEvtUnsubs.length);
          this.eventUnsubscribes = this.eventUnsubscribes.filter((u) => !curEvtUnsubs.includes(u));
        };
        const allOfEmitted = /* @__PURE__ */ new Set();
        const allOfConditionMet = () => allOf.length === 0 || allOfEmitted.size === allOf.length;
        for (const event of oneOf) {
          const unsub = this.events.on(event, ((...args) => {
            checkUnsubAllEvt();
            if (allOfConditionMet()) {
              callback(event, ...args);
              if (once)
                checkUnsubAllEvt(true);
            }
          }));
          curEvtUnsubs.push(unsub);
        }
        for (const event of allOf) {
          const unsub = this.events.on(event, ((...args) => {
            checkUnsubAllEvt();
            allOfEmitted.add(event);
            if (allOfConditionMet() && (oneOf.length === 0 || oneOf.includes(event))) {
              callback(event, ...args);
              if (once)
                checkUnsubAllEvt(true);
            }
          }));
          curEvtUnsubs.push(unsub);
        }
        allUnsubs.push(() => checkUnsubAllEvt(true));
      }
      return unsubAll;
    }
    //#region unsubscribeAll
    /** Unsubscribes all event listeners from this instance. Also clears the event catch-up memory. */
    unsubscribeAll() {
      for (const unsub of this.eventUnsubscribes)
        unsub();
      this.eventUnsubscribes = [];
      this.catchUpMemory.clear();
    }
  };
  var NanoEmitter = class extends PicoEmitter {
    /** Creates a new instance of NanoEmitter - a lightweight event emitter with helper methods and a strongly typed event map */
    constructor(options = {}) {
      super(options);
      __publicField(this, "events", createNanoEvents());
      __publicField(this, "eventUnsubscribes", []);
      __publicField(this, "emitterOptions");
      /** Stores the last arguments for each event listed in `catchUpEvents` */
      __publicField(this, "catchUpMemory", /* @__PURE__ */ new Map());
      this.emitterOptions = {
        publicEmit: false,
        ...options
      };
    }
    //#region emit
    /**
     * Emits an event on this instance.  
     * - ⚠️ Needs `publicEmit` to be set to true in the NanoEmitter constructor or super() call!
     * @param event The event to emit
     * @param args The arguments to pass to the event listeners
     * @returns Returns true if `publicEmit` is true and the event was emitted successfully
     */
    emit(event, ...args) {
      if (this.emitterOptions.publicEmit) {
        this.emitEvent(event, ...args);
        return true;
      }
      return false;
    }
    //#region unsubscribeAll
    /** Unsubscribes all event listeners from this instance. Also clears the event catch-up memory. */
    unsubscribeAll() {
      super.unsubscribeAll();
    }
  };
  var dsFmtVer = 1;
  var DataStore = class extends NanoEmitter {
    //#region constructor
    /**
     * Creates an instance of DataStore to manage a sync & async database that is cached in memory and persistently saved across sessions.  
     * Supports migrating data from older versions to newer ones and populating the cache with default data if no persistent data is found.  
     *   
     * - ⚠️ Make sure to call {@linkcode loadData()} at least once after creating an instance, or the returned data will be the same as `options.defaultData`
     * 
     * @template TData The type of the data that is saved in persistent storage for the currently set format version (will be automatically inferred from `defaultData` if not provided) - **This has to be a JSON-compatible object!** (no undefined, circular references, etc.)
     * @param opts The options for this DataStore instance
     */
    constructor(opts) {
      var _a, _b, _c;
      super(opts.nanoEmitterOptions);
      __publicField(this, "id");
      __publicField(this, "formatVersion");
      __publicField(this, "defaultData");
      __publicField(this, "encodeData");
      __publicField(this, "decodeData");
      __publicField(this, "compressionFormat", "deflate-raw");
      __publicField(this, "memoryCache");
      __publicField(this, "engine");
      __publicField(this, "keyPrefix");
      __publicField(this, "options");
      /**
       * Whether all first-init checks should be done.  
       * This includes migrating the internal DataStore format, migrating data from the UserUtils format, and anything similar.  
       * This is set to `true` by default. Create a subclass and set it to `false` before calling {@linkcode loadData()} if you want to explicitly skip these checks.
       */
      __publicField(this, "firstInit", true);
      /** In-memory cached copy of the data that is saved in persistent storage used for synchronous read access. */
      __publicField(this, "cachedData");
      __publicField(this, "migrations");
      __publicField(this, "migrateIds", []);
      this.id = opts.id;
      this.formatVersion = opts.formatVersion;
      this.defaultData = opts.defaultData;
      this.memoryCache = (_a = opts.memoryCache) != null ? _a : true;
      this.cachedData = this.memoryCache ? opts.defaultData : {};
      this.migrations = opts.migrations;
      if (opts.migrateIds)
        this.migrateIds = Array.isArray(opts.migrateIds) ? opts.migrateIds : [opts.migrateIds];
      this.engine = typeof opts.engine === "function" ? opts.engine() : opts.engine;
      this.keyPrefix = (_b = opts.keyPrefix) != null ? _b : "__ds-";
      this.options = opts;
      if ("encodeData" in opts && "decodeData" in opts && Array.isArray(opts.encodeData) && Array.isArray(opts.decodeData)) {
        this.encodeData = [opts.encodeData[0], opts.encodeData[1]];
        this.decodeData = [opts.decodeData[0], opts.decodeData[1]];
        this.compressionFormat = (_c = opts.encodeData[0]) != null ? _c : null;
      } else if (opts.compressionFormat === null) {
        this.encodeData = void 0;
        this.decodeData = void 0;
        this.compressionFormat = null;
      } else {
        const fmt = typeof opts.compressionFormat === "string" ? opts.compressionFormat : "deflate-raw";
        this.compressionFormat = fmt;
        this.encodeData = [fmt, async (data) => await compress(data, fmt, "string")];
        this.decodeData = [fmt, async (data) => await decompress(data, fmt, "string")];
      }
      this.engine.setDataStoreOptions({
        id: this.id,
        encodeData: this.encodeData,
        decodeData: this.decodeData
      });
    }
    //#region loadData
    /**
     * Loads the data saved in persistent storage into the in-memory cache and also returns a copy of it.  
     * Automatically populates persistent storage with default data if it doesn't contain any data yet.  
     * Also runs all necessary migration functions if the data format has changed since the last time the data was saved.
     */
    async loadData() {
      var _a;
      try {
        if (this.firstInit) {
          this.firstInit = false;
          const dsVer = Number(await this.engine.getValue("__ds_fmt_ver", 0));
          const oldData = await this.engine.getValue(`_uucfg-${this.id}`, null);
          if (oldData) {
            const oldVer = Number(await this.engine.getValue(`_uucfgver-${this.id}`, NaN));
            const oldEnc = await this.engine.getValue(`_uucfgenc-${this.id}`, null);
            const promises = [];
            const migrateFmt = (oldKey, newKey, value) => {
              promises.push(this.engine.setValue(newKey, value));
              promises.push(this.engine.deleteValue(oldKey));
            };
            migrateFmt(`_uucfg-${this.id}`, `${this.keyPrefix}${this.id}-dat`, oldData);
            if (!isNaN(oldVer))
              migrateFmt(`_uucfgver-${this.id}`, `${this.keyPrefix}${this.id}-ver`, oldVer);
            if (typeof oldEnc === "boolean" || oldEnc === "true" || oldEnc === "false" || typeof oldEnc === "number" || oldEnc === "0" || oldEnc === "1")
              migrateFmt(`_uucfgenc-${this.id}`, `${this.keyPrefix}${this.id}-enf`, [0, "0", true, "true"].includes(oldEnc) ? (_a = this.compressionFormat) != null ? _a : null : null);
            else {
              promises.push(this.engine.setValue(`${this.keyPrefix}${this.id}-enf`, this.compressionFormat));
              promises.push(this.engine.deleteValue(`_uucfgenc-${this.id}`));
            }
            await Promise.allSettled(promises);
          }
          if (isNaN(dsVer) || dsVer < dsFmtVer)
            await this.engine.setValue("__ds_fmt_ver", dsFmtVer);
        }
        if (this.migrateIds.length > 0) {
          await this.migrateId(this.migrateIds);
          this.migrateIds = [];
        }
        const storedDataRaw = await this.engine.getValue(`${this.keyPrefix}${this.id}-dat`, null);
        const storedFmtVer = Number(await this.engine.getValue(`${this.keyPrefix}${this.id}-ver`, NaN));
        if (typeof storedDataRaw !== "string" && typeof storedDataRaw !== "object" || storedDataRaw === null || isNaN(storedFmtVer)) {
          await this.saveDefaultData(false);
          const data = this.engine.deepCopy(this.defaultData);
          this.emitEvent("loadData", data);
          return data;
        }
        const storedData = storedDataRaw != null ? storedDataRaw : JSON.stringify(this.defaultData);
        const encodingFmt = String(await this.engine.getValue(`${this.keyPrefix}${this.id}-enf`, null));
        const isEncoded = encodingFmt !== "null" && encodingFmt !== "false" && encodingFmt !== "0" && encodingFmt !== "" && encodingFmt !== null;
        let parsed = typeof storedData === "string" ? await this.engine.deserializeData(storedData, isEncoded) : storedData;
        if (storedFmtVer < this.formatVersion && this.migrations)
          parsed = await this.runMigrations(parsed, storedFmtVer);
        const result = this.memoryCache ? this.cachedData = this.engine.deepCopy(parsed) : this.engine.deepCopy(parsed);
        this.emitEvent("loadData", result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.warn("Error while parsing JSON data, resetting it to the default value.", err);
        this.emitEvent("error", error);
        await this.saveDefaultData();
        return this.defaultData;
      }
    }
    //#region getData
    /**
     * Returns a copy of the data from the in-memory cache.  
     * Use {@linkcode loadData()} to get fresh data from persistent storage (usually not necessary since the cache should always exactly reflect persistent storage).  
     * ⚠️ Only available when `memoryCache` is `true` (default). When set to `false`, this produces a type and runtime error - use {@linkcode loadData()} instead.
     */
    getData() {
      if (!this.memoryCache)
        throw new DatedError("In-memory cache is disabled for this DataStore instance, so getData() can't be used. Please use loadData() instead.");
      return this.engine.deepCopy(this.cachedData);
    }
    //#region setData
    /** Saves the data synchronously to the in-memory cache and asynchronously to the persistent storage */
    setData(data) {
      const dataCopy = this.engine.deepCopy(data);
      if (this.memoryCache) {
        this.cachedData = data;
        this.emitEvent("updateDataSync", dataCopy);
      }
      return new Promise(async (resolve) => {
        const results = await Promise.allSettled([
          this.engine.setValue(`${this.keyPrefix}${this.id}-dat`, await this.engine.serializeData(data, this.encodingEnabled())),
          this.engine.setValue(`${this.keyPrefix}${this.id}-ver`, this.formatVersion),
          this.engine.setValue(`${this.keyPrefix}${this.id}-enf`, this.compressionFormat)
        ]);
        if (results.every((r) => r.status === "fulfilled"))
          this.emitEvent("updateData", dataCopy);
        else {
          const error = new Error("Error while saving data to persistent storage: " + results.map((r) => r.status === "rejected" ? r.reason : null).filter(Boolean).join("; "));
          console.error(error);
          this.emitEvent("error", error);
        }
        resolve();
      });
    }
    //#region saveDefaultData
    /**
     * Saves the default data passed in the constructor synchronously to the in-memory cache and asynchronously to persistent storage.
     * @param emitEvent Whether to emit the `setDefaultData` event - set to `false` to prevent event emission (used internally during initial population in {@linkcode loadData()})
     */
    async saveDefaultData(emitEvent = true) {
      if (this.memoryCache)
        this.cachedData = this.defaultData;
      const results = await Promise.allSettled([
        this.engine.setValue(`${this.keyPrefix}${this.id}-dat`, await this.engine.serializeData(this.defaultData, this.encodingEnabled())),
        this.engine.setValue(`${this.keyPrefix}${this.id}-ver`, this.formatVersion),
        this.engine.setValue(`${this.keyPrefix}${this.id}-enf`, this.compressionFormat)
      ]);
      if (results.every((r) => r.status === "fulfilled"))
        emitEvent && this.emitEvent("setDefaultData", this.defaultData);
      else {
        const error = new Error("Error while saving default data to persistent storage: " + results.map((r) => r.status === "rejected" ? r.reason : null).filter(Boolean).join("; "));
        console.error(error);
        this.emitEvent("error", error);
      }
    }
    //#region deleteData
    /**
     * Call this method to clear all persistently stored data associated with this DataStore instance, including the storage container (if supported by the DataStoreEngine).  
     * The in-memory cache will be left untouched, so you may still access the data with {@linkcode getData()}  
     * Calling {@linkcode loadData()} or {@linkcode setData()} after this method was called will recreate persistent storage with the cached or default data.
     */
    async deleteData() {
      var _a, _b;
      await Promise.allSettled([
        this.engine.deleteValue(`${this.keyPrefix}${this.id}-dat`),
        this.engine.deleteValue(`${this.keyPrefix}${this.id}-ver`),
        this.engine.deleteValue(`${this.keyPrefix}${this.id}-enf`)
      ]);
      await ((_b = (_a = this.engine).deleteStorage) == null ? void 0 : _b.call(_a));
      this.emitEvent("deleteData");
    }
    //#region encodingEnabled
    /** Returns whether encoding and decoding are enabled for this DataStore instance */
    encodingEnabled() {
      return Boolean(this.encodeData && this.decodeData) && this.compressionFormat !== null || Boolean(this.compressionFormat);
    }
    //#region runMigrations
    /**
     * Runs all necessary migration functions consecutively and saves the result to the in-memory cache and persistent storage and also returns it.  
     * This method is automatically called by {@linkcode loadData()} if the data format has changed since the last time the data was saved.  
     * Though calling this method manually is not necessary, it can be useful if you want to run migrations for special occasions like a user importing potentially outdated data that has been previously exported.  
     *   
     * If one of the migrations fails, the data will be reset to the default value if `resetOnError` is set to `true` (default). Otherwise, an error will be thrown and no data will be saved.
     */
    async runMigrations(oldData, oldFmtVer, resetOnError = true) {
      if (!this.migrations)
        return oldData;
      let newData = oldData;
      const sortedMigrations = Object.entries(this.migrations).sort(([a], [b]) => Number(a) - Number(b));
      let lastFmtVer = oldFmtVer;
      for (let i = 0; i < sortedMigrations.length; i++) {
        const [fmtVer, migrationFunc] = sortedMigrations[i];
        const ver = Number(fmtVer);
        if (oldFmtVer < this.formatVersion && oldFmtVer < ver) {
          try {
            const migRes = migrationFunc(newData);
            newData = migRes instanceof Promise ? await migRes : migRes;
            lastFmtVer = oldFmtVer = ver;
            const isFinal = ver >= this.formatVersion || i === sortedMigrations.length - 1;
            this.emitEvent("migrateData", ver, newData, isFinal);
          } catch (err) {
            const migError = new MigrationError(`Error while running migration function for format version '${fmtVer}'`, { cause: err });
            this.emitEvent("migrationError", ver, migError);
            this.emitEvent("error", migError);
            if (!resetOnError)
              throw migError;
            await this.saveDefaultData();
            return this.engine.deepCopy(this.defaultData);
          }
        }
      }
      await Promise.allSettled([
        this.engine.setValue(`${this.keyPrefix}${this.id}-dat`, await this.engine.serializeData(newData, this.encodingEnabled())),
        this.engine.setValue(`${this.keyPrefix}${this.id}-ver`, lastFmtVer),
        this.engine.setValue(`${this.keyPrefix}${this.id}-enf`, this.compressionFormat)
      ]);
      const result = this.memoryCache ? this.cachedData = this.engine.deepCopy(newData) : this.engine.deepCopy(newData);
      this.emitEvent("updateData", result);
      return result;
    }
    //#region migrateId
    /**
     * Tries to migrate the currently saved persistent data from one or more old IDs to the ID set in the constructor.  
     * If no data exist for the old ID(s), nothing will be done, but some time may still pass trying to fetch the non-existent data.
     */
    async migrateId(oldIds) {
      const ids = Array.isArray(oldIds) ? oldIds : [oldIds];
      await Promise.all(ids.map(async (id) => {
        const [data, fmtVer, isEncoded] = await (async () => {
          const [d, f, e] = await Promise.all([
            this.engine.getValue(`${this.keyPrefix}${id}-dat`, JSON.stringify(this.defaultData)),
            this.engine.getValue(`${this.keyPrefix}${id}-ver`, NaN),
            this.engine.getValue(`${this.keyPrefix}${id}-enf`, null)
          ]);
          return [d, Number(f), Boolean(e) && String(e) !== "null"];
        })();
        if (data === void 0 || isNaN(fmtVer))
          return;
        const parsed = await this.engine.deserializeData(data, isEncoded);
        await Promise.allSettled([
          this.engine.setValue(`${this.keyPrefix}${this.id}-dat`, await this.engine.serializeData(parsed, this.encodingEnabled())),
          this.engine.setValue(`${this.keyPrefix}${this.id}-ver`, fmtVer),
          this.engine.setValue(`${this.keyPrefix}${this.id}-enf`, this.compressionFormat),
          this.engine.deleteValue(`${this.keyPrefix}${id}-dat`),
          this.engine.deleteValue(`${this.keyPrefix}${id}-ver`),
          this.engine.deleteValue(`${this.keyPrefix}${id}-enf`)
        ]);
        this.emitEvent("migrateId", id, this.id);
      }));
    }
  };
  var DataStoreEngine = class {
    // setDataStoreOptions() is called from inside the DataStore constructor to set this value
    constructor(options) {
      __publicField(this, "dataStoreOptions");
      if (options)
        this.dataStoreOptions = options;
    }
    /** Called by DataStore on creation, to pass its options. Only call this if you are using this instance standalone! */
    setDataStoreOptions(dataStoreOptions) {
      this.dataStoreOptions = dataStoreOptions;
    }
    //#region serialization api
    /** Serializes the given object to a string, optionally encoded with `options.encodeData` if {@linkcode useEncoding} is not set to false and the `encodeData` and `decodeData` options are set */
    async serializeData(data, useEncoding) {
      var _a, _b, _c, _d, _e;
      this.ensureDataStoreOptions();
      const stringData = JSON.stringify(data);
      if (!useEncoding || !((_a = this.dataStoreOptions) == null ? void 0 : _a.encodeData) || !((_b = this.dataStoreOptions) == null ? void 0 : _b.decodeData))
        return stringData;
      const encRes = (_e = (_d = (_c = this.dataStoreOptions) == null ? void 0 : _c.encodeData) == null ? void 0 : _d[1]) == null ? void 0 : _e.call(_d, stringData);
      if (encRes instanceof Promise)
        return await encRes;
      return encRes;
    }
    /** Deserializes the given string to a JSON object, optionally decoded with `options.decodeData` if {@linkcode useEncoding} is set to true */
    async deserializeData(data, useEncoding) {
      var _a, _b, _c;
      this.ensureDataStoreOptions();
      let decRes = ((_a = this.dataStoreOptions) == null ? void 0 : _a.decodeData) && useEncoding ? (_c = (_b = this.dataStoreOptions.decodeData) == null ? void 0 : _b[1]) == null ? void 0 : _c.call(_b, data) : void 0;
      if (decRes instanceof Promise)
        decRes = await decRes;
      return JSON.parse(decRes != null ? decRes : data);
    }
    //#region misc api
    /** Throws an error if the {@linkcode DataStoreOptions} are not set or invalid. Call in every method where {@linkcode DataStoreEngineDSOptions} needs to be present. */
    ensureDataStoreOptions() {
      if (!this.dataStoreOptions)
        throw new DatedError("DataStoreEngine must be initialized with DataStore options before use. If you are using this instance standalone, set them in the constructor or call `setDataStoreOptions()` with the DataStore options.");
      if (!this.dataStoreOptions.id)
        throw new DatedError("DataStoreEngine must be initialized with a valid DataStore ID");
    }
    /**
     * Copies a JSON-compatible object and loses all its internal references in the process.  
     * Uses [`structuredClone()`](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone) if available, otherwise falls back to `JSON.parse(JSON.stringify(obj))`.
     */
    deepCopy(obj) {
      try {
        if ("structuredClone" in globalThis)
          return structuredClone(obj);
      } catch (e) {
      }
      return JSON.parse(JSON.stringify(obj));
    }
  };

  // lib/consts.ts
  var rawConsts = {
    coreUtilsVersion: "3.8.0",
    userUtilsVersion: "11.0.0"
  };
  function getConst(constKey, defaultVal) {
    const val = rawConsts[constKey];
    return val.match(/^#\{\{.+\}\}$/) ? defaultVal : val;
  }
  ({
    /** Semver version string of the bundled library CoreUtils. */
    CoreUtils: getConst("coreUtilsVersion", "ERR:unknown"),
    /** Semver version string of UserUtils. */
    UserUtils: getConst("userUtilsVersion", "ERR:unknown")
  });

  // lib/Errors.ts
  var PlatformError = class extends DatedError {
    constructor(message, options) {
      super(message, options);
      this.name = "PlatformError";
    }
  };
  var domReady = document.readyState !== "loading";
  !domReady && document.addEventListener("DOMContentLoaded", () => domReady = true, { once: true });

  // lib/GMStorageEngine.ts
  var GMStorageEngine = class extends DataStoreEngine {
    /**
     * Creates an instance of `GMStorageEngine`.  
     *   
     * - ⚠️ Requires the grants `GM.getValue`, `GM.setValue`, `GM.deleteValue`, and `GM.listValues` in your userscript metadata.
     * - ⚠️ Don't reuse engine instances, always create a new one for each {@linkcode DataStore} instance.
     */
    constructor(options) {
      super(options == null ? void 0 : options.dataStoreOptions);
      __publicField(this, "options");
      this.options = {
        ...options
      };
    }
    /** Fetches a value from persistent storage */
    async getValue(name, defaultValue) {
      try {
        if (!("GM" in globalThis))
          throw new PlatformError("GM is not defined. Make sure to run this in a userscript environment and that the necessary grants are set.");
        const value = await globalThis.GM.getValue(name, defaultValue);
        return value === void 0 ? defaultValue : value;
      } catch (err) {
        console.error(`Error getting value for key "${name}":`, err);
        throw err;
      }
    }
    /** Sets a value in persistent storage */
    async setValue(name, value) {
      try {
        if (!("GM" in globalThis))
          throw new PlatformError("GM is not defined. Make sure to run this in a userscript environment and that the necessary grants are set.");
        await globalThis.GM.setValue(name, value);
      } catch (err) {
        console.error(`Error setting value for key "${name}":`, err);
        throw err;
      }
    }
    /** Deletes a value from persistent storage */
    async deleteValue(name) {
      try {
        if (!("GM" in globalThis))
          throw new PlatformError("GM is not defined. Make sure to run this in a userscript environment and that the necessary grants are set.");
        await globalThis.GM.deleteValue(name);
      } catch (err) {
        console.error(`Error deleting value for key "${name}":`, err);
        throw err;
      }
    }
  };

  /** Run `fn` now and after any DOM change, coalesced to one call per frame. */
  function observeDom(fn, root = document.documentElement) {
      let queued = false;
      const tick = () => {
          if (queued)
              return;
          queued = true;
          requestAnimationFrame(() => {
              queued = false;
              fn();
          });
      };
      fn();
      new MutationObserver(tick).observe(root, { childList: true, subtree: true });
  }
  /** An SVG string sized like GitHub's own octicons. */
  function octicon(path, opts = {}) {
      const size = opts.size ?? 16;
      const style = opts.color
          ? ` style="color:var(--fgColor-${opts.color});vertical-align:text-bottom"`
          : '';
      return (`<svg class="octicon" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
          `viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"${style}><path d="${path}"></path></svg>`);
  }

  /** The PR the given github.com path belongs to, or null off a PR page. */
  /** Login of the signed-in user, from the meta tag GitHub still ships. */
  function currentUser() {
      const meta = document.querySelector('meta[name="user-login"]');
      return meta?.content || null;
  }

  /**
   * Shared UI for the scripts: toasts and settings panels.
   *
   * Everything renders inside a shadow root with `all: initial`, because these
   * are injected into pages whose CSS we don't control (GitHub's Primer resets
   * are especially aggressive). Colors come from one token block that follows the
   * page's color scheme.
   */
  const TOAST_HOST_ID = 'us-toast-host';
  const TOKENS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
  :host {
    --bg: #ffffff;
    --fg: #1f2328;
    --muted: rgba(31, 35, 40, 0.62);
    --line: rgba(128, 128, 128, 0.3);
    --btn-bg: #f6f8fa;
    --accent: #1f883d;
    --danger: #e5484d;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      --bg: #161b22;
      --fg: #e6edf3;
      --muted: rgba(230, 237, 243, 0.6);
      --line: rgba(128, 128, 128, 0.35);
      --btn-bg: #21262d;
      --accent: #238636;
    }
  }
  button {
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    color: var(--fg);
    background: var(--btn-bg);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 4px 10px;
  }
  button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
  button.plain { background: none; border: none; opacity: 0.6; padding: 2px 6px; }
  button.plain:hover { opacity: 1; }
  input, select {
    font: inherit;
    font-size: 13px;
    color: var(--fg);
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 4px 8px;
  }
  label { display: flex; align-items: center; gap: 6px; font-size: 13px; }
`;
  /** Run once the body exists — scripts running at document-start have none yet. */
  function whenBody(fn) {
      if (document.body)
          return fn();
      addEventListener('DOMContentLoaded', fn, { once: true });
  }
  function shadowHost(id, css) {
      const host = document.createElement('div');
      host.id = id;
      const root = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = TOKENS + css;
      root.appendChild(style);
      return { host, root };
  }
  const TOAST_CSS = `
  .stack {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
  }
  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    max-width: min(560px, 90vw);
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--bg);
    color: var(--fg);
    border: 1px solid var(--line);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
    font-size: 13px;
    line-height: 1.4;
  }
  .toast.danger { background: var(--danger); color: #fff; border-color: transparent; }
  .toast.danger button { background: rgba(255, 255, 255, 0.15); border-color: rgba(255, 255, 255, 0.6); color: #fff; }
  .msg { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
`;
  let toastStack = null;
  function ensureToastStack() {
      if (toastStack?.isConnected)
          return toastStack;
      const { host, root } = shadowHost(TOAST_HOST_ID, TOAST_CSS);
      const stack = document.createElement('div');
      stack.className = 'stack';
      root.appendChild(stack);
      document.body.appendChild(host);
      toastStack = stack;
      return stack;
  }
  /** A dismissible message in the corner of the page, with optional buttons. */
  function toast(opts) {
      whenBody(() => {
          const stack = ensureToastStack();
          const node = document.createElement('div');
          node.className = `toast${' danger' }`;
          const msg = document.createElement('span');
          msg.className = 'msg';
          msg.textContent = opts.text;
          node.appendChild(msg);
          for (const action of opts.actions ?? []) {
              const btn = document.createElement('button');
              btn.textContent = action.label;
              btn.addEventListener('click', action.onClick);
              node.appendChild(btn);
          }
          const dismiss = document.createElement('button');
          dismiss.className = 'plain';
          dismiss.textContent = '✕';
          dismiss.title = 'Dismiss';
          dismiss.addEventListener('click', () => node.remove());
          node.appendChild(dismiss);
          stack.appendChild(node);
          const duration = opts.duration ?? 10_000;
          if (duration > 0)
              setTimeout(() => node.remove(), duration);
      });
  }
  const PANEL_CSS = `
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 2147483646; }
  .panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2147483647;
    width: min(700px, 92vw);
    max-height: 88vh;
    overflow: auto;
    padding: 16px 18px;
    border-radius: 12px;
    background: var(--bg);
    color: var(--fg);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
    font-size: 13px;
  }
  header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  h2 { font-size: 16px; margin: 0; }
  .hint { font-size: 12px; color: var(--muted); margin: 0 0 10px; }
  .body { display: flex; flex-direction: column; gap: 10px; }
  footer { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
  .spacer { flex: 1; }
  .settings { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
  .settings input[type='number'] { width: 64px; }
  .rows { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; align-items: center; gap: 8px; }
  .row input { flex: 1 1 auto; min-width: 0; }
  .row img { width: 24px; height: 24px; border-radius: 50%; flex: 0 0 auto; object-fit: cover; background: var(--line); }
  table { border-collapse: collapse; width: 100%; }
  td { padding: 3px 8px 3px 0; border-top: 1px solid var(--line); }
`;
  /** A modal settings panel, isolated from the host page's CSS. */
  function openPanel(opts) {
      if (document.getElementById(opts.id))
          return null;
      const { host, root } = shadowHost(opts.id, PANEL_CSS);
      const backdrop = document.createElement('div');
      backdrop.className = 'backdrop';
      const panelEl = document.createElement('div');
      panelEl.className = 'panel';
      panelEl.setAttribute('role', 'dialog');
      panelEl.setAttribute('aria-modal', 'true');
      panelEl.setAttribute('aria-label', opts.title);
      const head = document.createElement('header');
      const title = document.createElement('h2');
      title.textContent = opts.title;
      const closeBtn = document.createElement('button');
      closeBtn.className = 'plain';
      closeBtn.textContent = '✕';
      closeBtn.title = 'Close';
      head.append(title, closeBtn);
      panelEl.appendChild(head);
      if (opts.hint) {
          const hint = document.createElement('p');
          hint.className = 'hint';
          hint.textContent = opts.hint;
          panelEl.appendChild(hint);
      }
      const body = document.createElement('div');
      body.className = 'body';
      panelEl.appendChild(body);
      const panel = {
          body,
          close: () => host.remove(),
          refresh: () => {
              body.replaceChildren();
              opts.build(body, panel);
          },
      };
      if (opts.footer?.length) {
          const footer = document.createElement('footer');
          const spacer = document.createElement('span');
          spacer.className = 'spacer';
          footer.appendChild(spacer);
          for (const spec of opts.footer) {
              const btn = document.createElement('button');
              btn.textContent = spec.label;
              if (spec.primary)
                  btn.className = 'primary';
              btn.addEventListener('click', () => spec.onClick(panel));
              footer.appendChild(btn);
          }
          panelEl.appendChild(footer);
      }
      closeBtn.addEventListener('click', panel.close);
      backdrop.addEventListener('click', panel.close);
      root.addEventListener('keydown', (e) => {
          if (e.key === 'Escape')
              panel.close();
      });
      root.append(backdrop, panelEl);
      opts.build(body, panel);
      document.body.appendChild(host);
      return panel;
  }
  /** A row of labelled controls, one per setting, that reads back as an object. */
  function settingsEditor(settings, values) {
      const el = document.createElement('div');
      el.className = 'settings';
      const controls = new Map();
      for (const setting of settings) {
          const label = document.createElement('label');
          const value = values[setting.key];
          if (setting.kind === 'select') {
              const select = document.createElement('select');
              for (const choice of setting.options) {
                  const option = document.createElement('option');
                  option.value = choice.value;
                  option.textContent = choice.label;
                  select.appendChild(option);
              }
              // A value that isn't one of the options leaves selectedIndex at -1, so
              // the control renders blank and reads back as ''. Fall back to the first
              // option instead, the way the number branch falls back to its old value.
              select.value = String(value ?? '');
              if (select.selectedIndex < 0)
                  select.selectedIndex = 0;
              controls.set(setting.key, select);
              label.append(setting.label, select);
              el.appendChild(label);
              continue;
          }
          const input = document.createElement('input');
          controls.set(setting.key, input);
          switch (setting.kind) {
              case 'boolean':
                  input.type = 'checkbox';
                  input.checked = Boolean(value);
                  label.append(input, setting.label);
                  break;
              case 'number':
                  input.type = 'number';
                  if (setting.min != null)
                      input.min = String(setting.min);
                  if (setting.max != null)
                      input.max = String(setting.max);
                  input.value = String(value ?? '');
                  label.append(setting.label, input);
                  break;
              case 'text':
                  input.type = 'text';
                  input.placeholder = setting.placeholder ?? '';
                  input.value = String(value ?? '');
                  label.append(setting.label, input);
                  break;
          }
          el.appendChild(label);
      }
      return {
          el,
          read: () => {
              const out = {};
              for (const setting of settings) {
                  const control = controls.get(setting.key);
                  if (!control)
                      continue;
                  if (setting.kind === 'boolean')
                      out[setting.key] = control.checked;
                  else if (setting.kind === 'select')
                      out[setting.key] = control.value || String(values[setting.key] ?? '');
                  else if (setting.kind === 'number') {
                      const n = Number.parseInt(control.value, 10);
                      const clamped = Number.isNaN(n) ? Number(values[setting.key]) : n;
                      out[setting.key] = Math.max(setting.min ?? -Infinity, Math.min(setting.max ?? Infinity, clamped));
                  }
                  else
                      out[setting.key] = control.value.trim();
              }
              return out;
          },
      };
  }
  /** Register a userscript-manager menu entry, where the manager supports it. */
  function menuCommand(label, fn) {
      if (typeof GM_registerMenuCommand === 'function')
          GM_registerMenuCommand(label, fn);
  }

  // HOW THIS WORKS — two halves, and only the first one is JavaScript.
  //
  //  1. Which PRs are accepted? The list's markup carries no review state, so
  //     rather than scrape rows we ask GitHub the question it already answers in
  //     its own filter bar: re-run the page's query with `review:approved` bolted
  //     on (plus `reviewed-by:@me` for the "mine" mode) as a same-origin fetch,
  //     and mark every row that comes back.
  //
  //     `review:approved` is GitHub's review DECISION, not a raw approval count:
  //     on a repo that requires review from code owners it only flips once those
  //     owners have approved — which is what "accepted by a codeowner" means
  //     here. GitHub has no `approved-by:` qualifier, so "accepted by me" is the
  //     closest it can express: approved overall AND I am one of its reviewers.
  //
  //  2. What does an accepted row look like? Pure CSS. JS sets one attribute on
  //     the row and one on <html>; the stylesheet below does the green tint, the
  //     dimming, the collapse to a single line, and the hover-to-expand. Nothing
  //     is written to element.style, so switching between collapse/dim/hide is a
  //     single attribute flip and GitHub re-rendering a row costs us nothing.
  const DEFAULTS = { mode: 'approved', display: 'collapse', markMine: true, pages: 2 };
  // Set on each accepted row (value: the Mode that matched) …
  const ROW = 'data-accepted-pr';
  // … and on <html>, so one attribute switches every row's treatment at once.
  const DISPLAY = 'data-accepted-pr-display';
  const BADGE = 'data-accepted-pr-badge';
  const BAR = 'accepted-pr-bar';
  const STYLE = 'accepted-pr-style';
  // Octicon path, lifted from the rendered page so it matches GitHub's own check.
  const CHECK = 'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z';
  // The whole visual treatment. GitHub's row styles are plain author rules, so
  // these win on specificity alone — !important is only on the hover escape
  // hatch, which has to beat the collapsed rule it overrides.
  const CSS = `
  [${ROW}] {
    transition: opacity .12s ease, background-color .12s ease;
    background-color: var(--bgColor-success-muted, rgba(46, 160, 67, 0.12));
    box-shadow: inset 3px 0 0 var(--fgColor-success, #3fb950);
    opacity: .6;
  }
  [${ROW}]:hover { opacity: 1; }

  [${DISPLAY}="collapse"] [${ROW}] {
    max-height: 2.4em;
    overflow: hidden;
  }
  /* Hovering a collapsed row gives the whole thing back, labels and all. */
  [${DISPLAY}="collapse"] [${ROW}]:hover {
    max-height: none !important;
    overflow: visible !important;
  }

  [${DISPLAY}="hide"] [${ROW}] { display: none; }

  [${BADGE}] {
    display: inline-flex;
    align-items: center;
    margin-right: 6px;
    vertical-align: text-bottom;
  }

  #${BAR} {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 6px 16px;
    font-size: 12px;
    color: var(--fgColor-muted, #848d97);
    border-bottom: 1px solid var(--borderColor-muted, rgba(128, 128, 128, .25));
  }
  #${BAR} button {
    font: inherit;
    cursor: pointer;
    padding: 1px 6px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: none;
    color: inherit;
  }
  #${BAR} button:hover { border-color: var(--borderColor-default, rgba(128, 128, 128, .4)); }
  #${BAR} button[aria-pressed="true"] {
    color: var(--fgColor-default, inherit);
    border-color: var(--borderColor-default, rgba(128, 128, 128, .4));
    background: var(--bgColor-neutral-muted, rgba(128, 128, 128, .15));
  }
`;
  // Persistence via UserUtils' DataStore: it owns the GM storage keys, the format
  // version and the migration chain, so a later config change is a numbered
  // migration instead of hand-written ?? fallbacks.
  const store = new DataStore({
      id: 'gh-pr-list-accepted',
      defaultData: { ...DEFAULTS },
      formatVersion: 1,
      engine: new GMStorageEngine(),
      compressionFormat: null,
      migrations: {},
  });
  let config = { ...DEFAULTS };
  /** The settings that decide WHICH PRs are accepted, as opposed to how they look. */
  function lookupKey(cfg) {
      return [cfg.mode, cfg.markMine, cfg.pages].join('|');
  }
  async function saveConfig(next) {
      // Switching collapse/dim/hide is one attribute on <html> — re-running the
      // lookup for it would cost four page fetches to change a stylesheet match.
      const relook = lookupKey(next) !== lookupKey(config);
      config = next;
      if (relook)
          void refresh(true);
      else
          decorate();
      await store.setData(next);
  }
  let loaded = false;
  // Nothing is looked up until this resolves: firing the fetches under the
  // defaults and again under the stored config would double every page view.
  // A storage failure still lands in finally, so the defaults go live either way.
  store
      .loadData()
      .then((saved) => {
      config = { ...DEFAULTS, ...saved };
  })
      .catch((e) => console.error('[accepted-pr] config load failed', e))
      .finally(() => {
      loaded = true;
      void refresh(true);
  });
  const DEFAULT_QUERY = 'is:open is:pr';
  const PR_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+$/;
  // Classic rows carry id="issue_123"; the React list marks its own list items.
  // Deliberately no bare `li`: that matched sub-lists inside a row, and any PR
  // link elsewhere on the page (a nav item, a recently-viewed widget) would have
  // dragged an unrelated container in as if it were a row.
  const ROW_SELECTOR = '.js-issue-row, [id^="issue_"], [data-testid="list-view-item"], .Box-row';
  /** The query the list is currently showing, as typed into GitHub's search box. */
  function currentQuery() {
      return (new URLSearchParams(location.search).get('q') || '').trim() || DEFAULT_QUERY;
  }
  /** Which page of that query is on screen. */
  function currentPage() {
      const page = Number.parseInt(new URLSearchParams(location.search).get('page') || '1', 10);
      return Number.isNaN(page) || page < 1 ? 1 : page;
  }
  /** That query, with our own review qualifiers swapped in for any it had. */
  function acceptedQuery(mode) {
      const terms = currentQuery()
          .split(/\s+/)
          .filter((term) => term && !/^-?(review|reviewed-by):/i.test(term));
      terms.push('review:approved');
      if (mode === 'mine')
          terms.push('reviewed-by:@me');
      return terms.join(' ');
  }
  /** The `/owner/repo/pull/123` an anchor points at, or null for anything else. */
  function prPath(link) {
      const path = (link.getAttribute('href') || '').split(/[?#]/)[0].replace(/\/$/, '');
      return PR_PATH.test(path) ? path : null;
  }
  /** Re-run the list's query with `review:approved`; collect what comes back. */
  async function acceptedPaths(mode) {
      const query = acceptedQuery(mode);
      const found = new Set();
      // The approved subset paginates on its own, so page 4 of the list is not
      // covered by page 4 of this query — only by scanning from the top. Deeper
      // pages therefore need a deeper scan, still bounded by the setting.
      const depth = config.pages + currentPage() - 1;
      for (let page = 1; page <= depth; page++) {
          const url = `${location.pathname}?q=${encodeURIComponent(query)}&page=${page}`;
          const res = await fetch(url, { credentials: 'same-origin' });
          if (!res.ok)
              throw new Error(`${res.status} ${res.statusText} for ${url}`);
          const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
          const before = found.size;
          for (const link of doc.querySelectorAll('a[href*="/pull/"]')) {
              const path = prPath(link);
              if (path)
                  found.add(path);
          }
          // A page that adds nearly nothing is the last one — GitHub clamps `page`
          // past the end rather than 404ing, so this is the only stop signal.
          if (found.size - before < 10)
              break;
      }
      return found;
  }
  /** Every PR row rendered right now, keyed by the PR's path. */
  function rowsOnPage() {
      const rows = new Map();
      for (const link of document.querySelectorAll('a[href*="/pull/"]')) {
          const path = prPath(link);
          // The title link comes first in DOM order, so the first hit wins the row.
          if (!path || rows.has(path))
              continue;
          // From the link's PARENT: the title anchor's own id is "issue_123_link",
          // which matches the row selector, and closest() would hand back the anchor.
          const row = link.parentElement?.closest(ROW_SELECTOR);
          if (row)
              rows.set(path, row);
      }
      return rows;
  }
  function ensureStyle() {
      if (document.getElementById(STYLE))
          return;
      const style = document.createElement('style');
      style.id = STYLE;
      style.textContent = CSS;
      document.head.appendChild(style);
  }
  function badge(row, mode) {
      const existing = row.querySelector(`[${BADGE}]`);
      if (existing?.getAttribute(BADGE) === mode)
          return;
      existing?.remove();
      const title = row.querySelector('a[href*="/pull/"]');
      if (!title?.parentElement)
          return;
      const mark = document.createElement('span');
      mark.setAttribute(BADGE, mode);
      mark.title =
          mode === 'mine'
              ? 'You reviewed this pull request, and it is approved'
              : 'Approved — GitHub’s review decision, so the required reviewers (code owners, where they are required) have signed off';
      mark.innerHTML = octicon(CHECK, { color: 'success' });
      title.parentElement.insertBefore(mark, title);
  }
  function unmark(row) {
      row.removeAttribute(ROW);
      row.querySelector(`[${BADGE}]`)?.remove();
  }
  /** Row count, and where the bar goes, in one pass over the rendered rows. */
  function decorate() {
      ensureStyle();
      document.documentElement.setAttribute(DISPLAY, config.display);
      let accepted = 0;
      let list = null;
      for (const [path, row] of rowsOnPage()) {
          if (!list)
              list = row.parentElement;
          const mode = state.paths.get(path);
          if (!mode) {
              if (row.hasAttribute(ROW))
                  unmark(row);
              continue;
          }
          accepted++;
          // Setting an attribute fires a mutation record even when the value is
          // unchanged, and we're inside a MutationObserver — so only touch a row
          // whose marking actually changed, or observeDom spins forever.
          if (row.getAttribute(ROW) !== mode)
              row.setAttribute(ROW, mode);
          badge(row, mode);
      }
      renderBar(accepted, list);
  }
  const DISPLAYS = [
      { value: 'collapse', label: 'Collapse', title: 'Green, dimmed, one line — hover to expand' },
      { value: 'dim', label: 'Dim', title: 'Green and dimmed, full height' },
      { value: 'hide', label: 'Hide', title: 'Drop accepted PRs from the list' },
  ];
  /** A line above the list: how many are accepted, and what to do with them. */
  function renderBar(accepted, list) {
      const existing = document.getElementById(BAR);
      // A <div> spliced into a <ul> is invalid markup, and React drops any child it
      // did not render — so the bar goes immediately before the list instead.
      const anchor = list?.parentElement;
      if (!list || !anchor || accepted === 0) {
          existing?.remove();
          return;
      }
      const summary = `${accepted} accepted ${accepted === 1 ? 'PR' : 'PRs'}` +
          (config.mode === 'mine' ? ' (approved, reviewed by you)' : ' (approved)');
      const signature = `${summary}|${config.display}`;
      // Same reason as the row marking: rebuilding on every mutation would loop.
      if (existing?.dataset.signature === signature)
          return;
      const bar = existing ?? document.createElement('div');
      bar.id = BAR;
      bar.dataset.signature = signature;
      bar.replaceChildren();
      const label = document.createElement('span');
      label.textContent = summary;
      bar.appendChild(label);
      for (const option of DISPLAYS) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = option.label;
          button.title = option.title;
          button.setAttribute('aria-pressed', String(config.display === option.value));
          button.addEventListener('click', () => void saveConfig({ ...config, display: option.value }));
          bar.appendChild(button);
      }
      const settings = document.createElement('button');
      settings.type = 'button';
      settings.textContent = '⚙';
      settings.title = 'Accepted PR settings';
      settings.addEventListener('click', openConfig);
      bar.appendChild(settings);
      if (!existing)
          anchor.insertBefore(bar, list);
  }
  const state = { key: '', paths: new Map(), retryAt: 0 };
  let run = 0;
  /** Look acceptance up again — once per (query, settings), unless forced. */
  async function refresh(force = false) {
      if (!loaded)
          return;
      const key = [location.pathname, currentQuery(), currentPage(), lookupKey(config)].join('|');
      if (!force && key === state.key)
          return;
      // decorate() runs on every DOM mutation, so a failing lookup gets a cooldown
      // rather than one retry per frame.
      if (!force && Date.now() < state.retryAt)
          return;
      // Claimed, not committed: a failed lookup clears it below so the next DOM
      // tick can retry, rather than leaving the list unmarked until you navigate.
      state.key = key;
      const token = ++run;
      // `reviewed-by:@me` needs a signed-in session to resolve; without one the
      // "mine" query would quietly match nothing at all.
      const mode = config.mode === 'mine' && !currentUser() ? 'approved' : config.mode;
      try {
          const paths = new Map();
          for (const path of await acceptedPaths(mode))
              paths.set(path, mode);
          // A second pass so the ones you signed off on read differently from the
          // ones somebody else did. Pointless when `mine` is already the whole set.
          if (mode === 'approved' && config.markMine && currentUser()) {
              for (const path of await acceptedPaths('mine')) {
                  if (paths.has(path))
                      paths.set(path, 'mine');
              }
          }
          if (token !== run)
              return;
          state.paths = paths;
          state.retryAt = 0;
      }
      catch (e) {
          if (token !== run)
              return;
          // Drop the key so a later tick tries again, but keep the stale set from
          // being painted onto a list it no longer describes.
          state.key = '';
          state.paths = new Map();
          state.retryAt = Date.now() + 30_000;
          console.error('[accepted-pr] lookup failed', e);
          toast({
              text: 'Could not read approval state from GitHub — the PR list is left as-is.'});
      }
      // Outside the try: a DOM failure here is our bug, not a failed lookup, and
      // must not be reported to the user as one.
      decorate();
  }
  function openConfig() {
      const settings = settingsEditor([
          {
              key: 'mode',
              kind: 'select',
              label: 'Accepted means',
              options: [
                  { value: 'approved', label: 'Approved (code owners, where required)' },
                  { value: 'mine', label: 'Approved, and I reviewed it' },
              ],
          },
          {
              key: 'display',
              kind: 'select',
              label: 'Show them',
              options: DISPLAYS.map((d) => ({ value: d.value, label: d.label })),
          },
          { key: 'markMine', kind: 'boolean', label: 'Badge the ones I reviewed' },
          { key: 'pages', kind: 'number', label: 'Pages to scan', min: 1, max: 10 },
      ], config);
      openPanel({
          id: 'accepted-pr-config-host',
          title: 'Accepted pull requests',
          hint: 'Acceptance comes from GitHub’s own search: this list’s query, re-run with review:approved — its review decision, which on a repo that requires code owner review means the code owners have signed off. GitHub has no “approved-by:” qualifier, so “I reviewed it” (reviewed-by:@me) is as close as it gets to “I approved it”.',
          build: (body) => body.append(settings.el),
          footer: [
              { label: 'Cancel', onClick: (panel) => panel.close() },
              {
                  label: 'Save',
                  primary: true,
                  onClick: (panel) => {
                      void saveConfig({ ...config, ...settings.read() });
                      panel.close();
                  },
              },
          ],
      });
  }
  menuCommand('✅ Accepted PRs…', openConfig);
  // The list is a SPA route: rows re-render, and the query changes under us.
  // refresh() is deduped by query + settings, so it only fetches when it must.
  observeDom(() => {
      void refresh();
      decorate();
  });

})();
