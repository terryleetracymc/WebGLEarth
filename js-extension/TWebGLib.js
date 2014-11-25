/**
 * This js-Lib is based on three.s(version 63) on github.
 * Thanks to mrdoob,Larry Battle，bhouston
 * @author Terry Lee
 * Created by Terry on 14-2-19.
 */
var TMee={version:"0.5"};
var projector=new THREE.Projector();
//设置默认值
function setDefault(para,dvalue){
    var p=(typeof(para)==="undefined")?dvalue:para;
    return p;
}
//物体拾取检测
function pickingObjects(vec,camera,objRoot){
    var raycaster=projector.pickingRay(vec.clone(),camera);
    var intersects=raycaster.intersectObjects(objRoot.children);
    return intersects;
}
function pickingObject(vec,camera,obj){
    var raycaster=projector.pickingRay(vec.clone(),camera);
    var intersect=raycaster.intersectObject(obj);
    return intersect;
}
//构造函数
TMee.GLInstance=function(container,renderPara){
    //container必须
    this.container=container;
    var width=this.container.clientWidth;
    var height=this.container.clientHeight;
    this.width=width;
    this.height=height;
    //设置默认值
    var para=setDefault(renderPara,{antialias:true,preserveDrawingBuffer:true});
    var renderer=new THREE.WebGLRenderer(para);
    renderer.setSize(width,height);
    this.renderer=renderer;
    container.appendChild(renderer.domElement);
    //初始化鼠标函数
    var dom=this.renderer.domElement;
    var that=this;
    dom.onmousedown=function(event){
        event.preventDefault();
        that.handleMouseDown(event);
    };
    dom.onmousemove=function(event){
        event.preventDefault();
        that.handleMouseMove(event);
    };
    dom.onmouseup=function(event){
        event.preventDefault();
        that.handleMouseUp(event);
    };
    dom.onmouseout=function(event){
        event.preventDefault();
        that.handleMouseOut(event);
    };
    dom.onmouseover=function(event){
        event.preventDefault();
        that.handleMouseOver(event);
    };
    //暂时只支持chrome浏览器
    if($.browser.webkit){
        dom.onmousewheel=function(event){
            that.handleMouseWheel(event);
        }
    }
};
TMee.GLInstance.prototype={
    constructor:TMee.GLInstance,
    width:0,
    height:0,
    container:undefined,
    renderer:undefined,
    scene:[],
    camera:[],
    cid:undefined,
    sid:undefined,
    //添加，删除相机
    addCamera:function(hashId,camera){
        //如果存在对象，先删除对象
        if(this.camera[hashId]){
            var obj=this.camera[hashId];
            obj=null;
        }
        this.camera[hashId]=camera;
        this.cid=hashId;
    },
    removeCamera:function(hashId){
        this.camera[hashId]=null;
        this.cid=undefined;
    },
    getCamera:function(hashId){
        return this.camera[hashId];
    },
    //添加场景,删除场景
    addScene:function(hashId,scene){
        if(this.scene[hashId]){
            var obj=this.scene[hashId];
            obj=null;
        }
        this.scene[hashId]=scene;
        this.sid=hashId;
    },
    removeScene:function(hashId){
        this.scene[hashId]=null;
        this.sid=undefined;
    },
    getScene:function(hashId){
        return this.scene[hashId];
    },
    //动画渲染
    animate:function(){
        this.update();
        if(this.scene[this.sid]!=undefined && this.camera[this.cid]!=undefined){
            this.renderer.render(this.scene[this.sid],this.camera[this.cid]);
        }
        var that=this;
        requestAnimationFrame(function(sceneId,cameraId){
            that.animate(that.scene[that.sid],that.camera[that.cid]);
        });
    },
    //设置当前渲染的场景
    setSid:function(hashId){
        this.sid=hashId;
    },
    setCid:function(hashId){
        this.cid=hashId;
    },
    //每一帧动画更新参数的函数
    update:function(){},
    //鼠标动作函数
    handleMouseUp:function(event){},
    handleMouseDown:function(event){},
    handleMouseMove:function(event){},
    handleMouseOut:function(event){},
    handleMouseOver:function(event){},
    handleMouseWheel:function(event){}
}
