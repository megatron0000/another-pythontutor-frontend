## Classes

<dl>
<dt><a href="#EventListenerList">EventListenerList</a></dt>
<dd><p>A sequential list containing event listeners(callback functions)</p>
</dd>
<dt><a href="#EventListenerMap">EventListenerMap</a></dt>
<dd><p>Map that stores listeners(callback functions) with the specific key</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#on">on(eventType, listenerFunc)</a></dt>
<dd><p>Set eventType you want to receive and the listener function to be callbacked from #emit method
 (This eventType will never fire unless called with emit)</p>
</dd>
<dt><a href="#removeListener">removeListener(eventType, listenerFunc)</a></dt>
<dd><p>Remove specified event listener</p>
</dd>
<dt><a href="#only">only(eventType, listenerName, listenerFunc)</a></dt>
<dd><p>Only one listener is registered per &quot;listenerName&quot; even if called multiple times.
If the same listenerName is set for listener, the old listener will be removed.</p>
</dd>
<dt><a href="#pipe">pipe(eventEmitter)</a></dt>
<dd><p>Set the emitter that receives the callback of this emitter.
When the specified emitter is received a callback, the specified emitter also emits it to its listener.</p>
</dd>
<dt><a href="#emit">emit(eventType, data)</a></dt>
<dd><p>Emit data to listeners (callback functions) registered with the &quot;on()&quot; method.</p>
</dd>
<dt><a href="#getAllListeners">getAllListeners()</a> ⇒ <code>Object</code></dt>
<dd><p>Returns all listeners like below.
   result={
      testEvent: {
        listeners: [ [Function (anonymous)] ],
        childEventEmitters: [ { childEmitterIdx: 0, listeners: [Array] } ]
      }
    }</p>
</dd>
<dt><a href="#hasListenerFuncs">hasListenerFuncs(eventType)</a> ⇒ <code>boolean</code></dt>
<dd><p>Returns true if at least one ListenerFunction that receives the event specified by &quot;eventType&quot; is registered</p>
</dd>
<dt><a href="#clearAll">clearAll()</a></dt>
<dd><p>Clear all related listeners</p>
</dd>
<dt><a href="#addOnIntercepterFunc">addOnIntercepterFunc(funcName, func)</a></dt>
<dd><p>Add callback func(s) to notify when calling on() method.</p>
</dd>
<dt><a href="#removeOnIntercepterFunc">removeOnIntercepterFunc(funcName)</a></dt>
<dd><p>Add callback func to notify when calling on() method.</p>
</dd>
<dt><a href="#getAllOnIntercepterFuncs">getAllOnIntercepterFuncs()</a></dt>
<dd><p>Returns callback func and func name to notify when calling on() method.</p>
</dd>
</dl>

<a name="on"></a>

## on(eventType, listenerFunc)
Set eventType you want to receive and the listener function to be callbacked from #emit method
 (This eventType will never fire unless called with emit)

**Kind**: global function  

| Param | Type |
| --- | --- |
| eventType | <code>string</code> | 
| listenerFunc | <code>function</code> | 

<a name="removeListener"></a>

## removeListener(eventType, listenerFunc)
Remove specified event listener

**Kind**: global function  

| Param |
| --- |
| eventType | 
| listenerFunc | 

<a name="only"></a>

## only(eventType, listenerName, listenerFunc)
Only one listener is registered per "listenerName" even if called multiple times.
If the same listenerName is set for listener, the old listener will be removed.

**Kind**: global function  

| Param | Type |
| --- | --- |
| eventType | <code>string</code> | 
| listenerName | <code>string</code> | 
| listenerFunc | <code>function</code> | 

<a name="pipe"></a>

## pipe(eventEmitter)
Set the emitter that receives the callback of this emitter.
When the specified emitter is received a callback, the specified emitter also emits it to its listener.

**Kind**: global function  

| Param |
| --- |
| eventEmitter | 

<a name="emit"></a>

## emit(eventType, data)
Emit data to listeners (callback functions) registered with the "on()" method.

**Kind**: global function  

| Param | Type |
| --- | --- |
| eventType | <code>string</code> | 
| data | <code>object</code> | 

<a name="getAllListeners"></a>

## getAllListeners() ⇒ <code>Object</code>
Returns all listeners like below.
   result={
      testEvent: {
        listeners: [ [Function (anonymous)] ],
        childEventEmitters: [ { childEmitterIdx: 0, listeners: [Array] } ]
      }
    }

**Kind**: global function  
<a name="hasListenerFuncs"></a>

## hasListenerFuncs(eventType) ⇒ <code>boolean</code>
Returns true if at least one ListenerFunction that receives the event specified by "eventType" is registered

**Kind**: global function  

| Param | Type |
| --- | --- |
| eventType | <code>string</code> | 

<a name="clearAll"></a>

## clearAll()
Clear all related listeners

**Kind**: global function  
<a name="addOnIntercepterFunc"></a>

## addOnIntercepterFunc(funcName, func)
Add callback func(s) to notify when calling on() method.

**Kind**: global function  

| Param |
| --- |
| funcName | 
| func | 

<a name="removeOnIntercepterFunc"></a>

## removeOnIntercepterFunc(funcName)
Add callback func to notify when calling on() method.

**Kind**: global function  

| Param |
| --- |
| funcName | 

<a name="getAllOnIntercepterFuncs"></a>

## getAllOnIntercepterFuncs()
Returns callback func and func name to notify when calling on() method.

**Kind**: global function  
