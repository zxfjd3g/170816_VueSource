/**
 * 功能类似于Vue的构造函数, 它的实例就是一个vm对象
 * @param options: 配置对象
 *  el
 *  data
 *  methods
 */
function MVVM(options) {
    // 保存options对象
    this.$options = options;
    // 保存data数据对象
    var data = this._data = this.$options.data;
    // 保存当前this(vm)
    var me = this;
    // 遍历data中所有属性, 实现对它们的代理
    Object.keys(data).forEach(function(key) {
        // 让vm代理指定的属性
        me._proxy(key);
    });

    observe(data, this);

    // 创建compile对象
        /*内部解析模板中所有的表达式和指令*/
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

    /**
     * 通过vm代理对指定key属性的操作(读/写)
     * @param key
     */
    _proxy: function(key) {
        // 暂存当前vm对象
        var me = this;
        // 为vm对象定义带get/set访问修饰符的属性
            //属性名为data中同名属性名
            //get()获取data中同名属性值
            //set()将当前属性值赋值给data中同名的属性
        /*实现数据代理的关键代码*/
        Object.defineProperty(me, key, {
            configurable: false,
            enumerable: true,
            get: function proxyGetter() {
                return me._data[key];
            },
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    }
};