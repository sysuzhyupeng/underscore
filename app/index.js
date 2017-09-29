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
    	if(obj instanceof _){
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
  		//调用的时候 _.property('a')(obj)，获取对象的value值(加上了obj是否存在的判断)
    	return function(obj) {
      		return obj == null ? void 0 : obj[key];
    	};
  	};
    _.property = property;
  	// Math.pow(2, 53) - 1 是javaScript 中能精确表示的最大数字
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
    /*
        var stooges = [{name: 'moe', age: 40}, {name: 'larry', age: 50}, {name: 'curly', age: 60}];
        _.pluck(stooges, 'name');
        => ["moe", "larry", "curly"]
        萃取数组中所有对象的某属性值，返回一个数组。
    */
	// _.pluck(list, propertyName)
    //_.property返回一个函数，返回对象的指定value
	_.pluck = function(obj, key) {
    	return _.map(obj, _.property(key));
  	};
  	//根据指定的键值对选择对象
  	_.where = function(obj, attrs) {
    	return _.filter(obj, _.matcher(attrs));
  	};
  	//寻找第一个有指定 key-value 键值对的对象
  	_.findWhere = function(obj, attrs) {
    	return _.find(obj, _.matcher(attrs));
  	};
    _.max = function(obj, iteratee, context){
        //result设为最小值
        var result = -Infinity,
            lastComputed = -Infinity,
            value,
            computed;
        // 单纯地寻找最值
        if(iteratee == null && obj != null){
            // 如果是数组，则寻找数组中最大元素,如果是对象，则寻找最大 value 值
            // 如果是对象，返回 values 组成的数组
            obj = isArrayLike(obj) ? obj : _.values(obj);
            for(var i = 0, length = obj.length; i < length; i++){
                value = obj[i];
                if(value > result){
                    result = value;
                }
            }
        } else {
            //寻找元素经过迭代后的最值
            //改变this指向
            iteratee = cb(iteratee, context);
            //lastComputed保存计算过程中的最值
            //遍历元素
            _.each(obj, function(value, index, list){
                computed = iteratee(value, index, list);
                // && 的优先级高于 ||
                if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
                    result = value;
                    lastComputed = computed;
                }
            })
        }
        return result;
    }
    // 寻找最小的元素
    // 类似 _.max,_.min(list, [iteratee], [context])， 这里不重复实现

    // 将数组乱序
    // 如果是对象，则返回一个数组，数组由对象 value 值构成
    // O(n)复杂度

    /*
        首先我们考虑 n = 2 的情况，根据算法，显然有 1/2 的概率两个数交换，有 1/2 的概率两个数不交换，因此对 n = 2 的情况，元素出现在每个位置的概率都是 1/2，满足随机性要求。
        假设有 i 个数， i >= 2 时，算法随机性符合要求，即每个数出现在 i 个位置上每个位置的概率都是 1/i。
        对于 i + 1 个数，按照我们的算法，在第一次循环时，每个数都有 1/(i+1) 的概率被交换到最末尾，所以每个元素出现在最末一位的概率都是 1/(i+1) 。而每个数也都有 i/(i+1) 的概率不被交换到最末尾，
        如果不被交换，从第二次循环开始还原成 i 个数随机，根据 2. 的假设，它们出现在 i 个位置的概率是 1/i。因此每个数出现在前 i 位任意一位的概率是 (i/(i+1)) * (1/i) = 1/(i+1)，也是 1/(i+1)。
        综合 1. 2. 3. 得出，对于任意 n >= 2，经过这个算法，每个元素出现在 n 个位置任意一个位置的概率都是 1/n。
    */
    _.shuffle = function(obj){
        //如果是对象，则对value值进行乱序
        var set = isArrayLike(obj) ? obj : _value(obj);
        var length = set.length;
        var shuffled = Array(length);
        for(var index = 0, rand; index < length; index++){
            //将新数组index位置设为新数组的rand元素
            //将新数组rand位置设为旧数组的index元素
            rand = _.random(0, index);
            //即使rand重复，在下一次中shuffled[index]也会得到值
            if(rand !== index) shuffled[index] = shuffled[rand];
            //set作为原来的
            shuffled[rand] = set[index];
        }
        return shuffled;
    }
    //从数组或者对象中取样
    _.sample = function(obj, n, guard){
        if(n == null || guard){
            if (!isArrayLike(obj)) obj = _.values(obj);
            return bj[_.random(obj.length - 1)];
        }
        //随机返回n个，在乱序之后直接slice
        return _.shuffle(obj).slice(0, Math.max(0, n));
    }
    _.sortBy = function(obj, iteratee, context){
        iteratee = cb(iteratee, context);
        // _.pluck([{}, {}, {}], 'value')
        return _.pluck(
            // _.map(obj, function(){}).sort()
             // _.map 后的结果 [{}, {}..]
             // sort 后的结果 [{}, {}..]
         _.map(obj, function(value, index, list) {
        return {
          value: value,
          index: index,
          // 元素经过迭代函数迭代后的值
          criteria: iteratee(value, index, list)
        };
        }).sort(function(left, right) {
        var a = left.criteria;
        var b = right.criteria;
        if (a !== b) {
            if (a > b || a === void 0) return 1;
            if (a < b || b === void 0) return -1;
        }
        return left.index - right.index;
        }), 'value');
    }
    // _.groupBy, _.indexBy 以及 _.countBy 其实都是对数组元素进行分类
    // 分类规则就是 behavior 函数
    /*
        group返回一个函数，
        第一个参数为obj，第二个参数为迭代器
    */
    var group = function(behavior){
        return function(obj, iteratee, context){
            //返回结果是一个对象，iteratee为筛选函数
            var result = {};
            iteratee = cb(iteratee, context);
            _.each(obj, function(value, index){
                var key = iteratee(value, index, obj);
                behavior(result, value, key);
            })
            return result;
        }
    }
    // 根据特定规则对数组或者对象中的元素进行分组
    //将这个规则函数传入上一个group函数
    /*
        _.groupBy([1.3, 2.1, 2.4], function(num){ return Math.floor(num); });
        {1: [1.3], 2: [2.1, 2.4]}

        _.groupBy(['one', 'two', 'three'], 'length');
        => {3: ["one", "two"], 5: ["three"]}
    */
    _.groupBy = group(function(result, value, key) {
        //如果result对象已经有key值了
        if(_.has(result, key))
            result[key].push(value);
        else result[key] = [value];
    });
    /*
        当你知道你的键是唯一的时候可以使用indexBy 
        var stooges = [{name: 'moe', age: 40}, {name: 'larry', age: 50}, {name: 'curly', age: 60}];
        _.indexBy(stooges, 'age');
            => {
            "40": {name: 'moe', age: 40},
            "50": {name: 'larry', age: 50},
            "60": {name: 'curly', age: 60}
        }
    */
    _indexBy = group(function(result, value, key){
        result[key] = value;
    });
    /*
         _.countBy([1, 2, 3, 4, 5], function(num) {
                return num % 2 == 0 ? 'even': 'odd';
        });
        => {odd: 3, even: 2}
        进行计数，而不是保存obj的value
    */
    _.countBy = group(function(result, value, key) {
        // 不同 key 值元素数量
        if (_.has(result, key))
            result[key]++;
        else result[key] = 1;
    });
    // 伪数组 -> 数组
    // 对象 -> 提取 value 值组成数组
    // 返回数组
    _.toArray = function(obj){
        if(!obj) return [];
        // 如果是数组，则返回副本数组
        if (_.isArray(obj)) return slice.call(obj);
        // 如果是类数组，则重新构造新的数组
        if (isArrayLike(obj)) return _.map(obj, _.identity);
        // 如果是对象，则返回 values 集合
        return _.values(obj);
    }
    _.size = function(){
        if(obj == null) return 0;
        //数组返回长度，对象返回key数组的长度
        return isArrayLike(obj)? obj.length : _.keys(obj).length;
    }
    //将数组或者对象中符合条件（predicate）的元素
    // 和不符合条件的元素（数组为元素，对象为 value 值）
    // 分别放入两个数组中
    // 返回一个数组，数组元素为以上两个数组（[[pass array], [fail array]]）
    _.partition = function(obj, predicate, context){
        predicate = cb(predicate, context);
        var pass = [],
            fail = [];
        _.each(obj, function(value, key, obj){
            (predicate(value, key, obj) ? pass : fail).push(value);
        })
        return [pass, fail]
    }
    _.first = _.head = _.take = function(array, n, guard){
        // 数组为空则返回 undefined（undefined == null返回true，所以这里不用===）
        if(array == null) return void 0;
        // 没指定参数 n，则默认返回第一个元素
        if (n == null || guard) return array[0];
        // 如果传入参数 n，则返回前 n 个元素组成的数组
        return _.initial(array, array.length - n);
    }
    // 返回剔除最后一个元素之后的数组副本
    // 如果传入参数 n，则剔除最后 n 个元素
    _.initial = function(array, n, guard){
        return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)))
    }

    _.last = function(array, n, guard){
        if(array == null) return void 0;
        if(n == null || guard) return array[array.length - 1];
        // 即剔除前 array.length - n 个元素
        return _rest(array, Math.max(0, array.length - n));
    }
    _.rest = _.tail = _.drop = function(array, n, guard){
        // 返回剔除第一个元素后的数组副本
        // 如果传入参数 n，则剔除前 n 个元素
        return slice.call(array, n == null || guard ? 1: n);
    }
    // 去掉数组中所有的假值
    // 返回数组副本（基本返回的都是副本）
    // JavaScript 中的假值包括 false、null、undefined、''、NaN、0
    _.compact = function(array){
        return _.filter(array, _.identity);
    }
    //根据 startIndex 变量确定需要展开的起始位置
    var flatten = function(input, shallow, strict, startIndex) {
    	//idx
    	var ouput = [], idx = 0;
        for(var i = startIndex || 0, length = getLength(input); i < length; i++){
        	var value = input[i];
        	// 注意 isArrayLike 还包括 {length: 10} 这样的，过滤掉
        	if(isArrayLike(value) && (_.isArray(value) || _.isArguments(value))){
        		//如果不只一层，递归
        		if(!shallow) value = flatten(value, shallow, strict);
        		// 递归展开到最后一层（没有嵌套的数组了）
        		var j = 0, len = value.length;
        		// 这一步貌似没有必要
        		// 毕竟 JavaScript 的数组会自动扩充
        		ouput.length += len;
        		while(j < len){
        			ouput[idx++] = value[j++];
        		}
        	} else if(!strict){
        		// (!strict === true) => (strict === false)
		        // 如果是深度展开，即 shallow 参数为 false
		        // 那么当最后 value 不是数组，是基本类型时
		        // 肯定会走到这个 else-if 判断中
		        // 而如果此时 strict 为 true，则不能跳到这个分支内部
		        // 所以 shallow === false 如果和 strict === true 搭配
		        // 调用 flatten 方法得到的结果永远是空数组 []
        		ouput[idx++] = value;
        	}
        }
        return ouput;
    }
    /*
    	_.flatten([1, [2], [3, [[4]]]], true);
    */
    _.flatten = function(array, shallow) {
        // array => 需要展开的数组
        // shallow => 是否只展开一层的布尔值
        // false 为 flatten 方法 strict 变量
        return flatten(array, shallow, false);
    };
    // _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
    // => [2, 3, 4]
    // 从数组中移除指定的元素
    // 返回移除后的数组副本
    _.without = function(array){
        // 将 arguments 转为数组（同时去掉第一个元素）
        // 之后便可以调用 _.difference 方法
        return _.difference(array, slice.call(arguments, 1));
    }
    /*
    	_.uniq([1, 2, 1, 3, 1, 4]);
		=> [1, 2, 3, 4]
    */
    _.uniq = _.unique = function(array, isSorted, iteratee, context){
    	/*
    		第二个餐参数缺失的时候，
			后面参数前移一位，
			再将第二个参数的默认值赋上
    	*/
    	if(!_.isBoolean(isSorted)){
    		context = iteratee;
    		iteratee = isSorted;
    		isSorted = false;
    	}
    	if(iteratee != null) iteratee = cb(iteratee, context);
    	var result = [];
    	//已经出现过的元素
    	var seen = [];
    	for(var i = 0, length = getLength(array); i < length; i++){
    		var value = array[i],
    		//如果指定了迭代参数，先进行迭代
    		computed = iteratee ? iteratee(value, i, array) : value;
    		//如果是有序数组，则当前元素只需要跟上一个对比
    		if(isSorted){
	    		// 如果 i === 0，是第一个元素，则直接 push
	        	// 否则比较当前元素是否和前一个元素相等
	        	if (!i || seen !== computed) result.push(value);
	        	// seen 保存当前元素，供下一次对比
	        	//这里把seen改成了一个元素，不再是数组
	        	seen = computed;
    		} else if(iteratee){
    			// 如果 seen[] 中没有 computed 这个元素值
		        if (!_.contains(seen, computed)) {
		            seen.push(computed);
		            //只push原来的元素，返回的不是迭代后的元素
		            result.push(value);
		        }
    		} else if(!_.contains(result, value)){
    			// 如果不用经过迭代函数计算，也就不用 seen[] 变量了
        		result.push(value);
    		}
    	}
    	return result;
    }
    // 将多个数组的元素集中到一个数组中
  	// 并且去重，返回数组副本
    _.union = function(){
    	return _.uniq(flatten(arguments, true, true))
    }
    // 寻找几个数组中共有的元素
  	// 将这些每个数组中都有的元素存入另一个数组中返回
  	//_.intersection([1, 2, 3, 1], [101, 2, 1, 10, 1], [2, 1, 1])
  	// => [1, 2]
	_.intersection = function(array){
		var result = [];
		var argsLength = arguments.length;
		//遍历第一个数组的元素
		//因为我们求的是交集，所以只需要遍历第一个参数数组即可
		for(var i = 0, length = getLength(array); i < length; i++){
			var item = array[i];
			//其实应该是对象去重效率比较高
			if(_.contains(result, item)) continue;
			for(var j = 1; j < argsLength; j++){
				if(!_.contains(arguments[j], item))
					break;
			}
			//如果遍历结束也没有发现其他数组中有这个元素
			if(j === argsLength) result.push(item);
		}
		return result;
	}

    /*
        _.difference([1, 2, 3, 4, 5], [5, 2, 10]);
        => [1, 3, 4]
        删除 array 数组中在 others 数组中出现的元素
    */
    _.difference = function(array){
    	// 将 others 数组展开一层
    	// rest[] 保存展开后的元素组成的数组
    	var rest = flatten(arguments, true, true, 1);
        console.log(11, rest);
    	return _.filter(array, function(value){
    		//如果 value 存在在 rest 中，则过滤掉
    		return !_.contains(rest, value);
    	})
    }
    /*
        _.zip(['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]);
        => [["moe", 30, true], ["larry", 40, false], ["curly", 50, false]]
        将每个arrays中相应位置的值合并在一起。在合并分开保存的数据时很有用.
    */
    _.zip = function(){
        return _.unzip(arguments);
    }
    /*
        _.unzip([['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]])
        => ["moe", 30, true], ["larry", 40, false], ["curly", 50, false]
        与zip相反的功能
    */
    _.unzip = function(array){
        //获得数组中元素数组的最大长度
        var length = array && _.max(array, getLength).length || 0;
        var result = Array(length);
        for(var index = 0; index < length; index++){
            //result[0] = _.pluck(array, 0);
            //返回在所有的属性值，这里的属性为0
            result[index] = _.pluck(array, index);
        }
        return result;
    }
    // 将数组转化为对象
    /*
        _.object(['moe', 'larry', 'curly'], [30, 40, 50]);
        => {moe: 30, larry: 40, curly: 50}
        第二种情况
        _.object([['moe', 30], ['larry', 40], ['curly', 50]]);
        => {moe: 30, larry: 40, curly: 50}
    */
    _.object = function(list, values){
        var result = {};
        for(var i = 0, length = getLength(list); i < length; i++){
            if(values){
                //list[i]为key, values[i]为value
                result[list[i]] = values[i];
            } else {
                //第二种情况
                result[list[i][0]] = list[i][1];
            }
        }
        return result;
    }
    function createPredicateIndexFinder(dir){
        return function(array, predicate, context){
            predicate = cb(predicate, context);
            var length = getLength(array);
            //如果dir < 0，则从数组末尾开始遍历
            var index = dir > 0 ? 0: length - 1;
            //index已经在之前定义，第一个预定义条件直接放空
            for(; index >= 0 && index < length; index += dir){
                if(predicate(array[index], index, array))
                    return index;
            }
            return -1;
        }
    }
    // 从前往后找到数组中 `第一个满足条件` 的元素，并返回下标值
    _.findIndex = createPredicateIndexFinder(1);
    // 从后往前找到数组中 `第一个满足条件` 的元素，并返回下标值
    _.findLastIndex = createPredicateIndexFinder(-1);
    // 将一个元素插入已排序的数组
    // 返回该插入的位置下标
    /*
        _.sortedIndex([10, 20, 30, 40, 50], 35);
        => 3
    */
    _.sortedIndex = function(array, obj, iteratee, context){
        iteratee = cb(iteratee, context, 1);
        var value = iteratee(obj);
        var low = 0, high = getLength(array);
        while(low < high){
            var mid = Math.floor((low + high) / 2);
            //因为使用Math.floor，实际拿到的mid比中间数偏小
            if(iteratee(array[mid]) < value){
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return low;
    }
    function createIndexFinder(dir, predicateFind, sortedIndex){
        return function(array, item, idx){
            var i = 0, 
                length = getLength(array);
            //如果idx为Number类型，则为查找的起始位置
            // 那么第三个参数不是 [isSorted]
            // 所以不能用二分查找优化了
            // 只能遍历查找
            if(typeof idx == 'number'){
                // 正向查找
                if(dir > 0){
                    i = idx > 0 ? idx : Math.max(idx + length, i);
                } else {
                    // 如果是反向查找，重置 length 属性值
                    length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
                }
            } else if(sortedIndex && idx && length){
                // 用 _.sortIndex 找到有序数组中 item 正好插入的位置
                // 说明该位置就是 item 第一次出现的位置
                // 返回下标
                idx = sortedIndex(array, item);
                return array[idx] === item ? idx : -1;
            }
            //如果要查找的元素是 NaN 类型
            if(item !== item){
                idx = predicateFind(slice.call(array, i, length), _.isNaN);
                return idx >= 0 ? idx + i : -1;
            }
            //一个一个遍历
            for(idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir){
                if(array[idx] === item) return idx;
            }
            return -1;
        }
    }
    // 找到数组array中value 第一次出现的位置
    // 并返回其下标值
    // 如果数组有序，则第三个参数可以传入 true
    _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
    //反序查找
    _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);
    /*
        _.range(10);
        => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        _.range(1, 11);
        => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        _.range(0, 30, 5);
        => [0, 5, 10, 15, 20, 25]
    */
    _.range = function(start, stop, step){
        if(stop == null){
            //没有stop，转换成[0, stop]
            stop = start || 0;
            start = 0;
        }
        step = step || 1;
        var length = Math.max(Math.ceil((stop - start) / step), 0);
        var range = Array(length);
        //多一个step变量来自增数组元素
        for(var idx = 0; idx < length; idx++, start += step){
            range[idx] = start;
        }
        return range;
    }
    /*
        Function (ahem) Functions
        函数的扩展方法
        共 14 个扩展方法
    */
    var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
        if (!(callingContext instanceof boundFunc))
            return sourceFunc.apply(context, args);
        //sourceFunc是要调用bind的函数
        // self 为 sourceFunc 的实例，继承了sourceFunc
        // self 理论上是一个空对象（还没赋值）
        var self = baseCreate(sourceFunc.prototype);
        //还是调用原来的sourceFunc的this
        var result = sourceFunc.apply(self, args);
        if(_.isObject(result)) return result;
        return self;
    }
    _.bind = function(func, context){
        //如果存在ES5的bind并且func的bind方法没有被改掉
        if(nativeBind && func.bind === nativeBind)
            return nativeBind.apply(func, slice.call(arguments, 1));
        // 如果传入的参数 func 不是方法，则抛出错误
        if (!_.isFunction(func))
            throw new TypeError('Bind must be called on a function');
        //获得func和context之外的参数
        var args = slice.call(arguments, 2);
        var bound = function(){
            //传入的参数和调用的参数进行合并
            //bound是要返回的函数
            return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
        }
        return bound;
    }
    /*
        var subtract = function(a, b) { return b - a; };
        sub5 = _.partial(subtract, 5);
        sub5(20);
        => 15
    */
    _.partial = function(func){
        //_.partial(_.delay, _, 1); 获得除func之外的参数
        // 如果传入的是 _，则这个位置的参数暂时空着，等待手动填入
        var boundArgs = slice.call(arguments, 1);
        var bound = function(){
            var position = 0,
                length = boundArgs.length;
            var args = Array(length);
            for(var i = 0; i < length; i++){
                args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
            }
            while(position < arguments.length)
                args.push(arguments[position++]);
            return executeBound(func, bound, this, this, args); 
        }
        return bound;
    }
    /*
        var buttonView = {
            label  : 'underscore',
            onClick: function(){ alert('clicked: ' + this.label); },
            onHover: function(){ console.log('hovering: ' + this.label); }
        };
        _.bindAll(buttonView, 'onClick', 'onHover');
        如果不这样绑定，在绑定事件的时候
        a.onclick = buttonView.onClick; 
        this指向的是元素a
    */
    _.bindAll = function(obj){
        var  i, 
            length = arguments.length, 
            key;
        //如果只传入了一个参数（obj），没有传入 methodNames，则报错
        if(length <= 1)
            throw new Error('bindAll must be passed function names');
        /*
            从1开始遍历，
            ojb['onClick'] = _.bind(ojb['onClick'], obj)
        */
        for(i = 1; i < length; i++){
            key = arguments[i];
            obj[key] = _.bind(obj[key], obj);
        }
        return obj;
    }
    /*
        var fibonacci = _.memoize(function(n) {
            return n < 2 ? n: fibonacci(n - 1) + fibonacci(n - 2);
        });
    */
    //「记忆化」，存储中间运算结果，提高效率
    _.memoize = function(func, hasher){
        var memoize = function(key){
            var cache = memoize.cache;
            // 求 key
            // 如果传入了 hasher，则用 hasher 函数来计算 key
            // 否则用 参数 key（即 memoize 方法传入的第一个参数）当 key
            //上面的例子的话key就是n
            var address = '' + (hasher ? hasher.apply(this, arguments) : key);
            // _.has对象是否包含给定的键吗
             if (!_.has(cache, address))
                //执行函数，直接使用调用时的参数key
                cache[address] = func.apply(this, arguments);
            //返回
            return cache[address];
        }
        /*
            cache 对象被当做 key-value 键值对缓存中间运算结果,
            函数通过闭包获得cache对象的引用
        */
        memoize.cache = {};
        return memoize;
    }
    // _.delay(function, wait, *arguments)
    //  如果传入了 arguments 参数，则会被当作 func 的参数在触发时调用
    // 其实是封装了「延迟触发某方法」，使其复用
    /*
        var log = _.bind(console.log, console);
        _.delay(log, 1000, 'logged later');
        => 'logged later' // Appears after one second.
    */
    _.delay = function(func, wait){
        //args为除了func和wait之外的参数
        var args = slice.call(arguments, 2);
        return setTimeout(function(){
            return func.apply(null, args);
        }, wait);
    }
    /*
        延迟调用function直到当前调用栈清空为止，类似使用延时为0的setTimeout方法。
        对于执行开销大的计算和无阻塞UI线程的HTML渲染时候非常有用。
        _.defer(function(){ alert('deferred'); });
/       Returns from the function before the alert runs.
    */
    _.defer = _.partial(_.delay, _, 1);
    /*
        创建并返回一个像节流阀一样的函数，当重复调用函数的时候，至少每隔 wait毫秒调用一次该函数。
        对于想控制一些触发频率较高的事件有帮助。
        var throttled = _.throttle(updatePosition, 100);
        $(window).scroll(throttled);
    */
    _.throttle = function(func, wait, options){
        var context, args, result;
        var timeout = null;
        //上一次执行回调的时间戳
        var previous = 0;
        if(!options) options = {};
        var later = function(){
            // 如果 options.leading === false
            // 则每次触发回调后将 previous 置为 0
            // 否则置为当前时间戳
            previous = options.leading === false ? 0 : _.now();
            // previous = _.now();
            timeout = null;
            result = func.apply(context, args);
            context = args = null;
        }
        return function(){
            var now = _.now();
            // 第一次执行回调（此时 previous 为 0，之后 previous 值为上一次时间戳）
            // 并且如果程序设定第一个回调不是立即执行的（options.leading === false）
            if(!previous && options.leading === false) previous = now;
            // 距离下次触发 func 还需要等待的时间
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            // 要么是到了间隔时间了，随即触发方法（remaining <= 0）
            // 要么是没有传入 {leading: false}，且第一次触发回调，即立即触发
            if(remaining <= 0 || remaining > wait){
                if(timeout){
                    clearTimeout(timeout);
                    //解除引用，防止内存泄漏
                    timeout = null;
                }
                //执行回调之后，更新previous
                previous = now;
                result = func.apply(context, args);
                context = args = null;
            } else if(!timeout && options.trailing !== false){
                timeout = setTimeout(later, remaining);
            }
            //没有执行的话，返回上次的执行结果
            return result;
        }
    }
    /*
        将延迟函数的执行(真正的执行)在函数最后一次调用时刻的 wait 毫秒之后. 
        对于必须在一些输入（多是一些用户操作）停止到达之后执行的行为有帮助。 
        例如: 渲染一个Markdown格式的评论预览, 当窗口停止改变大小之后重新计算布局
        
        并且在 wait 的时间之内，不会再次调用
        在类似不小心点了提交按钮两下而提交了两次的情况下很有用

        var lazyLayout = _.debounce(calculateLayout, 300);
        $(window).resize(lazyLayout);

         _.debounce(function(){}, 1000, true)
    */
    _.debounce = function(func, wait, immediate){
        var timeout,
            args,
            context,
            timestamp,
            result;
        var later = function(){
            var last = _.now() - timestamp;
            if(last < wait && wait >= 0){
                //如果还没到时间，则递归调用
                timeout = setTimeout(later, wait - last);
            } else {
                timeout = null;
                //如果不是立即触发
                if(!immediate){
                    result = func.apply(context, args);
                    if(!timeout) context = args = null;
                }
            }
        }
        return function(){
            context = this;
            args = arguments;
            timestamp = _.now();
            //immediate参数为true是立即触发
            var callNow = immediate && !timeout;
            if(!timeout)
                // 设置了 timeout，所以以后不会进入这个 if 分支了
                timeout = setTimeout(later, wait);
            // 如果是立即触发 
            if(callNow){
                result = func.apply(context, args);
                context = args = null;
            }
            return result;
        }
    }
    /*
        只有在运行了 count 次之后才有效果. 在处理同组异步请求返回结果时, 
        如果你要确保同组里所有异步请求完成之后才 执行这个函数, 这将非常有用

        var renderNotes = _.after(notes.length, render);
        _.each(notes, function(note) {
            //每次调用只更新了times，没有调用render
            note.asyncSave({success: renderNotes});
        });
    */
    _.after = function(times, func){
        //times由外部传入
        return function(){
            //每次调用的时候times都-1
            if(--times < 1){
                return func.apply(this, arguments);
            }
        }
    }
    /*
        创建一个函数,调用不超过count 次。 
        当count已经达到时，最后一个函数调用的结果将被记住并返回。

        var monthlyMeeting = _.before(3, askForRaise);
        monthlyMeeting();
        monthlyMeeting();
        monthlyMeeting();
        第三次调用结果和第二次调用的结果相同
    */
    _.before = function(times, func){
        var memo;
        return function(){
            if(--times > 0){
                //保存调用结果
                memo = func.apply(this, arguments);
            }
        }
        if(times <= 1) func = null;
        return memo;
    }
    _.once = _.partial(_.before, 2);
    _.isBoolean = function(obj) {
    	//使用短路运算来提升性能
    	return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  	};
  	_.isNull = function(obj){
  		return obj === null;
  	}
  	// undefined 能被改写 （IE < 9）
    // undefined 只是全局对象的一个属性
    // 在局部环境能被重新定义
    // 但是「void 0」始终是 undefined
  	_.isUndefined = function(obj){
  		return obj === void 0;
  	}
    _.has = function(obj, key) {
            // obj为null或者undefined返回false，否则判断是否在对象上
            return obj != null && hasOwnProperty.call(obj, key);
    };
    // 如果全局环境中已经使用了 `_` 变量
    // 可以用该方法返回其他变量
    // 继续使用 underscore 中的方法
    // var underscore = _.noConflict();
    // underscore.each(..);
    _.noConflict = function(){
    	//之前已经root._ = previousUnderscore;
    	root._ = previousUnderscore;
    	return this;
    }
    //  _.identity 在 undescore 内大量作为迭代函数出现
  	// 能简化很多迭代函数的书写
    _.identity = function(value){
    	return value;
    }
    _.constant = function(value){
    	return function(){
    		return value;
    	}
    }
    _.noop = function(){};
    /*
    	var stooge = {name: 'moe'};
		_.propertyOf(stooge)('name');
		=> 'moe'
    */
    _.propertyOf = function(obj){
    	//重新调用时可以增加参数
    	return obj == null ? function(){} : function(key){
    		return obj[key];
    	}
    }
    /*
    	返回一个断言函数，这个函数会给你一个断言可以用来辨别给定的对象是否匹配attrs指定键/值属性。
    	var ready = _.matcher({selected: true, visible: true});
    	var readyToGoList = _.filter(list, ready);
    */
    _.matcher = _.matches = function(attrs){
    	//先进行拷贝
    	attrs = _.extendOwn({}, attrs);
    	return function(obj){
    		return _.isMatch(obj, attrs);
    	}
    }
    // 执行某函数 n 次, 返回每次执行的结果
    _.times = function(n, iteratee, context){
    	var accm = Array(Math(max, n));
    	iteratee = optimizeCb(iteratee, context, 1);
    	for(var i = 0; i < n; i++) 
    		accm[i] = iteratee(i);
    	return accm;
    }
    _.random = function(min, max){
        //如果只传入一个参数，则返回[0, max]
        if(max == null){
            max = min;
            min = 0;
        }
        return min + Math.floor(Math.random() * (max - min + 1));
    }
    // 能将 & " ' < > 转为实体编码（下面的前 5 种）
    var escapeMap = {
    	'&': '&amp;',
	    '<': '&lt;',
	    '>': '&gt;',
	    '"': '&quot;',
	    // 以上四个为最常用的字符实体
	    // 也是仅有的可以在所有环境下使用的实体字符（其他应该用「实体数字」，如下）
	    // 浏览器也许并不支持所有实体名称（对实体数字的支持却很好）
	    "'": '&#x27;',
	    '`': '&#x60;'
    }
    // 这里的对象包括 function 和 object
  	_.isObject = function(obj) {
    	var type = typeof obj;
    	return type === 'function' || type === 'object' && !!obj;
  	};
    _.keys = function(obj){
        //如果传入参数不是对象，则返回空数组
        if(!_.isObject(obj)) return [];
        //如果支持Object.keys
        if(nativeKeys) return nativeKeys(obj);
        var keys = [];
        for(var key in obj){
            if(_.has(obj, key)) keys.push(key);
        }
        // IE < 9 下不能用 for in 来枚举某些 key 值
        // 传入 keys 数组为参数
        // 因为 JavaScript 下函数参数按值传递
        // 所以 keys 当做参数传入后会在 `collectNonEnumProps` 方法中改变值
        if (hasEnumBug) collectNonEnumProps(obj, keys);
        return keys;
    }
    // 将一个对象的 key-value 键值对颠倒
    // 即原来的 key 为 value 值，原来的 value 值为 key 值
    // 需要注意的是，value 值不能重复，否则会被覆盖
    _.invert = function(obj){
        var result = {};
        var keys = _.keys(obj);
        for(var i = 0, length = keys.length; i < length; i++){
            result[obj[keys[i]]] = keys[i];
        }
        return result;
    }
    _.allKeys = function(obj){
        if(!_.isObject(obj)) return [];
        // 不是对象，则返回空数组
        var keys = [];
        //for in会循环出原型链上属性，这里不过滤
        for(var key in obj) keys.push(key);
        // IE < 9 下的 bug，同 _.keys 方法
        if (hasEnumBug) collectNonEnumProps(obj, keys);
        return keys;
    }
    //翻转key和value值
    var unescapeMap = _.invert(escapeMap);
    var createEscaper = function(map){
    	var escaper = function(match){
    		return map[match];
    	}
    	//正则替换
    	var source = '(?:' + _.keys(map).join('|') + ')';
    	// 正则 pattern
    	var testRegexp = RegExp(source);
    	// 全局替换
    	var replaceRegexp = RegExp(source, 'g');
    	return function(string) {
      		string = string == null ? '' : '' + string;
      		return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
   		};
    }
    // 编码，防止被 XSS 攻击
 	_.escape = createEscaper(escapeMap);
 	_.unescape = createEscaper(unescapeMap);
    // _.isFunction 在 old v8, IE 11 和 Safari 8 下的兼容
    // 觉得这里有点问题
    // chrome 49 (显然不是 old v8)
    // 却也进入了这个 if 判断内部
    if (typeof /./ != 'function' && typeof Int8Array != 'object') {
        _.isFunction = function(obj) {
            return typeof obj == 'function' || false;
        };
    }
 	/*
 		var object = {cheese: 'crumpets', stuff: function(){ return 'nonsense'; }};
		_.result(object, 'cheese');
		=> "crumpets"
		_.result(object, 'stuff');
		=> "nonsense"
		_.result(object, 'meat', 'ham');
		=> "ham"
 	*/
 	_.result = function(object, proptety, fallback){
 		var value = object == null ? void 0 : object[property];
 		if(value === void 0){
 			value = fallback;
 		}
 		return _.isFunction(value) ? value.call(object): value;
 	}
 	var idCounter = 0;
 	_.uniqueId = function(index){
 		//id计数自增之后转成字符串
 		var id = ++idCounter + '';
 		return prefix ? prefix + id: id;
 	}
 	// Underscore 默认采用 ERB-style 风格模板，也可以根据自己习惯自定义模板
    // 1. <%  %> - to execute some code
    // 2. <%= %> - to print some value in template
    // 3. <%- %> - to print some values HTML escaped
    _.templateSettings = {
    	evaluate: /<%([\s\S]+?)%>/g,
    	interpolate : /<%=([\s\S]+?)%>/g,
    	escape      : /<%-([\s\S]+?)%>/g
    }
    var noMatch = /(.)^/;
    var escape = {
      "'": "'",
      '\\':     '\\',
      '\r':     'r',  // 回车符
      '\n':     'n',  // 换行符
      // http://stackoverflow.com/questions/16686687/json-stringify-and-u2028-u2029-check
      '\u2028': 'u2028', // Line separator
      '\u2029': 'u2029' 
    }
    //是否包含escape中的key
    var escaper = /\\|'|\r|\n|\u2028|\u2029/g;
    var escapeChar = function(match) {
        /**
          '      => \\'
          \\     => \\\\
          \r     => \\r
          \n     => \\n
          \u2028 => \\u2028
          \u2029 => \\u2029
        **/
        return '\\' + escapes[match];
    };
    /*
        如果您希望插入一个值, 并让其进行HTML转义,请使用<%- … %>。 
        当你要给模板函数赋值的时候，可以传递一个含有与模板对应属性的data对象 。 
        如果您要写一个一次性的, 您可以传对象 data 作为第二个参数给模板 template 来直接呈现, 这样页面会立即呈现而不是返回一个模板函数. 参数 settings 是一个哈希表包含任何可以覆盖的设置
        
        var compiled = _.template("hello: <%= name %>");
        compiled({name: 'moe'});
        => "hello: moe"

        进行转义
        var template = _.template("<b><%- value %></b>");
        template({value: '<script>'});
        => "<b>&lt;script&gt;</b>"

        也可以在JavaScript代码中使用 print. 有时候这会比使用 <%= ... %> 更方便.
        因为在编译可执行函数的时候，前面增加了print函数的定义
        var compiled = _.template("<% print('Hello ' + epithet); %>");
        compiled({epithet: "stooge"});
        => "Hello stooge"

        如果ERB式的分隔符您不喜欢, 您可以改变Underscore的模板设置, 使用别的符号来嵌入代码.
        定义一个 interpolate 正则表达式来逐字匹配嵌入代码的语句
        _.templateSettings = {
            interpolate: /\{\{(.+?)\}\}/g
        };
        把<%等标识修改为你喜欢的字符，修改默认配置

        默认的, template 通过 with 语句来取得 data 所有的值. 当然, 您也可以在 variable 设置里指定一个变量名. 这样能显著提升模板的渲染速度.
        _.template("Using 'with': <%= data.answer %>", {variable: 'data'})({answer: 'no'});
        => "Using 'with': no"
    */
    // 将 JavaScript 模板编译为可以用于页面呈现的函数
    // 第一次调用的时候可以传入settings
    _.template = function(text, settings, oldSettings){
        //settings为false， 并且传入了oldSettings参数
        if(!settings && oldSettings)
            settings = oldSettings;
        // 可以查看_.defaults方法注释
        // 自定义模板优先于默认模板 _.templateSettings
        // 修改模板配置
        settings = _.defaults({}, settings, _.templateSettings);
        // 正则表达式 pattern，用于正则匹配 text 字符串中的模板字符串
        /*
            new RegExp('ab+c') 提供了正则表达式运行时编译（runtime compilation）。
            如果你知道正则表达式模式将会改变，或者你事先不知道什么模式，
            而是从另一个来源获取，如用户输入，这些情况都可以使用构造函数。
            new RegExp('\n').source === '\n';  // true, prior to ES5
            new RegExp('\n').source === '\\n'; // true, starting with ES5
        */
        var matcher = RegExp([
          // 注意下 pattern 的 source 属性
          (settings.escape || noMatch).source,
          (settings.interpolate || noMatch).source,
          (settings.evaluate || noMatch).source
          // 默认matcher = <%-([\s\S]+?)%>|<%=([\s\S]+?)%>|<%([\s\S]+?)%>|$/g
          // |指明两项之间的一个选择。要匹配 |，请使用 \|。
          // \s匹配任何空白字符, \S匹配任何非空白字符
          // |$ 匹配输入字符串的结尾位置，所以结尾肯定会调用一次
        ].join('|') + '|$', 'g');
        var index = 0;
        var source = "__p+='";
        /*
            replace 回调的offset参数
            是指匹配到的子字符串在原字符串中的偏移量。（比如，如果原字符串是“abcd”，
            匹配到的子字符串是“bc”，那么这个参数将是1

            匹配到字符串末尾会再执行一次
        */
        text.replace(matcher, function(match, escape, interpolate, evaluate, offset){
            //匹配之前的字符串
            var former = text.slice(index, offset);
            // source用来保存字符串模板转化成的可执行函数
            source += former.replace(escaper, escapeChar);
            // index记录当前替换的位置
            index = offset + match.length;
            if (escape) {   
                // 需要对变量进行编码（=> HTML 实体编码）
                // 避免 XSS 攻击
                source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
            } else if (interpolate) {
                // 单纯的插入变量
                source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
            } else if (evaluate) {
                // 可以直接执行的 JavaScript 语句
                // 注意 "__p+="，__p 为渲染返回的字符串
                source += "';\n" + evaluate + "\n__p+='";
            }
            // return 的作用是
            // 将匹配到的内容原样返回（Adobe VMs 需要返回 match 来使得 offset 值正常）
            return match;
        })
        source += "';\n";
        // 如果设置了 settings.variable，能显著提升模板的渲染速度
        // 否则，默认用 with 语句指定作用域
        //使用with关键字的目的是为了简化多次编写访问同一对象的工作
        if (!settings.variable)
            source = 'with(obj||{}){\n' + source + '}\n';
        // 增加 print 功能
        // __p 为返回的字符串（每次进行叠加）
        //print('xxxx')之后会直接调用join方法、
        //__的命名来保证不会冲突
        source = "var __t,__p='',__j=Array.prototype.join," +
          "print=function(){__p+=__j.call(arguments,'');};\n" +
          source + 'return __p;\n';
        try {
            // render 方法，前两个参数为 render 方法的参数
            // obj 为传入的 JSON 对象，传入 _ 参数使得函数内部能用 Underscore 的函数
            //function('obj', '_', source);
            var render = new Function(settings.variable || 'obj', '_', source);
        } catch(e){
            // 添加错误信息后再抛出
            e.source = source;
            throw e;
        }
        // 返回的函数
        // data 一般是 JSON 数据，用来渲染模板
        var template = function(data){
            try{
                var result =  render.call(this, data, _);
            } catch(e){
                e.source = source;
                throw e;
            }
            // call可以传入多个参数，传入参数 _ ，使得模板里 <%  %> 里的代码能用 underscore 的方法
            return result;
        }
        //obj 与 with(obj||{}) 中的 obj 对应
        var argument = settings.variable || 'obj';
        // 可通过 _.template(tpl).source 获取
        // 可以用来预编译，在服务端预编译好，直接在客户端生成代码，客户端直接调用方法
        // 这样如果出错就能打印出错行
        template.source = 'function(' + argument + '){\n' + source + '}';
        return template;
    }
    /*
        对一个对象使用 chain 方法, 
        会把这个对象封装并 让以后每次方法的调用结束后都返回这个封装的对象,
        当您完成了计算, 可以使用 value 函数来取得最终的值
        返回一个封装的对象. 在封装的对象上调用方法会返回封装的对象本身, 
        直到 value 方法调用为止.

        var stooges = [{name: 'curly', age: 25}, {name: 'moe', age: 21}, {name: 'larry', age: 23}];
        var youngest = _.chain(stooges)
          .sortBy(function(stooge){ return stooge.age; })
          .map(function(stooge){ return stooge.name + ' is ' + stooge.age; })
          .first()
          .value();
        => "moe is 21"
    */
    _.chain = function(obj){
        // 无论是否 OOP 调用，都会转为 OOP 形式
        // 并且给新的构造对象添加了一个 _chain 属性
        var instance = _(obj);
        instance._chain = true;
        // 返回 OOP 对象
        // 可以看到该 instance 对象除了多了个 _chain 属性
        // 其他的和直接 _(obj) 的结果一样
        return instance;
    }
    //用在其他支持链式调用的方法中，判断是否当前是链式调用状态
    var result = function(instance, obj){
        return instance._chain ? _(obj).chain() : obj;
        // 如果需要链式操作，则对传入的obj 运行 _.chain 方法，使得可以继续后续的链式操作
        // 如果不需要，直接返回 obj
    }
    // 遍历该对象的键值对（包括 own properties 以及 原型链上的）
    // 如果某个 value 的类型是方法（function），则将该 key 存入数组
    /*
        _.functions(_);
        => ["all", "any", "bind", "bindAll", "clone", "compact", "compose" ...
    */
    _.functions = _.methods = function(obj){
        var names = [];
        for(var key in obj){
            if(_.isFunction(obj[key])) names.push(key);
        }
        return names.sort();
    }
    // 可向 underscore 函数库扩展自己的方法
    // obj 参数必须是一个对象 且自己的方法定义在 obj 的属性上
    // 之后便可使用如下: _.myFunc(..) 或者 OOP _(..).myFunc(..)
    _.mixin = function(obj){
        //遍历obj上的方法
        _.each(_.functions(obj), function(name){
            // 直接把方法挂载到 _[name] 上, 浅拷贝
            // 连等赋值是从右到左的
            var func = _[name] = obj[name];
            //将 name 方法挂载到 _ 对象的原型链上，使之能 OOP 调用
            _.prototype[name] = function(){
                var args = [this._wrapped];
                push.apply(args, arguments);
                return result(this, func.apply(_, args));
            }
        })
    }
    // 即添加到 _.prototype 中
    // 使 underscore 支持面向对象形式的调用
    _.mixin(_);
    // 将 Array 原型链上有的方法都添加到 underscore 中
    _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
            //从this._wrapped获得调用对象的引用
            var obj = this._wrapped;
            method.apply(obj, arguments);

            if ((name === 'shift' || name === 'splice') && obj.length === 0)
            delete obj[0];

            // 支持链式操作
            return result(this, obj);
        };
    });
    // 添加 concat、join、slice 等数组原生方法给 Underscore
    _.each(['concat', 'join', 'slice'], function(name) {
        var method = ArrayProto[name];
        _.prototype[name] = function() {
            return result(this, method.apply(this._wrapped, arguments));
        };
    });
    _.prototype.value = function() {
        return this._wrapped;
    };
    _.prototype.toString = function() {
        return '' + this._wrapped;
    };
    //把对象的value收集成数组后返回
    _.values = function(obj){
        // 仅包括 own properties
        var keys = _.keys(obj);
        var length = keys.length;
        var values = Array(length);
        for(var i = 0; i < length; i++){
            values[i] = obj[keys[i]];
        }
        return values;
    }
    //对象的每个value进行迭代后，返回一个结果数组
    _.mapObject = function(obj, iteratee, context){
        iteratee = cb(iteratee, context);
        var keys = _.keys(obj),
            length = keys.length,
            results = {},
            currentKey;
        for(var index = 0; index < length; index++){
            currentKey = keys[index];
            results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
        }
        return results;
    }
    // 将一个对象转换为元素为 [key, value] 形式的数组
    // _.pairs({one: 1, two: 2, three: 3});
    // => [["one", 1], ["two", 2], ["three", 3]]
    _.pairs = function(obj){
        var keys = _.keys(obj);
        var length = keys.length;
        var pairs = Array(length);
        for(var i = 0; i < length; i++){
            pairs[i] = [keys[i], obj[keys[i]]];
        }
        return pairs;
    }
    // 将几个对象上（第二个参数开始，根据参数而定）的所有键值对添加到 destination 对象（第一个参数）上
    // 因为 key 值可能会相同，所以后面的（键值对）可能会覆盖前面的
    // 跟 extend 方法类似，但是只把 own properties 拷贝给第一个参数对象
    _.extend = createAssigner(_.allKeys);
    // 找到对象的键值对中第一个满足条件的键值对
    _.findKey = function(obj, predicate, context){
        predicate = cb(predicate, context);
        var keys = _.keys(obj),
            key;
        for(var i = 0, length = keys.length; i < length; i++){
            key = keys[i];
            if(predicate(obj[key], key, obj)) return key;
        }
    }
    /*
        把对象中制定的key-value键值对筛选出来
        _.pick({name: 'moe', age: 50, userid: 'moe1'}, 'name', 'age');
        => {name: 'moe', age: 50}
        _.pick({name: 'moe', age: 50, userid: 'moe1'}, ['name', 'age']);
        => {name: 'moe', age: 50}
        _.pick({name: 'moe', age: 50, userid: 'moe1'}, function(value, key, object) {
            return _.isNumber(value);
        });
        => {age: 50}
    */
    _.pick = function(object, iteratee, context){
        var result = {},
            obj = object,
            iteratee,
            keys;
        if(obj == null) return result;
        if(_.isFunction(iteratee)){
            //获得obj的所有key
            keys = _.allKeys(obj);
            iteratee = optimizeCb(iteratee, context);
        } else {
            // 如果第二个参数不是函数
            // 则后面的 keys 可能是数组
            // 也可能是连续的几个并列的参数
            // 用 flatten 将它们展开
            keys = flatten(arguments, false, false, 1);
            iteratee = function(value, key, obj){
                //只需要满足key在对象上即可
                return key in obj;
            }
            obj = Object(obj);
        }
        for(var i = 0, length = keys.length; i < length; i++){
            var key = keys[i];
            var value = obj[key];
            if(iteratee(value, key, obj)) result[key] = value;
        }
        return result;
    }
    // 跟 _.pick 方法相对
  	// 返回 _.pick 的补集
    _.omit = function(obj, iteratee, context){
        if(_.isFunction(iteratee)){
        	// _.negate 方法对 iteratee 的结果取反
            iteratee = _.negate(iteratee);
        } else {
        	var keys = _.map(flatten(arguments, false, false, 1), String);
      		iteratee = function(value, key) {
        		return !_.contains(keys, key);
      		};
        }
        return _.pick(obj, iteratee, context);
    }
    /*
        用defaults对象填充object 中的undefined属性。 并且返回这个object。一旦这个属性被填充，再使用defaults方法将不会有任何效果。
        var iceCream = {flavor: "chocolate"};
        _.defaults(iceCream, {flavor: "vanilla", sprinkles: "lots"});
        => {flavor: "chocolate", sprinkles: "lots"}
    */
    _.defaults = createAssigner(_.allKeys, true);
    //返回给定原型的对象
    _.create = function(prototype, props){
    	var result = baseCreate(prototype);
    	// 将 props 的键值对覆盖 result 对象
    	if(props) _.extendOwn(result, props);
    	return result;
    }
    /*
    	如果是数组直接slice即可
    	如果是对象为浅复制，所有嵌套的对象或者数组都会跟原对象同一个引用
    */
    _.clone = function(obj){
    	if(!_.isObject(obj))
    		return obj;
    	return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
    }
    /*
    	用 object作为参数来调用函数interceptor，然后返回object。
    	这种方法的主要意图是作为函数链式调用的一环, 为了对此对象执行操作并返回对象本身。
    	_.chain([1,2,3,200])
		  .filter(function(num) { return num % 2 == 0; })
		  .tap(alert)
		  .map(function(num) { return num * num })
		  .value();
		=> // [2, 200] (alerted)
		=> [4, 40000]
    */
    _.tap = function(obj, interceptor){
    	interceptor(obj);
    	return obj;
    }
    /*
    	判断 object 对象中是否有 attrs 中的所有 key-value 键值对
    	var stooge = {name: 'moe', age: 32};
		_.isMatch(stooge, {age: 32});
		=> true
    */
    _.isMatch = function(object, attrs){
    	var keys = _.keys(attrs),
    		length = keys.length;
    	if(object == null) return !length;
    	var obj = Object(object);
    	for(var i = 0; i < length; i++){
    		var key = keys[i];
    		if(attrs[key] !== obj[key] || !(key in obj)) return false;
    	}
    	return true;
    }
    var eq = function(a, b, aStack, bStack){
    	if(a === b) return a !== 0 || 1 / a === 1 / b;
    	//待实现
    }
    // [1, 2, 3], [1, 2, 3] 被认为 equal
  	// 0 和 -0 被认为 unequal
  	// NaN 和 NaN 被认为 equal
  	_.isEqual = function(a, b) {
    	return eq(a, b);
  	};
  	// 是否是 {}、[] 或者 "" 或者 null、undefined
  	_.isEmpty = function(obj){
  		if(obj == null) return true;
  		if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
  		// 如果是对象
    	// 根据 keys 数量判断是否为 Empty
    	return _.keys(obj).length === 0;
  	}
  	// 判断是否为 DOM 元素
  	_.isElement = function(obj){
  		return !!(obj && obj.nodeType === 1);
  	}

    _.negate = function(predicate){
    	return function(){
    		return !predicate.apply(this, arguments);
    	}
    }
    _.extendOwn = _.assign = createAssigner(_.keys);
    // 判断是否为数组
  	_.isArray = nativeIsArray || function(obj) {
    	return toString.call(obj) === '[object Array]';
  	};
    // 比如重写了对象的 `toString` 方法，这个 key 值就不能在 IE < 9 下用 for in 枚举到
    // IE < 9，{toString: null}.propertyIsEnumerable('toString') 返回 false
    // IE < 9，重写的 `toString` 属性被认为不可枚举
    // 据此可以判断是否在 IE < 9 浏览器环境中
    var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
    // IE < 9 下不能用 for in 来枚举的 key 值集合
    // 其实还有个 `constructor` 属性
    // nonEnumerableProps[] 中都是方法
    // 而 constructor 表示的是对象的构造函数
    // 所以区分开来了
    var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];
    // obj 为需要遍历键值对的对象
    // keys 为键数组
    // 利用 JavaScript 按值传递的特点
    // 传入数组作为参数，能直接改变数组的值
    function collectNonEnumProps(obj, keys){
        var nonEnumIdx = nonEnumerableProps.length;
        var constructor = obj.constructor;
        var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;
        var prop = 'constructor';
        if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);
        // 遍历 nonEnumerableProps 数组中的 keys
        while (nonEnumIdx--) {
            prop = nonEnumerableProps[nonEnumIdx];
            // obj[prop] !== proto[prop] 判断该 key 是否来自于原型链
            // 即是否重写了原型链上的属性
            if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
                keys.push(prop);
            }
        }
    }
    // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
    // 其他类型判断
 	_.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    	_['is' + name] = function(obj) {
    		//_.isArguments = function(obj){ return toString.call(obj) === '[object Arguments]' }
      		return toString.call(obj) === '[object ' + name + ']';
    	};
  	});
    // _.isArguments 方法在 IE < 9 下的兼容
	// IE < 9 下对 arguments 调用 Object.prototype.toString.call 方法
	// 结果是 => [object Object]
	// 而并非我们期望的 [object Arguments]。
	// 所以用是否含有 callee 属性来做兼容
	if (!_.isArguments(arguments)) {
	    _.isArguments = function(obj) {
	      	return _.has(obj, 'callee');
	    };
	}
	// 判断是否是有限的数字
	_.isFinite = function(obj){
		return isFinite(obj) && !isNaN(parseFloat(obj));
	}
	_.isNaN = function(obj) {
    	return _.isNumber(obj) && obj !== +obj;
  	};
    // 兼容 AMD 规范
    if (typeof define === 'function' && define.amd) {
        define('underscore', [], function() {
            return _;
        });
    }
}.call(window))