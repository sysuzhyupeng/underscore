(function(){
	//root 的值, 客户端为 `window`, 服务端(node) 中为 `exports`
	var root = this;
	// 将原来全局环境中的变量 `_` 赋值给变量 previousUnderscore 进行缓存
    // 在后面的 noConflict 方法中有用到
    var previousUnderscore = root._;
    // 缓存变量, 便于压缩代码, 同时可减少在原型链中的查找次数(提高代码效率)
    var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;
    var  push             = ArrayProto.push,
    	slice            = ArrayProto.slice,
    	toString         = ObjProto.toString,
    	hasOwnProperty   = ObjProto.hasOwnProperty;
    // ES5 原生方法, 如果浏览器支持, 则 underscore 中会优先使用
    var nativeIsArray      = Array.isArray,
    	nativeKeys         = Object.keys,
    	nativeBind         = FuncProto.bind,
    	nativeCreate       = Object.create;
    var Ctor = function(){};
    /*
    	核心函数, `_` 其实是一个构造函数
  		支持无 new 调用的构造函数（思考 jQuery 的无 new 调用）
    */
    var _ = function(obj){
    	//如果_()传入的是underscore对象，则不再初始化
    	if(obj instanceof obj){
    		return obj;
    	}
    	if (!(this instanceof _)) return new _(obj);
    	// 将 obj 赋值给 this._wrapped 属性
    	this._wrapped = obj;
    }
    if (typeof exports !== 'undefined') {
	    if (typeof module !== 'undefined' && module.exports) {
	        exports = module.exports = _;
	    }
	    exports._ = _;
	    //之后注释掉
	    root._ = _;
	} else {
		//将上面定义的 `_` 局部变量赋值给全局对象中的 `_` 属性，将构造函数暴露出去
	    root._ = _;
	}
    _.VERSION = '1.8.3';
    // 二次操作返回一些回调、迭代方法
    var optimizeCb = function(func, context, argCount) {
    	// 如果没有指定 this 指向，则返回原函数(void 0相当于undefined)
    	if (context === void 0) return func;
    	switch (argCount == null ? 3 : argCount) {
    		case 1: return function(value){
    			func.call(context, value);
    		}
    		case 2: return function(value, other) {
        		return func.call(context, value, other);
      		};
      		case 3: return function(value, index, collection) {
        		return func.call(context, value, index, collection);
      		};
      		// _.reduce、_.reduceRight
      		case 4: return function(accumulator, value, index, collection) {
        		return func.call(context, accumulator, value, index, collection);
      		};
    	}
    	//call 比 apply 快很多(内部实现：.apply 在运行前要对作为参数的数组进行一系列检验和深拷贝，.call 则没有这些步骤)
    	//返回一个由匿名function包裹的func.apply
    	return function() {
      		return func.apply(context, arguments);
    	};
    }
    //待定
    var cb = function(value, context, argCount) {
    	if (value == null) return _.identity;
   		if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    	if (_.isObject(value)) return _.matcher(value);
    	return _.property(value);
  	};
  	_.iteratee = function(value, context) {
    	return cb(value, context, Infinity);
  	};
  	// 有三个方法用到了这个内部函数
  	// _.extend & _.extendOwn & _.defaults
  	// _.extend = createAssigner(_.allKeys);
  	// _.extendOwn = _.assign = createAssigner(_.keys);
  	// _.defaults = createAssigner(_.allKeys, true);
  	var createAssigner = function(keysFunc, undefinedOnly) {
  		return function(obj){
  			var length = arguments.length;
  			// 只传入了一个参数（或者0个)或者传入的第一个参数是 null
  			if (length < 2 || obj == null) return obj;
  			for(var index = 1; index < length; index++){
  				//source为参数
  				var source = arguments[index],
  				//提取参数的 keys 值
  				keys = keysFunc(source),
        		l = keys.length;
        		for (var i = 0; i < l; i++) {
        			var key = keys[i];
        			//把其他参数的属性拷贝到obj上
        			//如果没有传入 undefinedOnly 参数，即 !undefinedOnly 为 true, 这时obj把value非undefined也会拷进来
        			if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        		}
  			}
  			return obj;
  		}
  	}
  	//根据原型构造一个对象
  	var baseCreate = function(prototype){
  		// 如果 prototype 参数不是对象
    	if (!_.isObject(prototype)) return {};
    	// 如果浏览器支持 ES5 Object.create（Object.create）
    	if (nativeCreate) return nativeCreate(prototype);
    	//把一个空函数原型指向prototype，当做一个构造函数
    	Ctor.prototype = prototype;
   		var result = new Ctor;
    	Ctor.prototype = null;
    	return result;
  	}
  	// 闭包
  	var property = function(key) {
  		//调用的时候 property('a')({a: 1})
    	return function(obj) {
      		return obj == null ? void 0 : obj[key];
    	};
  	};
  	// Math.pow(2, 53) - 1 是 JavaScript 中能精确表示的最大数字
  	var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  	// 用来获取 array 以及 arrayLike 元素的 length 属性值
  	var getLength = property('length');
  	var isArrayLike = function(collection) {
   	 	// 返回参数 collection 的 length 属性值, 这里只检测了length属性
    	var length = getLength(collection);
    	return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  	};
  	_.each = _.forEach = function(obj, iteratee, context) {
  		// 根据 context 确定不同的迭代函数
    	iteratee = optimizeCb(iteratee, context);
    	var i, length;
    	//如果是数组或者类似数组的对象
    	if (isArrayLike(obj)) {
      		// 遍历
      		for (i = 0, length = obj.length; i < length; i++) {
        		iteratee(obj[i], i, obj);
      		}
    	} else {
    		var keys = _.keys(obj);
    		for (i = 0, length = keys.length; i < length; i++) {
        		iteratee(obj[keys[i]], keys[i], obj); // (value, key, obj)
      		}
    	}
    	return obj;
  	}
  	_.map = _.collect = function(obj, iteratee, context) {
  		iteratee = cb(iteratee, context);
  		var keys = !isArrayLike(obj) && _.keys(obj),
	        // 如果 obj 为对象，则 length 为 key.length
	        // 如果 obj 为数组，则 length 为 obj.length
	        length = (keys || obj).length,
	        results = Array(length); // 结果数组
	    // 遍历
	    for (var index = 0; index < length; index++) {
	      // 如果 obj 为对象，则 currentKey 为对象键值 key
	      // 如果 obj 为数组，则 currentKey 为 index 值
	      var currentKey = keys ? keys[index] : index;
	      results[index] = iteratee(obj[currentKey], currentKey, obj);
	    }
	    // 返回新的结果数组
	    return results;
  	}
  	// 根据 dir 确定是向左还是向右遍历
  	function createReduce(dir){
  		//不断递归向后调用
	    function iterator(obj, iteratee, memo, keys, index, length) {
	        for (; index >= 0 && index < length; index += dir) {
	        	var currentKey = keys ? keys[index] : index;
	        	// 迭代，返回值供下次迭代调用
	        	memo = iteratee(memo, obj[currentKey], currentKey, obj);
	      	}
	      	// 每次迭代返回值，供下次迭代调用
	      	return memo;
	    }
	    // _.reduce（_.reduceRight）可传入的 4 个参数
	    // obj 数组或者对象
	    // iteratee 迭代方法，对数组或者对象每个元素执行该方法
	    // memo 初始值，如果有，则从 obj 第一个元素开始迭代
	    // 如果没有，则从 obj 第二个元素开始迭代，将第一个元素作为初始值
    	// context 为迭代函数中的 this 指向
    	return function(obj, iteratee, memo, context) {
      		iteratee = optimizeCb(iteratee, context, 4);
      		var keys = !isArrayLike(obj) && _.keys(obj),
          		length = (keys || obj).length,
          		index = dir > 0 ? 0 : length - 1;

     		 // Determine the initial value if none is provided.
      		// 如果没有指定初始值
      		// 则把第一个元素指定为初始值
      		if (arguments.length < 3) {
        		memo = obj[keys ? keys[index] : index];
        		// 根据 dir 确定是向左还是向右遍历
        		index += dir;
      		}
      		return iterator(obj, iteratee, memo, keys, index, length);
    	};
  	}
  	_.reduce = _.foldl = _.inject = createReduce(1);
  	// 与 ES5 中 Array.prototype.reduceRight 使用方法类似
 	_.reduceRight = _.foldr = createReduce(-1);
 	_.find = _.detect = function(obj, predicate, context) {
 		var key;
 		// 如果 obj 是数组，key 为满足条件的下标
 		if(isArrayLike(obj)){
 			key = _.findIndex(obj, predicate, context);
 		} else {
 			key = _.findKey(obj, predicate, context);
 		}
 		// 如果不存在，则默认返回 undefined（函数没有返回，即返回 undefined）
    	if (key !== void 0 && key !== -1) return obj[key];
 	}
 	_.filter = _.select = function(obj, predicate, context) {
    	var results = [];
    	// 修改this 指向，也就是在predicate方法的执行阶段的this，返回 predicate 函数（判断函数）
    	predicate = cb(predicate, context);
    	// 遍历每个元素，如果符合条件则存入数组
    	_.each(obj, function(value, index, list) {
      		if (predicate(value, index, list)) results.push(value);
    	});
    	return results;
    }
    // 寻找数组或者对象中所有不满足条件的元素
    _.reject = function(obj, predicate, context) {
    	return _.filter(obj, _.negate(cb(predicate)), context);
  	};
  	//都是把predicate函数改变this之后传进来循环执行
  	_.every = _.all = function(obj, predicate, context) {
	    // 根据 this 指向，返回相应 predicate 函数
	    predicate = cb(predicate, context);

	    var keys = !isArrayLike(obj) && _.keys(obj),
	        length = (keys || obj).length;

	    for (var index = 0; index < length; index++) {
	      var currentKey = keys ? keys[index] : index;
	      // 如果有一个不能满足 predicate 中的条件
	      // 则返回 false
	      if (!predicate(obj[currentKey], currentKey, obj))
	        return false;
	    }
    	return true;
  	};
  	_.some = _.any = function(obj, predicate, context) {
	    // 根据 context 返回 predicate 函数
	    predicate = cb(predicate, context);
	    // 如果传参是对象，则返回该对象的 keys 数组
	    var keys = !isArrayLike(obj) && _.keys(obj),
	        length = (keys || obj).length;
	    for (var index = 0; index < length; index++) {
	      var currentKey = keys ? keys[index] : index;
	      // 如果有一个元素满足条件，则返回 true
	      if (predicate(obj[currentKey], currentKey, obj)) return true;
	    }
	    return false;
  	};
  	// 判断数组或者对象中（value 值）是否有指定元素
  	_.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
  		// 如果是对象，返回 values 组成的数组
    	if (!isArrayLike(obj)) obj = _.values(obj);
    	// fromIndex 表示查询起始位置
    	// 如果没有指定该参数，则默认从头找起
    	if (typeof fromIndex != 'number' || guard) fromIndex = 0;
    	// _.indexOf 是数组的扩展方法（Array Functions）
    	// 数组中寻找某一元素
    	return _.indexOf(obj, item, fromIndex) >= 0;
  	}

  	// 数组或者对象中的每个元素都调用 method 方法
	// 返回调用后的结果（数组或者关联数组）
	// method 参数后的参数会被当做参数传入 method 方法中
	// _.invoke(list, methodName, *arguments)
	_.invoke = function(obj, method) {
	    // 将method之后的参数保存在数组中
	    var args = slice.call(arguments, 2);
	    // 判断 method 是不是函数
	    var isFunc = _.isFunction(method);
	    // 用 map 方法对数组或者对象每个元素调用方法
	    // 返回数组
	    return _.map(obj, function(value) {
	        // 如果 method 不是函数，则可能是 obj 的 key 值
	        // 而 obj[method] 可能为函数
	        var func = isFunc ? method : value[method];
	        return func == null ? func : func.apply(value, args);
	    });
	};
	// _.pluck(list, propertyName)
	_.pluck = function(obj, key) {
    	return _.map(obj, _.property(key));
  	};
  	//根据指定的键值对 选择对象
  	_.where = function(obj, attrs) {
    	return _.filter(obj, _.matcher(attrs));
  	};
  	//寻找第一个有指定 key-value 键值对的对象
  	_.findWhere = function(obj, attrs) {
    	return _.find(obj, _.matcher(attrs));
  	};




    // _.isFunction 在 old v8, IE 11 和 Safari 8 下的兼容
	// 觉得这里有点问题
	// 我用的 chrome 49 (显然不是 old v8)
	// 却也进入了这个 if 判断内部
	if (typeof /./ != 'function' && typeof Int8Array != 'object') {
	    _.isFunction = function(obj) {
	        return typeof obj == 'function' || false;
	    };
	}
}.call(window))