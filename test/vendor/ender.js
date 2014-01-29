/*!
  * =============================================================
  * Ender: open module JavaScript framework (https://ender.no.de)
  * Build: ender build reqwest
  * Packages: ender-js@0.5.0 reqwest@0.9.7
  * =============================================================
  */

/*!
  * Ender: open module JavaScript framework (client-lib)
  * copyright Dustin Diaz & Jacob Thornton 2011-2012 (@ded @fat)
  * http://ender.jit.su
  * License MIT
  */
(function (context) {

  // a global object for node.js module compatiblity
  // ============================================

  context['global'] = context

  // Implements simple module system
  // loosely based on CommonJS Modules spec v1.1.1
  // ============================================

  var modules = {}
    , old = context['$']
    , oldEnder = context['ender']
    , oldRequire = context['require']
    , oldProvide = context['provide']

  /**
   * @param {string} name
   */
  function require(name) {
    // modules can be required from ender's build system, or found on the window
    var module = modules['$' + name];
    if (!module) throw new Error("Ender Error: Requested module '" + name + "' has not been defined.")
    return module
  }

  /**
   * @param {string} name
   * @param {*}      what
   */
  function provide(name, what) {
    return (modules['$' + name] = what)
  }

  context['provide'] = provide
  context['require'] = require

  function aug(o, o2) {
    for (var k in o2) k != 'noConflict' && k != '_VERSION' && (o[k] = o2[k])
    return o
  }
  
  /**
   * @param   {*}  o  is an item to count
   * @return  {number|boolean}
   */
  function count(o) {
    if (typeof o != 'object' || !o || o.nodeType)
      return false
    return typeof (o = o.length) == 'number' && o === o ? o : false
  }

  /**
   * @constructor
   * @param  {*=}      item   selector|node|collection|callback|anything
   * @param  {Object=} root   node(s) from which to base selector queries
   */  
  function Ender(item, root) {
    var i
    this.length = 0 // Ensure that instance owns length

    if (typeof item == 'string')
      // Start @ strings so the result parlays into the other checks
      // The .selector prop only applies to strings
      item = ender['_select'](this['selector'] = item, root)

    if (null == item)
      return this // Do not wrap null|undefined

    if (typeof item == 'function')
      ender['_closure'](item, root)

    // DOM node | scalar | not array-like
    else if (false === (i = count(item)))
      this[this.length++] = item

    // Array-like - Bitwise ensures integer length:
    else for (this.length = i = i > 0 ? i >> 0 : 0; i--;)
      this[i] = item[i]
  }
  
  /**
   * @param  {*=}      item   selector|node|collection|callback|anything
   * @param  {Object=} root   node(s) from which to base selector queries
   * @return {Ender}
   */
  function ender(item, root) {
    return new Ender(item, root)
  }

  ender['_VERSION'] = '0.4.x'

  // Sync the prototypes for jQuery compatibility
  ender['fn'] = ender.prototype = Ender.prototype 

  Ender.prototype['$'] = ender // handy reference to self

  // dev tools secret sauce
  Ender.prototype['splice'] = function () { throw new Error('Not implemented') }
  
  /**
   * @param   {function(*, number, Ender)} fn
   * @param   {Object=} opt_scope
   * @return  {Ender}
   */
  Ender.prototype['forEach'] = function (fn, opt_scope) {
    var i, l
    // opt out of native forEach so we can intentionally call our own scope
    // defaulting to the current item and be able to return self
    for (i = 0, l = this.length; i < l; ++i) i in this && fn.call(opt_scope || this[i], this[i], i, this)
    // return self for chaining
    return this
  }

  /**
   * @param {Object|Function} o
   * @param {boolean=}        chain
   */
  ender['ender'] = function (o, chain) {
    aug(chain ? Ender.prototype : ender, o)
  }

  /**
   * @param {string}  s
   * @param {Node=}   r
   */
  ender['_select'] = function (s, r) {
    return s ? (r || document).querySelectorAll(s) : []
  }

  /**
   * @param {Function} fn
   */
  ender['_closure'] = function (fn) {
    fn.call(document, ender)
  }

  /**
   * @param {(boolean|Function)=} fn  optional flag or callback
   * To unclaim the global $, use no args. To unclaim *all* ender globals, 
   * use `true` or a callback that receives (require, provide, ender)
   */
  ender['noConflict'] = function (fn) {
    context['$'] = old
    if (fn) {
      context['provide'] = oldProvide
      context['require'] = oldRequire
      context['ender'] = oldEnder
      typeof fn == 'function' && fn(require, provide, this)
    }
    return this
  }

  if (typeof module !== 'undefined' && module['exports']) module['exports'] = ender
  // use subscript notation as extern for Closure compilation
  // developers.google.com/closure/compiler/docs/api-tutorial3
  context['ender'] = context['$'] = ender

}(this));

(function () {

  var module = { exports: {} }, exports = module.exports;

  /*! version: 0.9.7
    * Reqwest! A general purpose XHR connection manager
    * license MIT (c) Dustin Diaz 2013
    * https://github.com/ded/reqwest
    */

  !function (name, context, definition) {
    if (typeof module != 'undefined' && module.exports) module.exports = definition()
    else if (typeof define == 'function' && define.amd) define(definition)
    else context[name] = definition()
  }('reqwest', this, function () {

    var twoHundo = /^(20\d|1223)$/
      , readyState = 'readyState'
      , contentType = 'Content-Type'
      , requestedWith = 'X-Requested-With'
      , uniqid = 0
      , callbackPrefix = 'reqwest_' + (+new Date())
      , lastValue // data stored by the most recent JSONP callback
      , xmlHttpRequest = 'XMLHttpRequest'
      , xDomainRequest = 'XDomainRequest'
      , noop = function () {}

      , isArray = typeof Array.isArray == 'function'
          ? Array.isArray
          : function (a) {
              return a instanceof Array
            }

      , defaultHeaders = {
            'contentType': 'application/x-www-form-urlencoded'
          , 'requestedWith': xmlHttpRequest
          , 'accept': {
                '*':  'text/javascript, text/html, application/xml, text/xml, */*'
              , 'xml':  'application/xml, text/xml'
              , 'html': 'text/html'
              , 'text': 'text/plain'
              , 'json': 'application/json, text/javascript'
              , 'js':   'application/javascript, text/javascript'
            }
        }

      , xhr = function(o) {
          // is it x-domain
          if (o['crossOrigin'] === true) {
            var xhr = win[xmlHttpRequest] ? new XMLHttpRequest() : null
            if (xhr && 'withCredentials' in xhr) {
              return xhr
            } else if (win[xDomainRequest]) {
              return new XDomainRequest()
            } else {
              throw new Error('Browser does not support cross-origin requests')
            }
          } else if (win[xmlHttpRequest]) {
            return new XMLHttpRequest()
          } else {
            return new ActiveXObject('Microsoft.XMLHTTP')
          }
        }
      , globalSetupOptions = {
          dataFilter: function (data) {
            return data
          }
        }

    function handleReadyState(r, success, error) {
      return function () {
        // use _aborted to mitigate against IE err c00c023f
        // (can't read props on aborted request objects)
        if (r._aborted) return error(r.request)
        if (r.request && r.request[readyState] == 4) {
          r.request.onreadystatechange = noop
          if (twoHundo.test(r.request.status))
            success(r.request)
          else
            error(r.request)
        }
      }
    }

    function setHeaders(http, o) {
      var headers = o['headers'] || {}
        , h

      headers['Accept'] = headers['Accept']
        || defaultHeaders['accept'][o['type']]
        || defaultHeaders['accept']['*']

      // breaks cross-origin requests with legacy browsers
      if (!o['crossOrigin'] && !headers[requestedWith]) headers[requestedWith] = defaultHeaders['requestedWith']
      if (!headers[contentType]) headers[contentType] = o['contentType'] || defaultHeaders['contentType']
      for (h in headers)
        headers.hasOwnProperty(h) && 'setRequestHeader' in http && http.setRequestHeader(h, headers[h])
    }

    function setCredentials(http, o) {
      if (typeof o['withCredentials'] !== 'undefined' && typeof http.withCredentials !== 'undefined') {
        http.withCredentials = !!o['withCredentials']
      }
    }

    function generalCallback(data) {
      lastValue = data
    }

    function urlappend (url, s) {
      return url + (/\?/.test(url) ? '&' : '?') + s
    }

    function getRequest(fn, err) {
      var o = this.o
        , method = (o['method'] || 'GET').toUpperCase()
        , url = typeof o === 'string' ? o : o['url']
        // convert non-string objects to query-string form unless o['processData'] is false
        , data = (o['processData'] !== false && o['data'] && typeof o['data'] !== 'string')
          ? reqwest.toQueryString(o['data'])
          : (o['data'] || null)
        , http
        , sendWait = false

      // if we're working on a GET request and we have data then we should append
      // query string to end of URL and not post data
      if ((o['type'] == 'jsonp' || method == 'GET') && data) {
        url = urlappend(url, data)
        data = null
      }

      if (o['type'] == 'jsonp') throw Error("Can't do jsonp maam!"); 

      // get the xhr from the factory if passed
      // if the factory returns null, fall-back to ours
      http = (o.xhr && o.xhr(o)) || xhr(o)

      http.open(method, url, o['async'] === false ? false : true)
      setHeaders(http, o)
      setCredentials(http, o)
      if (win[xDomainRequest] && http instanceof win[xDomainRequest]) {
          http.onload = fn
          http.onerror = err
          // NOTE: see
          // http://social.msdn.microsoft.com/Forums/en-US/iewebdevelopment/thread/30ef3add-767c-4436-b8a9-f1ca19b4812e
          http.onprogress = function() {}
          sendWait = true
      } else {
        http.onreadystatechange = handleReadyState(this, fn, err)
      }
      o['before'] && o['before'](http)
      if (sendWait) {
        setTimeout(function () {
          http.send(data)
        }, 200)
      } else {
        http.send(data)
      }
      return http
    }

    function Reqwest(o, fn) {
      this.o = o
      this.fn = fn

      init.apply(this, arguments)
    }

    function setType(url) {
      var m = url.match(/\.(json|jsonp|html|xml)(\?|$)/)
      return m ? m[1] : 'js'
    }

    function init(o, fn) {

      this.url = typeof o == 'string' ? o : o['url']
      this.timeout = null

      // whether request has been fulfilled for purpose
      // of tracking the Promises
      this._fulfilled = false
      // success handlers
      this._successHandler = function(){}
      this._fulfillmentHandlers = []
      // error handlers
      this._errorHandlers = []
      // complete (both success and fail) handlers
      this._completeHandlers = []
      this._erred = false
      this._responseArgs = {}

      var self = this
        , type = o['type'] || setType(this.url)

      fn = fn || function () {}

      if (o['timeout']) {
        this.timeout = setTimeout(function () {
          self.abort()
        }, o['timeout'])
      }

      if (o['success']) {
        this._successHandler = function () {
          o['success'].apply(o, arguments)
        }
      }

      if (o['error']) {
        this._errorHandlers.push(function () {
          o['error'].apply(o, arguments)
        })
      }

      if (o['complete']) {
        this._completeHandlers.push(function () {
          o['complete'].apply(o, arguments)
        })
      }

      function complete (resp) {
        o['timeout'] && clearTimeout(self.timeout)
        self.timeout = null
        while (self._completeHandlers.length > 0) {
          self._completeHandlers.shift()(resp)
        }
      }

      function success (resp) {
        resp = (type !== 'jsonp') ? self.request : resp
        // use global data filter on response text
        var filteredResponse = globalSetupOptions.dataFilter(resp.responseText, type)
          , r = filteredResponse
        try {
          resp.responseText = r
        } catch (e) {
          // can't assign this in IE<=8, just ignore
        }
        if (r) {
          switch (type) {
          case 'json':
            try {
              resp = self.JSON ? self.JSON.parse(r) : eval('(' + r + ')')
            } catch (err) {
              return error(resp, 'Could not parse JSON in response', err)
            }
            break
          case 'js':
            resp = eval(r)
            break
          case 'html':
            resp = r
            break
          case 'xml':
            resp = resp.responseXML
                && resp.responseXML.parseError // IE trololo
                && resp.responseXML.parseError.errorCode
                && resp.responseXML.parseError.reason
              ? null
              : resp.responseXML
            break
          }
        }

        self._responseArgs.resp = resp
        self._fulfilled = true
        fn(resp)
        self._successHandler(resp)
        while (self._fulfillmentHandlers.length > 0) {
          resp = self._fulfillmentHandlers.shift()(resp)
        }

        complete(resp)
      }

      function error(resp, msg, t) {
        resp = self.request
        self._responseArgs.resp = resp
        self._responseArgs.msg = msg
        self._responseArgs.t = t
        self._erred = true
        while (self._errorHandlers.length > 0) {
          self._errorHandlers.shift()(resp, msg, t)
        }
        complete(resp)
      }

      this.request = getRequest.call(this, success, error)
    }

    Reqwest.prototype = {
      abort: function () {
        this._aborted = true
        this.request.abort()
      }

    , retry: function () {
        init.call(this, this.o, this.fn)
      }

      /**
       * Small deviation from the Promises A CommonJs specification
       * http://wiki.commonjs.org/wiki/Promises/A
       */

      /**
       * `then` will execute upon successful requests
       */
    , then: function (success, fail) {
        success = success || function () {}
        fail = fail || function () {}
        if (this._fulfilled) {
          this._responseArgs.resp = success(this._responseArgs.resp)
        } else if (this._erred) {
          fail(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
        } else {
          this._fulfillmentHandlers.push(success)
          this._errorHandlers.push(fail)
        }
        return this
      }

      /**
       * `always` will execute whether the request succeeds or fails
       */
    , always: function (fn) {
        if (this._fulfilled || this._erred) {
          fn(this._responseArgs.resp)
        } else {
          this._completeHandlers.push(fn)
        }
        return this
      }

      /**
       * `fail` will execute when the request fails
       */
    , fail: function (fn) {
        if (this._erred) {
          fn(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
        } else {
          this._errorHandlers.push(fn)
        }
        return this
      }
    }

    function reqwest(o, fn) {
      return new Reqwest(o, fn)
    }

    // normalize newline variants according to spec -> CRLF
    function normalize(s) {
      return s ? s.replace(/\r?\n/g, '\r\n') : ''
    }

    function serial(el, cb) {
      var n = el.name
        , t = el.tagName.toLowerCase()
        , optCb = function (o) {
            // IE gives value="" even where there is no value attribute
            // 'specified' ref: http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-862529273
            if (o && !o['disabled'])
              cb(n, normalize(o['attributes']['value'] && o['attributes']['value']['specified'] ? o['value'] : o['text']))
          }
        , ch, ra, val, i

      // don't serialize elements that are disabled or without a name
      if (el.disabled || !n) return

      switch (t) {
      case 'input':
        if (!/reset|button|image|file/i.test(el.type)) {
          ch = /checkbox/i.test(el.type)
          ra = /radio/i.test(el.type)
          val = el.value
          // WebKit gives us "" instead of "on" if a checkbox has no value, so correct it here
          ;(!(ch || ra) || el.checked) && cb(n, normalize(ch && val === '' ? 'on' : val))
        }
        break
      case 'textarea':
        cb(n, normalize(el.value))
        break
      case 'select':
        if (el.type.toLowerCase() === 'select-one') {
          optCb(el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null)
        } else {
          for (i = 0; el.length && i < el.length; i++) {
            el.options[i].selected && optCb(el.options[i])
          }
        }
        break
      }
    }

    // collect up all form elements found from the passed argument elements all
    // the way down to child elements; pass a '<form>' or form fields.
    // called with 'this'=callback to use for serial() on each element
    function eachFormElement() {
      var cb = this
        , e, i
        , serializeSubtags = function (e, tags) {
            var i, j, fa
            for (i = 0; i < tags.length; i++) {
              fa = e[byTag](tags[i])
              for (j = 0; j < fa.length; j++) serial(fa[j], cb)
            }
          }

      for (i = 0; i < arguments.length; i++) {
        e = arguments[i]
        if (/input|select|textarea/i.test(e.tagName)) serial(e, cb)
        serializeSubtags(e, [ 'input', 'select', 'textarea' ])
      }
    }

    // standard query string style serialization
    function serializeQueryString() {
      return reqwest.toQueryString(reqwest.serializeArray.apply(null, arguments))
    }

    // { 'name': 'value', ... } style serialization
    function serializeHash() {
      var hash = {}
      eachFormElement.apply(function (name, value) {
        if (name in hash) {
          hash[name] && !isArray(hash[name]) && (hash[name] = [hash[name]])
          hash[name].push(value)
        } else hash[name] = value
      }, arguments)
      return hash
    }

    // [ { name: 'name', value: 'value' }, ... ] style serialization
    reqwest.serializeArray = function () {
      var arr = []
      eachFormElement.apply(function (name, value) {
        arr.push({name: name, value: value})
      }, arguments)
      return arr
    }

    reqwest.serialize = function () {
      if (arguments.length === 0) return ''
      var opt, fn
        , args = Array.prototype.slice.call(arguments, 0)

      opt = args.pop()
      opt && opt.nodeType && args.push(opt) && (opt = null)
      opt && (opt = opt.type)

      if (opt == 'map') fn = serializeHash
      else if (opt == 'array') fn = reqwest.serializeArray
      else fn = serializeQueryString

      return fn.apply(null, args)
    }

    reqwest.toQueryString = function (o, trad) {
      var prefix, i
        , traditional = trad || false
        , s = []
        , enc = encodeURIComponent
        , add = function (key, value) {
            // If value is a function, invoke it and return its value
            value = ('function' === typeof value) ? value() : (value == null ? '' : value)
            s[s.length] = enc(key) + '=' + enc(value)
          }
      // If an array was passed in, assume that it is an array of form elements.
      if (isArray(o)) {
        for (i = 0; o && i < o.length; i++) add(o[i]['name'], o[i]['value'])
      } else {
        // If traditional, encode the "old" way (the way 1.3.2 or older
        // did it), otherwise encode params recursively.
        for (prefix in o) {
          if (o.hasOwnProperty(prefix)) buildParams(prefix, o[prefix], traditional, add)
        }
      }

      // spaces should be + according to spec
      return s.join('&').replace(/%20/g, '+')
    }

    function buildParams(prefix, obj, traditional, add) {
      var name, i, v
        , rbracket = /\[\]$/

      if (isArray(obj)) {
        // Serialize array item.
        for (i = 0; obj && i < obj.length; i++) {
          v = obj[i]
          if (traditional || rbracket.test(prefix)) {
            // Treat each array item as a scalar.
            add(prefix, v)
          } else {
            buildParams(prefix + '[' + (typeof v === 'object' ? i : '') + ']', v, traditional, add)
          }
        }
      } else if (obj && obj.toString() === '[object Object]') {
        // Serialize object item.
        for (name in obj) {
          buildParams(prefix + '[' + name + ']', obj[name], traditional, add)
        }

      } else {
        // Serialize scalar item.
        add(prefix, obj)
      }
    }

    reqwest.getcallbackPrefix = function () {
      return callbackPrefix
    }

    // jQuery and Zepto compatibility, differences can be remapped here so you can call
    // .ajax.compat(options, callback)
    reqwest.compat = function (o, fn) {
      if (o) {
        o['type'] && (o['method'] = o['type']) && delete o['type']
        o['dataType'] && (o['type'] = o['dataType'])
        o['jsonpCallback'] && (o['jsonpCallbackName'] = o['jsonpCallback']) && delete o['jsonpCallback']
        o['jsonp'] && (o['jsonpCallback'] = o['jsonp'])
      }
      return new Reqwest(o, fn)
    }

    reqwest.ajaxSetup = function (options) {
      options = options || {}
      for (var k in options) {
        globalSetupOptions[k] = options[k]
      }
    }

    return reqwest
  });

  if (typeof provide == "function") provide("reqwest", module.exports);

  !function ($) {
    var r = require('reqwest')
      , integrate = function (method) {
          return function () {
            var args = Array.prototype.slice.call(arguments, 0)
              , i = (this && this.length) || 0
            while (i--) args.unshift(this[i])
            return r[method].apply(null, args)
          }
        }
      , s = integrate('serialize')
      , sa = integrate('serializeArray')

    $.ender({
        ajax: r
      , serialize: r.serialize
      , serializeArray: r.serializeArray
      , toQueryString: r.toQueryString
      , ajaxSetup: r.ajaxSetup
    })

    $.ender({
        serialize: s
      , serializeArray: sa
    }, true)
  }(ender);

}());
