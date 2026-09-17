// ==UserScript==
// @name         Code Helpers: GitHub Releases — Install Userscripts
// @namespace    https://github.com/NorthIsUp/userscripts/github-releases-install
// @version      1.5.1
// @description  Install and update buttons beside every .user.js asset on a repo's releases page, plus one button for the whole list, going through each script's own @downloadURL so the browser gets a page instead of a download. Installed state is read live from the scripts running on the page.
// @icon         data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @icon64       data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2264%22%20height=%2264%22%20viewBox=%220%200%2048%2048%22%3E%3Cstyle%3E:root%7B--fill:%23000%7D@media%20(prefers-color-scheme:dark)%7B:root%7B--fill:%23fff%7D%7D%3C/style%3E%3Cpath%20fill=%22var(--fill)%22%20d=%22M24%201.9a21.6%2021.6%200%200%200-6.8%2042.2c1%20.2%201.8-.9%201.8-1.8v-2.9c-6%201.3-7.9-2.9-7.9-2.9a6.5%206.5%200%200%200-2.2-3.2c-2-1.4.1-1.3.1-1.3a4.3%204.3%200%200%201%203.3%202c1.7%202.9%205.5%202.6%206.7%202.1a5.4%205.4%200%200%201%20.5-2.9C12.7%2032%209%2028%209%2022.6a10.7%2010.7%200%200%201%202.9-7.6%206.2%206.2%200%200%201%20.3-6.4%208.9%208.9%200%200%201%206.4%202.9%2015.1%2015.1%200%200%201%205.4-.8%2017.1%2017.1%200%200%201%205.4.7%209%209%200%200%201%206.4-2.8%206.5%206.5%200%200%201%20.4%206.4%2010.7%2010.7%200%200%201%202.8%207.6c0%205.4-3.7%209.4-10.5%2010.6a5.4%205.4%200%200%201%20.5%202.9v6.2a1.8%201.8%200%200%200%201.9%201.8A21.7%2021.7%200%200%200%2024%201.9Z%22/%3E%3C/svg%3E
// @match        https://github.com/*/*/releases*
// @run-at       document-idle
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.listValues
// @grant        GM.openInTab
// @grant        GM.xmlHttpRequest
// @connect      github.com
// @connect      githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/github-releases-install.user.js
// @downloadURL  https://raw.githubusercontent.com/NorthIsUp/userscripts/dist/github-releases-install.user.js
// ==/UserScript==

(function () {
  'use strict';

  // Installed-script beacon — src/lib/beacon.ts, inlined here so it runs
  // before anything else: announce this script on https://github.com/NorthIsUp/userscripts/releases,
  // then stop unless this script's own @match covers the page.
  {
    /** The attribute the tags carry, and what a reader queries for. */
    const BEACON_TAG = 'userscript-beacon';
    /**
     * On the beacon page, leave a `<meta name="userscript-beacon">` carrying this
     * script's identity. Returns whether the script should go on running here —
     * false on the beacon page when the script's own `@match` doesn't cover it.
     *
     * @param script    who this is: the header's name, namespace and version.
     * @param pageRe    source of a RegExp matching the page to announce on.
     * @param ownRes    sources of RegExps for the script's own `@match` patterns.
     */
    function announce(script, pageRe, ownRes) {
        // A fragment is never part of a @match, and never changes which page this is.
        const here = location.href.split('#')[0];
        if (new RegExp(pageRe).test(here)) {
            const tag = document.createElement('meta');
            tag.name = BEACON_TAG;
            Object.assign(tag.dataset, script);
            // document-start runs before <head> exists, so mount whenever it does.
            const mount = () => (document.head || document.documentElement).appendChild(tag);
            if (document.head || document.documentElement)
                mount();
            else
                document.addEventListener('DOMContentLoaded', mount, { once: true });
        }
        return ownRes.some((re) => new RegExp(re).test(here));
    }

    if (!announce({"name":"Code Helpers: GitHub Releases — Install Userscripts","namespace":"https://github.com/NorthIsUp/userscripts/github-releases-install","version":"1.5.1"}, "^https:\\/\\/github\\.com\\/NorthIsUp\\/userscripts\\/releases.*$", ["^https:\\/\\/github\\.com\\/.*\\/.*\\/releases.*$"])) return;
  }


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

  /**
   * The installed-script beacon: how a script tells a page it is running here.
   *
   * No userscript manager will tell a page what is installed — Tampermonkey and
   * Violentmonkey expose `external.<Manager>.isInstalled` only on the hosting
   * sites they allow-list, and one script's storage is invisible to another — so
   * each script answers for itself. Every bundle calls `announce()` before
   * anything else, and `github-releases-install` reads the tags it leaves.
   *
   * The build supplies the arguments (see build/beacon.mjs) and drops the call at
   * the top of the bundle, because the answer decides whether the rest of the
   * bundle runs at all: the beacon needs an extra `@match` for the page it
   * reports on, and that must not make a script run anywhere it didn't before.
   */
  /** The attribute the tags carry, and what a reader queries for. */
  const BEACON_TAG = 'userscript-beacon';

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
          node.className = `toast${opts.tone === 'danger' ? ' danger' : ''}`;
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

  /**
   * Compare userscript `@version` strings: dotted segments, numeric where both
   * sides are numbers (so 1.10 > 1.9) and lexical where either isn't (1.0.0-rc).
   * Missing segments read as 0, so 1.2 and 1.2.0 are the same version.
   */
  function compareVersions(a, b) {
      const left = a.split('.');
      const right = b.split('.');
      for (let i = 0; i < Math.max(left.length, right.length); i++) {
          const x = left[i] ?? '0';
          const y = right[i] ?? '0';
          const nx = Number.parseInt(x, 10);
          const ny = Number.parseInt(y, 10);
          const diff = Number.isNaN(nx) || Number.isNaN(ny) || String(nx) !== x || String(ny) !== y
              ? x.localeCompare(y)
              : nx - ny;
          if (diff !== 0)
              return diff < 0 ? -1 : 1;
      }
      return 0;
  }

  // HOW THIS WORKS — a release asset is served with `Content-Disposition:
  // attachment` and `Content-Type: application/octet-stream`, so navigating to
  // one saves the file: the browser never renders it, and a userscript manager
  // never sees a page to offer an install on. We can't change those headers, so
  // the button never sends you there. It reads the asset's own metadata block
  // (the first few KB, over GM.xmlHttpRequest) and installs from the
  // `@downloadURL` the author declared, which is nearly always a raw/CDN URL
  // served inline as text/plain — the shape a manager intercepts and turns into
  // its install page. If that read fails there is nowhere good to go, so the
  // button says so instead of handing you a download.
  //
  // @connect is `githubusercontent.com`, the whole domain: GitHub redirects a
  // release asset to a signed URL on a host it changes from time to time (it was
  // objects.githubusercontent.com, now release-assets.githubusercontent.com), and
  // Tampermonkey checks the final URL of a redirect as well as the first. Naming
  // one host meant every header read failed the day GitHub moved.
  //
  // "Missing" needs to know what you already have, and no manager will say so
  // from here: Tampermonkey and Violentmonkey expose `external.<Manager>
  // .isInstalled` only on the script-hosting sites they allow-list (Tampermonkey
  // 5.6 closed it everywhere else), and one script's storage is invisible to
  // another. So the scripts answer for themselves. The build gives every script
  // in this repo an extra @match for this repo's releases page, and starts every
  // bundle with src/lib/beacon.ts: it drops a <meta name="userscript-beacon"> tag
  // carrying the script's name, namespace and version, then bails out unless the
  // script's own @match covers the page. What
  // the buttons show is therefore what is running right now — nothing is
  // remembered, and a script that was uninstalled (or disabled) simply isn't
  // there. Scripts from other repos don't announce themselves, so on their
  // releases pages every button just reads "Install".
  //
  // The buttons are markup + one stylesheet; nothing is written to element.style.
  const BUTTON = 'data-userscript-install';
  const ROW = 'data-userscript-install-row';
  const ALL_ROW = 'data-userscript-install-all';
  const STYLE = 'userscript-install-style';
  const CSS = `
  [${BUTTON}] {
    font: inherit;
    font-size: 12px;
    /* The row is a flex container that is already full: never give up width
       (which would clip the label) and never stretch to the row's height. */
    flex-shrink: 0;
    align-self: center;
    line-height: 20px;
    cursor: pointer;
    margin-left: 8px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid var(--borderColor-default, rgba(128, 128, 128, .4));
    background: var(--bgColor-default, transparent);
    color: var(--fgColor-default, inherit);
    white-space: nowrap;
  }
  [${BUTTON}]:hover { background: var(--bgColor-neutral-muted, rgba(128, 128, 128, .15)); }
  [${BUTTON}][data-state='install'] {
    border-color: var(--borderColor-success-emphasis, #238636);
    color: var(--fgColor-success, #3fb950);
  }
  [${BUTTON}][data-state='update'] {
    border-color: var(--borderColor-attention-emphasis, #9e6a03);
    color: var(--fgColor-attention, #d29922);
  }
  [${BUTTON}][data-state='installed'],
  [${BUTTON}][data-state='older'],
  [${BUTTON}][data-state='pending'] { opacity: .55; }
  [${BUTTON}][data-state='blocked'] {
    border-color: var(--borderColor-danger-emphasis, #da3633);
    color: var(--fgColor-danger, #f85149);
  }

  /* GitHub's asset row is two cells that already fill it end to end: the file
     name is col-12 col-lg-6, and the digest, size and date share col-md-6. A
     third child has to take its width from one of them, and the digest sits in
     a wrapper with overflow:hidden and min-width:0 — so the digest is what
     collapses, and the sha disappears. File names are far narrower than the
     half row they're given, so let that cell size to its own content: the
     button lands in slack the row already had, and nothing has to shrink. */
  li[${ROW}] > div:first-child {
    width: auto;
    flex: 0 1 auto;
    min-width: 0;
  }

  [${ALL_ROW}] { display: flex; align-items: center; gap: 10px; }
  [${ALL_ROW}] .note { font-size: 12px; color: var(--fgColor-muted, #848d97); }
`;
  // Persistence via UserUtils' DataStore: it owns the GM storage keys, the format
  // version and the migration chain.
  const store = new DataStore({
      id: 'gh-releases-install',
      defaultData: { headers: {}, hintSeen: false },
      formatVersion: 2,
      engine: new GMStorageEngine(),
      compressionFormat: null,
      migrations: {
          // v1 also kept `installed`, our own record of clicks; the beacons made it
          // redundant, and a stale record is worse than none.
          2: (old) => ({ headers: old.headers ?? {}, hintSeen: Boolean(old.hintSeen) }),
      },
  });
  let data = { headers: {}, hintSeen: false };
  let loaded = false;
  function save() {
      // Fire and forget: the in-memory copy is what the page renders from, and a
      // storage failure must not take the buttons down.
      store.setData(data).catch((e) => console.error('[releases-install] save failed', e));
  }
  store
      .loadData()
      .then((saved) => {
      // Field-wise, and ours wins: rendering starts before this resolves, so a
      // header read or an install click may already have written to `data`.
      data = {
          headers: { ...saved.headers, ...data.headers },
          hintSeen: saved.hintSeen || data.hintSeen,
      };
  })
      .catch((e) => console.error('[releases-install] load failed', e))
      .finally(() => {
      loaded = true;
      render();
  });
  const ASSET_PATH = /^\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/([^/]+\.user\.js)$/;
  /** Every `.user.js` asset row rendered right now, one entry per asset URL. */
  function assetsOnPage() {
      const assets = new Map();
      for (const link of document.querySelectorAll('a[href*="/releases/download/"]')) {
          const href = link.getAttribute('href') || '';
          const match = ASSET_PATH.exec(href.split(/[?#]/)[0]);
          if (!match)
              continue;
          const row = link.closest('li');
          const list = row?.closest('ul');
          if (!row || !list)
              continue;
          const [, owner, repo, tag, file] = match;
          const url = new URL(href, location.origin).href;
          // A row can carry more than one link to the same asset; first one wins.
          if (!assets.has(url)) {
              assets.set(url, { url, key: `${owner}/${repo}/${file}`, file, tag, row, list });
          }
      }
      return [...assets.values()];
  }
  // ────────────────────────────────────────────────────────────────────────
  //  What is running on this page. Every script built from this repo announces
  //  itself with a <meta name="userscript-beacon"> tag (see the note up top).
  //  Seen tags are kept in memory: GitHub's soft navigation rewrites <head>,
  //  but a script that announced once is still running in this document.
  // ────────────────────────────────────────────────────────────────────────
  const beacons = new Map();
  /** A manager identifies a script by @namespace + @name; so do we. */
  function identity(namespace, name) {
      return `${namespace}\u0000${name}`;
  }
  function collectBeacons() {
      for (const tag of document.querySelectorAll(`meta[name="${BEACON_TAG}"]`)) {
          const { name = '', namespace = '', version = '' } = tag.dataset;
          if (!name && !namespace)
              continue;
          beacons.set(identity(namespace, name), { name, namespace, version });
      }
  }
  /** Assets whose tab was opened in this page's lifetime, and what that tab was
   *  for. In memory only: whether it took is the beacon's to say, after a reload. */
  const pending = new Map();
  function stateOf(asset) {
      const header = data.headers[asset.url];
      const inFlight = pending.get(asset.url);
      if (inFlight) {
          return {
              state: 'pending',
              label: inFlight === 'update' ? 'Updating…' : 'Installing…',
              title: `${asset.file} — a tab was opened to ${inFlight} it. Reload this page to see whether it took.`,
          };
      }
      if (!header) {
          return { state: 'install', label: 'Install', title: `${asset.file} — reading its version…` };
      }
      if (!header.downloadURL) {
          return {
              state: 'blocked',
              label: `No install URL`,
              title: `${header.name} ${header.version} declares no @downloadURL, and the release asset is ` +
                  `served as a download rather than a page, so there is nothing a userscript manager ` +
                  `can install from. Click to copy the asset URL.`,
          };
      }
      const running = beacons.get(identity(header.namespace, header.name));
      if (!running) {
          return {
              state: 'install',
              label: `Install ${header.version}`,
              title: `New here — ${header.name} ${header.version} is not running on this page (not installed, ` +
                  `disabled, or a script that doesn't announce itself). Installs from ${header.downloadURL}`,
          };
      }
      const order = compareVersions(header.version, running.version);
      if (order === 0) {
          return {
              state: 'installed',
              label: `Installed ${running.version}`,
              title: `Installed and up to date — ${running.name} ${running.version} is running on this page. ` +
                  `Nothing to update; click only if you want to reinstall the same version.`,
          };
      }
      if (order > 0) {
          return {
              state: 'update',
              label: `Update → ${header.version}`,
              title: `Installed, but out of date — you have ${running.version} running and this release has ` +
                  `${header.version}. Click to open your manager's update page: it matches @namespace + ` +
                  `@name, so it updates in place rather than installing a second copy.`,
          };
      }
      return {
          state: 'older',
          label: `Older ${header.version}`,
          title: `Installed and newer — you have ${running.version} running and this release only has ` +
              `${header.version}, so there is nothing to update. Click only to go back to the older one.`,
      };
  }
  /** What clicking this row would do, if anything: install a script that isn't
   *  here yet, or update one that is. Every other state is nothing to do. */
  function actionFor(asset) {
      const state = stateOf(asset).state;
      return state === 'install' || state === 'update' ? state : null;
  }
  /** How many of a list's rows are new, and how many are installed but behind. */
  function tallyOf(assets) {
      const tally = { install: 0, update: 0 };
      for (const asset of assets) {
          const action = actionFor(asset);
          if (action)
              tally[action]++;
      }
      return tally;
  }
  /** A manager turns a .user.js navigation into its install page, but only if it
   *  can still see the navigation. Chrome's MV3 needs that switched on by hand. */
  function hintOnce() {
      if (data.hintSeen)
          return;
      data.hintSeen = true;
      save();
      toast({
          text: 'If that tab shows the script as plain text instead of offering to install it, your ' +
              'manager could not intercept the URL. On Chrome, turn on "Allow user scripts" on the ' +
              "extension's own details page (Developer mode before Chrome 138), or paste the URL into " +
              'the dashboard\'s "Install from URL".',
          duration: 20_000,
      });
  }
  /** Where a script can actually be installed from, or null if nowhere.
   *  Reads the asset's header first, retrying a read that failed earlier. */
  async function installURL(asset) {
      if (!data.headers[asset.url])
          reads.delete(asset.url);
      const header = await readHeader(asset);
      return header?.downloadURL ?? null;
  }
  async function install(asset, background = false) {
      // Read the verb before pending hides it, so the row can say which it is.
      const action = actionFor(asset) ?? 'install';
      // Shown while the header read is in flight, so a click is never silent.
      pending.set(asset.url, action);
      render();
      const url = await installURL(asset);
      if (!url) {
          pending.delete(asset.url);
          render();
          // The asset itself is served as an attachment. Opening it would save a file
          // and install nothing, which is the one outcome worth refusing outright.
          toast({
              text: `Could not work out where to install ${asset.file} from. Its release asset is served ` +
                  `as a download, not as a page, so opening it would only save a file.`,
              duration: 12_000,
          });
          return;
      }
      GM.openInTab(url, background);
      hintOnce();
      // Whatever the manager does with that tab, this page can't see it: a newly
      // installed script only announces itself on the next load.
      render();
  }
  /** Nothing to install from: hand over the URL so it can be pasted into the
   *  manager's own "Install from URL", which accepts what a browser won't render. */
  function copyAssetURL(asset) {
      // navigator.clipboard is absent outside a secure context and can throw on
      // access, so showing the URL has to work even when copying it can't.
      const show = () => toast({ text: asset.url, duration: 20_000 });
      try {
          navigator.clipboard
              ?.writeText(asset.url)
              .then(() => toast({ text: `Copied the asset URL for ${asset.file}.` }))
              .catch(show) ?? show();
      }
      catch {
          show();
      }
  }
  function installAll(list) {
      const todo = assetsOnPage().filter((a) => a.list === list && actionFor(a));
      if (!todo.length)
          return;
      toast({
          text: `Opening ${phrase(tallyOf(todo))} — confirm each in its own tab.`,
          duration: 6_000,
      });
      // Staggered: managers queue their install pages badly when a burst of tabs
      // opens at once, and the browser treats it as a popup flood.
      todo.forEach((asset, i) => setTimeout(() => install(asset, true), i * 700));
  }
  /** "2 installs and 1 update", keeping the two words for what each one is. */
  function phrase({ install, update }) {
      const parts = [];
      if (install)
          parts.push(`${install} install${install === 1 ? '' : 's'}`);
      if (update)
          parts.push(`${update} update${update === 1 ? '' : 's'}`);
      return parts.join(' and ');
  }
  /** Header reads by asset URL: in flight, done, or failed. A failed read stays
   *  in the map so render(), which runs on every DOM mutation, can't turn one
   *  dead host into a request storm; clicking Install clears it to try again. */
  const reads = new Map();
  function field(text, key) {
      return new RegExp(`^//\\s*@${key}\\s+(.+)$`, 'm').exec(text)?.[1]?.trim() ?? '';
  }
  /** Read the metadata block out of an asset. Resolves null if it can't be read. */
  function readHeader(asset) {
      const cached = data.headers[asset.url];
      if (cached)
          return Promise.resolve(cached);
      const existing = reads.get(asset.url);
      if (existing)
          return existing;
      const read = new Promise((resolve) => {
          GM.xmlHttpRequest({
              method: 'GET',
              url: asset.url,
              // The metadata block is the first few lines; no need for the whole bundle
              // (a server that ignores the range just sends everything, which still works).
              headers: { Range: 'bytes=0-4095' },
              onload: (res) => {
                  // GM routes HTTP errors here too, and an error body is not a userscript.
                  if (res.status >= 400) {
                      console.warn('[releases-install] could not read', asset.url, res.status);
                      return resolve(null);
                  }
                  const text = res.responseText || '';
                  const version = field(text, 'version');
                  if (!version)
                      return resolve(null);
                  const header = {
                      name: field(text, 'name') || asset.file,
                      namespace: field(text, 'namespace'),
                      version,
                      downloadURL: field(text, 'downloadURL') || null,
                  };
                  data.headers[asset.url] = header;
                  save();
                  render();
                  resolve(header);
              },
              onerror: () => {
                  // Nearly always @connect: GM checks the final URL of a redirect too.
                  console.warn('[releases-install] could not reach', asset.url);
                  resolve(null);
              },
          });
      });
      reads.set(asset.url, read);
      return read;
  }
  function ensureStyle() {
      if (document.getElementById(STYLE))
          return;
      const style = document.createElement('style');
      style.id = STYLE;
      style.textContent = CSS;
      document.head.appendChild(style);
  }
  function button(asset) {
      const { state, label, title } = stateOf(asset);
      const existing = asset.row.querySelector(`[${BUTTON}]`);
      // Rewriting on every mutation would loop: we're inside a MutationObserver.
      if (existing && existing.textContent === label && existing.dataset.state === state)
          return;
      const btn = existing ?? document.createElement('button');
      btn.setAttribute(BUTTON, asset.key);
      btn.type = 'button';
      btn.dataset.state = state;
      btn.textContent = label;
      btn.title = title;
      if (!existing) {
          btn.addEventListener('click', (e) => {
              e.preventDefault();
              if (stateOf(asset).state === 'blocked')
                  return copyAssetURL(asset);
              install(asset);
          });
          // At the end of the row, after GitHub's own columns — not beside the file
          // name, whose cell is col-12 below the lg breakpoint. The marker lets the
          // stylesheet above reclaim that cell's unused width for the button, so the
          // digest beside it keeps its own.
          asset.row.setAttribute(ROW, '');
          asset.row.appendChild(btn);
      }
  }
  function allRow(list, tally) {
      const existing = list.querySelector(`[${ALL_ROW}]`);
      const { install, update } = tally;
      // Say which of the two it would do, and how many of each — "missing" counted
      // updates as missing, which they are not: those scripts are already here.
      const label = install
          ? update
              ? `Install ${install} missing, update ${update}`
              : `Install ${install} missing`
          : update
              ? `Update ${update}`
              : 'Everything here is installed and up to date';
      if (existing?.dataset.label === label)
          return;
      const row = existing ?? document.createElement('li');
      row.setAttribute(ALL_ROW, 'true');
      row.dataset.label = label;
      // Borrow the assets list's own row class so it lines up with the real rows.
      row.className = list.querySelector('li')?.className || '';
      row.replaceChildren();
      const btn = document.createElement('button');
      btn.setAttribute(BUTTON, 'all');
      btn.type = 'button';
      btn.dataset.state = install ? 'install' : update ? 'update' : 'installed';
      btn.textContent = label;
      btn.disabled = install + update === 0;
      btn.addEventListener('click', () => installAll(list));
      row.appendChild(btn);
      const note = document.createElement('span');
      note.className = 'note';
      note.textContent = 'Opens one tab each — confirm them in your userscript manager.';
      row.appendChild(note);
      if (!existing)
          list.appendChild(row);
  }
  function render() {
      // Before storage answers, no header is cached and every row would read a
      // bare "Install" — a label that would then flip under the pointer.
      if (!loaded)
          return;
      const assets = assetsOnPage();
      if (!assets.length)
          return;
      ensureStyle();
      collectBeacons();
      const lists = new Map();
      for (const asset of assets) {
          readHeader(asset);
          button(asset);
          lists.set(asset.list, [...(lists.get(asset.list) ?? []), asset]);
      }
      for (const [list, own] of lists)
          allRow(list, tallyOf(own));
  }
  // Assets live behind a lazily-loaded <include-fragment>, so the rows appear
  // well after load — on the releases index, only once a release is expanded.
  observeDom(render);

})();
