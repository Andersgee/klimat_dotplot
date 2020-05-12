
//////////////////////////////////////////////////////////////////////////////
// shader

async function fetchglsl() {
  return await Promise.all([fetch("/glsl/dotplot.glsl").then(res=>res.text())])
}

function shaderprograms(text) {
  var layout={};
  layout.attributes = {
    "p1": 2,
    "p2": 2,
    "tA": 2,
  };

  layout.uniforms = {
    "t": "uniform1f",
    "pointsize": "uniform1f",
    "Nxy": "uniform2fv",
    "mousexy": "uniform2fv",
    "yearsperpoint": "uniform1f",
    "tonsperpoint": "uniform1f",
  };

  uniforms = {};
  uniforms.t = 0.0;
  uniforms.pointsize = 3.0;
  uniforms.Nxy = new Float32Array(2);
  uniforms.mousexy = new Float32Array(2);
  uniforms.yearsperpoint = 1.0;
  uniforms.tonsperpoint = 1.0;

  var shaders = {};
  shaders.dotplot = shaderprogram(layout, text, 0);
  return shaders;  
}

function shaderprogram(layout, text, i) {
  var VERT = "#define VERT;\n";
  var FRAG = "#define FRAG;\n";
  var verttext = VERT.concat(text[i]);
  var fragtext = FRAG.concat(text[i]);

  var vert = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vert, verttext);
  gl.compileShader(vert);

  var frag = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(frag, fragtext);
  gl.compileShader(frag);

  var program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  //gl.bindAttribLocation(program, 0, "position");
  gl.linkProgram(program);

  program.attributes = getattributes(program, layout.attributes);
  program.uniforms = getuniforms(program, layout.uniforms);

  console.log("program",i, program);
  return program
}

function getattributes(program, layout) {
  var attributes = {};
  for (name in layout) {
    var id = gl.getAttribLocation(program, name);
    //console.log(id, name)
    if (id != -1) {
      attributes[name] = {};
      attributes[name].location = id;
      attributes[name].size = layout[name]; //value is number (size)
    }
  }
  return attributes
}

function getuniforms(program, layout) {
  var uniforms = {};
  for (name in layout) {
    var id = gl.getUniformLocation(program, name);
    //console.log(id, name)
    if (id != null) {
      uniforms[name] = {};
      uniforms[name].location = id;
      uniforms[name].type = layout[name]; //value is string (function name type)
    }
  }
  return uniforms
}

//////////////////////////////////////////////////////////////////////////////
// webgl

function webgl(canvas) {
  var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {return alert("need webgl. try another browser");}

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  //gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS);
  //gl.frontFace(gl.CW);
  //gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  gl.enable(gl.DITHER);
  gl.clearColor(1,1,1, 1);

  //VertexArray is standard in webgl2, but its also available in this extension as VertexArrayOES
  var ext = gl.getExtension('OES_vertex_array_object') || gl.getExtension('MOZ_OES_vertex_array_object') ||gl.getExtension('WEBKIT_OES_vertex_array_object');
  if (!ext) {return alert("couldnt get webgl extension vertex array object");}
  gl.createVertexArray = () => ext.createVertexArrayOES();
  gl.bindVertexArray = (vao) => ext.bindVertexArrayOES(vao);

  return gl
}

function gldraw(program, vao) {
  gl.useProgram(program);
  setuniforms(program)
  gl.bindVertexArray(vao);
  gl.drawElements(vao.mode, vao.count, vao.type, vao.offset);
  gl.bindVertexArray(null);
}

function setuniforms(program) {
  for (name in program.uniforms) {
    gl[program.uniforms[name].type](program.uniforms[name].location, uniforms[name]);
  }
}

function vertexarray(program, model) {
  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.index), gl.STATIC_DRAW);
  for (name in program.attributes) {
    gl.enableVertexAttribArray(program.attributes[name].location);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.vertexAttribPointer(program.attributes[name].location, program.attributes[name].size, gl.FLOAT, false, 0, 0);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model[name]), gl.STATIC_DRAW);
  }
  gl.bindVertexArray(null);
  vao.mode = gl.POINTS;
  vao.count = model.index.length;
  //vao.type = gl.UNSIGNED_INT; //standard in webgl2, getExtension("OES_element_index_uint") needed in webgl1
  vao.type = gl.UNSIGNED_SHORT; //max points 2^16=65535
  vao.offset = 0;
  return vao;
}