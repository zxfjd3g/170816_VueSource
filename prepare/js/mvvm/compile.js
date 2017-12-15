/**
 * 用于编译模板的构造函数
 * @param el
 * @param vm
 * @constructor
 */
function Compile(el, vm) {
    // 保存vm对象
    this.$vm = vm;
    // 保存模板根元素对象
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);
    // 如果元素存在才去解析
    if (this.$el) {
        // 创建fragment对象, 取出根元素中所有子元素, 将其添加到fragment中
        this.$fragment = this.node2Fragment(this.$el);
        // 初始化: 编译fragment中所有的模板
        this.init();
        // 将fragment添加到根元素中显示
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    node2Fragment: function(el) {
        // 创建一个空的fragment对象
        var fragment = document.createDocumentFragment(),
            child;
        // 遍历取出所有的子元素添加到fragment中
        while (child = el.firstChild) {
            fragment.appendChild(child); //child会从el中转移到fragment中
        }

        return fragment;
    },

    init: function() {
        // 编译fragment中所有的模板子元素
        this.compileElement(this.$fragment);
    },

    compileElement: function(el) {
        // 得到所有的子节点(包括换行文本节点)
        var childNodes = el.childNodes,
            me = this;
        // 遍历所有子节点, 一个一个编译
        [].slice.call(childNodes).forEach(function(node) {
            // 得到当前节点的文本内容
            var text = node.textContent;
            // 定义匹配表达式的正则
            var reg = /\{\{(.*)\}\}/;
            // 如果当前遍历的节点是元素点
            if (me.isElementNode(node)) {
                // 编译当前节点(其中的指令属性)
                me.compile(node);

            // 当前节点是一个表达式格式的文本节点
            } else if (me.isTextNode(node) && reg.test(text)) {
                //编译表达式文本节点
                me.compileText(node, RegExp.$1);
            }

            // 如果当前节点还有子节点
            if (node.childNodes && node.childNodes.length) {
                //编译当前节点元素(的子节点): 形成递归调用编译, 从而实现对任意层次的模板的编译
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        // 取出所有属性
        var nodeAttrs = node.attributes,
            me = this;
        // 遍历属性: 编译指令属性
        [].slice.call(nodeAttrs).forEach(function(attr) {
            // 得到属性名
            var attrName = attr.name;
            // 根据属性名判断是否是指令属性
            if (me.isDirective(attrName)) {
                // 得到指令表达式
                var exp = attr.value;
                // 得到指令名: text/html/model/on:click
                var dir = attrName.substring(2);
                // 如果是事件指令
                if (me.isEventDirective(dir)) {
                    // 处理事件指令
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                } else {// 普通指令
                    // 调用普通指令所对应的处理方法处理
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }
                // 编译指令完成后, 删除指令属性
                node.removeAttribute(attrName);
            }
        });
    },

    /*
    编译文本节点
     */
    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

    /*
    判断是否是指令属性
     */
    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    /*
    判断指令是否是事件指令
     */
    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    /*
    判断是否是元素节点
     */
    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    /*
    判断是否是文本节点
     */
    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

/*
表达式/指令的编译工具对象
 */
var compileUtil = {
    /*
    编译表达式
     */
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

    /*
     编译v-html
     */
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

    /*
    编译v-model
     */
    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

        var me = this,
          // 获取当前表达式的值
            val = this._getVMVal(vm, exp);
        // 给节点绑定input监听: 一旦input的value变化, 回调函数就执行
            // 用来实现双向数据绑定
        node.addEventListener('input', function(e) {
            // 得到输入框最新的值
            var newValue = e.target.value;
            // 如果值没有变化, 不做任何处理
            if (val === newValue) {
                return;
            }
            // 将最新的值保存到对应的属性上
            me._setVMVal(vm, exp, newValue);
            // 保存最新的值
            val = newValue;
        });
    },

    /*
    编译v-class
     */
    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },


    bind: function(node, vm, exp, dir) {
        // 得到真正将指令/表达式更新为对应值的函数
        var updaterFn = updater[dir + 'Updater'];
        // 如果存在, 执行最后的解析工作
            // _getVMVal(vm, exp)
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));
        // 为每个一般指令/表达式创建一个对应的watcher
            //用来监视对应数据的变化, 一旦变化, 再次调用指令/表达式的处理函数
        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件指令处理
    eventHandler: function(node, vm, exp, dir) {
        // 根据指令名得到事件类型(名)
        var eventType = dir.split(':')[1],
          //事件回调函数
            fn = vm.$options.methods && vm.$options.methods[exp];
        // 如果事件名与回调函数都存在
        if (eventType && fn) {
            // 给节点添加指定类型的事件监听
                //fn.bind(vm): 指定回调函数中的this为vm对象
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    /*
    得到指定表达式的值
        表达式可能是多层组成, 需要一层一层来遍历
     */
    _getVMVal: function(vm, exp) {
        var val = vm._data;
        exp = exp.split('.');

        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    /*
    给指定表达式设置指定的新值
     */
    _setVMVal: function(vm, exp, value) {
        //得到data对象
        var val = vm._data;
        exp = exp.split('.');
            exp.forEach(function(k, i) {
                // 找到最内层属性并设置为指定的value
                if (i < exp.length - 1) {
                    val = val[k];
                } else {
                    val[k] = value;
                }
        });
    }
};


var updater = {
    /*
    更新标签体文本: v-text/表达式
     */
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },
    /*
     更新标签体html: v-html
     */
    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    /*
     更新标签的class属性值: v-class
     */
    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },

    /*
    更新标签的value: v-model
     */
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};