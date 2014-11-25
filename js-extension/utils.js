/**
 * This is a utils set.
 * Created by Terry on 14-2-24.
 */
//web墨卡托投影
//以弧度为单位
function webMercatorTrans(lon,lat,radius){
    var x=radius*lon;
    var y=radius*Math.log(Math.tan(Math.PI/4+lat/2))/Math.log(Math.E);
    return {"x":x,"y":y};
}
//反web墨卡托投影
//以弧度为单位
function IwebMercatorTrans(x,y,radius){
    var lon,lat;
    lon=x/radius;
    lat=2*Math.atan(Math.exp(y/radius))-Math.PI/2;
    return {"lon":lon,"lat":lat};
}
//度转弧度
function degreeToRad(degree){
    return degree*Math.PI/180;
}
//弧度转度数
function radToDegree(rad){
    return rad*180/Math.PI;
}
//
function pixelToIDxy(px,py,z,halfCircumference){
    var tileSize=halfCircumference*2/Math.pow(2.0,z);
    var idx=Math.floor(px/tileSize);
    var idy=Math.floor(py/tileSize);
    return {"idx":idx,"idy":idy};
}