# event-listener-helper
[![npm version](https://badge.fury.io/js/event-listener-helper.svg)](https://badge.fury.io/js/event-listener-helper)
[![CircleCI](https://circleci.com/gh/riversun/event-listener-helper.svg?style=shield)](https://circleci.com/gh/riversun/event-listener-helper)
[![codecov](https://codecov.io/gh/riversun/event-listener-helper/branch/master/graph/badge.svg)](https://codecov.io/gh/riversun/event-listener-helper)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/02b5f97b330840848458d73104574810)](https://app.codacy.com/manual/riversun/event-listener-helper?utm_source=github.com&utm_medium=referral&utm_content=riversun/event-listener-helper&utm_campaign=Badge_Grade_Dashboard)

  This library allows you to:  
  - Get a list of event listeners attached to the target node
  - Confirms the existence of event listener registered on the target node
  - Deletes all event listeners registered on the target node
  - Registers event listeners with name (rather than a reference)
  
  These benefits can be received by calling **addEventListener** and **removeEventListener** via this library.
  
  MIT License
  
# Examples

- Add **named** event listener to the button element

```javascript
  const eh = new EventListenerHelper();

  const btn = document.querySelector('#myButton');

  eh.addEventListener(btn, 'click', () => {
    alert('Hello!');
  }, { listenerName: 'my-listener' });

```

- Remove **named** event listener from the button element

```javascript
  const eh = new EventListenerHelper();

  const btn = document.querySelector('#myButton');

  eh.addEventListener(btn, 'click', () => {
    alert('Hello!');
  }, { listenerName: 'my-listener' });

  eh.clearEventListener(btn, 'click', 'my-listener');
    
```

- Get registered listeners on the button element

```javascript
eh.getEventListeners(btn, 'click');
```

- Check the existence of a listener who has already registered

```javascript
eh.hasEventListeners(btn, 'click');
```

# Demo

https://riversun.github.io/event-listener-helper/

# How to install

- **NPM**

```
npm install event-listener-helper
```

   or 

- **use `<script>` tag**  from CDN

```html
 <script src="https://cdn.jsdelivr.net/npm/event-listener-helper/lib/event-listener-helper.js"></script>
```

# API Details

[JSDoc here](https://riversun.github.io/event-listener-helper/docs/EventListenerHelper.html)

<a name="EventListenerHelper"></a>

## EventListenerHelper
**Kind**: global class  
**Author**: Tom Misawa (riversun.org@gmail.com,https://github.com/riversun)  

* [EventListenerHelper](#EventListenerHelper)
    * [new EventListenerHelper()](#new_EventListenerHelper_new)
    * [.addEventListener(eventTarget, eventType, listener, [options])](#EventListenerHelper+addEventListener) ⇒
    * [.removeEventListener(eventTarget, eventType, [listener], [options])](#EventListenerHelper+removeEventListener) ⇒
    * [.getEventListeners(eventTarget, [eventType])](#EventListenerHelper+getEventListeners) ⇒
    * [.getAllEventListeners()](#EventListenerHelper+getAllEventListeners) ⇒
    * [.getEventListener(eventTarget, eventType, listenerName)](#EventListenerHelper+getEventListener) ⇒ <code>function</code>
    * [.hasEventListeners(eventTarget, eventType)](#EventListenerHelper+hasEventListeners) ⇒ <code>boolean</code>
    * [.hasEventListener(eventTarget, eventType, listenerName)](#EventListenerHelper+hasEventListener) ⇒ <code>boolean</code>
    * [.clearAllEventListeners()](#EventListenerHelper+clearAllEventListeners)
    * [.clearEventListeners(eventTarget, [eventType])](#EventListenerHelper+clearEventListeners)
    * [.clearEventListener(eventTarget, [eventType], listenerName)](#EventListenerHelper+clearEventListener)
    * [.getAllEventTargets()](#EventListenerHelper+getAllEventTargets) ⇒
    * [.searchEventListenersByName(listenerName)](#EventListenerHelper+searchEventListenersByName) ⇒

<a name="new_EventListenerHelper_new"></a>

### new EventListenerHelper()
This library allows you to:
get a list of event listeners attached to the target node,
confirms the existence of event listener registered on the target node,
deletes all event listeners registered on the target node,
registers event listeners with name (rather than a reference).
These benefits can be received by calling addEventListener and removeEventListener through this library.

MIT License

<a name="EventListenerHelper+addEventListener"></a>

### eventListenerHelper.addEventListener(eventTarget, eventType, listener, [options]) ⇒
**Kind**: instance method of [<code>EventListenerHelper</code>](#EventListenerHelper)  

| Param | Type | Description |
| --- | --- | --- |
| eventTarget | <code>EventTarget</code> | EventTarget is a DOM interface implemented by objects that can receive events and may have listeners for them.<br>   <p><a href="https://developer.mozilla.org/en-US/docs/Web/API/EventTarget">EventTarget</a> by <a class="new" rel="nofollow" title="Page has not yet been created.">Mozilla Contributors</a> is licensed under <a class="external" href="http://creativecommons.org/licenses/by-sa/2.5/" rel="noopener">CC-BY-SA 2.5</a>.</p> |
| eventType | <code>String</code> | A case-sensitive string representing the <a href="/en-US/docs/Web/Events">event type</a> to listen for. |
| listener | <code>function</code> | The object which receives a notification (an object that implements the <a href="/en-US/docs/Web/API/Event"><code>Event</code></a> interface) when an event of the specified type occurs. This must be an object implementing the <a href="/en-US/docs/Web/API/EventListener"><code>EventListener</code></a> interface, or a JavaScript <a href="/en-US/docs/JavaScript/Guide/Functions">function</a>. See <a href="#The_event_listener_callback">The event listener callback</a> for details on the callback itself. |
| [options] | <code>Object</code> | An options object specifies characteristics about the event listener. The available options are:<br>    <dl>    <dt><code><var><b>listenerName</b></var></code></dt>    <dd>A <code>String</code>By assigning listenerName, the specified listener function (callback function) can be specified.In other words, it is possible to retrieve the listener function later    using this listenerName as a key.listenerName must be unique.    </dd>    <dt><code><var>capture</var></code></dt>    <dd>A <a href="/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean"><code>Boolean</code></a> indicating that events of this type will be dispatched to the registered <code>listener</code>    before being dispatched to any <code>EventTarget</code> beneath it in the DOM tree.    </dd>    <dt><code><var>once</var></code></dt>    <dd>A <a href="/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean"><code>Boolean</code></a> indicating that the <code><var>listener</var></code> should be invoked at most once after being    added. If <code>true</code>, the <code><var>listener</var></code> would be automatically removed when invoked.    </dd>    </dl>    <p><a href="https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener">addEventListener</a> by <a class="new" rel="nofollow" title="Page has not yet been created.">Mozilla Contributors</a> is licensed under <a class="external" href="http://creativecommons.org/licenses/by-sa/2.5/" rel="noopener">CC-BY-SA 2.5</a>.</p> |

<a name="EventListenerHelper+removeEventListener"></a>

### eventListenerHelper.removeEventListener(eventTarget, eventType, [listener], [options]) ⇒
The EventListenerHelper#removeEventListener method removes from the EventTarget an event listener previously registered with EventListenerHelper#addEventListener.
   The event listener to be removed is identified using option.
   listenerName and a combination of the event type, the event listener function itself,
   and various optional options that may affect the matching process; see Matching event listeners for removal

**Kind**: instance method of [<code>EventListenerHelper</code>](#EventListenerHelper)  

| Param | Type | Description |
| --- | --- | --- |
| eventTarget | <code>EventTarget</code> | EventTarget is a DOM interface implemented by objects that can receive events and may have listeners for them.<br>   <p><a href="https://developer.mozilla.org/en-US/docs/Web/API/EventTarget">EventTarget</a> by <a class="new" rel="nofollow" title="Page has not yet been created.">Mozilla Contributors</a> is licensed under <a class="external" href="http://creativecommons.org/licenses/by-sa/2.5/" rel="noopener">CC-BY-SA 2.5</a>.</p> |
| eventType | <code>String</code> | A string which specifies the type of event for which to remove an event listener. |
| [listener] | <code>function</code> | (Either the listener or options.listenerName must be specified. If both are specified, options.listenerName takes precedence.) <br> The object which receives a notification (an object that implements the <a href="/en-US/docs/Web/API/Event"><code>Event</code></a> interface) when an event of the specified type occurs. This must be an object implementing the <a href="/en-US/docs/Web/API/EventListener"><code>EventListener</code></a> interface, or a JavaScript <a href="/en-US/docs/JavaScript/Guide/Functions">function</a>. See <a href="#The_event_listener_callback">The event listener callback</a> for details on the callback itself. |
| [options] | <code>Object</code> | (Either the listener or options.listenerName must be specified. If both are specified, options.listenerName takes precedence.)<br> An options object specifies characteristics about the event listener. The available options are:<br>    <dl>    <dt><code><var><b>listenerName</b></var></code></dt>    <dd>A <code>String</code>By assigning listenerName, the specified listener function (callback function) can be specified.In other words, it is possible to retrieve the listener function later    using this listenerName as a key.listenerName must be unique.    </dd>    <dt><code><var>capture</var></code></dt>    <dd>A <a href="/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean"><code>Boolean</code></a> indicating that events of this type will be dispatched to the registered <code>listener</code>    before being dispatched to any <code>EventTarget</code> beneath it in the DOM tree.    </dd>    </dl>    <p><a href="https://developer.mozilla.org/ja/docs/Web/API/EventTarget/removeEventListener">removeEventListener</a> by <a class="new" rel="nofollow" title="Page has not yet been created.">Mozilla Contributors</a> is licensed under <a class="external" href="http://creativecommons.org/licenses/by-sa/2.5/" rel="noopener">CC-BY-SA 2.5</a>.</p> |

<a name="EventListenerHelper+getEventListeners"></a>

### eventListenerHelper.getEventListeners(eventTarget, [eventType]) ⇒
Get a listener definition matching the specified eventTarget and eventType (optional).
Please note that the return value is immutable.

**Kind**: instance method of [<code>EventListenerHelper</code>](#EventListenerHelper)  
**Returns**: Example of the returned value when only eventTarget is specified:<br><code><pre>
   [
   {
      eventType:click,
      listener:[
         {
            listener:func,
            options:{
               listenerName:my-test-listener-1
            }
         },
         {
            listener:func,
            options:{
               capture:true,
               listenerName:my-test-listener-2
            }
         }
      ]
   },
   {
      eventType:mousemove,
      listener:[
         {
            listener:func,
            options:{
               once:true,
               listenerName:my-test-listener-3
            }
         }
      ]
   }
   ]
   </pre></code>
   <br>
   Example of returned value when eventType is also specified as an argument:<br><code><pre>
   [
   {
      options:{
         listenerName:my-test-listener-1
      },
      listener:func1
   },
   {
      options:{
         capture:true,
         listenerName:my-test-listener-2
      },
      listener:func2
   },
   {
      options:{
         once:true,
         listenerName:my-test-listener-3
      },
      listener:func3
   }
   ]
   </pre></code>  

| Param | Type | Description |
| --- | --- | --- |
| eventTarget | <code>EventTarget</code> | EventTarget is a DOM interface implemented by objects that can receive events and may have listeners for them.<br>   <p><a href="https://developer.mozilla.org/en-US/docs/Web/API/EventTarget">EventTarget</a> by <a class="new" rel="nofollow" title="Page has not yet been created.">Mozilla Contributors</a> is licensed under <a class="external" href="http://creativecommons.org/licenses/by-sa/2.5/" rel="noopener">CC-BY-SA 2.5</a>.</p> |
| [eventType] | <code>String</code> | A case-sensitive string representing the <a href="/en-US/docs/Web/Events">event type</a> to listen for. |

<a name="EventListenerHelper+getAllEventListeners"></a>

### eventListenerHelper.getAllEventListeners() ⇒
You can get listeners for "inputElement" 's "click" event by map chain.

**Kind**: instance method of [<code>EventListenerHelper</code>](#EventListenerHelper)  
**Returns**: const listeners=result.get(inputElement).get('click');  
<a name="EventListenerHelper+getEventListener"></a>

### eventListenerHelper.getEventListener(eventTarget, eventType, listenerName) ⇒ <code>function</code>
Get a listener with the specified eventTarget, eventType and listenerName.
   The listenerName must be unique for one eventTarget and eventType combination,
   but it does not have to be unique for different eventTargets or different eventTypes.

**Kind**: instance method of [<code>EventListenerHelper</code>](#EventListenerHelper)  
**Returns**: <code>function</code> - Returns null if no listener function is found  

| Param | Type | Description |
| --- | --- | --- |
| eventTarget | <code>EventTarget</code> | EventTarget is a DOM interface implemented by objects that can receive events and may have listeners for them.<br>   <p><a href="https://developer.mozilla.org/en-US/docs/Web/API/EventTarget">EventTarget</a> by <a class="new" rel="nofollow" title="Page has not yet been created.">Mozilla Contributors</a> is licensed under <a class="external" href="http://creativecommons.org/licenses/by-sa/2.5/" rel="noopener">CC-BY-SA 2.5</a>.</p> |
| eventType | <code>String</code> | A case-sensitive string representing the <a href="/en-US/docs/Web/Events">event type</a> to listen for. |
| listenerName | <code>String</code> | The listener name of the listener you want to find |

<a name="EventListenerHelper+hasEventListeners"></a>

### eventListenerHelper.hasEventListeners(eventTarget, eventType) ⇒ <code>boolean</code>
Returns whether or not there are more than one event listener for the given eventTarget and eventType.

**Kind**: instance method of [<code>EventListenerHelper</code>](#EventListenerHelper)  

| Param |
| --- |
| eventTarget | 
| eventType | 

<a name="EventListenerHelper+hasEventListener"></a>

### eventListenerHelper.hasEventListener(eventTarget, eventType, listenerName) ⇒ <code>boolean</code>
Returns whether a listenerName exists for the specified eventTarget and eventType.

**Kind**: instance method of [<code>EventListenerHelper</code>](#EventListenerHelper)  

| Param | Type | Description |
| --- | --- | --- |
| eventTarget | <code>EventTarget</code> | EventTarget is a DOM interface implemented by objects that can receive events and may have listeners for them.<br>   <p><a href="https://developer.mozilla.org/en-US/docs/Web/API/EventTarget">EventTarget</a> by <a class="new" rel="nofollow" title="Page has not yet been created.">Mozilla Contributors</a> is licensed under <a class="external" href="http://creativecommons.org/licenses/by-sa/2.5/" rel="noopener">CC-BY-SA 2.5</a>.</p> |
| eventType | <code>String</code> | A case-sensitive string representing the <a href="/en-US/docs/Web/Events">event type</a> to listen for. |
| listenerName | <code>String</code> | The listener name of the listener you want to find |

<a name="EventListenerHelper+clearAllEventListeners"></a>

### eventListenerHelper.clearAllEventListeners()
Removes all registered events through the addEventListener method.

**Kind**: instance method of [<code>EventListenerHelper</code>](#EventListenerHelper)  
<a name="EventListenerHelper+clearEventListeners"></a>

### eventListenerHelper.clearEventListeners(eventTarget, [eventType])
Remove all listeners matching the specified eventTarget and eventType (optional).

**Kind**: instance method of [<code>EventListenerHelper</code>](#EventListenerHelper)  

| Param | Type | Description |
| --- | --- | --- |
| eventTarget | <code>EventTarget</code> | EventTarget is a DOM interface implemented by objects that can receive events and may have listeners for them.<br>   <p><a href="https://developer.mozilla.org/en-US/docs/Web/API/EventTarget">EventTarget</a> by <a class="new" rel="nofollow" title="Page has not yet been created.">Mozilla Contributors</a> is licensed under <a class="external" href="http://creativecommons.org/licenses/by-sa/2.5/" rel="noopener">CC-BY-SA 2.5</a>.</p> |
| [eventType] | <code>String</code> | A case-sensitive string representing the <a href="/en-US/docs/Web/Events">event type</a> to listen for. |

<a name="EventListenerHelper+clearEventListener"></a>

### eventListenerHelper.clearEventListener(eventTarget, [eventType], listenerName)
Removes the eventListener with eventTarget, eventType, and listenerName as arguments.
   The functions are the same as those of removeEventListener, except for the way to give arguments.

**Kind**: instance method of [<code>EventListenerHelper</code>](#EventListenerHelper)  

| Param | Type | Description |
| --- | --- | --- |
| eventTarget | <code>EventTarget</code> | EventTarget is a DOM interface implemented by objects that can receive events and may have listeners for them.<br>   <p><a href="https://developer.mozilla.org/en-US/docs/Web/API/EventTarget">EventTarget</a> by <a class="new" rel="nofollow" title="Page has not yet been created.">Mozilla Contributors</a> is licensed under <a class="external" href="http://creativecommons.org/licenses/by-sa/2.5/" rel="noopener">CC-BY-SA 2.5</a>.</p> |
| [eventType] | <code>String</code> | A case-sensitive string representing the <a href="/en-US/docs/Web/Events">event type</a> to listen for. |
| listenerName | <code>String</code> | The listener name of the listener you want to find |

<a name="EventListenerHelper+getAllEventTargets"></a>

### eventListenerHelper.getAllEventTargets() ⇒
Get all registered eventTargets through the #addEventListener method.

**Kind**: instance method of [<code>EventListenerHelper</code>](#EventListenerHelper)  
<a name="EventListenerHelper+searchEventListenersByName"></a>

### eventListenerHelper.searchEventListenersByName(listenerName) ⇒
Get all listeners(listener definition) with a given listenerName.
   Since listeners need only be unique to the eventTarget and eventType,
   it is possible to have the same listenerName for different eventTargets and eventTypes.

**Kind**: instance method of [<code>EventListenerHelper</code>](#EventListenerHelper)  
**Returns**: <code><pre>[ { options: { listenerName: 'my-test-listener' },
        listener: [Function: func] },
   { options: { capture: true, listenerName: 'my-test-listener' },
        listener: [Function: func] },
   { options: { once: true, listenerName: 'my-test-listener' },
        listener: [Function: func] },
   { options: { once: true, listenerName: 'my-test-listener' },
        listener: [Function: func] } ]
   </pre></code>  

| Param | Type | Description |
| --- | --- | --- |
| listenerName | <code>String</code> | The listener name of the listener you want to find |

