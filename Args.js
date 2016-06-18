/**
The MIT License (MIT)

Copyright (c) 2013-2015, Joe Bain

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

;(function(name, context, definition) {
    if (typeof module !== 'undefined' && module.exports) { module.exports = definition(); }
    else if (typeof define === 'function' && define.amd) { define(definition); }
    else { context[name] = definition(); }
})('Args', this, function argsDefinition() {
	"use strict";

	if (!Array.isArray) {
		Array.isArray = function(arg) {
			return Object.prototype.toString.call(arg) === "[object Array]";
		};
	}

	var _extractSchemeEl = function(rawSchemeEl) {
		var schemeEl = {};
		schemeEl.defValue = undefined;
		schemeEl.typeValue = undefined;
		schemeEl.customCheck = undefined;
		for (var name in rawSchemeEl) {
			if (!rawSchemeEl.hasOwnProperty(name)) continue;
				if (name === "_default") {
					schemeEl.defValue = rawSchemeEl[name];
				} else if (name === "_type") {
					schemeEl.typeValue = rawSchemeEl[name];
				} else if (name === "_check") {
					schemeEl.customCheck = rawSchemeEl[name];
				} else {
					schemeEl.sname = name;
				}
		}
		schemeEl.sarg = rawSchemeEl[schemeEl.sname];
		if(typeof schemeEl.customCheck === "object" && schemeEl.customCheck instanceof RegExp) {
			var schemeRegexp = schemeEl.customCheck;
			schemeEl.customCheck = function(arg) {
				return !!arg.toString().match(schemeRegexp);
			};
		}
		return schemeEl;
	};

	var _typeMatches = function(arg, schemeEl) {
		var ok = false;
		if ((schemeEl.sarg & Args.ANY) !== 0) {
			ok = true;
		}
		else if ((schemeEl.sarg & Args.STRING) !== 0 && typeof arg === "string") {
			ok = true;
		}
		else if ((schemeEl.sarg & Args.FUNCTION) !== 0 && typeof arg === "function") {
			ok = true;
		}
		else if ((schemeEl.sarg & Args.INT) !== 0 && (typeof arg === "number" && Math.floor(arg) === arg)) {
			ok = true;
		}
		else if ((schemeEl.sarg & Args.FLOAT) !== 0 && typeof arg === "number") {
			ok = true;
		}
		else if ((schemeEl.sarg & Args.ARRAY) !== 0 && (Array.isArray(arg))) {
			ok = true;
		}
		else if (((schemeEl.sarg & Args.OBJECT) !== 0 || schemeEl.typeValue !== undefined) && (
			typeof arg === "object" &&
			(schemeEl.typeValue === undefined || (arg instanceof schemeEl.typeValue))
		)) {
			ok = true;
		}
		else if ((schemeEl.sarg & Args.ARRAY_BUFFER) !== 0 && arg.toString().match(/ArrayBuffer/)) {
			ok = true;
		}
		else if ((schemeEl.sarg & Args.DATE) !== 0 && arg instanceof Date) {
			ok = true;
		}
		else if ((schemeEl.sarg & Args.BOOL) !== 0 && typeof arg === "boolean") {
			ok = true;
		}
		else if ((schemeEl.sarg & Args.DOM_EL) !== 0 &&
			(
				(arg instanceof HTMLElement) ||
				(window.$ !== undefined && arg instanceof window.$)
			)
		) {
			ok = true;
		}
		if (schemeEl.customCheck !== undefined && typeof schemeEl.customCheck === "function") {
			if (schemeEl.customCheck(arg)) {
				ok = true;
			} else {
				ok = false;
			}
		}
		return ok;
	};

	var _isTypeSpecified = function(schemeEl) {
		return (schemeEl.sarg & (Args.ANY | Args.STRING | Args.FUNCTION | Args.INT | Args.FLOAT | Args.OBJECT | Args.ARRAY_BUFFER | Args.DATE | Args.BOOL | Args.DOM_EL | Args.ARRAY)) != 0 || schemeEl.typeValue !== undefined;
	};

	var _getTypeString = function(schemeEl) {
		var sarg = schemeEl.sarg;
		var typeValue = schemeEl.typeValue;
		var customCheck = schemeEl.customCheck;

		if ((sarg & Args.STRING) !== 0 ) {
			return "String";
		}
		if ((sarg & Args.FUNCTION) !== 0 ) {
			return "Function";
		}
		if ((sarg & Args.INT) !== 0 ) {
			return "Int";
		}
		if ((sarg & Args.FLOAT) !== 0 ) {
			return "Float";
		}
		if ((sarg & Args.ARRAY) !== 0 ) {
			return "Array";
		}
		if ((sarg & Args.OBJECT) !== 0) {
			if (typeValue !== undefined) {
				return "Object (" + typeValue.toString() + ")";
			} else {
				return "Object";
			}
		}
		if ((sarg & Args.ARRAY_BUFFER) !== 0 ) {
			return "Arry Buffer";
		}
		if ((sarg & Args.DATE) !== 0 ) {
			return "Date";
		}
		if ((sarg & Args.BOOL) !== 0 ) {
			return "Bool";
		}
		if ((sarg & Args.DOM_EL) !== 0 ) {
			return "DOM Element";
		}
		if (customCheck !== undefined) {
			return "[Custom checker]";
		}
		return "unknown";
	};

	var _checkNamedArgs = function(namedArgs, scheme, returns) {
		var foundOne = false;
		for (var s = 0  ; s < scheme.length ; s++) {
			var found = (function(schemeEl) {
				var argFound = false;
				for (var name in namedArgs) {
					var namedArg = namedArgs[name];
					if (name === schemeEl.sname) {
						if (_typeMatches(namedArg, schemeEl)) {
							returns[name] = namedArg;
							argFound = true;
							break;
						}
					}
				}
				return argFound;
			})(_extractSchemeEl(scheme[s]));
			if (found) { scheme.splice(s--, 1); }
			foundOne |= found;
		}
		return foundOne;
	};

	var _schemesMatch = function(schemeA, schemeB) {
		if (!schemeA || !schemeB) { return false; }
		return (schemeA.sarg & ~(Args.Optional | Args.Required)) === (schemeB.sarg & ~(Args.Optional | Args.Required)) &&
			   schemeA.typeValue === schemeB.typeValue;
	};

	var _isRequired = function(sarg) {
		return !_isOptional(sarg);
	};

	var _isOptional = function(sarg) {
		return (sarg & Args.Optional) !== 0;
	};

	var _reasonForFailure = function(schemeEl, a, arg) {
		var err = "";
		if (_isTypeSpecified(schemeEl)) {
			err = "Argument " + a + " ("+schemeEl.sname+") should be type "+_getTypeString(schemeEl)+", but it was type " + (typeof arg) + " with value " + arg + ".";
		} else if (schemeEl.customCheck !== undefined) {
			var funcString = schemeEl.customCheck.toString();
			if (funcString.length > 50) {
				funcString = funcString.substr(0, 40) + "..." + funcString.substr(funcString.length-10);
			}
			err = "Argument " + a + " ("+schemeEl.sname+") does not pass the custom check ("+funcString+").";
		} else {
			err = "Argument " + a + " ("+schemeEl.sname+") has no valid type specified.";
		}
		return err;
	};

	/**
	 * Last argument may be a named argument object. This is decided in a non-greedy way, if
	 * there are any unmatched arguments after the normal process and the last argument is an
	 * object it is inspected for matching names.
	 *
	 * If the last argument is a named argument object and it could potentially be matched to
	 * a normal object in the schema the object is first used to try to match any remaining
	 * required args (including the object that it would match against). Only if there are no
	 * remaining required args or none of the remaining required args are matched will the
	 * last object arg match against a normal schema object.
	 *
	 * Runs of objects with the same type are matched greedily but if a required object is
	 * encountered in the schema after all objects of that type have been matched the previous
	 * matches are shifted right to cover the new required arg. Shifts can only happen from
	 * immediately preceding required args or optional args. If a previous required arg is
	 * matched but an optional arg seprates the new required arg from the old one only the
	 * optional arg in between can be shifted. The required arg and any preceding optional
	 * args are not shifted.
	 */
	var Args = function(scheme, args) {
		if (scheme === undefined) throw new Error("The scheme has not been passed.");
		if (args === undefined) throw new Error("The arguments have not been passed.");

		args = Array.prototype.slice.call(args,0);

		var returns = {};
		var err = undefined;

		var runType = undefined;
		var run = [];
		var _addToRun = function(schemeEl) {
			if (
				!runType ||
				!_schemesMatch(runType, schemeEl) ||
				(_isRequired(runType.sarg) && _isOptional(schemeEl.sarg))
			) {
				run = [];
			}
			if (run.length > 0 || _isOptional(schemeEl.sarg)) {
				runType = schemeEl;
				run.push(schemeEl);
			}
		};
		var _shiftRun = function(schemeEl, a, r) {
			if (r === undefined) r = run.length-1;
			if (r < 0) return;
			var lastMatch = run[r];
			var arg = returns[lastMatch.sname];
			if (_typeMatches(arg, schemeEl)) {
				returns[schemeEl.sname] = arg;
				returns[lastMatch.sname] = lastMatch.defValue || undefined;
				if ((lastMatch.sarg & Args.Optional) === 0) { // if the last in the run was not optional
					_shiftRun(lastMatch, a, r-1);
				}
			} else {
				return _reasonForFailure(schemeEl, a, arg);
			}
		};


		var a, s;


		// first let's extract any named args
        // we need to see if the last arg is an object and if it's constructor was Object (i.e. it is simple)
        var lastArg = args[args.length-1];
		if (lastArg !== null && typeof lastArg === "object" && lastArg.constructor === Object) {
            // we should also exit if the object arg matches a rule itself
            // that is more tricky though...

			if (_checkNamedArgs(args[args.length-1], scheme, returns)) {
				args.splice(args.length-1,1);
			}
		}


		for (a = 0, s = 0; s < scheme.length ; s++) {
			a = (function(a,s) {

				var arg = args[a];

				// argument group
				if (scheme[s] instanceof Array) {
                    var group = scheme[s];
                    var retName = undefined;
                    var groupIsOptional = false;
                    for (var g = 0 ; g < group.length ; g++) {
                        var groupEl = group[g];
                        if (groupEl === Args.Optional) {
                            groupIsOptional = true;
                        } else {
                            var schemeEl = _extractSchemeEl(groupEl);
                            if (_typeMatches(arg, schemeEl)) {
                                retName = schemeEl.sname;
                            }
                        }
                    }
                    if (retName === undefined && !groupIsOptional) {
                        if (arg === null || arg === undefined) {
                            err = "Argument " + a + " is null or undefined but it must be not null.";
                            return a;
                        }

                        err = "Argument " + a + " should be one of: ";
                        for (var g = 0 ; g < group.length ; g++) {
                            var schemeEl = _extractSchemeEl(group[g]);
                            err += _getTypeString(schemeEl) + ", ";
                        }
                        err += "but it was type " + (typeof arg) + " with value " + arg + ".";
                        return a;
                    } else if (retName !== undefined) {
                        returns[retName] = arg;
                        return a+1;
                    }
				} else {
					var schemeEl = _extractSchemeEl(scheme[s]);

					// optional arg
					if ((schemeEl.sarg & Args.Optional) !== 0) {
						// check if this arg matches the next schema slot
						if ( arg === null || arg === undefined) {
							if (schemeEl.defValue !== undefined)  {
								returns[schemeEl.sname] = schemeEl.defValue;
							} else {
								returns[schemeEl.sname] = arg;
							}
							return a+1; // if the arg is null or undefined it will fill a slot, but may be replace by the default value
						} else if (_typeMatches(arg, schemeEl)) {
							returns[schemeEl.sname] = arg;
							_addToRun(schemeEl);
							return a+1;
						} else if (schemeEl.defValue !== undefined)  {
							returns[schemeEl.sname] = schemeEl.defValue;
							return a;
						}
					}

					// manadatory arg
					else { //if ((schemeEl.sarg & Args.NotNull) !== 0) {
						if (arg === null || arg === undefined) {
							if (_isTypeSpecified(schemeEl) && _schemesMatch(schemeEl, runType)) {
								err = _shiftRun(schemeEl, a);
								if (err === "") {
									_addToRun(schemeEl);
								}
								return a;
							} else {
								err = "Argument " + a + " ("+schemeEl.sname+") is null or undefined but it must be not null.";
								return a;
							}
						}
						else if (!_typeMatches(arg, schemeEl)) {
							if (_isTypeSpecified(schemeEl) && _schemesMatch(schemeEl, runType)) {
								err = _shiftRun(schemeEl, a);
								if (err === "") {
									_addToRun(schemeEl);
									return a+1;
								}
							} else {
								err = _reasonForFailure(schemeEl, a, arg);
							}
							return a;
						} else {
							returns[schemeEl.sname] = arg;
							_addToRun(schemeEl);
							return a+1;
						}
					}

				}

				return a;
			})(a,s);
			if (err) {
				break;
			}
		}

		if (err) {
			throw new Error(err);
		}

		return returns;
	};

	Args.ANY	  = 0x1;
	Args.STRING	  = 0x1 << 1;
	Args.FUNCTION	  = 0x1 << 2;
	Args.INT	  = 0x1 << 3;
	Args.FLOAT	  = 0x1 << 4;
	Args.ARRAY_BUFFER = 0x1 << 5;
	Args.OBJECT	  = 0x1 << 6;
	Args.DATE	  = 0x1 << 7;
	Args.BOOL	  = 0x1 << 8;
	Args.DOM_EL	  = 0x1 << 9;
	Args.ARRAY	  = 0x1 << 10;


	Args.Optional	  = 0x1 << 11;
	Args.NotNull	  =
	Args.Required	  = 0x1 << 12;

    return Args;
});
