"use strict";

var canvas;
var gl;

var numTimesToSubdivide = 6;

var index = 0;

var pointsArray = [];
var normalsArray = [];


var near = -10;
var far = 10;
var radius = 1.5;
var theta  = 0.0;
var phi    = 0.0;
var dr = 5.0 * Math.PI/180.0;

var left = -3.0;
var right = 3.0;
var ytop =3.0;
var bottom = -3.0;

var va = vec4(0.0, 0.0, -1.0,1);
var vb = vec4(0.0, 0.942809, 0.333333, 1);
var vc = vec4(-0.816497, -0.471405, 0.333333, 1);
var vd = vec4(0.816497, -0.471405, 0.333333,1);

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4( 0.5, 0.5, 0.5, 1.0 );
var lightDiffuse = vec4( 0.5, 0.5, 0.5, 1.0 );
var lightSpecular = vec4( 0.5, 0.5, 0.5, 1.0 );

var materialAmbient = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialDiffuse = vec4( 0.8, 0.8, 0.8, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 20.0;

var ctm;
var ambientColor, diffuseColor, specularColor;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var ambientProductLoc, diffuseProductLoc, specularProductLoc;
var lightPositionLoc;
var materialShininessLoc;

var ambientProduct, specularProduct, diffuseProduct;

var normalMatrix, normalMatrixLoc;


var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var use_flat = true;

function updateMaterialAmbient(jscolor) {
    materialAmbient = hex2vec4(jscolor);
}

function updateLightAmbient(jscolor) {
    lightAmbient = hex2vec4(jscolor);
}

function updateMaterialDiffuse(jscolor) {
    materialDiffuse = hex2vec4(jscolor);
}

function updateLightDiffuse(jscolor) {
    lightDiffuse = hex2vec4(jscolor);
}

function updateMaterialSpecular(jscolor) {
    materialSpecular = hex2vec4(jscolor);
}

function updateLightSpecular(jscolor) {
    lightSpecular = hex2vec4(jscolor);
}

function hex2vec4(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? vec4(parseInt(result[1], 16)/255,
       parseInt(result[2], 16)/255,
       parseInt(result[3], 16)/255)
     : null;
}

function triangle(a, b, c) {

     // Since the circle is centered at (roughly) 0, 0, 0, the 
     // true normal vector is simply the same as the point - but with 0
     // as it's fourth component rather than 1.
     normalsArray.push(a[0],a[1], a[2], 0.0);
     normalsArray.push(b[0],b[1], b[2], 0.0);
     normalsArray.push(c[0],c[1], c[2], 0.0);

     pointsArray.push(a);
     pointsArray.push(b);
     pointsArray.push(c);

     index += 3;
}


function divideTriangle(a, b, c, count) {
    if ( count > 0 ) {

        var ab = mix( a, b, 0.5);
        var ac = mix( a, c, 0.5);
        var bc = mix( b, c, 0.5);

        ab = normalize(ab, true);
        ac = normalize(ac, true);
        bc = normalize(bc, true);

        divideTriangle( a, ab, ac, count - 1 );
        divideTriangle( ab, b, bc, count - 1 );
        divideTriangle( bc, c, ac, count - 1 );
        divideTriangle( ab, bc, ac, count - 1 );
    }
    else {
        triangle( a, b, c );
    }
}


function tetrahedron(a, b, c, d, n) {
    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    tetrahedron(va, vb, vc, vd, numTimesToSubdivide);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);


    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );

    ambientProductLoc = gl.getUniformLocation( program, "ambientProduct" );
    diffuseProductLoc = gl.getUniformLocation( program, "diffuseProduct" );
    specularProductLoc = gl.getUniformLocation( program, "specularProduct" );

    lightPositionLoc = gl.getUniformLocation( program, "lightPosition" );
    materialShininessLoc = gl.getUniformLocation( program, "materialShininess");

    

    window.onkeydown = function(event) {

        var key = String.fromCharCode(event.keyCode);
        var isShift = event.shiftKey;

        switch(key) {

            case 'X':
            if (isShift) lightPosition[0]+=0.1;
            else lightPosition[0]-=0.1;
            break;

            case 'Y':
            if (isShift) lightPosition[1]+=0.1;
            else lightPosition[1]-=0.1;
            break;

            case 'Z':
            if (isShift) lightPosition[2]+=0.1;
            else lightPosition[2]-=0.1;
            break;

            case 'S':
            if (isShift) {
                if (materialShininess < 30) {
                     materialShininess += 1;
                }
            }
            else {
                if (materialShininess > 0) {
                    materialShininess -= 1;
                }
            }
        }

    }
    

    render();
}


function render() {

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    eye = vec3(radius*Math.sin(theta)*Math.cos(phi),
        radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));

    modelViewMatrix = lookAt(eye, at , up);
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];


    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix) );


    var a = document.getElementById("ambient").checked ? lightAmbient : vec4(0, 0, 0, 1);
    ambientProduct = mult(a, materialAmbient);
    gl.uniform4fv( ambientProductLoc, flatten(ambientProduct) );

    var d = document.getElementById("diffuse").checked ? lightDiffuse : vec4(0, 0, 0, 1);
    diffuseProduct = mult(d, materialDiffuse);
    gl.uniform4fv( diffuseProductLoc, flatten(diffuseProduct) );

    var s = document.getElementById("specular").checked ? lightSpecular : vec4(0, 0, 0, 1);
    specularProduct = mult(s, materialSpecular);
    gl.uniform4fv( specularProductLoc, flatten(specularProduct) );

    gl.uniform4fv( lightPositionLoc, flatten(lightPosition) );
    gl.uniform1f( materialShininessLoc, materialShininess );


    

    for( var i=0; i<index; i+=3)
        gl.drawArrays( gl.TRIANGLES, i, 3 );

    window.requestAnimFrame(render);
}
