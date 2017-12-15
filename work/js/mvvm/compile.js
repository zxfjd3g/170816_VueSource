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

  compile: function (node) {
    var nodeAttrs = node.attributes,
      me = this;

    [].slice.call(nodeAttrs).forEach(function (attr) {
      var attrName = attr.name;
      if (me.isDirective(attrName)) {
        var exp = attr.value;
        var dir = attrName.substring(2);
        // 事件指令
        if (me.isEventDirective(dir)) {
          compileUtil.eventHandler(node, me.$vm, exp, dir);
          // 普通指令
        } else {
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

  // 解析 {{}}/ v-model
  model: function (node, vm, exp) {
    this.bind(node, vm, exp, 'model');

    var me = this,
      val = this._getVMVal(vm, exp);
    node.addEventListener('input', function (e) {
      var newValue = e.target.value;
      if (val === newValue) {
        return;
      }

      me._setVMVal(vm, exp, newValue);
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
    var eventType = dir.split(':')[1],
      fn = vm.$options.methods && vm.$options.methods[exp];

    if (eventType && fn) {
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
    className = className.replace(oldValue, '').replace(/\s$/, '');

    var space = className && String(value) ? ' ' : '';

    node.className = className + space + value;
  },

  // 更新节点的value属性
  modelUpdater: function (node, value, oldValue) {
    node.value = typeof value == 'undefined' ? '' : value;
  }
};