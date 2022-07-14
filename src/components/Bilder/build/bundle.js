
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached if target is not <head>
        let children = target.childNodes;
        // If target is <head>, there may be children without claim_order
        if (target.nodeName === 'HEAD') {
            const myChildren = [];
            for (let i = 0; i < children.length; i++) {
                const node = children[i];
                if (node.claim_order !== undefined) {
                    myChildren.push(node);
                }
            }
            children = myChildren;
        }
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            // with fast path for when we are on the current longest subsequence
            const seqLen = ((longest > 0 && children[m[longest]].claim_order <= current) ? longest + 1 : upper_bound(1, longest, idx => children[m[idx]].claim_order, current)) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append_hydration(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            // Skip nodes of undefined ordering
            while ((target.actual_end_child !== null) && (target.actual_end_child.claim_order === undefined)) {
                target.actual_end_child = target.actual_end_child.nextSibling;
            }
            if (node !== target.actual_end_child) {
                // We only insert if the ordering of this node should be modified or the parent node is not target
                if (node.claim_order !== undefined || node.parentNode !== target) {
                    target.insertBefore(node, target.actual_end_child);
                }
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target || node.nextSibling !== null) {
            target.appendChild(node);
        }
    }
    function insert_hydration(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append_hydration(target, node);
        }
        else if (node.parentNode !== target || node.nextSibling != anchor) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = typeof node[prop] === 'boolean' && value === '' ? true : value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function init_claim_info(nodes) {
        if (nodes.claim_info === undefined) {
            nodes.claim_info = { last_index: 0, total_claimed: 0 };
        }
    }
    function claim_node(nodes, predicate, processNode, createNode, dontUpdateLastIndex = false) {
        // Try to find nodes in an order such that we lengthen the longest increasing subsequence
        init_claim_info(nodes);
        const resultNode = (() => {
            // We first try to find an element after the previous one
            for (let i = nodes.claim_info.last_index; i < nodes.length; i++) {
                const node = nodes[i];
                if (predicate(node)) {
                    const replacement = processNode(node);
                    if (replacement === undefined) {
                        nodes.splice(i, 1);
                    }
                    else {
                        nodes[i] = replacement;
                    }
                    if (!dontUpdateLastIndex) {
                        nodes.claim_info.last_index = i;
                    }
                    return node;
                }
            }
            // Otherwise, we try to find one before
            // We iterate in reverse so that we don't go too far back
            for (let i = nodes.claim_info.last_index - 1; i >= 0; i--) {
                const node = nodes[i];
                if (predicate(node)) {
                    const replacement = processNode(node);
                    if (replacement === undefined) {
                        nodes.splice(i, 1);
                    }
                    else {
                        nodes[i] = replacement;
                    }
                    if (!dontUpdateLastIndex) {
                        nodes.claim_info.last_index = i;
                    }
                    else if (replacement === undefined) {
                        // Since we spliced before the last_index, we decrease it
                        nodes.claim_info.last_index--;
                    }
                    return node;
                }
            }
            // If we can't find any matching node, we create a new one
            return createNode();
        })();
        resultNode.claim_order = nodes.claim_info.total_claimed;
        nodes.claim_info.total_claimed += 1;
        return resultNode;
    }
    function claim_element_base(nodes, name, attributes, create_element) {
        return claim_node(nodes, (node) => node.nodeName === name, (node) => {
            const remove = [];
            for (let j = 0; j < node.attributes.length; j++) {
                const attribute = node.attributes[j];
                if (!attributes[attribute.name]) {
                    remove.push(attribute.name);
                }
            }
            remove.forEach(v => node.removeAttribute(v));
            return undefined;
        }, () => create_element(name));
    }
    function claim_element(nodes, name, attributes) {
        return claim_element_base(nodes, name, attributes, element);
    }
    function claim_svg_element(nodes, name, attributes) {
        return claim_element_base(nodes, name, attributes, svg_element);
    }
    function claim_text(nodes, data) {
        return claim_node(nodes, (node) => node.nodeType === 3, (node) => {
            const dataStr = '' + data;
            if (node.data.startsWith(dataStr)) {
                if (node.data.length !== dataStr.length) {
                    return node.splitText(dataStr.length);
                }
            }
            else {
                node.data = dataStr;
            }
        }, () => text(data), true // Text nodes should not update last index since it is likely not worth it to eliminate an increasing subsequence of actual elements
        );
    }
    function claim_space(nodes) {
        return claim_text(nodes, ' ');
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
        return context;
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function claim_component(block, parent_nodes) {
        block && block.l(parent_nodes);
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_hydration_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append_hydration(target, node);
    }
    function insert_hydration_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert_hydration(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.48.0 */

    function create_fragment(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[8],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $location;
    	let $routes;
    	let $base;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, ['default']);
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	validate_store(routes, 'routes');
    	component_subscribe($$self, routes, value => $$invalidate(6, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(5, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	validate_store(base, 'base');
    	component_subscribe($$self, base, value => $$invalidate(7, $base = value));

    	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    		// If there is no activeRoute, the routerBase will be identical to the base.
    		if (activeRoute === null) {
    			return base;
    		}

    		const { path: basepath } = base;
    		const { route, uri } = activeRoute;

    		// Remove the potential /* or /*splatname from
    		// the end of the child Routes relative paths.
    		const path = route.default
    		? basepath
    		: route.path.replace(/\*.*$/, "");

    		return { path, uri };
    	});

    	function registerRoute(route) {
    		const { path: basepath } = $base;
    		let { path } = route;

    		// We store the original path in the _path property so we can reuse
    		// it when the basepath changes. The only thing that matters is that
    		// the route reference is intact, so mutation is fine.
    		route._path = path;

    		route.path = combinePaths(basepath, path);

    		if (typeof window === "undefined") {
    			// In SSR we should set the activeRoute immediately if it is a match.
    			// If there are more Routes being registered after a match is found,
    			// we just skip them.
    			if (hasActiveRoute) {
    				return;
    			}

    			const matchingRoute = match(route, $location.pathname);

    			if (matchingRoute) {
    				activeRoute.set(matchingRoute);
    				hasActiveRoute = true;
    			}
    		} else {
    			routes.update(rs => {
    				rs.push(route);
    				return rs;
    			});
    		}
    	}

    	function unregisterRoute(route) {
    		routes.update(rs => {
    			const index = rs.indexOf(route);
    			rs.splice(index, 1);
    			return rs;
    		});
    	}

    	if (!locationContext) {
    		// The topmost Router in the tree is responsible for updating
    		// the location store and supplying it through context.
    		onMount(() => {
    			const unlisten = globalHistory.listen(history => {
    				location.set(history.location);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute
    	});

    	const writable_props = ['basepath', 'url'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('basepath' in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(4, url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		onMount,
    		writable,
    		derived,
    		LOCATION,
    		ROUTER,
    		globalHistory,
    		pick,
    		match,
    		stripSlashes,
    		combinePaths,
    		basepath,
    		url,
    		locationContext,
    		routerContext,
    		routes,
    		activeRoute,
    		hasActiveRoute,
    		location,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute,
    		$location,
    		$routes,
    		$base
    	});

    	$$self.$inject_state = $$props => {
    		if ('basepath' in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(4, url = $$props.url);
    		if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 128) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			 {
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 96) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			 {
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [
    		routes,
    		location,
    		base,
    		basepath,
    		url,
    		$location,
    		$routes,
    		$base,
    		$$scope,
    		slots
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.48.0 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 4,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[2],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_hydration_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, routeParams, $location*/ 532)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[9],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[9], dirty, get_default_slot_changes),
    						get_default_slot_context
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[2],
    		/*routeProps*/ ctx[3]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (switch_instance) claim_component(switch_instance.$$.fragment, nodes);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_hydration_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 28)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && { location: /*$location*/ ctx[4] },
    					dirty & /*routeParams*/ 4 && get_spread_object(/*routeParams*/ ctx[2]),
    					dirty & /*routeProps*/ 8 && get_spread_object(/*routeProps*/ ctx[3])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			if (if_block) if_block.l(nodes);
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_hydration_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$activeRoute*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Route', slots, ['default']);
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, 'activeRoute');
    	component_subscribe($$self, activeRoute, value => $$invalidate(1, $activeRoute = value));
    	const location = getContext(LOCATION);
    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));

    	const route = {
    		path,
    		// If no path prop is given, this Route will act as the default Route
    		// that is rendered if no other Route in the Router is a match.
    		default: path === ""
    	};

    	let routeParams = {};
    	let routeProps = {};
    	registerRoute(route);

    	// There is no need to unregister Routes in SSR since it will all be
    	// thrown away anyway.
    	if (typeof window !== "undefined") {
    		onDestroy(() => {
    			unregisterRoute(route);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('path' in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		onDestroy,
    		ROUTER,
    		LOCATION,
    		path,
    		component,
    		registerRoute,
    		unregisterRoute,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate(8, path = $$new_props.path);
    		if ('component' in $$props) $$invalidate(0, component = $$new_props.component);
    		if ('routeParams' in $$props) $$invalidate(2, routeParams = $$new_props.routeParams);
    		if ('routeProps' in $$props) $$invalidate(3, routeProps = $$new_props.routeProps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 2) {
    			 if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(2, routeParams = $activeRoute.params);
    			}
    		}

    		 {
    			const { path, component, ...rest } = $$props;
    			$$invalidate(3, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		$activeRoute,
    		routeParams,
    		routeProps,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		$$scope,
    		slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/modal/einstellungen.svelte generated by Svelte v3.48.0 */

    const file = "src/components/modal/einstellungen.svelte";

    function create_fragment$2(ctx) {
    	let groupui_notification;
    	let t0;
    	let t1;
    	let div12;
    	let div6;
    	let div0;
    	let t2;
    	let t3;
    	let div1;
    	let t4;
    	let t5;
    	let div2;
    	let t6;
    	let t7;
    	let div3;
    	let t8;
    	let t9;
    	let div4;
    	let t10;
    	let t11;
    	let div5;
    	let t12;
    	let t13;
    	let div7;
    	let p0;
    	let t14;
    	let t15;
    	let div8;
    	let p1;
    	let t16;
    	let t17;
    	let groupui_input0;
    	let span0;
    	let t18;
    	let groupui_input0_pattern_value;
    	let t19;
    	let groupui_input1;
    	let span1;
    	let t20;
    	let groupui_input1_pattern_value;
    	let t21;
    	let groupui_input2;
    	let t22;
    	let div9;
    	let p2;
    	let t23;
    	let t24;
    	let groupui_input3;
    	let span2;
    	let t25;
    	let t26;
    	let div10;
    	let p3;
    	let t27;
    	let t28;
    	let div11;
    	let p4;
    	let t29;
    	let t30;
    	let br;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			groupui_notification = element("groupui-notification");
    			t0 = text(/*notificationinhalt*/ ctx[1]);
    			t1 = space();
    			div12 = element("div");
    			div6 = element("div");
    			div0 = element("div");
    			t2 = text("1");
    			t3 = space();
    			div1 = element("div");
    			t4 = text("Einstellungen");
    			t5 = space();
    			div2 = element("div");
    			t6 = text("Passwort zurücksetzen");
    			t7 = space();
    			div3 = element("div");
    			t8 = text("Handynummer ändern");
    			t9 = space();
    			div4 = element("div");
    			t10 = text("User Settings");
    			t11 = space();
    			div5 = element("div");
    			t12 = text("User Settings");
    			t13 = space();
    			div7 = element("div");
    			p0 = element("p");
    			t14 = text("default");
    			t15 = space();
    			div8 = element("div");
    			p1 = element("p");
    			t16 = text("Passwort zurücksetzen");
    			t17 = space();
    			groupui_input0 = element("groupui-input");
    			span0 = element("span");
    			t18 = text("neues Passwort eingeben");
    			t19 = space();
    			groupui_input1 = element("groupui-input");
    			span1 = element("span");
    			t20 = text("Passwort wiederholen");
    			t21 = space();
    			groupui_input2 = element("groupui-input");
    			t22 = space();
    			div9 = element("div");
    			p2 = element("p");
    			t23 = text("Handynummer ändern");
    			t24 = space();
    			groupui_input3 = element("groupui-input");
    			span2 = element("span");
    			t25 = text("neue Nummer eingeben");
    			t26 = space();
    			div10 = element("div");
    			p3 = element("p");
    			t27 = text("4");
    			t28 = space();
    			div11 = element("div");
    			p4 = element("p");
    			t29 = text("5");
    			t30 = space();
    			br = element("br");
    			this.h();
    		},
    		l: function claim(nodes) {
    			groupui_notification = claim_element(nodes, "GROUPUI-NOTIFICATION", {
    				dismissible: true,
    				style: true,
    				id: true,
    				severity: true
    			});

    			var groupui_notification_nodes = children(groupui_notification);
    			t0 = claim_text(groupui_notification_nodes, /*notificationinhalt*/ ctx[1]);
    			groupui_notification_nodes.forEach(detach_dev);
    			t1 = claim_space(nodes);
    			div12 = claim_element(nodes, "DIV", {});
    			var div12_nodes = children(div12);
    			div6 = claim_element(div12_nodes, "DIV", { class: true });
    			var div6_nodes = children(div6);
    			div0 = claim_element(div6_nodes, "DIV", { style: true, id: true });
    			var div0_nodes = children(div0);
    			t2 = claim_text(div0_nodes, "1");
    			div0_nodes.forEach(detach_dev);
    			t3 = claim_space(div6_nodes);
    			div1 = claim_element(div6_nodes, "DIV", { id: true, class: true });
    			var div1_nodes = children(div1);
    			t4 = claim_text(div1_nodes, "Einstellungen");
    			div1_nodes.forEach(detach_dev);
    			t5 = claim_space(div6_nodes);
    			div2 = claim_element(div6_nodes, "DIV", { id: true, class: true });
    			var div2_nodes = children(div2);
    			t6 = claim_text(div2_nodes, "Passwort zurücksetzen");
    			div2_nodes.forEach(detach_dev);
    			t7 = claim_space(div6_nodes);
    			div3 = claim_element(div6_nodes, "DIV", { id: true, class: true });
    			var div3_nodes = children(div3);
    			t8 = claim_text(div3_nodes, "Handynummer ändern");
    			div3_nodes.forEach(detach_dev);
    			t9 = claim_space(div6_nodes);
    			div4 = claim_element(div6_nodes, "DIV", { id: true, class: true });
    			var div4_nodes = children(div4);
    			t10 = claim_text(div4_nodes, "User Settings");
    			div4_nodes.forEach(detach_dev);
    			t11 = claim_space(div6_nodes);
    			div5 = claim_element(div6_nodes, "DIV", { id: true, class: true });
    			var div5_nodes = children(div5);
    			t12 = claim_text(div5_nodes, "User Settings");
    			div5_nodes.forEach(detach_dev);
    			div6_nodes.forEach(detach_dev);
    			t13 = claim_space(div12_nodes);
    			div7 = claim_element(div12_nodes, "DIV", { style: true, id: true, class: true });
    			var div7_nodes = children(div7);
    			p0 = claim_element(div7_nodes, "P", {});
    			var p0_nodes = children(p0);
    			t14 = claim_text(p0_nodes, "default");
    			p0_nodes.forEach(detach_dev);
    			div7_nodes.forEach(detach_dev);
    			t15 = claim_space(div12_nodes);
    			div8 = claim_element(div12_nodes, "DIV", { id: true, class: true });
    			var div8_nodes = children(div8);
    			p1 = claim_element(div8_nodes, "P", {});
    			var p1_nodes = children(p1);
    			t16 = claim_text(p1_nodes, "Passwort zurücksetzen");
    			p1_nodes.forEach(detach_dev);
    			t17 = claim_space(div8_nodes);

    			groupui_input0 = claim_element(div8_nodes, "GROUPUI-INPUT", {
    				id: true,
    				placeholder: true,
    				maxlength: true,
    				pattern: true,
    				inverted: true,
    				type: true
    			});

    			var groupui_input0_nodes = children(groupui_input0);
    			span0 = claim_element(groupui_input0_nodes, "SPAN", { slot: true });
    			var span0_nodes = children(span0);
    			t18 = claim_text(span0_nodes, "neues Passwort eingeben");
    			span0_nodes.forEach(detach_dev);
    			groupui_input0_nodes.forEach(detach_dev);
    			t19 = claim_space(div8_nodes);

    			groupui_input1 = claim_element(div8_nodes, "GROUPUI-INPUT", {
    				id: true,
    				placeholder: true,
    				maxlength: true,
    				pattern: true,
    				inverted: true,
    				type: true
    			});

    			var groupui_input1_nodes = children(groupui_input1);
    			span1 = claim_element(groupui_input1_nodes, "SPAN", { slot: true });
    			var span1_nodes = children(span1);
    			t20 = claim_text(span1_nodes, "Passwort wiederholen");
    			span1_nodes.forEach(detach_dev);
    			groupui_input1_nodes.forEach(detach_dev);
    			t21 = claim_space(div8_nodes);
    			groupui_input2 = claim_element(div8_nodes, "GROUPUI-INPUT", { id: true, style: true });
    			var groupui_input2_nodes = children(groupui_input2);
    			groupui_input2_nodes.forEach(detach_dev);
    			div8_nodes.forEach(detach_dev);
    			t22 = claim_space(div12_nodes);
    			div9 = claim_element(div12_nodes, "DIV", { id: true, class: true });
    			var div9_nodes = children(div9);
    			p2 = claim_element(div9_nodes, "P", {});
    			var p2_nodes = children(p2);
    			t23 = claim_text(p2_nodes, "Handynummer ändern");
    			p2_nodes.forEach(detach_dev);
    			t24 = claim_space(div9_nodes);

    			groupui_input3 = claim_element(div9_nodes, "GROUPUI-INPUT", {
    				id: true,
    				placeholder: true,
    				maxlength: true,
    				inverted: true,
    				type: true
    			});

    			var groupui_input3_nodes = children(groupui_input3);
    			span2 = claim_element(groupui_input3_nodes, "SPAN", { slot: true });
    			var span2_nodes = children(span2);
    			t25 = claim_text(span2_nodes, "neue Nummer eingeben");
    			span2_nodes.forEach(detach_dev);
    			groupui_input3_nodes.forEach(detach_dev);
    			div9_nodes.forEach(detach_dev);
    			t26 = claim_space(div12_nodes);
    			div10 = claim_element(div12_nodes, "DIV", { id: true, class: true });
    			var div10_nodes = children(div10);
    			p3 = claim_element(div10_nodes, "P", {});
    			var p3_nodes = children(p3);
    			t27 = claim_text(p3_nodes, "4");
    			p3_nodes.forEach(detach_dev);
    			div10_nodes.forEach(detach_dev);
    			t28 = claim_space(div12_nodes);
    			div11 = claim_element(div12_nodes, "DIV", { id: true, class: true });
    			var div11_nodes = children(div11);
    			p4 = claim_element(div11_nodes, "P", {});
    			var p4_nodes = children(p4);
    			t29 = claim_text(p4_nodes, "5");
    			p4_nodes.forEach(detach_dev);
    			div11_nodes.forEach(detach_dev);
    			div12_nodes.forEach(detach_dev);
    			t30 = claim_space(nodes);
    			br = claim_element(nodes, "BR", {});
    			this.h();
    		},
    		h: function hydrate() {
    			set_custom_element_data(groupui_notification, "dismissible", "false");
    			set_style(groupui_notification, "display", "none");
    			set_style(groupui_notification, "position", "fixed");
    			set_custom_element_data(groupui_notification, "id", "einstellungen_notification");
    			set_custom_element_data(groupui_notification, "severity", /*notificationstyle*/ ctx[0]);
    			add_location(groupui_notification, file, 74, 0, 2035);
    			set_style(div0, "display", "none");
    			attr_dev(div0, "id", "einstellungen_selected");
    			add_location(div0, file, 81, 3, 2301);
    			attr_dev(div1, "id", "einstellungen_select_1");
    			attr_dev(div1, "class", "einstellungen-side-bar-elements");
    			add_location(div1, file, 82, 3, 2367);
    			attr_dev(div2, "id", "einstellungen_select_2");
    			attr_dev(div2, "class", "einstellungen-side-bar-elements");
    			add_location(div2, file, 83, 3, 2489);
    			attr_dev(div3, "id", "einstellungen_select_3");
    			attr_dev(div3, "class", "einstellungen-side-bar-elements");
    			add_location(div3, file, 84, 3, 2619);
    			attr_dev(div4, "id", "einstellungen_select_4");
    			attr_dev(div4, "class", "einstellungen-side-bar-elements");
    			add_location(div4, file, 85, 3, 2746);
    			attr_dev(div5, "id", "einstellungen_select_5");
    			attr_dev(div5, "class", "einstellungen-side-bar-elements");
    			add_location(div5, file, 86, 3, 2868);
    			attr_dev(div6, "class", "einstellungen-side-bar");
    			add_location(div6, file, 80, 2, 2261);
    			add_location(p0, file, 89, 3, 3091);
    			set_style(div7, "display", "block");
    			attr_dev(div7, "id", "einstellungen_selected_1");
    			attr_dev(div7, "class", "einstellungen-selected");
    			add_location(div7, file, 88, 2, 2999);
    			add_location(p1, file, 94, 3, 3189);
    			attr_dev(span0, "slot", "label");
    			add_location(span0, file, 96, 4, 3388);
    			set_custom_element_data(groupui_input0, "id", "passwortwechseln1");
    			set_custom_element_data(groupui_input0, "placeholder", "Passwort123");
    			set_custom_element_data(groupui_input0, "maxlength", "16");
    			set_custom_element_data(groupui_input0, "pattern", groupui_input0_pattern_value = "[A-Za-z]" + 3);
    			set_custom_element_data(groupui_input0, "inverted", "false");
    			set_custom_element_data(groupui_input0, "type", "password");
    			add_location(groupui_input0, file, 95, 3, 3221);
    			attr_dev(span1, "slot", "label");
    			add_location(span1, file, 99, 4, 3627);
    			set_custom_element_data(groupui_input1, "id", "passwortwechseln2");
    			set_custom_element_data(groupui_input1, "placeholder", "Passwort123");
    			set_custom_element_data(groupui_input1, "maxlength", "16");
    			set_custom_element_data(groupui_input1, "pattern", groupui_input1_pattern_value = "[A-Za-z]" + 3);
    			set_custom_element_data(groupui_input1, "inverted", "false");
    			set_custom_element_data(groupui_input1, "type", "password");
    			add_location(groupui_input1, file, 98, 3, 3461);
    			set_custom_element_data(groupui_input2, "id", "passwortleer");
    			set_style(groupui_input2, "display", "none");
    			add_location(groupui_input2, file, 101, 3, 3697);
    			attr_dev(div8, "id", "einstellungen_selected_2");
    			attr_dev(div8, "class", "einstellungen-selected");
    			add_location(div8, file, 93, 2, 3119);
    			add_location(p2, file, 106, 3, 3855);
    			attr_dev(span2, "slot", "label");
    			add_location(span2, file, 108, 4, 4018);
    			set_custom_element_data(groupui_input3, "id", "nummerwechseln");
    			set_custom_element_data(groupui_input3, "placeholder", "12345678");
    			set_custom_element_data(groupui_input3, "maxlength", "16");
    			set_custom_element_data(groupui_input3, "inverted", "false");
    			set_custom_element_data(groupui_input3, "type", "number");
    			add_location(groupui_input3, file, 107, 3, 3884);
    			attr_dev(div9, "id", "einstellungen_selected_3");
    			attr_dev(div9, "class", "einstellungen-selected");
    			add_location(div9, file, 105, 2, 3785);
    			add_location(p3, file, 113, 3, 4167);
    			attr_dev(div10, "id", "einstellungen_selected_4");
    			attr_dev(div10, "class", "einstellungen-selected");
    			add_location(div10, file, 112, 2, 4097);
    			add_location(p4, file, 118, 3, 4259);
    			attr_dev(div11, "id", "einstellungen_selected_5");
    			attr_dev(div11, "class", "einstellungen-selected");
    			add_location(div11, file, 117, 2, 4189);
    			add_location(div12, file, 79, 1, 2228);
    			add_location(br, file, 123, 0, 4287);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, groupui_notification, anchor);
    			append_hydration_dev(groupui_notification, t0);
    			insert_hydration_dev(target, t1, anchor);
    			insert_hydration_dev(target, div12, anchor);
    			append_hydration_dev(div12, div6);
    			append_hydration_dev(div6, div0);
    			append_hydration_dev(div0, t2);
    			append_hydration_dev(div6, t3);
    			append_hydration_dev(div6, div1);
    			append_hydration_dev(div1, t4);
    			append_hydration_dev(div6, t5);
    			append_hydration_dev(div6, div2);
    			append_hydration_dev(div2, t6);
    			append_hydration_dev(div6, t7);
    			append_hydration_dev(div6, div3);
    			append_hydration_dev(div3, t8);
    			append_hydration_dev(div6, t9);
    			append_hydration_dev(div6, div4);
    			append_hydration_dev(div4, t10);
    			append_hydration_dev(div6, t11);
    			append_hydration_dev(div6, div5);
    			append_hydration_dev(div5, t12);
    			append_hydration_dev(div12, t13);
    			append_hydration_dev(div12, div7);
    			append_hydration_dev(div7, p0);
    			append_hydration_dev(p0, t14);
    			append_hydration_dev(div12, t15);
    			append_hydration_dev(div12, div8);
    			append_hydration_dev(div8, p1);
    			append_hydration_dev(p1, t16);
    			append_hydration_dev(div8, t17);
    			append_hydration_dev(div8, groupui_input0);
    			append_hydration_dev(groupui_input0, span0);
    			append_hydration_dev(span0, t18);
    			append_hydration_dev(div8, t19);
    			append_hydration_dev(div8, groupui_input1);
    			append_hydration_dev(groupui_input1, span1);
    			append_hydration_dev(span1, t20);
    			append_hydration_dev(div8, t21);
    			append_hydration_dev(div8, groupui_input2);
    			append_hydration_dev(div12, t22);
    			append_hydration_dev(div12, div9);
    			append_hydration_dev(div9, p2);
    			append_hydration_dev(p2, t23);
    			append_hydration_dev(div9, t24);
    			append_hydration_dev(div9, groupui_input3);
    			append_hydration_dev(groupui_input3, span2);
    			append_hydration_dev(span2, t25);
    			append_hydration_dev(div12, t26);
    			append_hydration_dev(div12, div10);
    			append_hydration_dev(div10, p3);
    			append_hydration_dev(p3, t27);
    			append_hydration_dev(div12, t28);
    			append_hydration_dev(div12, div11);
    			append_hydration_dev(div11, p4);
    			append_hydration_dev(p4, t29);
    			insert_hydration_dev(target, t30, anchor);
    			insert_hydration_dev(target, br, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div1, "click", sidebarselect1, false, false, false),
    					listen_dev(div2, "click", sidebarselect2, false, false, false),
    					listen_dev(div3, "click", sidebarselect3, false, false, false),
    					listen_dev(div4, "click", sidebarselect4, false, false, false),
    					listen_dev(div5, "click", sidebarselect5, false, false, false),
    					listen_dev(groupui_input0, "change", /*passwortändern*/ ctx[2], false, false, false),
    					listen_dev(groupui_input1, "change", /*passwortändern*/ ctx[2], false, false, false),
    					listen_dev(groupui_input3, "change", /*nummerändern*/ ctx[3], false, false, false),
    					listen_dev(div12, "load", sidebarselect1, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*notificationinhalt*/ 2) set_data_dev(t0, /*notificationinhalt*/ ctx[1]);

    			if (dirty & /*notificationstyle*/ 1) {
    				set_custom_element_data(groupui_notification, "severity", /*notificationstyle*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(groupui_notification);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div12);
    			if (detaching) detach_dev(t30);
    			if (detaching) detach_dev(br);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function sidebarselect(zahl) {
    	var aktuellselect = document.getElementById("einstellungen_selected").innerHTML;

    	if (aktuellselect != zahl) {
    		document.getElementById("einstellungen_select_" + aktuellselect).style.backgroundColor = "";
    		document.getElementById("einstellungen_selected_" + aktuellselect).style.display = "none";
    	}

    	document.getElementById("einstellungen_select_" + zahl).style.backgroundColor = "#00354d";
    	document.getElementById("einstellungen_selected_" + zahl).style.display = "block";
    	document.getElementById("einstellungen_selected").innerHTML = zahl;
    }

    function sidebarselect1() {
    	sidebarselect(1);
    }

    function sidebarselect2() {
    	sidebarselect(2);
    }

    function sidebarselect3() {
    	sidebarselect(3);
    }

    function sidebarselect4() {
    	sidebarselect(4);
    }

    function sidebarselect5() {
    	sidebarselect(5);
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Einstellungen', slots, []);

    	function passwortändern() {
    		var passwort1 = document.getElementById("passwortwechseln1").value;
    		var passwort2 = document.getElementById("passwortwechseln2").value;
    		var passwortleer = document.getElementById("passwortwechseln2").value;

    		if (passwort1 == passwort2) {
    			notify("success", "Passwort passt");
    		} else if (passwort1 == passwortleer) {
    			notify("danger", "Passwort 1 bitte eingeben");
    		} else if (passwort2 == passwortleer) {
    			notify("danger", "Passwort 2 bitte eingeben");
    		} else {
    			notify("danger", "Passwort stimmt nicht überein");
    		}
    	}

    	function nummerändern() {
    		var nummer = document.getElementById("nummerwechseln").value;
    		var inputleer = document.getElementById("passwortwechseln2").value;

    		if (nummer == inputleer) {
    			notify("danger", "Nummer bitte eingeben");
    		} else {
    			notify("success", "Nummer geändert");
    		}
    	}

    	function notify(art, inhalt) {
    		document.getElementById("einstellungen_notification").style.display = "block";

    		setTimeout(
    			function () {
    				document.getElementById("einstellungen_notification").style.display = "none";
    			},
    			3000
    		);

    		$$invalidate(0, notificationstyle = art);
    		$$invalidate(1, notificationinhalt = inhalt);
    	}

    	var notificationstyle = "success";
    	var notificationinhalt = "success";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Einstellungen> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		sidebarselect,
    		passwortändern,
    		nummerändern,
    		notify,
    		sidebarselect1,
    		sidebarselect2,
    		sidebarselect3,
    		sidebarselect4,
    		sidebarselect5,
    		notificationstyle,
    		notificationinhalt
    	});

    	$$self.$inject_state = $$props => {
    		if ('notificationstyle' in $$props) $$invalidate(0, notificationstyle = $$props.notificationstyle);
    		if ('notificationinhalt' in $$props) $$invalidate(1, notificationinhalt = $$props.notificationinhalt);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [notificationstyle, notificationinhalt, passwortändern, nummerändern];
    }

    class Einstellungen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Einstellungen",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/vorlagen/Header.svelte generated by Svelte v3.48.0 */
    const file$1 = "src/components/vorlagen/Header.svelte";

    function create_fragment$3(ctx) {
    	let div0;
    	let t0;
    	let groupui_header;
    	let groupui_headline0;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let div4;
    	let a1;
    	let div1;
    	let t2;
    	let t3;
    	let a2;
    	let div2;
    	let t4;
    	let t5;
    	let div3;
    	let t6;
    	let t7;
    	let div11;
    	let div5;
    	let groupui_avatar;
    	let t8;
    	let span;
    	let groupui_headline1;
    	let t9;
    	let t10;
    	let div7;
    	let img1;
    	let img1_src_value;
    	let div6;
    	let groupui_headline2;
    	let t11;
    	let br;
    	let t12;
    	let div9;
    	let img2;
    	let img2_src_value;
    	let div8;
    	let groupui_headline3;
    	let t13;
    	let t14;
    	let groupui_modal;
    	let div10;
    	let p;
    	let t15;
    	let t16;
    	let einstellungen;
    	let current;
    	let mounted;
    	let dispose;
    	einstellungen = new Einstellungen({ $$inline: true });

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			groupui_header = element("groupui-header");
    			groupui_headline0 = element("groupui-headline");
    			a0 = element("a");
    			img0 = element("img");
    			t1 = space();
    			div4 = element("div");
    			a1 = element("a");
    			div1 = element("div");
    			t2 = text("FAQ");
    			t3 = space();
    			a2 = element("a");
    			div2 = element("div");
    			t4 = text("Projekte");
    			t5 = space();
    			div3 = element("div");
    			t6 = text("Sonstiges");
    			t7 = space();
    			div11 = element("div");
    			div5 = element("div");
    			groupui_avatar = element("groupui-avatar");
    			t8 = space();
    			span = element("span");
    			groupui_headline1 = element("groupui-headline");
    			t9 = text("username");
    			t10 = space();
    			div7 = element("div");
    			img1 = element("img");
    			div6 = element("div");
    			groupui_headline2 = element("groupui-headline");
    			t11 = text("Einstellungen");
    			br = element("br");
    			t12 = space();
    			div9 = element("div");
    			img2 = element("img");
    			div8 = element("div");
    			groupui_headline3 = element("groupui-headline");
    			t13 = text("Logout");
    			t14 = space();
    			groupui_modal = element("groupui-modal");
    			div10 = element("div");
    			p = element("p");
    			t15 = text("X");
    			t16 = space();
    			create_component(einstellungen.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div0 = claim_element(nodes, "DIV", { style: true });
    			children(div0).forEach(detach_dev);
    			t0 = claim_space(nodes);
    			groupui_header = claim_element(nodes, "GROUPUI-HEADER", { class: true });
    			var groupui_header_nodes = children(groupui_header);
    			groupui_headline0 = claim_element(groupui_header_nodes, "GROUPUI-HEADLINE", { style: true, heading: true, class: true });
    			var groupui_headline0_nodes = children(groupui_headline0);
    			a0 = claim_element(groupui_headline0_nodes, "A", { class: true, href: true });
    			var a0_nodes = children(a0);
    			img0 = claim_element(a0_nodes, "IMG", { src: true, style: true });
    			a0_nodes.forEach(detach_dev);
    			groupui_headline0_nodes.forEach(detach_dev);
    			t1 = claim_space(groupui_header_nodes);
    			div4 = claim_element(groupui_header_nodes, "DIV", {});
    			var div4_nodes = children(div4);
    			a1 = claim_element(div4_nodes, "A", { class: true, href: true });
    			var a1_nodes = children(a1);
    			div1 = claim_element(a1_nodes, "DIV", { class: true });
    			var div1_nodes = children(div1);
    			t2 = claim_text(div1_nodes, "FAQ");
    			div1_nodes.forEach(detach_dev);
    			a1_nodes.forEach(detach_dev);
    			t3 = claim_space(div4_nodes);
    			a2 = claim_element(div4_nodes, "A", { class: true, href: true });
    			var a2_nodes = children(a2);
    			div2 = claim_element(a2_nodes, "DIV", { class: true });
    			var div2_nodes = children(div2);
    			t4 = claim_text(div2_nodes, "Projekte");
    			div2_nodes.forEach(detach_dev);
    			a2_nodes.forEach(detach_dev);
    			t5 = claim_space(div4_nodes);
    			div3 = claim_element(div4_nodes, "DIV", { class: true });
    			var div3_nodes = children(div3);
    			t6 = claim_text(div3_nodes, "Sonstiges");
    			div3_nodes.forEach(detach_dev);
    			div4_nodes.forEach(detach_dev);
    			t7 = claim_space(groupui_header_nodes);
    			div11 = claim_element(groupui_header_nodes, "DIV", { class: true, style: true });
    			var div11_nodes = children(div11);
    			div5 = claim_element(div11_nodes, "DIV", { style: true });
    			var div5_nodes = children(div5);
    			groupui_avatar = claim_element(div5_nodes, "GROUPUI-AVATAR", { class: true, theme: true });
    			children(groupui_avatar).forEach(detach_dev);
    			div5_nodes.forEach(detach_dev);
    			t8 = claim_space(div11_nodes);
    			span = claim_element(div11_nodes, "SPAN", { style: true, id: true, class: true });
    			var span_nodes = children(span);
    			groupui_headline1 = claim_element(span_nodes, "GROUPUI-HEADLINE", { heading: true, class: true });
    			var groupui_headline1_nodes = children(groupui_headline1);
    			t9 = claim_text(groupui_headline1_nodes, "username");
    			groupui_headline1_nodes.forEach(detach_dev);
    			t10 = claim_space(span_nodes);
    			div7 = claim_element(span_nodes, "DIV", {});
    			var div7_nodes = children(div7);
    			img1 = claim_element(div7_nodes, "IMG", { src: true, class: true });
    			div6 = claim_element(div7_nodes, "DIV", { class: true });
    			var div6_nodes = children(div6);
    			groupui_headline2 = claim_element(div6_nodes, "GROUPUI-HEADLINE", { heading: true, class: true });
    			var groupui_headline2_nodes = children(groupui_headline2);
    			t11 = claim_text(groupui_headline2_nodes, "Einstellungen");
    			groupui_headline2_nodes.forEach(detach_dev);
    			div6_nodes.forEach(detach_dev);
    			div7_nodes.forEach(detach_dev);
    			br = claim_element(span_nodes, "BR", {});
    			t12 = claim_space(span_nodes);
    			div9 = claim_element(span_nodes, "DIV", {});
    			var div9_nodes = children(div9);
    			img2 = claim_element(div9_nodes, "IMG", { src: true, class: true });
    			div8 = claim_element(div9_nodes, "DIV", { class: true });
    			var div8_nodes = children(div8);
    			groupui_headline3 = claim_element(div8_nodes, "GROUPUI-HEADLINE", { heading: true, class: true });
    			var groupui_headline3_nodes = children(groupui_headline3);
    			t13 = claim_text(groupui_headline3_nodes, "Logout");
    			groupui_headline3_nodes.forEach(detach_dev);
    			div8_nodes.forEach(detach_dev);
    			div9_nodes.forEach(detach_dev);
    			span_nodes.forEach(detach_dev);
    			t14 = claim_space(div11_nodes);
    			groupui_modal = claim_element(div11_nodes, "GROUPUI-MODAL", { id: true, theme: true });
    			var groupui_modal_nodes = children(groupui_modal);
    			div10 = claim_element(groupui_modal_nodes, "DIV", { class: true });
    			var div10_nodes = children(div10);
    			p = claim_element(div10_nodes, "P", { style: true });
    			var p_nodes = children(p);
    			t15 = claim_text(p_nodes, "X");
    			p_nodes.forEach(detach_dev);
    			div10_nodes.forEach(detach_dev);
    			t16 = claim_space(groupui_modal_nodes);
    			claim_component(einstellungen.$$.fragment, groupui_modal_nodes);
    			groupui_modal_nodes.forEach(detach_dev);
    			div11_nodes.forEach(detach_dev);
    			groupui_header_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			set_style(div0, "height", "64px");
    			add_location(div0, file$1, 31, 0, 936);
    			if (!src_url_equal(img0.src, img0_src_value = "Bilder/infoGrabber_Logo.svg")) attr_dev(img0, "src", img0_src_value);
    			set_style(img0, "width", "250px");
    			add_location(img0, file$1, 35, 103, 1156);
    			attr_dev(a0, "class", "link");
    			attr_dev(a0, "href", "./");
    			add_location(a0, file$1, 35, 77, 1130);
    			set_style(groupui_headline0, "margin-right", "5%");
    			set_custom_element_data(groupui_headline0, "heading", "h5");
    			set_custom_element_data(groupui_headline0, "class", "hydrated");
    			add_location(groupui_headline0, file$1, 35, 4, 1057);
    			attr_dev(div1, "class", "header_item");
    			add_location(div1, file$1, 37, 37, 1288);
    			attr_dev(a1, "class", "link");
    			attr_dev(a1, "href", "./faq");
    			add_location(a1, file$1, 37, 8, 1259);
    			attr_dev(div2, "class", "header_item");
    			add_location(div2, file$1, 38, 42, 1369);
    			attr_dev(a2, "class", "link");
    			attr_dev(a2, "href", "./projekte");
    			add_location(a2, file$1, 38, 8, 1335);
    			attr_dev(div3, "class", "header_item");
    			add_location(div3, file$1, 39, 8, 1421);
    			add_location(div4, file$1, 36, 4, 1245);
    			set_custom_element_data(groupui_avatar, "class", "tooltip_rahmen");
    			set_custom_element_data(groupui_avatar, "theme", "vwag");
    			add_location(groupui_avatar, file$1, 43, 12, 1630);
    			attr_dev(div5, "style", "");
    			add_location(div5, file$1, 42, 8, 1569);
    			set_custom_element_data(groupui_headline1, "heading", "h3");
    			set_custom_element_data(groupui_headline1, "class", "schriftfarbe");
    			add_location(groupui_headline1, file$1, 48, 12, 1978);
    			if (!src_url_equal(img1.src, img1_src_value = "Bilder/icons/adjust-filled-16-white.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "icon_element");
    			add_location(img1, file$1, 50, 49, 2165);
    			set_custom_element_data(groupui_headline2, "heading", "h4");
    			set_custom_element_data(groupui_headline2, "class", "hydrated");
    			add_location(groupui_headline2, file$1, 50, 146, 2262);
    			attr_dev(div6, "class", "text_mittig");
    			add_location(div6, file$1, 50, 121, 2237);
    			add_location(div7, file$1, 50, 12, 2128);
    			add_location(br, file$1, 50, 238, 2354);
    			if (!src_url_equal(img2.src, img2_src_value = "./../Bilder/icons/logout-16-white.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "icon_element");
    			add_location(img2, file$1, 52, 35, 2452);
    			set_custom_element_data(groupui_headline3, "heading", "h4");
    			set_custom_element_data(groupui_headline3, "class", "hydrated");
    			add_location(groupui_headline3, file$1, 52, 130, 2547);
    			attr_dev(div8, "class", "text_mittig");
    			add_location(div8, file$1, 52, 105, 2522);
    			add_location(div9, file$1, 52, 12, 2429);
    			set_style(span, "width", "280px");
    			set_style(span, "margin-top", "3%");
    			attr_dev(span, "id", "header_profil");
    			attr_dev(span, "class", "tooltip_popup box1");
    			add_location(span, file$1, 47, 8, 1798);
    			set_style(p, "display", "table-cell");
    			set_style(p, "vertical-align", "middle");
    			add_location(p, file$1, 60, 72, 2789);
    			attr_dev(div10, "class", "closedialog");
    			add_location(div10, file$1, 60, 12, 2729);
    			set_custom_element_data(groupui_modal, "id", "einstellungenfenster");
    			set_custom_element_data(groupui_modal, "theme", "vwag");
    			add_location(groupui_modal, file$1, 58, 8, 2661);
    			attr_dev(div11, "class", "tooltip_rahmen");
    			set_style(div11, "width", "350px");
    			set_style(div11, "right", "15px");
    			set_style(div11, "position", "fixed");
    			add_location(div11, file$1, 41, 4, 1480);
    			set_custom_element_data(groupui_header, "class", "hydrated");
    			add_location(groupui_header, file$1, 32, 0, 968);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div0, anchor);
    			insert_hydration_dev(target, t0, anchor);
    			insert_hydration_dev(target, groupui_header, anchor);
    			append_hydration_dev(groupui_header, groupui_headline0);
    			append_hydration_dev(groupui_headline0, a0);
    			append_hydration_dev(a0, img0);
    			append_hydration_dev(groupui_header, t1);
    			append_hydration_dev(groupui_header, div4);
    			append_hydration_dev(div4, a1);
    			append_hydration_dev(a1, div1);
    			append_hydration_dev(div1, t2);
    			append_hydration_dev(div4, t3);
    			append_hydration_dev(div4, a2);
    			append_hydration_dev(a2, div2);
    			append_hydration_dev(div2, t4);
    			append_hydration_dev(div4, t5);
    			append_hydration_dev(div4, div3);
    			append_hydration_dev(div3, t6);
    			append_hydration_dev(groupui_header, t7);
    			append_hydration_dev(groupui_header, div11);
    			append_hydration_dev(div11, div5);
    			append_hydration_dev(div5, groupui_avatar);
    			append_hydration_dev(div11, t8);
    			append_hydration_dev(div11, span);
    			append_hydration_dev(span, groupui_headline1);
    			append_hydration_dev(groupui_headline1, t9);
    			append_hydration_dev(span, t10);
    			append_hydration_dev(span, div7);
    			append_hydration_dev(div7, img1);
    			append_hydration_dev(div7, div6);
    			append_hydration_dev(div6, groupui_headline2);
    			append_hydration_dev(groupui_headline2, t11);
    			append_hydration_dev(span, br);
    			append_hydration_dev(span, t12);
    			append_hydration_dev(span, div9);
    			append_hydration_dev(div9, img2);
    			append_hydration_dev(div9, div8);
    			append_hydration_dev(div8, groupui_headline3);
    			append_hydration_dev(groupui_headline3, t13);
    			append_hydration_dev(div11, t14);
    			append_hydration_dev(div11, groupui_modal);
    			append_hydration_dev(groupui_modal, div10);
    			append_hydration_dev(div10, p);
    			append_hydration_dev(p, t15);
    			append_hydration_dev(groupui_modal, t16);
    			mount_component(einstellungen, groupui_modal, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div5, "click", header_profil_anzeigen, false, false, false),
    					listen_dev(div7, "click", einstellungen_öffnen, false, false, false),
    					listen_dev(div9, "click", logout, false, false, false),
    					listen_dev(span, "mouseout", header_profil_verstecken, false, false, false),
    					listen_dev(span, "mouseover", header_profil_anzeigen, false, false, false),
    					listen_dev(div10, "click", einstellungen_schließen, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(einstellungen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(einstellungen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(groupui_header);
    			destroy_component(einstellungen);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function header_projekte_anzeigen() {
    	objektanzeigen("header_projekte");
    }

    function header_projekte_verstecken() {
    	objektverstecken("header_projekte");
    }

    function header_profil_anzeigen() {
    	objektanzeigen("header_profil");
    }

    function header_profil_verstecken() {
    	objektverstecken("header_profil");
    }

    function logout() {
    	alert();
    }

    function einstellungen_öffnen() {
    	document.querySelector('groupui-modal')['displayed'] = true;
    }

    function einstellungen_schließen() {
    	document.querySelector('groupui-modal')['displayed'] = false;
    }

    function objektanzeigen(objektid) {
    	document.getElementById(objektid).style.display = "block";
    }

    function objektverstecken(objektid) {
    	document.getElementById(objektid).style.display = "none";
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Einstellungen,
    		header_projekte_anzeigen,
    		header_projekte_verstecken,
    		header_profil_anzeigen,
    		header_profil_verstecken,
    		logout,
    		einstellungen_öffnen,
    		einstellungen_schließen,
    		objektanzeigen,
    		objektverstecken
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/vorlagen/Footer.svelte generated by Svelte v3.48.0 */

    const file$2 = "src/components/vorlagen/Footer.svelte";

    function create_fragment$4(ctx) {
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let svg;
    	let path0;
    	let path1;
    	let rect0;
    	let rect1;
    	let t1;
    	let div1;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			rect0 = svg_element("rect");
    			rect1 = svg_element("rect");
    			t1 = space();
    			div1 = element("div");
    			this.h();
    		},
    		l: function claim(nodes) {
    			div0 = claim_element(nodes, "DIV", { id: true, class: true });
    			var div0_nodes = children(div0);
    			img = claim_element(div0_nodes, "IMG", { src: true, style: true });
    			t0 = claim_space(div0_nodes);

    			svg = claim_svg_element(div0_nodes, "svg", {
    				width: true,
    				height: true,
    				viewBox: true,
    				fill: true,
    				xmlns: true
    			});

    			var svg_nodes = children(svg);
    			path0 = claim_svg_element(svg_nodes, "path", { d: true, fill: true });
    			children(path0).forEach(detach_dev);
    			path1 = claim_svg_element(svg_nodes, "path", { d: true, fill: true });
    			children(path1).forEach(detach_dev);

    			rect0 = claim_svg_element(svg_nodes, "rect", {
    				x: true,
    				y: true,
    				width: true,
    				height: true,
    				fill: true
    			});

    			children(rect0).forEach(detach_dev);

    			rect1 = claim_svg_element(svg_nodes, "rect", {
    				x: true,
    				y: true,
    				width: true,
    				height: true,
    				rx: true,
    				stroke: true
    			});

    			children(rect1).forEach(detach_dev);
    			svg_nodes.forEach(detach_dev);
    			div0_nodes.forEach(detach_dev);
    			t1 = claim_space(nodes);
    			div1 = claim_element(nodes, "DIV", { id: true });
    			var div1_nodes = children(div1);
    			div1_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			if (!src_url_equal(img.src, img_src_value = "Bilder/infoGrabber_Logo.svg")) attr_dev(img, "src", img_src_value);
    			set_style(img, "width", "250px");
    			add_location(img, file$2, 12, 4, 234);
    			attr_dev(path0, "d", "M19.8142 24.9H18.6622L16.8382 30.12C16.6342 30.708 16.4302 31.38 16.2742 31.932H16.2622C16.1062 31.356 15.9022 30.672 15.7222 30.168L13.9102 24.9H12.6742L15.5662 33H16.9102L19.8142 24.9ZM25.8522 33V32.076H22.3242V29.268H25.5162V28.38H22.3242V25.812H25.8042V24.9H21.2202V33H25.8522ZM33.4017 33L31.3857 30.216C31.0737 29.772 30.7257 29.352 30.7257 29.352C31.8777 29.184 32.8497 28.464 32.8497 27.06C32.8497 25.512 31.6977 24.852 30.0057 24.852C28.9617 24.852 27.8937 24.912 27.8937 24.912V33H28.9977V29.496H29.5857L32.0337 33H33.4017ZM28.9977 25.776C28.9977 25.776 29.4657 25.752 29.9097 25.752C31.0737 25.752 31.6977 26.268 31.6977 27.192C31.6977 28.116 31.0377 28.668 29.8617 28.668C29.4537 28.668 28.9977 28.656 28.9977 28.656V25.776ZM39.5471 25.824V24.9H33.7751V25.824H36.1031V33H37.2071V25.824H39.5471ZM46.5146 33L44.4986 30.216C44.1866 29.772 43.8386 29.352 43.8386 29.352C44.9906 29.184 45.9626 28.464 45.9626 27.06C45.9626 25.512 44.8106 24.852 43.1186 24.852C42.0746 24.852 41.0066 24.912 41.0066 24.912V33H42.1106V29.496H42.6986L45.1466 33H46.5146ZM42.1106 25.776C42.1106 25.776 42.5786 25.752 43.0226 25.752C44.1866 25.752 44.8106 26.268 44.8106 27.192C44.8106 28.116 44.1506 28.668 42.9746 28.668C42.5666 28.668 42.1106 28.656 42.1106 28.656V25.776ZM54.0373 33L51.1453 24.9H49.8013L46.8973 33H48.0253L48.6973 31.068H52.1413L52.8013 33H54.0373ZM51.8773 30.192H48.9733L50.0773 27.072C50.1973 26.688 50.3173 26.304 50.4133 25.944H50.4253C50.5333 26.304 50.6413 26.688 50.7733 27.084L51.8773 30.192ZM61.3092 24.9H60.2292V29.988C60.2292 31.62 59.5692 32.208 58.1532 32.208C56.5212 32.208 56.1492 31.308 56.1492 30.192V24.9H55.0452V30.276C55.0452 31.716 55.5492 33.12 58.0812 33.12C60.1932 33.12 61.3092 32.028 61.3092 29.904V24.9ZM68.137 33V32.064H64.897V24.9H63.793V33H68.137ZM70.5862 33V24.9H69.4822V33H70.5862ZM78.2148 31.788C77.5908 31.98 76.8228 32.112 76.2228 32.112C74.4588 32.112 73.5828 30.984 73.5828 29.016C73.5828 27.216 74.3508 25.776 76.1508 25.776C76.7988 25.776 77.4708 25.92 78.1188 26.196V25.104C77.5668 24.924 76.9188 24.828 76.2948 24.828C73.6308 24.828 72.3948 26.676 72.3948 29.136C72.3948 31.464 73.4868 33.096 76.0188 33.096C76.8108 33.096 77.5548 32.964 78.2148 32.772V31.788ZM86.4349 33V24.9H85.3309V28.332H81.2029V24.9H80.0989V33H81.2029V29.268H85.3309V33H86.4349Z");
    			attr_dev(path0, "fill", "white");
    			add_location(path0, file$2, 15, 8, 408);
    			attr_dev(path1, "d", "M15.9306 12.404C15.4026 12.572 14.7426 12.692 14.1786 12.692C12.6426 12.692 11.9106 11.732 11.9106 10.028C11.9106 8.408 12.5586 7.22 14.1066 7.22C14.6946 7.22 15.2946 7.364 15.8706 7.604V6.044C15.3546 5.912 14.7906 5.828 14.2026 5.828C11.5506 5.828 10.1946 7.64 10.1946 10.172C10.1946 12.296 11.1186 14.096 13.8906 14.096C14.6466 14.096 15.3066 13.988 15.9306 13.82V12.404ZM24.5479 9.8C24.5479 7.256 23.2639 5.768 20.8279 5.768C18.6799 5.768 16.8559 7.292 16.8559 10.1C16.8559 12.644 18.1399 14.132 20.5759 14.132C22.7239 14.132 24.5479 12.608 24.5479 9.8ZM22.8799 9.98C22.8799 11.768 21.9679 12.728 20.6959 12.728C19.2439 12.728 18.5239 11.648 18.5239 9.908C18.5239 8.132 19.4239 7.172 20.6959 7.172C22.1599 7.172 22.8799 8.252 22.8799 9.98ZM32.6106 14V5.9H31.0986V7.868C31.0986 9.2 31.1586 10.628 31.2186 11.516H31.1946C30.9666 11.012 30.6426 10.4 30.2226 9.74L27.8346 5.9H26.0586V14H27.5706V11.792C27.5706 10.484 27.5106 8.96 27.4506 8.144H27.4746C27.7146 8.684 27.9666 9.164 28.4226 9.896L30.9666 14H32.6106ZM39.5358 7.232V5.9H34.7478V14H36.3078V10.616H39.3438V9.344H36.3078V7.232H39.5358ZM42.5478 14V5.9H40.9878V14H42.5478ZM44.6848 13.988C45.3688 14.012 46.1008 14.048 46.9408 14.048C49.5808 14.048 51.4048 12.584 51.4048 9.812C51.4048 6.968 49.8088 5.852 47.3008 5.852C46.3048 5.852 45.3208 5.888 44.6848 5.912V13.988ZM46.2448 7.196C46.4968 7.172 46.8328 7.16 47.1928 7.16C49.0408 7.16 49.7248 8.192 49.7248 9.932C49.7248 11.852 48.6208 12.716 47.0968 12.716C46.7848 12.716 46.4608 12.692 46.2448 12.656V7.196ZM57.8487 14V12.656H54.4887V10.46H57.5487V9.212H54.4887V7.208H57.8127V5.9H52.9287V14H57.8487ZM66.1543 14V5.9H64.6423V7.868C64.6423 9.2 64.7023 10.628 64.7623 11.516H64.7383C64.5103 11.012 64.1863 10.4 63.7663 9.74L61.3783 5.9H59.6023V14H61.1143V11.792C61.1143 10.484 61.0543 8.96 60.9943 8.144H61.0183C61.2583 8.684 61.5103 9.164 61.9663 9.896L64.5103 14H66.1543ZM73.1689 7.232V5.9H67.4089V7.232H69.5089V14H71.0689V7.232H73.1689ZM75.9861 14V5.9H74.4261V14H75.9861ZM84.5485 14L81.8245 5.9H79.7965L77.0845 14H78.6565L79.2205 12.272H82.2685L82.8205 14H84.5485ZM81.9205 11.036H79.5805L80.4205 8.492C80.5405 8.096 80.6485 7.676 80.7325 7.292H80.7565C80.8405 7.676 80.9485 8.084 81.0805 8.504L81.9205 11.036ZM90.1642 14V12.644H87.2122V5.9H85.6522V14H90.1642Z");
    			attr_dev(path1, "fill", "white");
    			add_location(path1, file$2, 16, 8, 2738);
    			attr_dev(rect0, "x", "38");
    			attr_dev(rect0, "y", "19");
    			attr_dev(rect0, "width", "24");
    			attr_dev(rect0, "height", "1");
    			attr_dev(rect0, "fill", "white");
    			add_location(rect0, file$2, 17, 8, 5039);
    			attr_dev(rect1, "x", "0.5");
    			attr_dev(rect1, "y", "0.5");
    			attr_dev(rect1, "width", "99");
    			attr_dev(rect1, "height", "39");
    			attr_dev(rect1, "rx", "1.5");
    			attr_dev(rect1, "stroke", "white");
    			add_location(rect1, file$2, 18, 8, 5104);
    			attr_dev(svg, "width", "100");
    			attr_dev(svg, "height", "40");
    			attr_dev(svg, "viewBox", "0 0 100 40");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$2, 14, 4, 302);
    			attr_dev(div0, "id", "footer1");
    			attr_dev(div0, "class", "footer box3");
    			add_location(div0, file$2, 8, 0, 189);
    			attr_dev(div1, "id", "footer2");
    			add_location(div1, file$2, 21, 0, 5193);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div0, anchor);
    			append_hydration_dev(div0, img);
    			append_hydration_dev(div0, t0);
    			append_hydration_dev(div0, svg);
    			append_hydration_dev(svg, path0);
    			append_hydration_dev(svg, path1);
    			append_hydration_dev(svg, rect0);
    			append_hydration_dev(svg, rect1);
    			insert_hydration_dev(target, t1, anchor);
    			insert_hydration_dev(target, div1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Footer', slots, []);

    	window.onload = function exampleFunction() {
    		document.getElementById("footer2").style.height = document.getElementById("footer1").offsetHeight + "px";
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/vorlagen/Groupui.svelte generated by Svelte v3.48.0 */

    const file$3 = "src/components/vorlagen/Groupui.svelte";

    function create_fragment$5(ctx) {
    	let main;
    	let script0;
    	let script0_src_value;
    	let t0;
    	let script1;
    	let script1_src_value;
    	let t1;
    	let link0;
    	let t2;
    	let link1;
    	let t3;
    	let link2;
    	let t4;
    	let link3;

    	const block = {
    		c: function create() {
    			main = element("main");
    			script0 = element("script");
    			t0 = space();
    			script1 = element("script");
    			t1 = space();
    			link0 = element("link");
    			t2 = space();
    			link1 = element("link");
    			t3 = space();
    			link2 = element("link");
    			t4 = space();
    			link3 = element("link");
    			this.h();
    		},
    		l: function claim(nodes) {
    			main = claim_element(nodes, "MAIN", {});
    			var main_nodes = children(main);
    			script0 = claim_element(main_nodes, "SCRIPT", { type: true, src: true });
    			var script0_nodes = children(script0);
    			script0_nodes.forEach(detach_dev);
    			t0 = claim_space(main_nodes);
    			script1 = claim_element(main_nodes, "SCRIPT", { src: true });
    			var script1_nodes = children(script1);
    			script1_nodes.forEach(detach_dev);
    			t1 = claim_space(main_nodes);
    			link0 = claim_element(main_nodes, "LINK", { rel: true, href: true });
    			t2 = claim_space(main_nodes);
    			link1 = claim_element(main_nodes, "LINK", { rel: true, href: true });
    			t3 = claim_space(main_nodes);
    			link2 = claim_element(main_nodes, "LINK", { rel: true, href: true });
    			t4 = claim_space(main_nodes);
    			link3 = claim_element(main_nodes, "LINK", { rel: true, href: true });
    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			attr_dev(script0, "type", "module");
    			if (!src_url_equal(script0.src, script0_src_value = "https://groupui-assets.apps.emea.vwapps.io/components/latest/group-ui/group-ui.esm.js")) attr_dev(script0, "src", script0_src_value);
    			add_location(script0, file$3, 3, 1, 10);
    			script1.noModule = true;
    			if (!src_url_equal(script1.src, script1_src_value = "https://groupui-assets.apps.emea.vwapps.io/components/latest/group-ui/group-ui.js")) attr_dev(script1, "src", script1_src_value);
    			add_location(script1, file$3, 4, 1, 135);
    			attr_dev(link0, "rel", "stylesheet");
    			attr_dev(link0, "href", "https://groupui-assets.apps.emea.vwapps.io/components/latest/group-ui/assets/themes/man/man.css");
    			add_location(link0, file$3, 6, 1, 252);
    			attr_dev(link1, "rel", "stylesheet");
    			attr_dev(link1, "href", "https://groupui-assets.apps.emea.vwapps.io/components/latest/group-ui/assets/themes/vwag/vwag.css");
    			add_location(link1, file$3, 7, 1, 382);
    			attr_dev(link2, "rel", "stylesheet");
    			attr_dev(link2, "href", "https://groupui-assets.apps.emea.vwapps.io/components/latest/group-ui/assets/themes/audi/audi.css");
    			add_location(link2, file$3, 8, 1, 514);
    			attr_dev(link3, "rel", "stylesheet");
    			attr_dev(link3, "href", "https://groupui-assets.apps.emea.vwapps.io/components/latest/group-ui/assets/themes/porschePlant/porschePlant.css");
    			add_location(link3, file$3, 9, 1, 646);
    			add_location(main, file$3, 2, 0, 2);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, main, anchor);
    			append_hydration_dev(main, script0);
    			append_hydration_dev(main, t0);
    			append_hydration_dev(main, script1);
    			append_hydration_dev(main, t1);
    			append_hydration_dev(main, link0);
    			append_hydration_dev(main, t2);
    			append_hydration_dev(main, link1);
    			append_hydration_dev(main, t3);
    			append_hydration_dev(main, link2);
    			append_hydration_dev(main, t4);
    			append_hydration_dev(main, link3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Groupui', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Groupui> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Groupui extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Groupui",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/Home.svelte generated by Svelte v3.48.0 */
    const file$4 = "src/components/Home.svelte";

    function create_fragment$6(ctx) {
    	let main;
    	let groupui;
    	let t0;
    	let header;
    	let t1;
    	let h3;
    	let t2;
    	let t3;
    	let p0;
    	let t4;
    	let br0;
    	let br1;
    	let t5;
    	let p1;
    	let t6;
    	let br2;
    	let br3;
    	let t7;
    	let p2;
    	let t8;
    	let br4;
    	let br5;
    	let t9;
    	let p3;
    	let t10;
    	let br6;
    	let br7;
    	let t11;
    	let p4;
    	let t12;
    	let br8;
    	let br9;
    	let t13;
    	let p5;
    	let t14;
    	let br10;
    	let br11;
    	let t15;
    	let p6;
    	let t16;
    	let br12;
    	let br13;
    	let t17;
    	let p7;
    	let t18;
    	let br14;
    	let br15;
    	let t19;
    	let p8;
    	let t20;
    	let br16;
    	let br17;
    	let t21;
    	let p9;
    	let t22;
    	let br18;
    	let br19;
    	let t23;
    	let p10;
    	let t24;
    	let br20;
    	let br21;
    	let t25;
    	let p11;
    	let t26;
    	let br22;
    	let br23;
    	let t27;
    	let p12;
    	let t28;
    	let br24;
    	let br25;
    	let t29;
    	let p13;
    	let t30;
    	let br26;
    	let br27;
    	let t31;
    	let p14;
    	let t32;
    	let br28;
    	let br29;
    	let t33;
    	let p15;
    	let t34;
    	let br30;
    	let br31;
    	let t35;
    	let p16;
    	let t36;
    	let br32;
    	let br33;
    	let t37;
    	let p17;
    	let t38;
    	let br34;
    	let br35;
    	let t39;
    	let p18;
    	let t40;
    	let br36;
    	let br37;
    	let t41;
    	let footer;
    	let current;
    	groupui = new Groupui({ $$inline: true });
    	header = new Header({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(groupui.$$.fragment);
    			t0 = space();
    			create_component(header.$$.fragment);
    			t1 = space();
    			h3 = element("h3");
    			t2 = text("Home");
    			t3 = space();
    			p0 = element("p");
    			t4 = text("a");
    			br0 = element("br");
    			br1 = element("br");
    			t5 = space();
    			p1 = element("p");
    			t6 = text("a");
    			br2 = element("br");
    			br3 = element("br");
    			t7 = space();
    			p2 = element("p");
    			t8 = text("a");
    			br4 = element("br");
    			br5 = element("br");
    			t9 = space();
    			p3 = element("p");
    			t10 = text("a");
    			br6 = element("br");
    			br7 = element("br");
    			t11 = space();
    			p4 = element("p");
    			t12 = text("a");
    			br8 = element("br");
    			br9 = element("br");
    			t13 = space();
    			p5 = element("p");
    			t14 = text("a");
    			br10 = element("br");
    			br11 = element("br");
    			t15 = space();
    			p6 = element("p");
    			t16 = text("a");
    			br12 = element("br");
    			br13 = element("br");
    			t17 = space();
    			p7 = element("p");
    			t18 = text("a");
    			br14 = element("br");
    			br15 = element("br");
    			t19 = space();
    			p8 = element("p");
    			t20 = text("a");
    			br16 = element("br");
    			br17 = element("br");
    			t21 = space();
    			p9 = element("p");
    			t22 = text("a");
    			br18 = element("br");
    			br19 = element("br");
    			t23 = space();
    			p10 = element("p");
    			t24 = text("a");
    			br20 = element("br");
    			br21 = element("br");
    			t25 = space();
    			p11 = element("p");
    			t26 = text("a");
    			br22 = element("br");
    			br23 = element("br");
    			t27 = space();
    			p12 = element("p");
    			t28 = text("a");
    			br24 = element("br");
    			br25 = element("br");
    			t29 = space();
    			p13 = element("p");
    			t30 = text("a");
    			br26 = element("br");
    			br27 = element("br");
    			t31 = space();
    			p14 = element("p");
    			t32 = text("a");
    			br28 = element("br");
    			br29 = element("br");
    			t33 = space();
    			p15 = element("p");
    			t34 = text("a");
    			br30 = element("br");
    			br31 = element("br");
    			t35 = space();
    			p16 = element("p");
    			t36 = text("a");
    			br32 = element("br");
    			br33 = element("br");
    			t37 = space();
    			p17 = element("p");
    			t38 = text("a");
    			br34 = element("br");
    			br35 = element("br");
    			t39 = space();
    			p18 = element("p");
    			t40 = text("a");
    			br36 = element("br");
    			br37 = element("br");
    			t41 = space();
    			create_component(footer.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			main = claim_element(nodes, "MAIN", {});
    			var main_nodes = children(main);
    			claim_component(groupui.$$.fragment, main_nodes);
    			t0 = claim_space(main_nodes);
    			claim_component(header.$$.fragment, main_nodes);
    			t1 = claim_space(main_nodes);
    			h3 = claim_element(main_nodes, "H3", {});
    			var h3_nodes = children(h3);
    			t2 = claim_text(h3_nodes, "Home");
    			h3_nodes.forEach(detach_dev);
    			t3 = claim_space(main_nodes);
    			p0 = claim_element(main_nodes, "P", {});
    			var p0_nodes = children(p0);
    			t4 = claim_text(p0_nodes, "a");
    			p0_nodes.forEach(detach_dev);
    			br0 = claim_element(main_nodes, "BR", {});
    			br1 = claim_element(main_nodes, "BR", {});
    			t5 = claim_space(main_nodes);
    			p1 = claim_element(main_nodes, "P", {});
    			var p1_nodes = children(p1);
    			t6 = claim_text(p1_nodes, "a");
    			p1_nodes.forEach(detach_dev);
    			br2 = claim_element(main_nodes, "BR", {});
    			br3 = claim_element(main_nodes, "BR", {});
    			t7 = claim_space(main_nodes);
    			p2 = claim_element(main_nodes, "P", {});
    			var p2_nodes = children(p2);
    			t8 = claim_text(p2_nodes, "a");
    			p2_nodes.forEach(detach_dev);
    			br4 = claim_element(main_nodes, "BR", {});
    			br5 = claim_element(main_nodes, "BR", {});
    			t9 = claim_space(main_nodes);
    			p3 = claim_element(main_nodes, "P", {});
    			var p3_nodes = children(p3);
    			t10 = claim_text(p3_nodes, "a");
    			p3_nodes.forEach(detach_dev);
    			br6 = claim_element(main_nodes, "BR", {});
    			br7 = claim_element(main_nodes, "BR", {});
    			t11 = claim_space(main_nodes);
    			p4 = claim_element(main_nodes, "P", {});
    			var p4_nodes = children(p4);
    			t12 = claim_text(p4_nodes, "a");
    			p4_nodes.forEach(detach_dev);
    			br8 = claim_element(main_nodes, "BR", {});
    			br9 = claim_element(main_nodes, "BR", {});
    			t13 = claim_space(main_nodes);
    			p5 = claim_element(main_nodes, "P", {});
    			var p5_nodes = children(p5);
    			t14 = claim_text(p5_nodes, "a");
    			p5_nodes.forEach(detach_dev);
    			br10 = claim_element(main_nodes, "BR", {});
    			br11 = claim_element(main_nodes, "BR", {});
    			t15 = claim_space(main_nodes);
    			p6 = claim_element(main_nodes, "P", {});
    			var p6_nodes = children(p6);
    			t16 = claim_text(p6_nodes, "a");
    			p6_nodes.forEach(detach_dev);
    			br12 = claim_element(main_nodes, "BR", {});
    			br13 = claim_element(main_nodes, "BR", {});
    			t17 = claim_space(main_nodes);
    			p7 = claim_element(main_nodes, "P", {});
    			var p7_nodes = children(p7);
    			t18 = claim_text(p7_nodes, "a");
    			p7_nodes.forEach(detach_dev);
    			br14 = claim_element(main_nodes, "BR", {});
    			br15 = claim_element(main_nodes, "BR", {});
    			t19 = claim_space(main_nodes);
    			p8 = claim_element(main_nodes, "P", {});
    			var p8_nodes = children(p8);
    			t20 = claim_text(p8_nodes, "a");
    			p8_nodes.forEach(detach_dev);
    			br16 = claim_element(main_nodes, "BR", {});
    			br17 = claim_element(main_nodes, "BR", {});
    			t21 = claim_space(main_nodes);
    			p9 = claim_element(main_nodes, "P", {});
    			var p9_nodes = children(p9);
    			t22 = claim_text(p9_nodes, "a");
    			p9_nodes.forEach(detach_dev);
    			br18 = claim_element(main_nodes, "BR", {});
    			br19 = claim_element(main_nodes, "BR", {});
    			t23 = claim_space(main_nodes);
    			p10 = claim_element(main_nodes, "P", {});
    			var p10_nodes = children(p10);
    			t24 = claim_text(p10_nodes, "a");
    			p10_nodes.forEach(detach_dev);
    			br20 = claim_element(main_nodes, "BR", {});
    			br21 = claim_element(main_nodes, "BR", {});
    			t25 = claim_space(main_nodes);
    			p11 = claim_element(main_nodes, "P", {});
    			var p11_nodes = children(p11);
    			t26 = claim_text(p11_nodes, "a");
    			p11_nodes.forEach(detach_dev);
    			br22 = claim_element(main_nodes, "BR", {});
    			br23 = claim_element(main_nodes, "BR", {});
    			t27 = claim_space(main_nodes);
    			p12 = claim_element(main_nodes, "P", {});
    			var p12_nodes = children(p12);
    			t28 = claim_text(p12_nodes, "a");
    			p12_nodes.forEach(detach_dev);
    			br24 = claim_element(main_nodes, "BR", {});
    			br25 = claim_element(main_nodes, "BR", {});
    			t29 = claim_space(main_nodes);
    			p13 = claim_element(main_nodes, "P", {});
    			var p13_nodes = children(p13);
    			t30 = claim_text(p13_nodes, "a");
    			p13_nodes.forEach(detach_dev);
    			br26 = claim_element(main_nodes, "BR", {});
    			br27 = claim_element(main_nodes, "BR", {});
    			t31 = claim_space(main_nodes);
    			p14 = claim_element(main_nodes, "P", {});
    			var p14_nodes = children(p14);
    			t32 = claim_text(p14_nodes, "a");
    			p14_nodes.forEach(detach_dev);
    			br28 = claim_element(main_nodes, "BR", {});
    			br29 = claim_element(main_nodes, "BR", {});
    			t33 = claim_space(main_nodes);
    			p15 = claim_element(main_nodes, "P", {});
    			var p15_nodes = children(p15);
    			t34 = claim_text(p15_nodes, "a");
    			p15_nodes.forEach(detach_dev);
    			br30 = claim_element(main_nodes, "BR", {});
    			br31 = claim_element(main_nodes, "BR", {});
    			t35 = claim_space(main_nodes);
    			p16 = claim_element(main_nodes, "P", {});
    			var p16_nodes = children(p16);
    			t36 = claim_text(p16_nodes, "a");
    			p16_nodes.forEach(detach_dev);
    			br32 = claim_element(main_nodes, "BR", {});
    			br33 = claim_element(main_nodes, "BR", {});
    			t37 = claim_space(main_nodes);
    			p17 = claim_element(main_nodes, "P", {});
    			var p17_nodes = children(p17);
    			t38 = claim_text(p17_nodes, "a");
    			p17_nodes.forEach(detach_dev);
    			br34 = claim_element(main_nodes, "BR", {});
    			br35 = claim_element(main_nodes, "BR", {});
    			t39 = claim_space(main_nodes);
    			p18 = claim_element(main_nodes, "P", {});
    			var p18_nodes = children(p18);
    			t40 = claim_text(p18_nodes, "a");
    			p18_nodes.forEach(detach_dev);
    			br36 = claim_element(main_nodes, "BR", {});
    			br37 = claim_element(main_nodes, "BR", {});
    			t41 = claim_space(main_nodes);
    			claim_component(footer.$$.fragment, main_nodes);
    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(h3, file$4, 11, 0, 233);
    			add_location(p0, file$4, 12, 1, 248);
    			add_location(br0, file$4, 12, 9, 256);
    			add_location(br1, file$4, 12, 13, 260);
    			add_location(p1, file$4, 13, 1, 266);
    			add_location(br2, file$4, 13, 9, 274);
    			add_location(br3, file$4, 13, 13, 278);
    			add_location(p2, file$4, 14, 1, 284);
    			add_location(br4, file$4, 14, 9, 292);
    			add_location(br5, file$4, 14, 13, 296);
    			add_location(p3, file$4, 15, 1, 302);
    			add_location(br6, file$4, 15, 9, 310);
    			add_location(br7, file$4, 15, 13, 314);
    			add_location(p4, file$4, 16, 1, 320);
    			add_location(br8, file$4, 16, 9, 328);
    			add_location(br9, file$4, 16, 13, 332);
    			add_location(p5, file$4, 17, 1, 338);
    			add_location(br10, file$4, 17, 9, 346);
    			add_location(br11, file$4, 17, 13, 350);
    			add_location(p6, file$4, 18, 1, 356);
    			add_location(br12, file$4, 18, 9, 364);
    			add_location(br13, file$4, 18, 13, 368);
    			add_location(p7, file$4, 19, 1, 374);
    			add_location(br14, file$4, 19, 9, 382);
    			add_location(br15, file$4, 19, 13, 386);
    			add_location(p8, file$4, 20, 1, 392);
    			add_location(br16, file$4, 20, 9, 400);
    			add_location(br17, file$4, 20, 13, 404);
    			add_location(p9, file$4, 21, 1, 410);
    			add_location(br18, file$4, 21, 9, 418);
    			add_location(br19, file$4, 21, 13, 422);
    			add_location(p10, file$4, 22, 1, 428);
    			add_location(br20, file$4, 22, 9, 436);
    			add_location(br21, file$4, 22, 13, 440);
    			add_location(p11, file$4, 23, 1, 446);
    			add_location(br22, file$4, 23, 9, 454);
    			add_location(br23, file$4, 23, 13, 458);
    			add_location(p12, file$4, 24, 1, 464);
    			add_location(br24, file$4, 24, 9, 472);
    			add_location(br25, file$4, 24, 13, 476);
    			add_location(p13, file$4, 25, 1, 482);
    			add_location(br26, file$4, 25, 9, 490);
    			add_location(br27, file$4, 25, 13, 494);
    			add_location(p14, file$4, 26, 1, 500);
    			add_location(br28, file$4, 26, 9, 508);
    			add_location(br29, file$4, 26, 13, 512);
    			add_location(p15, file$4, 27, 1, 518);
    			add_location(br30, file$4, 27, 9, 526);
    			add_location(br31, file$4, 27, 13, 530);
    			add_location(p16, file$4, 28, 1, 536);
    			add_location(br32, file$4, 28, 9, 544);
    			add_location(br33, file$4, 28, 13, 548);
    			add_location(p17, file$4, 29, 1, 554);
    			add_location(br34, file$4, 29, 9, 562);
    			add_location(br35, file$4, 29, 13, 566);
    			add_location(p18, file$4, 30, 1, 572);
    			add_location(br36, file$4, 30, 9, 580);
    			add_location(br37, file$4, 30, 13, 584);
    			add_location(main, file$4, 8, 0, 201);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, main, anchor);
    			mount_component(groupui, main, null);
    			append_hydration_dev(main, t0);
    			mount_component(header, main, null);
    			append_hydration_dev(main, t1);
    			append_hydration_dev(main, h3);
    			append_hydration_dev(h3, t2);
    			append_hydration_dev(main, t3);
    			append_hydration_dev(main, p0);
    			append_hydration_dev(p0, t4);
    			append_hydration_dev(main, br0);
    			append_hydration_dev(main, br1);
    			append_hydration_dev(main, t5);
    			append_hydration_dev(main, p1);
    			append_hydration_dev(p1, t6);
    			append_hydration_dev(main, br2);
    			append_hydration_dev(main, br3);
    			append_hydration_dev(main, t7);
    			append_hydration_dev(main, p2);
    			append_hydration_dev(p2, t8);
    			append_hydration_dev(main, br4);
    			append_hydration_dev(main, br5);
    			append_hydration_dev(main, t9);
    			append_hydration_dev(main, p3);
    			append_hydration_dev(p3, t10);
    			append_hydration_dev(main, br6);
    			append_hydration_dev(main, br7);
    			append_hydration_dev(main, t11);
    			append_hydration_dev(main, p4);
    			append_hydration_dev(p4, t12);
    			append_hydration_dev(main, br8);
    			append_hydration_dev(main, br9);
    			append_hydration_dev(main, t13);
    			append_hydration_dev(main, p5);
    			append_hydration_dev(p5, t14);
    			append_hydration_dev(main, br10);
    			append_hydration_dev(main, br11);
    			append_hydration_dev(main, t15);
    			append_hydration_dev(main, p6);
    			append_hydration_dev(p6, t16);
    			append_hydration_dev(main, br12);
    			append_hydration_dev(main, br13);
    			append_hydration_dev(main, t17);
    			append_hydration_dev(main, p7);
    			append_hydration_dev(p7, t18);
    			append_hydration_dev(main, br14);
    			append_hydration_dev(main, br15);
    			append_hydration_dev(main, t19);
    			append_hydration_dev(main, p8);
    			append_hydration_dev(p8, t20);
    			append_hydration_dev(main, br16);
    			append_hydration_dev(main, br17);
    			append_hydration_dev(main, t21);
    			append_hydration_dev(main, p9);
    			append_hydration_dev(p9, t22);
    			append_hydration_dev(main, br18);
    			append_hydration_dev(main, br19);
    			append_hydration_dev(main, t23);
    			append_hydration_dev(main, p10);
    			append_hydration_dev(p10, t24);
    			append_hydration_dev(main, br20);
    			append_hydration_dev(main, br21);
    			append_hydration_dev(main, t25);
    			append_hydration_dev(main, p11);
    			append_hydration_dev(p11, t26);
    			append_hydration_dev(main, br22);
    			append_hydration_dev(main, br23);
    			append_hydration_dev(main, t27);
    			append_hydration_dev(main, p12);
    			append_hydration_dev(p12, t28);
    			append_hydration_dev(main, br24);
    			append_hydration_dev(main, br25);
    			append_hydration_dev(main, t29);
    			append_hydration_dev(main, p13);
    			append_hydration_dev(p13, t30);
    			append_hydration_dev(main, br26);
    			append_hydration_dev(main, br27);
    			append_hydration_dev(main, t31);
    			append_hydration_dev(main, p14);
    			append_hydration_dev(p14, t32);
    			append_hydration_dev(main, br28);
    			append_hydration_dev(main, br29);
    			append_hydration_dev(main, t33);
    			append_hydration_dev(main, p15);
    			append_hydration_dev(p15, t34);
    			append_hydration_dev(main, br30);
    			append_hydration_dev(main, br31);
    			append_hydration_dev(main, t35);
    			append_hydration_dev(main, p16);
    			append_hydration_dev(p16, t36);
    			append_hydration_dev(main, br32);
    			append_hydration_dev(main, br33);
    			append_hydration_dev(main, t37);
    			append_hydration_dev(main, p17);
    			append_hydration_dev(p17, t38);
    			append_hydration_dev(main, br34);
    			append_hydration_dev(main, br35);
    			append_hydration_dev(main, t39);
    			append_hydration_dev(main, p18);
    			append_hydration_dev(p18, t40);
    			append_hydration_dev(main, br36);
    			append_hydration_dev(main, br37);
    			append_hydration_dev(main, t41);
    			mount_component(footer, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(groupui.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(groupui.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(groupui);
    			destroy_component(header);
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount, Header, Footer, Groupui });
    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/components/Projekte.svelte generated by Svelte v3.48.0 */
    const file$5 = "src/components/Projekte.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (59:4) {#each projektegefiltert as projekt}
    function create_each_block_1(ctx) {
    	let div;
    	let p;
    	let t_value = /*projekt*/ ctx[4].projekt_name + "";
    	let t;
    	let div_id_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[2](/*projekt*/ ctx[4]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t = text(t_value);
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { id: true, class: true });
    			var div_nodes = children(div);
    			p = claim_element(div_nodes, "P", {});
    			var p_nodes = children(p);
    			t = claim_text(p_nodes, t_value);
    			p_nodes.forEach(detach_dev);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(p, file$5, 60, 153, 2203);
    			attr_dev(div, "id", div_id_value = "projekt_select_" + /*projekt*/ ctx[4].projekt_name);
    			attr_dev(div, "class", "einstellungen-side-bar-elements");
    			add_location(div, file$5, 60, 4, 2054);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			append_hydration_dev(div, p);
    			append_hydration_dev(p, t);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*projektegefiltert*/ 1 && t_value !== (t_value = /*projekt*/ ctx[4].projekt_name + "")) set_data_dev(t, t_value);

    			if (dirty & /*projektegefiltert*/ 1 && div_id_value !== (div_id_value = "projekt_select_" + /*projekt*/ ctx[4].projekt_name)) {
    				attr_dev(div, "id", div_id_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(59:4) {#each projektegefiltert as projekt}",
    		ctx
    	});

    	return block;
    }

    // (70:3) {#each projektegefiltert as projekt}
    function create_each_block(ctx) {
    	let div;
    	let groupui_headline;
    	let t0_value = /*projekt*/ ctx[4].projekt_name + "";
    	let t0;
    	let br;
    	let t1;
    	let groupui_card;
    	let t2_value = /*projekt*/ ctx[4].detail + "";
    	let t2;
    	let t3;
    	let div_id_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			groupui_headline = element("groupui-headline");
    			t0 = text(t0_value);
    			br = element("br");
    			t1 = space();
    			groupui_card = element("groupui-card");
    			t2 = text(t2_value);
    			t3 = space();
    			this.h();
    		},
    		l: function claim(nodes) {
    			div = claim_element(nodes, "DIV", { id: true, class: true });
    			var div_nodes = children(div);
    			groupui_headline = claim_element(div_nodes, "GROUPUI-HEADLINE", { style: true, weight: true });
    			var groupui_headline_nodes = children(groupui_headline);
    			t0 = claim_text(groupui_headline_nodes, t0_value);
    			groupui_headline_nodes.forEach(detach_dev);
    			br = claim_element(div_nodes, "BR", {});
    			t1 = claim_space(div_nodes);
    			groupui_card = claim_element(div_nodes, "GROUPUI-CARD", {});
    			var groupui_card_nodes = children(groupui_card);
    			t2 = claim_text(groupui_card_nodes, t2_value);
    			groupui_card_nodes.forEach(detach_dev);
    			t3 = claim_space(div_nodes);
    			div_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			set_style(groupui_headline, "color", "#1b1e1f");
    			set_custom_element_data(groupui_headline, "weight", "light");
    			add_location(groupui_headline, file$5, 71, 5, 2522);
    			add_location(br, file$5, 71, 102, 2619);
    			add_location(groupui_card, file$5, 72, 5, 2629);
    			attr_dev(div, "id", div_id_value = "projekt_selected_" + /*projekt*/ ctx[4].projekt_name);
    			attr_dev(div, "class", "projekt_selected");
    			add_location(div, file$5, 70, 4, 2441);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, div, anchor);
    			append_hydration_dev(div, groupui_headline);
    			append_hydration_dev(groupui_headline, t0);
    			append_hydration_dev(div, br);
    			append_hydration_dev(div, t1);
    			append_hydration_dev(div, groupui_card);
    			append_hydration_dev(groupui_card, t2);
    			append_hydration_dev(div, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*projektegefiltert*/ 1 && t0_value !== (t0_value = /*projekt*/ ctx[4].projekt_name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*projektegefiltert*/ 1 && t2_value !== (t2_value = /*projekt*/ ctx[4].detail + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*projektegefiltert*/ 1 && div_id_value !== (div_id_value = "projekt_selected_" + /*projekt*/ ctx[4].projekt_name)) {
    				attr_dev(div, "id", div_id_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(70:3) {#each projektegefiltert as projekt}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let main;
    	let groupui;
    	let t0;
    	let header;
    	let t1;
    	let div5;
    	let div0;
    	let t2;
    	let t3;
    	let div3;
    	let groupui_search_field;
    	let t4;
    	let div2;
    	let div1;
    	let t5;
    	let t6;
    	let div4;
    	let p;
    	let t7;
    	let t8;
    	let t9;
    	let footer;
    	let current;
    	let mounted;
    	let dispose;
    	groupui = new Groupui({ $$inline: true });
    	header = new Header({ $$inline: true });
    	let each_value_1 = /*projektegefiltert*/ ctx[0];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*projektegefiltert*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(groupui.$$.fragment);
    			t0 = space();
    			create_component(header.$$.fragment);
    			t1 = space();
    			div5 = element("div");
    			div0 = element("div");
    			t2 = text("auswählen");
    			t3 = space();
    			div3 = element("div");
    			groupui_search_field = element("groupui-search-field");
    			t4 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t5 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t6 = space();
    			div4 = element("div");
    			p = element("p");
    			t7 = text("auswählen");
    			t8 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t9 = space();
    			create_component(footer.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			main = claim_element(nodes, "MAIN", {});
    			var main_nodes = children(main);
    			claim_component(groupui.$$.fragment, main_nodes);
    			t0 = claim_space(main_nodes);
    			claim_component(header.$$.fragment, main_nodes);
    			t1 = claim_space(main_nodes);
    			div5 = claim_element(main_nodes, "DIV", { style: true });
    			var div5_nodes = children(div5);
    			div0 = claim_element(div5_nodes, "DIV", { style: true, id: true });
    			var div0_nodes = children(div0);
    			t2 = claim_text(div0_nodes, "auswählen");
    			div0_nodes.forEach(detach_dev);
    			t3 = claim_space(div5_nodes);
    			div3 = claim_element(div5_nodes, "DIV", { class: true });
    			var div3_nodes = children(div3);
    			groupui_search_field = claim_element(div3_nodes, "GROUPUI-SEARCH-FIELD", { id: true, placeholder: true });
    			var groupui_search_field_nodes = children(groupui_search_field);
    			groupui_search_field_nodes.forEach(detach_dev);
    			t4 = claim_space(div3_nodes);
    			div2 = claim_element(div3_nodes, "DIV", { id: true });
    			var div2_nodes = children(div2);
    			div1 = claim_element(div2_nodes, "DIV", { style: true, id: true });
    			children(div1).forEach(detach_dev);
    			t5 = claim_space(div2_nodes);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].l(div2_nodes);
    			}

    			div2_nodes.forEach(detach_dev);
    			div3_nodes.forEach(detach_dev);
    			t6 = claim_space(div5_nodes);
    			div4 = claim_element(div5_nodes, "DIV", { id: true, class: true, style: true });
    			var div4_nodes = children(div4);
    			p = claim_element(div4_nodes, "P", {});
    			var p_nodes = children(p);
    			t7 = claim_text(p_nodes, "auswählen");
    			p_nodes.forEach(detach_dev);
    			div4_nodes.forEach(detach_dev);
    			t8 = claim_space(div5_nodes);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].l(div5_nodes);
    			}

    			div5_nodes.forEach(detach_dev);
    			t9 = claim_space(main_nodes);
    			claim_component(footer.$$.fragment, main_nodes);
    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			set_style(div0, "display", "none");
    			attr_dev(div0, "id", "projekt_selected");
    			add_location(div0, file$5, 50, 2, 1674);
    			set_custom_element_data(groupui_search_field, "id", "projektsuchen");
    			set_custom_element_data(groupui_search_field, "placeholder", "Projektname eingeben");
    			add_location(groupui_search_field, file$5, 52, 3, 1778);
    			set_style(div1, "display", "none");
    			attr_dev(div1, "id", "projekt_select_auswählen");
    			add_location(div1, file$5, 56, 4, 1944);
    			attr_dev(div2, "id", "projektefilter");
    			add_location(div2, file$5, 55, 3, 1914);
    			attr_dev(div3, "class", "projekte_menülinks ");
    			add_location(div3, file$5, 51, 2, 1741);
    			add_location(p, file$5, 67, 5, 2369);
    			attr_dev(div4, "id", "projekt_selected_auswählen");
    			attr_dev(div4, "class", "projekt_selected");
    			set_style(div4, "display", "block");
    			add_location(div4, file$5, 66, 4, 2280);
    			attr_dev(div5, "style", "height: 80vh; width; 100vw; ");
    			add_location(div5, file$5, 49, 1, 1629);
    			add_location(main, file$5, 46, 0, 1595);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, main, anchor);
    			mount_component(groupui, main, null);
    			append_hydration_dev(main, t0);
    			mount_component(header, main, null);
    			append_hydration_dev(main, t1);
    			append_hydration_dev(main, div5);
    			append_hydration_dev(div5, div0);
    			append_hydration_dev(div0, t2);
    			append_hydration_dev(div5, t3);
    			append_hydration_dev(div5, div3);
    			append_hydration_dev(div3, groupui_search_field);
    			append_hydration_dev(div3, t4);
    			append_hydration_dev(div3, div2);
    			append_hydration_dev(div2, div1);
    			append_hydration_dev(div2, t5);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div2, null);
    			}

    			append_hydration_dev(div5, t6);
    			append_hydration_dev(div5, div4);
    			append_hydration_dev(div4, p);
    			append_hydration_dev(p, t7);
    			append_hydration_dev(div5, t8);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div5, null);
    			}

    			append_hydration_dev(main, t9);
    			mount_component(footer, main, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(groupui_search_field, "input", /*projektsuchen*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*projektegefiltert, sidebarprojekteselect*/ 1) {
    				each_value_1 = /*projektegefiltert*/ ctx[0];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*projektegefiltert*/ 1) {
    				each_value = /*projektegefiltert*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div5, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(groupui.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(groupui.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(groupui);
    			destroy_component(header);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			destroy_component(footer);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function sidebarprojekteselect(zahl) {
    	var aktuellselect = document.getElementById("projekt_selected").innerHTML;

    	if (aktuellselect != zahl) {
    		document.getElementById("projekt_select_" + aktuellselect).style.backgroundColor = "";
    		document.getElementById("projekt_selected_" + aktuellselect).style.display = "none";
    	}

    	document.getElementById("projekt_select_" + zahl).style.backgroundColor = "#00354d";

    	if (zahl != "auswählen") {
    		document.getElementById("projekt_selected_" + zahl).style.display = "block";
    	}

    	document.getElementById("projekt_selected").innerHTML = zahl;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Projekte', slots, []);

    	window.onload = function exampleFunction() {
    		
    	}; /*inhalt=document.getElementById("projektefilter").innerHTML
    		alert(inhalt)*/

    	let projekte = [
    		{
    			"projekt_name": "carPLAN",
    			"detail": "Detailierter Text",
    			"projektid": 123
    		},
    		{
    			"projekt_name": "aMaxa",
    			"detail": "detailmaxa"
    		},
    		{
    			"projekt_name": "aEva",
    			"detail": "detaileva"
    		},
    		{
    			"projekt_name": "aMax",
    			"detail": "detailamax"
    		}
    	];

    	var projektegefiltert = projekte.slice();

    	function projektsuchen() {
    		$$invalidate(0, projektegefiltert = projektegefiltert.pop());
    		$$invalidate(0, projektegefiltert = []);

    		//console.log(projektegefiltert)
    		var i = 0;

    		while (i < projekte.length) {
    			var gleich = projekte[i].projekt_name.toLowerCase().includes(document.getElementById("projektsuchen").value);

    			if (gleich === true) {
    				projektegefiltert.unshift(projekte[i]);
    			}

    			i = i + 1;
    		}
    	} //console.log(projektegefiltert)

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Projekte> was created with unknown prop '${key}'`);
    	});

    	const click_handler = projekt => sidebarprojekteselect(projekt.projekt_name);

    	$$self.$capture_state = () => ({
    		onMount,
    		Header,
    		Footer,
    		Groupui,
    		projekte,
    		projektegefiltert,
    		projektsuchen,
    		sidebarprojekteselect
    	});

    	$$self.$inject_state = $$props => {
    		if ('projekte' in $$props) projekte = $$props.projekte;
    		if ('projektegefiltert' in $$props) $$invalidate(0, projektegefiltert = $$props.projektegefiltert);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [projektegefiltert, projektsuchen, click_handler];
    }

    class Projekte extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Projekte",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/components/Faq.svelte generated by Svelte v3.48.0 */
    const file$6 = "src/components/Faq.svelte";

    function create_fragment$8(ctx) {
    	let main;
    	let groupui;
    	let t0;
    	let header;
    	let t1;
    	let h3;
    	let t2;
    	let t3;
    	let groupui_accordion0;
    	let span0;
    	let groupui_headline0;
    	let p0;
    	let t4;
    	let t5;
    	let p1;
    	let t6;
    	let t7;
    	let groupui_accordion1;
    	let span1;
    	let groupui_headline1;
    	let p2;
    	let t8;
    	let t9;
    	let p3;
    	let t10;
    	let t11;
    	let groupui_accordion2;
    	let span2;
    	let groupui_headline2;
    	let p4;
    	let t12;
    	let t13;
    	let p5;
    	let t14;
    	let t15;
    	let groupui_accordion3;
    	let span3;
    	let groupui_headline3;
    	let p6;
    	let t16;
    	let t17;
    	let p7;
    	let t18;
    	let t19;
    	let groupui_accordion4;
    	let span4;
    	let groupui_headline4;
    	let p8;
    	let t20;
    	let t21;
    	let p9;
    	let t22;
    	let t23;
    	let footer;
    	let current;
    	groupui = new Groupui({ $$inline: true });
    	header = new Header({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(groupui.$$.fragment);
    			t0 = space();
    			create_component(header.$$.fragment);
    			t1 = space();
    			h3 = element("h3");
    			t2 = text("FAQ");
    			t3 = space();
    			groupui_accordion0 = element("groupui-accordion");
    			span0 = element("span");
    			groupui_headline0 = element("groupui-headline");
    			p0 = element("p");
    			t4 = text("Frage 1");
    			t5 = space();
    			p1 = element("p");
    			t6 = text("Antwort 1");
    			t7 = space();
    			groupui_accordion1 = element("groupui-accordion");
    			span1 = element("span");
    			groupui_headline1 = element("groupui-headline");
    			p2 = element("p");
    			t8 = text("Frage 2");
    			t9 = space();
    			p3 = element("p");
    			t10 = text("Antwort 2");
    			t11 = space();
    			groupui_accordion2 = element("groupui-accordion");
    			span2 = element("span");
    			groupui_headline2 = element("groupui-headline");
    			p4 = element("p");
    			t12 = text("Frage 3");
    			t13 = space();
    			p5 = element("p");
    			t14 = text("Antwort 3");
    			t15 = space();
    			groupui_accordion3 = element("groupui-accordion");
    			span3 = element("span");
    			groupui_headline3 = element("groupui-headline");
    			p6 = element("p");
    			t16 = text("Frage 4");
    			t17 = space();
    			p7 = element("p");
    			t18 = text("Antwort 4");
    			t19 = space();
    			groupui_accordion4 = element("groupui-accordion");
    			span4 = element("span");
    			groupui_headline4 = element("groupui-headline");
    			p8 = element("p");
    			t20 = text("Frage 5");
    			t21 = space();
    			p9 = element("p");
    			t22 = text("Antwort 5");
    			t23 = space();
    			create_component(footer.$$.fragment);
    			this.h();
    		},
    		l: function claim(nodes) {
    			main = claim_element(nodes, "MAIN", {});
    			var main_nodes = children(main);
    			claim_component(groupui.$$.fragment, main_nodes);
    			t0 = claim_space(main_nodes);
    			claim_component(header.$$.fragment, main_nodes);
    			t1 = claim_space(main_nodes);
    			h3 = claim_element(main_nodes, "H3", {});
    			var h3_nodes = children(h3);
    			t2 = claim_text(h3_nodes, "FAQ");
    			h3_nodes.forEach(detach_dev);
    			t3 = claim_space(main_nodes);
    			groupui_accordion0 = claim_element(main_nodes, "GROUPUI-ACCORDION", { first: true, "icon-position": true });
    			var groupui_accordion0_nodes = children(groupui_accordion0);
    			span0 = claim_element(groupui_accordion0_nodes, "SPAN", { slot: true });
    			var span0_nodes = children(span0);
    			groupui_headline0 = claim_element(span0_nodes, "GROUPUI-HEADLINE", { heading: true });
    			var groupui_headline0_nodes = children(groupui_headline0);
    			p0 = claim_element(groupui_headline0_nodes, "P", { class: true });
    			var p0_nodes = children(p0);
    			t4 = claim_text(p0_nodes, "Frage 1");
    			p0_nodes.forEach(detach_dev);
    			groupui_headline0_nodes.forEach(detach_dev);
    			span0_nodes.forEach(detach_dev);
    			t5 = claim_space(groupui_accordion0_nodes);
    			p1 = claim_element(groupui_accordion0_nodes, "P", { class: true });
    			var p1_nodes = children(p1);
    			t6 = claim_text(p1_nodes, "Antwort 1");
    			p1_nodes.forEach(detach_dev);
    			groupui_accordion0_nodes.forEach(detach_dev);
    			t7 = claim_space(main_nodes);
    			groupui_accordion1 = claim_element(main_nodes, "GROUPUI-ACCORDION", { first: true, "icon-position": true });
    			var groupui_accordion1_nodes = children(groupui_accordion1);
    			span1 = claim_element(groupui_accordion1_nodes, "SPAN", { slot: true });
    			var span1_nodes = children(span1);
    			groupui_headline1 = claim_element(span1_nodes, "GROUPUI-HEADLINE", { heading: true });
    			var groupui_headline1_nodes = children(groupui_headline1);
    			p2 = claim_element(groupui_headline1_nodes, "P", { class: true });
    			var p2_nodes = children(p2);
    			t8 = claim_text(p2_nodes, "Frage 2");
    			p2_nodes.forEach(detach_dev);
    			groupui_headline1_nodes.forEach(detach_dev);
    			span1_nodes.forEach(detach_dev);
    			t9 = claim_space(groupui_accordion1_nodes);
    			p3 = claim_element(groupui_accordion1_nodes, "P", { class: true });
    			var p3_nodes = children(p3);
    			t10 = claim_text(p3_nodes, "Antwort 2");
    			p3_nodes.forEach(detach_dev);
    			groupui_accordion1_nodes.forEach(detach_dev);
    			t11 = claim_space(main_nodes);
    			groupui_accordion2 = claim_element(main_nodes, "GROUPUI-ACCORDION", { first: true, "icon-position": true });
    			var groupui_accordion2_nodes = children(groupui_accordion2);
    			span2 = claim_element(groupui_accordion2_nodes, "SPAN", { slot: true });
    			var span2_nodes = children(span2);
    			groupui_headline2 = claim_element(span2_nodes, "GROUPUI-HEADLINE", { heading: true });
    			var groupui_headline2_nodes = children(groupui_headline2);
    			p4 = claim_element(groupui_headline2_nodes, "P", { class: true });
    			var p4_nodes = children(p4);
    			t12 = claim_text(p4_nodes, "Frage 3");
    			p4_nodes.forEach(detach_dev);
    			groupui_headline2_nodes.forEach(detach_dev);
    			span2_nodes.forEach(detach_dev);
    			t13 = claim_space(groupui_accordion2_nodes);
    			p5 = claim_element(groupui_accordion2_nodes, "P", { class: true });
    			var p5_nodes = children(p5);
    			t14 = claim_text(p5_nodes, "Antwort 3");
    			p5_nodes.forEach(detach_dev);
    			groupui_accordion2_nodes.forEach(detach_dev);
    			t15 = claim_space(main_nodes);
    			groupui_accordion3 = claim_element(main_nodes, "GROUPUI-ACCORDION", { first: true, "icon-position": true });
    			var groupui_accordion3_nodes = children(groupui_accordion3);
    			span3 = claim_element(groupui_accordion3_nodes, "SPAN", { slot: true });
    			var span3_nodes = children(span3);
    			groupui_headline3 = claim_element(span3_nodes, "GROUPUI-HEADLINE", { heading: true });
    			var groupui_headline3_nodes = children(groupui_headline3);
    			p6 = claim_element(groupui_headline3_nodes, "P", { class: true });
    			var p6_nodes = children(p6);
    			t16 = claim_text(p6_nodes, "Frage 4");
    			p6_nodes.forEach(detach_dev);
    			groupui_headline3_nodes.forEach(detach_dev);
    			span3_nodes.forEach(detach_dev);
    			t17 = claim_space(groupui_accordion3_nodes);
    			p7 = claim_element(groupui_accordion3_nodes, "P", { class: true });
    			var p7_nodes = children(p7);
    			t18 = claim_text(p7_nodes, "Antwort 4");
    			p7_nodes.forEach(detach_dev);
    			groupui_accordion3_nodes.forEach(detach_dev);
    			t19 = claim_space(main_nodes);
    			groupui_accordion4 = claim_element(main_nodes, "GROUPUI-ACCORDION", { first: true, "icon-position": true });
    			var groupui_accordion4_nodes = children(groupui_accordion4);
    			span4 = claim_element(groupui_accordion4_nodes, "SPAN", { slot: true });
    			var span4_nodes = children(span4);
    			groupui_headline4 = claim_element(span4_nodes, "GROUPUI-HEADLINE", { heading: true });
    			var groupui_headline4_nodes = children(groupui_headline4);
    			p8 = claim_element(groupui_headline4_nodes, "P", { class: true });
    			var p8_nodes = children(p8);
    			t20 = claim_text(p8_nodes, "Frage 5");
    			p8_nodes.forEach(detach_dev);
    			groupui_headline4_nodes.forEach(detach_dev);
    			span4_nodes.forEach(detach_dev);
    			t21 = claim_space(groupui_accordion4_nodes);
    			p9 = claim_element(groupui_accordion4_nodes, "P", { class: true });
    			var p9_nodes = children(p9);
    			t22 = claim_text(p9_nodes, "Antwort 5");
    			p9_nodes.forEach(detach_dev);
    			groupui_accordion4_nodes.forEach(detach_dev);
    			t23 = claim_space(main_nodes);
    			claim_component(footer.$$.fragment, main_nodes);
    			main_nodes.forEach(detach_dev);
    			this.h();
    		},
    		h: function hydrate() {
    			add_location(h3, file$6, 12, 4, 239);
    			attr_dev(p0, "class", "schriftfarbe_dunkel");
    			add_location(p0, file$6, 15, 55, 364);
    			set_custom_element_data(groupui_headline0, "heading", "h6");
    			add_location(groupui_headline0, file$6, 15, 24, 333);
    			attr_dev(span0, "slot", "headline");
    			add_location(span0, file$6, 15, 2, 311);
    			attr_dev(p1, "class", "schriftfarbe_dunkel");
    			add_location(p1, file$6, 16, 2, 435);
    			set_custom_element_data(groupui_accordion0, "first", "true");
    			set_custom_element_data(groupui_accordion0, "icon-position", "left");
    			add_location(groupui_accordion0, file$6, 14, 1, 255);
    			attr_dev(p2, "class", "schriftfarbe_dunkel");
    			add_location(p2, file$6, 19, 55, 616);
    			set_custom_element_data(groupui_headline1, "heading", "h6");
    			add_location(groupui_headline1, file$6, 19, 24, 585);
    			attr_dev(span1, "slot", "headline");
    			add_location(span1, file$6, 19, 2, 563);
    			attr_dev(p3, "class", "schriftfarbe_dunkel");
    			add_location(p3, file$6, 20, 2, 687);
    			set_custom_element_data(groupui_accordion1, "first", "true");
    			set_custom_element_data(groupui_accordion1, "icon-position", "left");
    			add_location(groupui_accordion1, file$6, 18, 3, 507);
    			attr_dev(p4, "class", "schriftfarbe_dunkel");
    			add_location(p4, file$6, 23, 55, 868);
    			set_custom_element_data(groupui_headline2, "heading", "h6");
    			add_location(groupui_headline2, file$6, 23, 24, 837);
    			attr_dev(span2, "slot", "headline");
    			add_location(span2, file$6, 23, 2, 815);
    			attr_dev(p5, "class", "schriftfarbe_dunkel");
    			add_location(p5, file$6, 24, 2, 939);
    			set_custom_element_data(groupui_accordion2, "first", "true");
    			set_custom_element_data(groupui_accordion2, "icon-position", "left");
    			add_location(groupui_accordion2, file$6, 22, 3, 759);
    			attr_dev(p6, "class", "schriftfarbe_dunkel");
    			add_location(p6, file$6, 27, 55, 1120);
    			set_custom_element_data(groupui_headline3, "heading", "h6");
    			add_location(groupui_headline3, file$6, 27, 24, 1089);
    			attr_dev(span3, "slot", "headline");
    			add_location(span3, file$6, 27, 2, 1067);
    			attr_dev(p7, "class", "schriftfarbe_dunkel");
    			add_location(p7, file$6, 28, 2, 1191);
    			set_custom_element_data(groupui_accordion3, "first", "true");
    			set_custom_element_data(groupui_accordion3, "icon-position", "left");
    			add_location(groupui_accordion3, file$6, 26, 3, 1011);
    			attr_dev(p8, "class", "schriftfarbe_dunkel");
    			add_location(p8, file$6, 31, 55, 1372);
    			set_custom_element_data(groupui_headline4, "heading", "h6");
    			add_location(groupui_headline4, file$6, 31, 24, 1341);
    			attr_dev(span4, "slot", "headline");
    			add_location(span4, file$6, 31, 2, 1319);
    			attr_dev(p9, "class", "schriftfarbe_dunkel");
    			add_location(p9, file$6, 32, 2, 1443);
    			set_custom_element_data(groupui_accordion4, "first", "true");
    			set_custom_element_data(groupui_accordion4, "icon-position", "left");
    			add_location(groupui_accordion4, file$6, 30, 3, 1263);
    			add_location(main, file$6, 8, 0, 201);
    		},
    		m: function mount(target, anchor) {
    			insert_hydration_dev(target, main, anchor);
    			mount_component(groupui, main, null);
    			append_hydration_dev(main, t0);
    			mount_component(header, main, null);
    			append_hydration_dev(main, t1);
    			append_hydration_dev(main, h3);
    			append_hydration_dev(h3, t2);
    			append_hydration_dev(main, t3);
    			append_hydration_dev(main, groupui_accordion0);
    			append_hydration_dev(groupui_accordion0, span0);
    			append_hydration_dev(span0, groupui_headline0);
    			append_hydration_dev(groupui_headline0, p0);
    			append_hydration_dev(p0, t4);
    			append_hydration_dev(groupui_accordion0, t5);
    			append_hydration_dev(groupui_accordion0, p1);
    			append_hydration_dev(p1, t6);
    			append_hydration_dev(main, t7);
    			append_hydration_dev(main, groupui_accordion1);
    			append_hydration_dev(groupui_accordion1, span1);
    			append_hydration_dev(span1, groupui_headline1);
    			append_hydration_dev(groupui_headline1, p2);
    			append_hydration_dev(p2, t8);
    			append_hydration_dev(groupui_accordion1, t9);
    			append_hydration_dev(groupui_accordion1, p3);
    			append_hydration_dev(p3, t10);
    			append_hydration_dev(main, t11);
    			append_hydration_dev(main, groupui_accordion2);
    			append_hydration_dev(groupui_accordion2, span2);
    			append_hydration_dev(span2, groupui_headline2);
    			append_hydration_dev(groupui_headline2, p4);
    			append_hydration_dev(p4, t12);
    			append_hydration_dev(groupui_accordion2, t13);
    			append_hydration_dev(groupui_accordion2, p5);
    			append_hydration_dev(p5, t14);
    			append_hydration_dev(main, t15);
    			append_hydration_dev(main, groupui_accordion3);
    			append_hydration_dev(groupui_accordion3, span3);
    			append_hydration_dev(span3, groupui_headline3);
    			append_hydration_dev(groupui_headline3, p6);
    			append_hydration_dev(p6, t16);
    			append_hydration_dev(groupui_accordion3, t17);
    			append_hydration_dev(groupui_accordion3, p7);
    			append_hydration_dev(p7, t18);
    			append_hydration_dev(main, t19);
    			append_hydration_dev(main, groupui_accordion4);
    			append_hydration_dev(groupui_accordion4, span4);
    			append_hydration_dev(span4, groupui_headline4);
    			append_hydration_dev(groupui_headline4, p8);
    			append_hydration_dev(p8, t20);
    			append_hydration_dev(groupui_accordion4, t21);
    			append_hydration_dev(groupui_accordion4, p9);
    			append_hydration_dev(p9, t22);
    			append_hydration_dev(main, t23);
    			mount_component(footer, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(groupui.$$.fragment, local);
    			transition_in(header.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(groupui.$$.fragment, local);
    			transition_out(header.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(groupui);
    			destroy_component(header);
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Faq', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Faq> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount, Header, Footer, Groupui });
    	return [];
    }

    class Faq extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Faq",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/routes/index.svelte generated by Svelte v3.48.0 */

    // (10:0) <Router {url}>
    function create_default_slot(ctx) {
    	let route0;
    	let t0;
    	let route1;
    	let t1;
    	let route2;
    	let current;

    	route0 = new Route({
    			props: { path: "projekte", component: Projekte },
    			$$inline: true
    		});

    	route1 = new Route({
    			props: { path: "/", component: Home },
    			$$inline: true
    		});

    	route2 = new Route({
    			props: { path: "/faq", component: Faq },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(route0.$$.fragment);
    			t0 = space();
    			create_component(route1.$$.fragment);
    			t1 = space();
    			create_component(route2.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(route0.$$.fragment, nodes);
    			t0 = claim_space(nodes);
    			claim_component(route1.$$.fragment, nodes);
    			t1 = claim_space(nodes);
    			claim_component(route2.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert_hydration_dev(target, t0, anchor);
    			mount_component(route1, target, anchor);
    			insert_hydration_dev(target, t1, anchor);
    			mount_component(route2, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(route0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(route1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(route2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(10:0) <Router {url}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let router;
    	let current;

    	router = new Router({
    			props: {
    				url: /*url*/ ctx[0],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(router.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};
    			if (dirty & /*url*/ 1) router_changes.url = /*url*/ ctx[0];

    			if (dirty & /*$$scope*/ 2) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Routes', slots, []);
    	let { url = '' } = $$props;
    	const writable_props = ['url'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Routes> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('url' in $$props) $$invalidate(0, url = $$props.url);
    	};

    	$$self.$capture_state = () => ({ Router, Route, Home, Projekte, Faq, url });

    	$$self.$inject_state = $$props => {
    		if ('url' in $$props) $$invalidate(0, url = $$props.url);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [url];
    }

    class Routes extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { url: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Routes",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get url() {
    		throw new Error("<Routes>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Routes>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.48.0 */

    function create_fragment$a(ctx) {
    	let router;
    	let current;
    	router = new Routes({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			claim_component(router.$$.fragment, nodes);
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Router: Routes });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    const app = new App({
       target: document.body,
       hydrate: true
    });



    /*import App from './App.svelte';

    const app = new App({
    	target: document.body,
    	hydrate: true,
    	props: {
    		name: 'world'
    	}
    });

    export default app;
    */

    return app;

}());
//# sourceMappingURL=bundle.js.map
