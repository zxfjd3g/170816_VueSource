/*
相当于Vue的构造函数
 */
function MVVM(options) {
  // 保存配置对象到vm中
  this.$options = options;
  // 保存配置中的data到vm和变量data
  var data = this._data = this.$options.data;
  // 保存vm
  var me = this;

  // 遍历data中所有属性
  Object.keys(data).forEach(function (key) {//  key是属性名  name
    // 对指定属性名的属性实现数据代理
    me._proxy(key);
  });

  observe(data, this);

  // 创建Compile对象来对模板进行编译(解析)
  this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
  $watch: function (key, cb, options) {
    new Watcher(this, key, cb);
  },

  // 对指定属性名的属性实现数据代理
  _proxy: function (key) {
    // 保存vm
    var me = this;
    // 给vm添加指定属性名的属性(使用属性描述符)
    Object.defineProperty(me, key, {
      configurable: false, // 不能再重新定义
      enumerable: true, // 可以枚举
      // 获取vm的key属性值
      get: function proxyGetter() {
        // 读取data中对应的属性值
        return me._data[key];
      },
      // 监视vm的key属性值的变化
      set: function proxySetter(newVal) {
        // 将最新的属性值赋值给dat中对应的属性
        me._data[key] = newVal;
      }
    });
  }
};