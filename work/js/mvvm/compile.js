function Compile(el, vm) {
  // 保存vm
  this.$vm = vm;
  // 保存el元素
  this.$el = this.isElementNode(el) ? el : document.querySelector(el);

  if (this.$el) {
    // 1. 将el中的所有子节点封装在一个内存中的fragment对象中
    this.$fragment = this.node2Fragment(this.$el);
    // 2. 编译fragment所有层次的子节点
    this.init();
    // 3. 将编译好的fragment添加为el元素子节点: 所有编译后的子节点又添加回el中
    this.$el.appendChild(this.$fragment);
  }
}

Compile.prototype = {
  node2Fragment: function (el) {
    var fragment = document.createDocumentFragment(),
      child;
    // 将原生节点转移到fragment
    while (child = el.firstChild) {
      fragment.appendChild(child);
    }
    return fragment;
  },

  init: function () {
    this.compileElement(this.$fragment);
  },

  // 编译指定element/fragment的所有子节点
  compileElement: function (el) {
    // 得到所有子节点
    var childNodes = el.childNodes,
      // 保存compile对象
      me = this;
    // 遍历所有子节点
    [].slice.call(childNodes).forEach(function (node) {
      // 得到节点的文本内容
      var text = node.textContent;
      // 创建匹配{{xxx}}的正则对象
      var reg = /\{\{(.*)\}\}/;   // {{name}}
      // 判断当前子节点是否是一个元素节点
      if (me.isElementNode(node)) {
        // 编译元素节点(解析标签中的指令属性)
        me.compile(node);
      // 判断是否是大括号表达格式的文本节点
      } else if (me.isTextNode(node) && reg.test(text)) {
        // 解析文本节点中的大括号表达格式
        me.compileText(node, RegExp.$1);
      }
      // 判断当前子节点是否还有子节点
      if (node.childNodes && node.childNodes.length) {
        // 递归调用, 实现所有层次子节点的编译
        me.compileElement(node);
      }
    });
  },

  // 编译元素节点(编译它的属性)
  compile: function (node) {
    // 得到所有的属性节点
    var nodeAttrs = node.attributes,
      // 保存compile对象
      me = this;
    // 遍历所有属性节点
    [].slice.call(nodeAttrs).forEach(function (attr) {
      // 得到属性名: v-on:click
      var attrName = attr.name;
      // 判断是否是指令属性
      if (me.isDirective(attrName)) {
        // 得到表达式(属性值): test
        var exp = attr.value;
        // 从属性名取出指令名: on:click
        var dir = attrName.substring(2);
        // 如果是事件指令
        if (me.isEventDirective(dir)) {
          // 解析事件指令
          compileUtil.eventHandler(node, me.$vm, exp, dir);
        // 普通指令
        } else {
          // 解析普通指令(调用指令在compileUtil中对应的方法去解析)
          compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
        }

        node.removeAttribute(attrName);
      }
    });
  },

  compileText: function (node, exp) {
    compileUtil.text(node, this.$vm, exp);
  },

  isDirective: function (attr) {
    return attr.indexOf('v-') == 0;
  },

  isEventDirective: function (dir) {
    return dir.indexOf('on') === 0;
  },

  isElementNode: function (node) {
    return node.nodeType == 1;
  },

  isTextNode: function (node) {
    return node.nodeType == 3;
  }
};

// 编译工具对象
var compileUtil = {
  // 解析 {{}}/ v-text
  text: function (node, vm, exp) {
    this.bind(node, vm, exp, 'text');
  },
  // 解析 v-html
  html: function (node, vm, exp) {
    this.bind(node, vm, exp, 'html');
  },

  // 解析 v-model
  model: function (node, vm, exp) {
    // 初始化显示/创建watcher进行监视
    this.bind(node, vm, exp, 'model');

    var me = this,
      // 得到表达式对应的值
      val = this._getVMVal(vm, exp);
    // 给节点绑定input事件监听
    node.addEventListener('input', function (e) { // 输入框的值发生改变时回调
      // 得到输入框最新的值
      var newValue = e.target.value;
      if (val === newValue) {
        return;
      }
      // 将最新值赋值给表达式所对应的属性, 内部会触发对应的界面更新
      me._setVMVal(vm, exp, newValue);
      // 保存最新的值
      val = newValue;
    });
  },

  // 解析 v-class
  class: function (node, vm, exp) {
    this.bind(node, vm, exp, 'class');
  },

  // 绑定: 实现节点的初始化显示和更新显示
  bind: function (node, vm, exp, dir) {
    // 得到对应的更新节点的函数
    var updaterFn = updater[dir + 'Updater'];
    // 调用更新函数更新节点
    updaterFn && updaterFn(node, this._getVMVal(vm, exp));
    // 创建watcher对象, 实现节点的更新显示
    new Watcher(vm, exp, function (value, oldValue) {
      updaterFn && updaterFn(node, value, oldValue);
    });
  },

  // 事件处理
  eventHandler: function (node, vm, exp, dir) {
    // 得到事件类型(名): click
    var eventType = dir.split(':')[1],
      // 得到methods中对应的处理函数
      fn = vm.$options.methods && vm.$options.methods[exp];
    // 如果都存在
    if (eventType && fn) {
      // 给节点绑定指定事件名和处理函数DOM事件监听
          // 将回调函数中的this强制绑定为vm
      node.addEventListener(eventType, fn.bind(vm), false);
    }
  },

  // 通过vm得到表达式所对应的value
  _getVMVal: function (vm, exp) {
    var val = vm._data;
    exp = exp.split('.');
    exp.forEach(function (k) {
      val = val[k];
    });
    return val;
  },

  _setVMVal: function (vm, exp, value) {
    var val = vm._data;
    exp = exp.split('.');
    exp.forEach(function (k, i) {
      // 非最后一个key，更新val的值
      if (i < exp.length - 1) {
        val = val[k];
      } else {
        val[k] = value;
      }
    });
  }
};

// 节点的更新对象
var updater = {
  // 更新节点textContent属性
  textUpdater: function (node, value) {
    node.textContent = typeof value == 'undefined' ? '' : value;
  },

  // 更新节点的innerHTML属性
  htmlUpdater: function (node, value) {
    node.innerHTML = typeof value == 'undefined' ? '' : value;
  },

  // 更新节点的className属性
  classUpdater: function (node, value, oldValue) {
    var className = node.className;
    const space = className ? ' ' : ''
    node.className = className + space + value;
  },

  // 更新节点的value属性
  modelUpdater: function (node, value, oldValue) {
    node.value = typeof value == 'undefined' ? '' : value;
  }
};