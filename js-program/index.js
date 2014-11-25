/**
 * Created by Terry on 14-2-19.
 */
//最大纬度
var MAXLAT=1.4844222297453322;
//webMercator半周长
var halfCircumference=20037.5083427892;
//球体半径
var radius=6378.1370;
//拖拽平面
var dragPlane;
//拖拽开始点，终止点，位移
var dragStartPoint=new THREE.Vector3(),
    dragEndPoint=new THREE.Vector3(),
    dragOffset=new THREE.Vector3();
//相机、场景、光线、地球以及app对象
var camera;
var scene;
var light;
var earth;
var app;
//检测鼠标是否按下
var isPress;
//正对经纬度
var pointLon,pointLat;
//相机高度
var cameraHeight;
var currentLevel;
//当前地图的经纬度范围
var loRange,laRange;
//最近最少使用算法容器
var LRUMapContainer=[];
//统计最近十次命中率的数据
var staticTime,hitTime,missTime;
//容器大小
var LRULength=50;
//添加地图到LRU容器中
function addTileToLRU(x,y,z){
    var hit=false;
    staticTime++;
//    console.log(LRUMapContainer.length);
    for(var i=0;i<LRUMapContainer.length;i++){
        if(LRUMapContainer[i].x==x &&
           LRUMapContainer[i].y==y &&
           LRUMapContainer[i].z==z){
            //命中，退出循环
            hit=true;
            //命中,将项目调至第一位,与第一位置换位置
            var tmp=LRUMapContainer[0];
            LRUMapContainer[0]=LRUMapContainer[i];
            LRUMapContainer[i]=tmp;
            break;
        }
    }
    if(hit)
        return;
    //如果未命中且容器未满，直接填入
    if(LRUMapContainer.length<LRULength){
        //将地图存入LRU容器中，前插
        LRUMapContainer.unshift({"x":x,"y":y,"z":z,"id":x+"_"+y+"_"+z});
        earth.addGoogleTile(x,y,z);
        return;
    }
    //如果未命中，容器已经满了，采用置换最近最少使用的地图并重新加入新的地图
    else{
        //移除最后几个地图数据
        var obj;
        for(var i=0;i<10;i++){
            obj=LRUMapContainer.pop();
            earth.removeGoogleTile(obj.x,obj.y,obj.z);
//            console.log("删除数据"+i);
        }
        //加入新数据
        LRUMapContainer.unshift({"x":x,"y":y,"z":z});
        earth.addGoogleTile(x,y,z);
        return;
    }
}
//主程序入口
function webGLStart(){
    var gl=$("#glContainer")[0];
    app=new TMee.GLInstance(gl);
    initVariables();
    initCamera();
    initLight();
    initScene();
    initEarth();
    initDragger();
    app.update=function(){
        TWEEN.update();
    };
    app.addScene("1",scene);
    app.addCamera("1",camera);
    app.animate();
}
//初始化一些变量
function initVariables(){
    staticTime=0;
    missTime=0;
    hitTime=0;
    currentLevel=4;
    cameraHeight=25000;
    pointLon=0;
    pointLat=0;
    //设置当前的经纬度范围
    loRange=Math.PI;
    //85.05112877980659*Math.PI/180 web墨卡托投影的最大纬度范围
    laRange=MAXLAT;
}
//初始化拖拽
function initDragger(){
    var geometry=new THREE.PlaneGeometry(50000,50000);
    var material=new THREE.MeshBasicMaterial();
    dragPlane=new THREE.Mesh(geometry,material);
    //处理鼠标按下事件
    app.handleMouseDown=function(event){
        var mv=new THREE.Vector3();
        mv.x=2*(event.clientX/app.width)-1;
        mv.y=1-2*(event.clientY/app.height);
        var intersect=pickingObject(mv.clone(),camera,dragPlane);
        if(intersect.length!=0){
            dragStartPoint=intersect[0].point;
        }
        else{
            dragStartPoint.set(0,0,0);
        }
        isPress=true;
    };
    //处理鼠标移动事件
    app.handleMouseMove=function(event){
        if(isPress){
            var mv=new THREE.Vector3();
            mv.x=2*(event.clientX/app.width)-1;
            mv.y=1-2*(event.clientY/app.height);
            var intersect=pickingObject(mv.clone(),camera,dragPlane);
            if(intersect.length!=0){
                dragEndPoint=intersect[0].point;
            }
            else{
                dragEndPoint.set(0,0,0);
            }
        }
    };
    //处理鼠标按键抬起事件
    app.handleMouseUp=function(event){
        dragOffset.subVectors(dragStartPoint,dragEndPoint);
        isPress=false;
        //调用拖拽事件函数
        onDrag();
    };
    //处理鼠标滚动事件
    app.handleMouseWheel=function(event){
        var delta=0;
        if(event.wheelDelta){
            delta=event.wheelDelta;
        }
        cameraHeight=camera.position.z-getWheelOffset(delta);
        if(cameraHeight>33000){
            cameraHeight=33000;
        }
        if(cameraHeight<6500){
            cameraHeight=6500;
        }
        camera.position.z=cameraHeight;
        getLolaRange();
        setMapLevel();
        updateMap();
    };
    geometry.dispose();
    material.dispose();
}
//滚动位移设定
function getWheelOffset(delta){
    //按等级滚动
//    var offset;
//    if(currentLevel>=0 && currentLevel<=6){
//        offset=100;
//    }
//    else if(currentLevel>=7 && currentLevel<=10){
//        offset=50;
//    }
//    else if(currentLevel>=8 && currentLevel<=15){
//        offset=25;
//    }
//    else if(currentLevel>=16 && currentLevel<=22){
//        offset=10;
//    }
//    if(delta<0){
//        offset=-offset;
//    }
//    console.log(offset+" "+currentLevel);
//    return offset;
    return delta/120*100;
}
//位移设定
function getDragOffset(offset){
    return offset/15000/(currentLevel+1);
}
//拖拽事件设定函数
function onDrag(){
    var dx,dy;
    dx=getDragOffset(dragOffset.x);
    dy=getDragOffset(dragOffset.y);
    dx=dx*Math.PI;
    dy=dy*Math.PI;
    var oriX=earth.root.rotation.x;
    var oriY=earth.root.rotation.y;
    var tarX=oriX+dy;
    var tarY=oriY-dx;
    //简单粗暴无动画变化
//    earth.root.rotation.x=tarX;
//    earth.root.rotation.y=tarY;
    dragAnimate(oriX,oriY,tarX,tarY,3000);
}
//初始化相机
function initCamera(){
    //相机参数设置
    camera=new THREE.PerspectiveCamera(45,app.width/app.height,50,35000);
    camera.position.set(0,0,25000);
    camera.up.set(0,1,0);
    camera.lookAt({x:0,y:0,z:0});
}
//初始化光线
function initLight(){
    //光线设置
    light=new THREE.DirectionalLight(0xffffff,0.5);
    light.position.set(0,0,1000);
}
//初始化场景
function initScene(){
    //场景设置
    scene=new THREE.Scene();
}
//初始化地球
function initEarth(){
    //地球设置
    earth=new TOee.TPlanet();
    earth.init();
    //让地球初始的经度为0
    earth.root.rotation.y+=Math.PI/2;
    radius=earth.radius;
    halfCircumference=earth.halfCircumference;
    //将初始化的地球加入到场景中
    scene.add(earth.root);
}
//保持球体的位置
//即让地球不倒置
//输入为球体的旋转角度
function fixSphere(x,y){
    if(x>Math.PI/2){
        x=Math.PI-x;
    }
    else if(x<-Math.PI/2){
        x=-Math.PI-x;
    }
    if(y>Math.PI*2){
        y-=Math.PI*2;
    }
    else if(y<0){
        y+=Math.PI*2;
    }
    return {x:x,y:y};
}
//球体上的位置转到实际经纬度的函数
function sphereToLola(x,y){
    //x对应纬度，y对应经度
    y=Math.PI*5/2-y;
    if(y>Math.PI*2){
        y-=Math.PI*2;
    }
    return {lon:y,lat:x};
};
//拖拽动画
function dragAnimate(ox,oy,tx,ty,times){
    var position={x:ox,y:oy};
    var target={x:tx,y:ty};
    var tmp;
    var offX=target.x;
    var offY=target.y;
    tmp=fixSphere(offX,offY);
    offX=tmp.x;
    offY=tmp.y;
    var tarLola=sphereToLola(offX,offY);
    pointLon=tarLola.lon;
    pointLat=tarLola.lat;
    getLolaRange();
    updateMap();
    //设置动画
    var tween=new TWEEN.Tween(position).to(target,times);
    //设置动画样式
    tween.easing(TWEEN.Easing.Circular.Out);
    //定义动画每一帧的更新
    tween.onUpdate(function(){
        var offX=position.x;
        var offY=position.y;
        var tmp=fixSphere(offX,offY);
        offX=tmp.x;
        offY=tmp.y;
        //当前相对X轴和Y轴的角度
        earth.root.rotation.x=offX;
        earth.root.rotation.y=offY;
    });
    tween.onComplete(function(){});
    tween.start();
}
//更新地图(根据当前位置和地图等级)
function updateMap(){
    getMapTileList();
//    for(var i=0;i<maplist.length;i++){
//        addTileToLRU(maplist[i].x,maplist[i].y,maplist[i].z);
//    }
}
//得到欲载入的地图瓦片清单
function getMapTileList(){
    var plon=pointLon,plat=pointLat;
    //检测纬度是否超过最大纬度
    if(plat>MAXLAT){
        plat=MAXLAT;
    }
    else if(plat<-MAXLAT){
        plat=-MAXLAT;
    }
    var obj=webMercatorTrans(plon,plat,radius);
    var idx=obj.x,idy=halfCircumference-obj.y;
    obj=pixelToIDxy(idx,idy,currentLevel,halfCircumference);
    var tileNum=Math.pow(2.0,currentLevel);
    idx=obj.idx;
    idy=obj.idy;
    var offx=1,offY=1;halfCircumference
//    var mapList=[];
    for(var i=idx-offx;i<=idx+offx;i++){
        for(var j=idy-offY;j<=idy+offY;j++){
            var pi=i;
            var pj=j;
            if(pi<0){
                pi=pi+tileNum;
            }
            else if(pi>tileNum){
                pi=pi%tileNum;
            }
            if(pj<0){
                pj=pj+tileNum;
            }
            else if(pj>tileNum){
                pj=pj%tileNum;
            }
            addTileToLRU(i,j,currentLevel);
        }
    }
//    addTileToLRU(Math.floor(idx/2),Math.floor(idy/2),currentLevel-1);
    //加入上一层瓦片
//    mapList.push({"x":Math.floor(idx/2),"y":Math.floor(idy/2),"z":currentLevel-1});
//    return mapList;
}
//得到当前视角的经纬度范围
function getLolaRange(){
    //设置picking检测的视口点
    var mv=new THREE.Vector3();
    var intersect;
    var delta;
    var point;
    //通过检测上方点来确定纬度方向的范围
    mv.x=0;
    mv.y=1;
    intersect=pickingObject(mv.clone(),camera,earth.planetFrame);
    if(intersect.length==0){
        //没有检测到picking
        laRange=MAXLAT;
    }
    else{
        //检测到picking
        point=intersect[0].point;
        //delta是正对经纬度点到最大经纬度点的纬度差
        laRange=Math.asin(point.y/radius);
    }
    //通过检测右侧点来确定经度方向的范围
    mv.x=1;
    mv.y=0;
    intersect=pickingObject(mv.clone(),camera,earth.planetFrame);
    if(intersect.length==0){
        //没有检测到picking
        loRange=Math.PI/4;
    }
    else{
        point=intersect[0].point;
        loRange=Math.asin((point.x/radius));
    }
    //调试输出经纬度范围
//    console.log((pointLon-loRange)+" ~ "+
//                 (pointLon+loRange)+"\n"+
//                 (pointLat-laRange)+" ~ "+
//                 (pointLat+laRange)+"\n");
//    console.log(loRange+" "+laRange);
}
//设置使用的地图等级
//确定地图的策略可以再议
function setMapLevel(){
    //没有hit的时候靠相机高度判断地图等级
//    console.log(cameraHeight);
    var tune=1;
    if(loRange==Math.PI/4 || laRange==MAXLAT){
        if(cameraHeight<=33000 && cameraHeight>=16500){
            currentLevel=0+tune;
//            console.log(cameraHeight+" "+currentLevel);
            return;
        }
    }
    //根据经纬度范围确定地图等级
    //1/4范围的可见部分需要使用4张地图瓦片
    //每张瓦片的范围
    var tileRange=((loRange>laRange)?loRange:laRange);
    currentLevel=Math.floor(Math.log(2*Math.PI/tileRange)/Math.LN2)+tune;
//    console.log(cameraHeight+" "+currentLevel);
//    if(cameraHeight<=33000 && cameraHeight>31000){
//        currentLevel=0;
//    }
//    else if(cameraHeight<=31000 && cameraHeight>29000){
//        currentLevel=1;
//    }
//    else if(cameraHeight<=29000 && cameraHeight>27000){
//        currentLevel=2;
//    }
//    else if(cameraHeight<=27000 && cameraHeight>25000){
//        currentLevel=3;
//    }
//    else if(cameraHeight<=25000 && cameraHeight>23000){
//        currentLevel=4;
//    }
//    else if(cameraHeight<=23000 && cameraHeight>21000){
//        currentLevel=5;
//    }
//    console.log(cameraHeight+":"+currentLevel);
}