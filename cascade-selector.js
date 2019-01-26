/* * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 	cascade-selector：hover式触发级联选择器
 * 	- 垂直式布局，基于jquery-3.3.1.min.js，依赖layui的ayui-icon-right图标，现已打包
 *  - 支持嵌套，每个cascade-selector的下一级都可绑定拓展函数，灵活性高。封装模板cascade-panel，集成响应事件
 *  - 参数化样式，轻度支持自定义修改样式，非常轻量级
 *  - css样式层次
 *  	<cascade-selector>
 *  	<cascade-panel>嵌套处</cascade-panel>
 *  	<cascade-selectitem><selectitem-text/><selectitem-flag/></cascade-selectitem>
 *  	<cascade-selectitem>...</cascade-selectitem>
 *  	...
 *  	</cascade-selector>
 *  - 参数：
 *  	[对于cascade-selector]
 *  	样式：
 *  	themeColor：主体颜色，主要为字体颜色，默认蓝色
 *  	fontColor：字体颜色，默认都是黑色
 *  	backgroundColor：背景颜色，默认白色
 *  	borderColor：对于selectitem，hover的border颜色，默认灰色（#dddddd）
 *  	selectorWidth：selector的width
 *  	selectorHeight：auto|指定值，默认auto，高度自适应
 *  	selectitemHeight：selectitem的height
 *  	panelWidth：cascade-panel的width
 *  	panelHeight：cascade-panel的height
 *  	flagColor：flag的color
 *  	fontSize：selectitem选项字体的大小
 *  	facede：定义cascade-selector的panel外观，facefa=default|panel，默认为垂直列表list风格，panel配合内置模板函数使用
 *  	属性：
 *  	func：传递某个函数，当鼠标hover某个selectitem时调用的这个函数，用来渲染新的一级选择器
 *  	[对于封装的模板panel]
 *  	此功能基于一个CascadeSelector的静态方法：CascadeSelector.createTempPanel(conf, data)
 *  		- conf：参数，类似上面
 *  		- data：二维json数组
 *  	对于此方法的conf:
 *  		width和height：面板的宽高，大小受制于cascade-panel
 *  		title：文本，标题信息，每个selectitem的小标题
 *  		func：此参数为函数，用来响应每个小item的点击响应
 *  - 关于拓展函数func：
 *  	通过cascade-selector的func属性，绑定cascade-panel展开时调用的函数，例如：func="xxx_cascade_getready"
 *  	方法规范：xxxx(xx, xx)必须为两个参数，建议为function xxx_cascade_getready(panel, selectitem) {}
 *  	cascade-panel为展开面板容器，selectitem为被选择的选项
 *  	通过传递的参数，进行不同选项的不同数据展示，所有都cascade-panel内元素都是创建，删除式的
 *  - 类结构
 *  	私有属性：themeColor，fontColor，backgroundColor，borderColor，selectorWidth，
 *  	selectorHeight，selectitemHeight，panelWidth，panelHeight，flagColor，fontSize，
 *  	facede，func
 *  	公有属性：this.dom;//绑定的dom对象
 *  	构造方法：new CascadeSelector(conf, data, parent)
 *  	私有方法：creatSelector(list)，init(obj)
 *  	静态方法：createTempPanel(conf, data)
 *  
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *	- created by lr
 *  - 2019-01-25
 */

/*	参数全局配置
 * 	可以通过静态函数修改全局默认，这样可以定义自己喜欢的风格，而不用每个selector都去赋参
 * */
CascadeSelector.themeColor = "#01AAED";
CascadeSelector.fontColor = "black";
CascadeSelector.backgroundColor = "white";
CascadeSelector.borderColor = "#dddddd";
CascadeSelector.selectorWidth = "200px";
CascadeSelector.selectorHeight = "auto";
CascadeSelector.selectitemHeight = "35px";
CascadeSelector.panelWidth = "700px";
CascadeSelector.panelHeight = "default";
CascadeSelector.flagColor = "#a0a0a0";
CascadeSelector.fontSize = "15px";
CascadeSelector.facede = "default";
CascadeSelector.func = null;
/*
 * 修改全局配置函数：CascadeSelector.config(data)
 * 		-参数：json对象，键值对形式覆盖默认参数
 */
CascadeSelector.config = function(data) {
	//遍历所有参数
	for(var conf in data) {//conf为key-value中的key，类型为string
		eval("CascadeSelector."+conf+"=\""+data[conf]+"\"");//通过eval函数执行js，可实现通过string获得变量名
	}
}

/*	主类：CascadeSelector
	参数：
		- conf：为一个json对象，各种参数信息
		- data：json对象数组，一个json对象对应一个selectitem
		- parent：将创建的dom对象置于指定父容器，当data使用选择器指定元素时，此值无意义，可以为null
*/
function CascadeSelector(conf, data, parent) {
	//私有属性，读取参数配置，覆盖缺省值
	var themeColor = conf['themeColor'] || CascadeSelector.themeColor;
	var fontColor = conf['fontColor'] || CascadeSelector.fontColor;
	var backgroundColor = conf['backgroundColor'] || CascadeSelector.backgroundColor;
	var borderColor = conf['borderColor'] || CascadeSelector.borderColor;
	var selectorWidth = conf['selectorWidth'] || CascadeSelector.selectorWidth;
	var selectorHeight = conf['selectorHeight'] || CascadeSelector.selectorHeight;
	var selectitemHeight = conf['selectitemHeight'] || CascadeSelector.selectitemHeight;
	var panelWidth = conf['panelWidth'] || CascadeSelector.panelWidth;
	var panelHeight = conf['panelHeight'] || CascadeSelector.panelHeight;//默认表示跟随selector的高度，auto表示自动高度，auto|default
	var flagColor = conf['flagColor'] || CascadeSelector.flagColor;
	var fontSize = conf['fontSize'] || CascadeSelector.fontSize;
	var facede = conf['facede'] || CascadeSelector.facede;
	var func = conf['func'] || CascadeSelector.func;//这个参数必须指定，否则应该把isTail设为true
	
	//公有属性
	this.dom;//绑定的dom对象
	
	//私有方法
	/*	创建dom元素，根据json对象数组
	 * 	参数：- list为json对象数组
	 */
	var creatSelector = function(list) {
		//创建div
		var selector = document.createElement('div');
		var new_panel = document.createElement('div');
		//设置class
		$(selector).addClass("cascade-selector");
		$(new_panel).addClass("cascade-panel");
		//将new_panel加入selector
		$(selector).append(new_panel);
		//遍历list数组
		for(var i = 0; i < list.length; i++) {
			var item = list[i];
			//创建div
			var selectitem = document.createElement('div');
			var text = document.createElement('div');
			var flag = document.createElement('div');
			//设置css和属性
			$(selectitem).addClass("cascade-selectitem");
			$(selectitem).attr("id", item['id']);
			$(text).addClass("selectitem-text");
			$(flag).addClass("selectitem-flag icon flag-icon");
			$(text).text(item['text']);
			//设置父子关系
			$(selectitem).append(text);
			$(selectitem).append(flag);
			$(selector).append(selectitem);
		}
		return selector;//返回selector
	};
	
	//初始化方法
	var init = function(obj) {
		//组件变量设置
		var selector = obj;
		var selectitems = $(selector).children('.cascade-selectitem');
		var texts = $(selectitems).children('.selectitem-text');
		var flags = $(selectitems).children('.selectitem-flag');
		var panel = $(selector).children('.cascade-panel');
		
		//字符串转数字，计算，再转换为字符串
		var selectorHgt = (parseInt(selectorHeight.substr(0, selectorHeight.length-2))-16)+"px";//由于padding上下各8px，要减去16px
		panelWidth = (parseInt(panelWidth.substr(0, panelWidth.length-2))-2+1)+"px";
		panelHeight = (panelHeight == "default") ? selectorHeight: "auto";
		var panelLeft = (parseInt(selectorWidth.substr(0, selectorWidth.length-2))-1)+"px";
		
		//css样式设置
		$(selector).css({"background": backgroundColor, "width": selectorWidth, "height": selectorHgt});
		$(selectitems).css({"height": selectitemHeight, "line-height": selectitemHeight});
		$(texts).css({"font-size": fontSize, "color": fontColor});
		$(flags).css("color", flagColor);
		$(panel).css({"background": backgroundColor, "width": selectorWidth, "height": panelHeight, "border-left": "1px solid "+borderColor, "left": panelLeft});
		if(facede == "panel") {//如果panel样式为panel，则改变宽高等
			$(panel).css({"background": backgroundColor, "width": panelWidth, "height": selectorHeight, "border": "none", "border": "1px solid "+borderColor});
		}
		
		//事件相关参数
		var isLeaveSelector = true;
		var isLeavePanel = true;
		var lastSelector = null;//最后一个被选种的selector
		var isInstance = true;//是否为新实例，为true则调用拓展函数cascade_getready(panel)，注意，此为模拟的，并不是真的创建实例
		$(selectitems).hover(function() {//鼠标移进元素的方法
			//清除上次的selector的hover效果
			if(lastSelector != null && lastSelector != this) {//不为空并且不为自己，所有要清除上次的hover效果
				$(lastSelector).children('.selectitem-flag').show();
				$(lastSelector).css({"border": "none", "color": fontColor});
				isInstance = true;//这里说明有选项更换的情况，必然引起新实例
				$(panel).empty();//新实例为true，应删除panel所有子元素
			}
			isLeaveSelector = false;//标志进入selector
			lastSelector = this;//更新最后被选中的selector
			//selector变化
			$(this).children('.selectitem-flag').hide();
			$(this).css({"border-top": "1px solid "+borderColor, "border-bottom": "1px solid "+borderColor, "color": themeColor});
			$(panel).show();//展开二级选项
			//二级选项的拓展操作，二级选项展开时处理函数
			if(isInstance) {
				if(func != null) {//拓展方法不为空
					func(panel, this);//调用参数设定方法
				}
				isInstance = false;
			}
		}, function() {//鼠标移出元素的方法
			isLeaveSelector = true;//标志离开selector
			var This = this;
			setTimeout(function() {
				if(isLeaveSelector && isLeavePanel) {//鼠标是否离开了selector和panel
					//selector变化
					$(This).children('.selectitem-flag').show();
					$(This).css({"border": "none", "color": fontColor});
					//隐藏二级选项
					$(This).parent().children('.cascade-panel').hide();
					isInstance = true;//鼠标已移动至无关区域，标志下次为新实例
					$(panel).empty();//新实例为true，应删除panel所有子元素
				}
			}, 100);//延迟100ms再执行方法体，由于先触发离开的时间再触发进入的时间，如果立即执行
					//则此时鼠标一定没有进入panel，isLeavePanel还是=true 或者
					//从panel到selector时的跳转，鼠标一进入selector的时间也没触发
		});
		
		$(panel).hover(function() {
			isLeaveSelector = false;//标志进入panel
		}, function() {
			isLeaveSelector = true;//标志离开panel
			setTimeout(function () {
				if(isLeaveSelector && isLeavePanel) {
					//selector变化
					$(lastSelector).children('.selectitem-flag').show();
					$(lastSelector).css({"border": "none", "color": fontColor});
					//隐藏二级选项
					$(lastSelector).parent().children('.cascade-panel').hide();
					isInstance = true;//鼠标已移动至无关区域，标志下次为新实例
					$(panel).empty();//新实例为true，应删除panel所有子元素
				}
			}, 100);//延迟100ms再执行方法体
		});
	};//组件初始化
	
	//公有方法
	
	//根据data创建组件
	var type = typeof(data);
	if(type == "string") {//指定id方式创建，要确保唯一性
		//jq选择器选择结果可能不唯一，选第一个
		var target = $(data+":first");
		this.dom = target;
		init(this.dom);
		return this;
	} if(type == "object") {//给一个json对象方式创建
		//创建对象
		this.dom = creatSelector(data);
		$(parent).append(this.dom);
		//初始化调用
		init(this.dom);
		return this;
	} else {
		console.log("data参数错误，对象创建实例化失败！:"+type);
		return null;
	}
}

/*	静态方法
 * 	提供一个静态方法创建模板panel(通常为selector末尾panel)。在用户指定的func中调用此函数，方便生成模板panel
 * 	参数：
 * 		- conf：json对象，传入参数
 * 			- title：panel的标题
 * 			- func：外置函数，a标签被点击时调用
 * 		- data：json对象，通过传入json对象，解析为各层子元素，为二维数组json对象
 * 	返回：返回实例元素，为inner元素
 * */
CascadeSelector.createTempPanel = function(conf, data) {
	//读取各种参数
	var title_name = conf['title'];//标题文本
	var func = conf['func'];//超链接按钮响应函数
	var width = conf['width'] || "700px";
	var height = conf['width'] || "400px";
	width = (parseInt(width.substr(0, width.length-2))-1-40)+"px";
	height = (parseInt(height.substr(0, height.length-2))-2-20)+"px";
	
	//创建元素
	var inner = document.createElement('div');
	var title = document.createElement('div');
	var hr = document.createElement('hr');
	//设置css,class等属性
	$(inner).addClass("inner");
	$(title).addClass("title");
	$(title).text(title_name);
	$(inner).css({"width": width, "height": height});
	
	//设置父子关系
	$(inner).append(title);
	$(inner).append(hr);
	//解析二维数组json对象
	for(var i = 0; i < data.length; i++) {
		var itemBlk = data[i];
		//创建元素
		var blk = document.createElement('div');
		var hr = (i < data.length-1) ? document.createElement('hr'): null;
		//设置css,class等属性
		$(blk).addClass("item-block");
		//添加item
		for(var j = 0; j < itemBlk.length; j++) {
			var item = itemBlk[j];
			//创建元素
			var itm = document.createElement('a');
			var a = document.createElement('a');
			//设置css,class等属性
			$(itm).addClass("item");
			$(itm).attr("id", item['id']);
			$(a).addClass("a-item");
			$(a).text(item['text']);
			//设置父子关系
			$(itm).append(a);
			$(blk).append(itm);
			//添加事件
			(func && $(a).click(function(){func(a);}));
		}
		//设置父子关系
		$(inner).append(blk);
		if(i < data.length-1) {
			$(inner).append(hr);
		}
	}	
	return inner;
};
