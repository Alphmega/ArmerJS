(function(factory, window, undefined){
    if (window.define && window.define.amd) window.define('armer', factory);
    else if (window.angular) angular.module('angular.armer', []).service('armer', ['$window', factory]);
    else window.armer = factory(window)
})(function(window){
    var emptyObj = {};
    var hasOwn = emptyObj.hasOwnProperty;

    function template(text, data, settings) {
        var callee = arguments.callee;
        settings = angular.extend({}, callee.settings, settings);

        // Combine delimiters into one regular expression via alternation.
        var matcher = new RegExp([
                (settings.escape || callee.noMatch).source,
                (settings.interpolate || callee.noMatch).source,
                (settings.evaluate || callee.noMatch).source
            ].join('|') + '|$', 'g');

        // Compile the template source, escaping string literals appropriately.
        var index = 0;
        var source = "__p+='";
        text.replace(matcher, function (match, escape, interpolate, evaluate, offset) {
            source += text.slice(index, offset)
                .replace(callee.escaper, function (match) {
                    return '\\' + callee.escapes[match];
                });
            source +=
                escape ? "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'" :
                    interpolate ? "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'" :
                        evaluate ? "';\n" + evaluate + "\n__p+='" : '';
            index = offset + match.length;
        });
        source += "';\n";

        // If a variable is not specified, place data values in local scope.
        if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

        source = "var __t,__p='',__j=Array.prototype.join," +
            "print=function(){__p+=__j.call(arguments,'');};\n" +
            source + "return __p;\n";

        try {
            var render = new Function(settings.variable || 'obj', source);
        } catch (e) {
            e.source = source;
            throw e;
        }

        if (data) return render(data);
        var template = function (data) {
            return render.call(this, data);
        };

        // Provide the compiled function source as a convenience for precompilation.
        template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

        return template;
    }
    template.escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
    template.noMatch = /(.)^/;
    template.escapes = {
        "'": "'",
        '\\': '\\',
        '\r': 'r',
        '\n': 'n',
        '\t': 't',
        '\u2028': 'u2028',
        '\u2029': 'u2029'
    };
    template.settings = {
        evaluate: /\[%([\s\S]+?)%]/g,
        interpolate: /\[%=([\s\S]+?)%]/g,
        escape: /\[%-([\s\S]+?)%]/g
    };

    function isWindow( obj ) {
        return obj != null && obj === obj.window;
    }

    function isPlainObject( obj ) {
        if ( toStringType( obj ) !== "Object" || obj.nodeType || isWindow( obj ) ) {
            return false;
        }
        if ( obj.constructor &&
            !hasOwn.call( obj.constructor.prototype, "isPrototypeOf" ) ) {
            return false;
        }
        return true;
    }

    function isQueryElement(node) {
        return !!(node &&
        (node.nodeName
        || (node.prop && node.attr && node.find)));

    }

    function toStringType(obj, type){
        var result = emptyObj.toString.call(obj).slice(8, -1);
        if (type) result = !!result.match(RegExp(type, 'gi'));
        return result;
    }

    function isArrayLike(obj, includeString) { //是否包含字符串
        var type = toStringType(obj);
        if (includeString && type === "String") {
            return true;
        }
        switch(type) {
            case "Array" :
            case "Arguments":
            case "NodeList":
            case "Collection":
            case "StaticNodeList":
            case "HTMLCollection": return true;
        }
        if (type === "Object") {
            var i = obj.length;
            return typeof obj.callee == 'function' || obj.namedItem || (i >= 0) && (i % 1 === 0) && (hasOwn.call(obj, '0') || typeof obj.each == 'function' || typeof obj.forEach == 'function'); //非负整数
        }
        return false;
    }

    function search(target, name, arrayKey, create) {
        var a = [];
        if (name.indexOf('[]') > -1 &&  name.indexOf('[]') < name.length - 2) {
            throw Error();
        }
        name.replace('[]', '[' + arrayKey + ']');
        name.replace(new RegExp("[a-zA-Z][a-zA-Z0-9]*|" + arrayKey, 'g'), function (i) {
            a.push(i)
        });
        var key = a.pop();

        var i = 0, lastIndex = a.length;
        var objs = target, s, tmp;
        if (create) {
            for(;i < lastIndex;i++) {
                s = a[i];
                if ((tmp = objs[s]) == null) {
                    tmp = objs[s] = {};
                }
                objs = tmp;
            }
        }

        return [a.length ? (new Function('obj', 'return obj' + '["' + a.join('"]["') + '"]'))(target) : target, key]
    }

    function baseExtend(target, source, options){
        var sss = '!@#%';
        var inputIndex = 0, input = source,
            inputLength = source.length,
            key, tmp, obj,
            value, create = options.create, deep = options.deep, ignore = options.ignore;
        target = target || {};
        for (; inputIndex < inputLength; inputIndex++) {
            for (key in input[inputIndex]) {
                value = input[inputIndex][key];
                if (!!~ignore.indexOf(key) || !input[inputIndex].hasOwnProperty(key) || value == undefined) continue;
                if (/[\[\]\.]/.test(key)) {
                    try {
                        tmp =  search(target, key, sss, create);
                    } catch(e) {
                        tmp = undefined;
                    }
                }

                if (tmp && typeof tmp[0] == 'object') {
                    obj = tmp[0];
                    key = tmp[1];
                } else {
                    obj = target
                }
                tmp = null;

                if(key == sss && this.isArrayLike(obj)) {
                    // 处理a[]这种情况下，推进数组
                    [].push.call(obj, value);
                } else if (typeof value == 'object' && deep) {
                    if (toStringType(value, 'date')) {
                        obj[key] = new Date(value.valueOf());
                    } else if (toStringType(value, 'regexp')) {
                        obj[key] = new RegExp(value);
                    } else if (value.nodeName) {
                        obj[key] = value.cloneNode(true);
                    } else if (isQueryElement(value)) {
                        obj[key] = value.clone();
                    } else if (isPlainObject(value)) {
                        obj[key] = isPlainObject(obj[key]) ?
                            baseExtend.call(this, {}, obj[key], value) :
                            // Don't extend strings, arrays, etc. with objects
                            baseExtend.call(this, {}, value);
                        // Copy everything else by reference
                    }
                } else  {
                    obj[key] = value;
                }
            }
        }
        return target;

    }


    function reduce(o, iterator, memo) {
        return Object.keys(o).reduce(function (memo, key) {
            return iterator.call(null, memo, o[key], key, o)
        }, memo);
    }
    function indexWhere(value, iterator) {
        var ret = -1;
        this.each(value, function (item, i) {
            if (iterator.call(value, item)) {
                ret = i;
                return false;
            }
        });
        return ret;
    }

    function indexAllWhere(value, iterator) {
        var ret = [];
        this.each(value, function (item, i) {
            if (iterator.call(value, item)) {
                ret.push(i);
            }
        });
        return ret;
    }

    function where(value, iterator) {
        return value[this.indexWhere(value, iterator)];
    }

    function has(value, iterator){
        return this.indexWhere(value, iterator) !== -1;
    }

    function empty(value){
        return !this.has(value, function(){return true});
    }

    function whereAll(value, iterator) {
        return this.indexAllWhere(value, iterator).map(function(item){
            return value[item]
        })
    }
    function each(obj, iterator) {
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                if (iterator(obj[i], i) === false) break;
            }
        }
    }
    function removeWhere(obj, iterator) {
        var that = this;
        each(that.indexAllWhere(obj, iterator), function(index){
            that.removeIndexOf(obj, index);
        })

    }
    function removeIndexOf(obj, index){
        if (this.isArrayLike(obj)) {
            [].splice.call(obj, index, 1)
        } else {
            delete obj[index];
        }
    }
    function remove(obj, find) {
        this.removeWhere(obj, function(item){
            if (find ==  item) return true;
        })
    }

    return {
        template: template,
        parseCSS: function (cssStr, global) {
            var DOC = global.document,
                head = DOC.head || DOC.getElementsByTagName("head")[0];
            var styles = head.getElementsByTagName("style"), style, media;
            cssStr += "\n";
            if (styles.length == 0) {
                if (DOC.createStyleSheet) {
                    DOC.createStyleSheet();
                } else {
                    style = DOC.createElement('style');
                    style.setAttribute("type", "text/css");
                    head.insertBefore(style, null)
                }
            }
            style = styles[0];
            media = style.getAttribute("media");
            if (media === null && !/screen/i.test(media)) {
                style.setAttribute("media", "all");
            }
            if (style.styleSheet) {
                style.styleSheet.cssText += cssStr;
            } else if (DOC.getBoxObjectFor) {
                style.innerHTML += cssStr;
            } else {
                style.appendChild(DOC.createTextNode(cssStr))
            }
        },
        isWindow: isWindow,
        isPlainObject: isPlainObject,
        merge: function mixOptions(target) {
            return baseExtend(target, [].slice.call(arguments, 1), {
                deep: true,
                ignore: ['$$hashKey']
            })
        },
        extend: function(){
            return baseExtend(target, [].slice.call(arguments, 1), {
                ignore: ['$$hashKey']
            })
        },
        isQueryElement: isQueryElement,
        /**
         * 是否为类数组（Array, Arguments, NodeList与拥有非负整数的length属性的Object对象）
         * 如果第二个参数为true,则包含有字符串
         * @method armer.isArrayLike
         * @static
         * @param {Object} obj
         * @param {Boolean} [includeString]
         * @returns {Boolean}
         */
        isArrayLike: isArrayLike,
        /**
         * 判断对象类型
         * @method armer.stringType
         * @static
         * @param obj
         * @param [type]
         * @returns {boolean|string}
         */
        stringType: toStringType,
        debouce: function debouce (func, wait, immediate) {
            var timeout, result;
            return function() {
                var context = this, args = arguments;
                var later = function() {
                    timeout = null;
                    if (!immediate) result = func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) result = func.apply(context, args);
                return result;
            };
        },
        reduce: reduce,
        where: where,
        whereAll: whereAll,
        remove: remove,
        removeWhere: removeWhere,
        removeIndexOf: removeIndexOf,
        indexWhere: indexWhere,
        indexAllWhere: indexAllWhere,
        each: each,
        has: has,
        empty: empty,
        isThenable: function(obj){
            return obj && typeof obj.then == 'function'
        }
    }
}, window)