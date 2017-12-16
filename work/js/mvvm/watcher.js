function Watcher(vm, exp, cb) {
  this.cb = cb;
  this.vm = vm;
  this.exp = exp;
  this.depIds = {};
  this.value = this.get();
}

Watcher.prototype = {
  update: function () {
    this.run();
  },
  run: function () {
    // 得到最新的值
    var value = this.get();
    // 得到老值
    var oldVal = this.value;
    // 只有不相等
    if (value !== oldVal) {
      // 保存新值
      this.value = value;
      // 调用回调函数去更新界面中对应的节点
      this.cb.call(this.vm, value, oldVal);
    }
  },
  addDep: function (dep) {
    // 判断关系是否已经建立, 只有没有时才建立
    if (!this.depIds.hasOwnProperty(dep.id)) {
      // 将watcher添加到dep
      dep.addSub(this);
      // 将dep添加到watcher中
      this.depIds[dep.id] = dep;
    }
  },
  get: function () {
    // 将当前watcher告知给Dep
    Dep.target = this;
    // 获取表达式所对应的值
    var value = this.getVMVal();
    // 将当前watcher从Dep中移除
    Dep.target = null;
    return value;
  },

  getVMVal: function () {  // a.b.c
    // [a, b, c]
    var exp = this.exp.split('.');
    // 得到data对象
    var val = this.vm._data;
    // val = val['a']  val = val['b']  val = val['c']
    exp.forEach(function (k) {
      val = val[k];
    });
    return val;
  }
};