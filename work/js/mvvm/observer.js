function Observer(data) {
  // 保存数据对象
  this.data = data;
  // 启动劫持
  this.walk(data);
}

Observer.prototype = {
  walk: function (data) {
    // 保存observer
    var me = this;
    // 遍历data中所有属性
    Object.keys(data).forEach(function (key) {
      // 对指定属性实现劫持
      me.convert(key, data[key]);
    });
  },
  convert: function (key, val) {
    // 对指定属性实现劫持
    this.defineReactive(this.data, key, val);
  },

  defineReactive: function (data, key, val) {
    // 创建与当前属性对应的dep对象
    var dep = new Dep();
    // 递归调用实现所有层次属性的劫持
    var childObj = observe(val);

    // 给data重新定义属性: 实现对当前属性的数据劫持
    Object.defineProperty(data, key, {
      enumerable: true, // 可枚举
      configurable: false, // 不能再定义
      // 返回属性的值, 建立dep与watcher之间的关系
      get: function () {
        // 只当对应的watcher已经存在了
        if (Dep.target) {
          // 建立dep与watcher之间的关系
          dep.depend();
        }
        return val;
      },
      // 监视data属性值的变化, 当值发生了变化, 更新界面
      set: function (newVal) {
        if (newVal === val) {
          return;
        }
        val = newVal;
        // 对新的值进行监视(只有当新值是一个对象时)
        childObj = observe(newVal);
        // 通过dep来通知所有相关的watcher
        dep.notify();
      }
    });
  }
};

function observe(value, vm) {
  // 必须是一个对象, 否则直接结束
  if (!value || typeof value !== 'object') {
    return;
  }
  // 创建一个对应的Observer来对value对象中的属性进行劫持
  return new Observer(value);
};


var uid = 0;

function Dep() {
  this.id = uid++;
  this.subs = [];
}

Dep.prototype = {
  addSub: function (sub) {
    this.subs.push(sub);
  },

  depend: function () {
    // 通知watcher来建立关系
    Dep.target.addDep(this);
  },

  removeSub: function (sub) {
    var index = this.subs.indexOf(sub);
    if (index != -1) {
      this.subs.splice(index, 1);
    }
  },

  notify: function () {
    // 遍历所有相关的watcher, 通知它们去更新视图
    this.subs.forEach(function (sub) {
      sub.update();
    });
  }
};

Dep.target = null;