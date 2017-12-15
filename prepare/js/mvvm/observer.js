function Observer(data) {
  // 保存数据
  this.data = data;
  // 开启对指定数据的监视(劫持)
  this.walk(data);
}

Observer.prototype = {
  walk: function (data) {
    //保存当前observer对象
    var me = this;
    // 遍历数据对象中的所有属性
    Object.keys(data).forEach(function (key) {
      // 对数据对象中的指定属性进行劫持, 实现数据绑定
      me.defineReactive(me.data, key, data[key]);
    });
  },

  defineReactive: function (data, key, val) {
    // 创建对应当前key属性的dep对象
    var dep = new Dep();
    // 监视当前属性值的下一级属性(如果有的话): 递归调用, 实现所有层次属性的数据劫持
    observe(val);

    // 为指定key属性指定set/get方法, 劫持该属性, 进而实现对此属性的数据绑定
    Object.defineProperty(data, key, {
      enumerable: true, // 可枚举
      configurable: false, // 不能再define
      get: function () {
        if (Dep.target) {
          dep.depend();
        }
        return val;
      },
      set: function (newVal) {
        if (newVal === val) {
          return;
        }
        val = newVal;
        // 新的值是object的话，进行监听
        observe(newVal);
        // 通知订阅者
        dep.notify();
      }
    });
  }
};

/*
 对指定value的内部属性进行监视(劫持)
 */
function observe(value, vm) {
  //如果value不是对象, 直接结束
  if (!value || typeof value !== 'object') {
    return;
  }

  // 创建观察对象, 针对当前value
  return new Observer(value);
};


var uid = 0;
/*
每个data属性所对应的dep对象构造函数
 */
function Dep() {
  this.id = uid++; // 标识
  this.subs = []; // 包含n个对应watcher的数组
}

Dep.prototype = {
  addSub: function (sub) {
    this.subs.push(sub);
  },

  depend: function () {
    Dep.target.addDep(this);
  },

  removeSub: function (sub) {
    var index = this.subs.indexOf(sub);
    if (index != -1) {
      this.subs.splice(index, 1);
    }
  },

  notify: function () {
    this.subs.forEach(function (sub) {
      sub.update();
    });
  }
};

Dep.target = null;