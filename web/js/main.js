async function fetchdata() {
  var data = [fetchglsl(), fetchplotattributes()];
  return await Promise.all(data);
}

function setup() {
  

  var canvas = document.getElementById("canvas");
  var aspect = 16/9;
  canvas.width = window.innerWidth;
  canvas.height = Math.floor(window.innerWidth/aspect);

  gl = webgl(canvas)
  fetchdata().then(data=>{
    shaders = shaderprograms(data[0]);
    var atr = plotattributes(data[1], canvas);
    vao = vertexarray(shaders.dotplot, atr);
    main()
  })
}

function main() {
  yearslider = document.getElementById("yearslider");
  yearslider.oninput = updateuniforms;
  canvas.addEventListener("mousemove", (e) => {mousexy(e);});

  renderplot();
}

function mix(a, b, t) {return (1-t)*a + t*b;}

function updateuniforms() {
  uniforms.t = mix(uniforms.t, yearslider.value, 0.05)
  //uniforms.pointsize = 3.0;
}

function renderplot() {
  //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  updateuniforms()
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gldraw(shaders.dotplot, vao);
  window.requestAnimationFrame(renderplot);
}


function mousexy(e) {
  uniforms.mousexy = [e.clientX/canvas.width, e.clientY/canvas.height];
  //uniforms.mousexy = [e.clientX, e.clientY]; //in pixels
  //console.log(uniforms.mousexy)
}

window.onload = setup()
