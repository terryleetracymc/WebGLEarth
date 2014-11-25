/**
 * This js-Lib is based on three.s(version 63) on github.
 * This is a set of object which can be used in earthSystem
 * @author Terry Lee
 * Created by Terry on 14-2-24.
 */
var TOee={version:"0.5"};
//TObject基类，是所有物体对象的基类
TOee.TObject=function(){
    this.root=new THREE.Object3D();
};
TOee.TObject.prototype.init=function(){
};
//内存释放
TOee.TObject.prototype.objectDispose=function(obj){
    if(obj.geometry)
    {
        obj.geometry.dispose();
    }
    if(obj.material){
        if(obj.material.map){
            obj.material.map.dispose();
        }
        obj.material.dispose();
    }
    obj.dispatchEvent({type:"dispose"});
//    obj=null;
};
//TPlanet类，实现一个星球的定义
//如果没有修改参数，该球体默认为地球
TOee.TPlanet=function(){
    TOee.TObject.call(this);
    //球体的半周长
    this.halfCircumference=20037.5083427892;
    //球体半径
    this.radius=6378.1370;
    //纬度方向的绘制精致度，越高效果越好速度越慢
    this.hSegments=10;
    //经度方向的绘制精致度，同上
    this.wSegments=10;
    //地图切片容器
    this.tileMaps=new THREE.Object3D();
    //哈希对应image类
    this.hImg=[];
    //哈希地图对应关系数组
    this.hMap=[];
    //url集合
    this.tileUrls=[];
    //球框模型
    this.planetFrame=null;
    //将地图切片集合加入root容器中
    this.root.add(this.tileMaps);
    //图像错误时返回的图像
    this.errorTile="images/error.jpg";
    //任务列表
    this.taskList=[];
};
TOee.TPlanet.prototype=new TOee.TObject();
//计算瓦片的经纬度范围
TOee.TPlanet.prototype.getTileRange=function(idxX,idxY,idxZ){
    var size=2*this.halfCircumference/(Math.pow(2,idxZ));
    var x1,x2,y1,y2;
    x1=-this.halfCircumference+size*idxX;
    x2=x1+size;
    y2=this.halfCircumference-size*idxY;
    y1=y2-size;
    return {"x1":x1,"x2":x2,"y1":y1,"y2":y2};
};
//使用CORS添加一个墨卡托投影的地图瓦片
//url为地图所对应的url,x,y,z为地图的索引号
TOee.TPlanet.prototype.addMercatorTileByCORS=function(url,x,y,z){
    //判断是否合法
    var maxidx=Math.pow(2.0,z);
    if(x>=maxidx || x<0 || y<0 || y>=maxidx){
//        console.log("非法瓦片数据...");
        return;
    }
    //若瓦片已经存在，返回
    if(this.taskList[url]!=undefined){
//        console.log("重复添加瓦片"+url);
        return;
    }
    //从未添加该瓦片，则添加
    //添加瓦片
    //设置状态为start
    this.taskList[url]="start";
    //计算该瓦片的起始、终止经纬度
    var sLon,eLon,sLat,eLat;
    var imgRange=this.getTileRange(x,y,z);
    var start=IwebMercatorTrans(imgRange.x1,imgRange.y1,this.radius);
    var end=IwebMercatorTrans(imgRange.x2,imgRange.y2,this.radius);
    //计算在Three.js球体上的位置
    sLon=start.lon+Math.PI;
    sLat=Math.PI/2-start.lat;
    eLon=end.lon+Math.PI;
    eLat=Math.PI/2-end.lat;
    //定义载入的图像
    var image=new Image();
    var that=this;
    //设置异域访问控制
    image.crossOrigin="anonymous";
    this.hImg[url]=image;
    var geometry,texture,material,mesh;
    image.onload=function(){
        if(that.hImg[url].src==""){
            //如果要删除了就不进行
            delete this.hImg[url];
            this.hImg[url]=null;
            return;
        }
        geometry=new THREE.SphereGeometry(that.radius+(z+1)*3,that.wSegments,that.hSegments,sLon,
            (eLon-sLon),eLat,sLat-eLat);
        texture=new THREE.Texture(image);
        texture.needsUpdate=true;
        material=new THREE.MeshBasicMaterial({map:texture});
        mesh=new THREE.Mesh(geometry,material);
        that.hMap[url]=mesh;
        that.tileMaps.add(mesh);
        that.tileUrls.push(url);
        material.dispose();
        texture.dispose();
        geometry.dispose();
        //完成标记
        mesh.isLoad=true;
        that.onloadImgSuccess(url,x,y,z);
        that.taskList[url]="end";
        delete that.hImg[url];
        that.hImg[url]=null;
    };
    //请求失败时,或者被src被置为""
    image.onerror=function(){
    };
    image.src=url;
};
//用户自定义载入地图后的动作
TOee.TPlanet.prototype.onloadImgSuccess=function(url,x,y,z){};
TOee.TPlanet.prototype.onloadImgError=function(url,x,y,z){};
TOee.TPlanet.prototype.onloadImgRemove=function(url,x,y,z){};
TOee.TPlanet.prototype.removeMercatorTile=function(url,x,y,z){
    //不存在瓦片任务，立即返回
    if(this.taskList[url]==undefined){
        return;
    }
    //如果瓦片已经加载到球体上
    if(this.taskList[url]=="end"){
        var obj=this.hMap[url];
        this.tileMaps.remove(obj);
        this.objectDispose(obj);
        var idx=this.tileUrls.indexOf(url);
        this.tileUrls.splice(idx,1);
//        console.log("已经加载的地图瓦片删除...");
    }
    //已经开始传输
    else if(this.taskList[url]=="start"){
        //设置删除标记位
        this.hImg[url].src="";
//        console.log("未加载的地图瓦片删除...");
    }
    this.taskList[url]=undefined;
    this.hMap[url]=undefined;
    this.onloadImgRemove(url,x,y,z);
};
//添加Google地图瓦片
TOee.TPlanet.prototype.addGoogleTile=function(x,y,z){
    //判断是否合法
    var url="http://mt2.google.cn/vt/lyrs=m@167000000&hl=zh-CN&gl=cn&x="+x+"&y="+y+"&z="+z;
    this.addMercatorTileByCORS(url,x,y,z);
};
//移除Google地图瓦片
TOee.TPlanet.prototype.removeGoogleTile=function(x,y,z){
    var url="http://mt2.google.cn/vt/lyrs=m@167000000&hl=zh-CN&gl=cn&x="+x+"&y="+y+"&z="+z;
    this.removeMercatorTile(url,x,y,z);
};
//初始化球体的一些对象
TOee.TPlanet.prototype.init=function(){
    //球框模型
    var geometry=new THREE.SphereGeometry(this.radius,this.wSegments,this.hSegments);
    var material=new THREE.MeshBasicMaterial({wireframe:true,color:0xffffff,transparent:true});
    var mesh=new THREE.Mesh(geometry,material);
    this.planetFrame=mesh;
    this.root.add(this.planetFrame);
    geometry.dispose();
    material.dispose();
    var level=2;
    var num=Math.pow(2,level);

//    for(var i=0;i<num;i++){
//        for(var j=0;j<num;j++){
//            this.addGoogleTile(i,j,level);
//        }
//    }
};