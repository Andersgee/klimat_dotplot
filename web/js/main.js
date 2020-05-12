async function fetchmunicipalitydata(municipality) {
  var baseurl =
    "https://storage.googleapis.com/klimatsekretariatet-static/climate-visualizer/sweden/emissions/";
  var fn = baseurl + municipality.toLowerCase() + ".json";
  return await fetch(fn).then((res) => res.json());
}

async function fetchassets() {
  var assets = [fetchglsl(), fetchmunicipalitydata("nyköping")];
  return await Promise.all(assets);
}

function setup() {
  var canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth * 0.9;
  canvas.height = 300;

  document.getElementById("but1").addEventListener("click", change_data(1));
  document.getElementById("but2").addEventListener("click", change_data(2));
  document.getElementById("but3").addEventListener("click", change_data(3));

  var plotarguments = {
    time_axis: { first_year: 1999, last_year: 2059 }, //plot x axis
    targetshape: "percent", //"percent", "fixed percent" "linear", "sshape", "percent0"
    policy: "stuff", //ignored if not fixed percent
  };

  gl = webgl(canvas);
  fetchassets().then((assets) => {
    atrbuffers = {};
    shaders = shaderprograms(assets[0]);

    data = assets[1];
    ce.impute_years_inplace(data, 1999, 2019);
    ce.split_budget_to_sectors_inplace(data);

    var emissions_sum = data.municipality.emissions["_sum"]["_sum"];
    var budget_sum = {
      tCO2: data.municipality.budget.sector["_sum"],
      year: data.municipality.budget.year,
    };
    //delete emissions_sectors["_sum"]
    //delete budget_sectors["_sum"]

    //convert to attributes for glsl
    atr = plotattributes(plotarguments, canvas, emissions_sum, budget_sum);
    vao = vertexarray(shaders.dotplot, atr);
    main();
  });
}
function change_data(i) {
  console.log(i);
}

function main() {
  renderplot();
}

function renderplot() {
  //change some data, for debugging
  atr.p2[4] += 0.1;
  atr.p2[5] += 0.1;
  atr.p2[6] += 0.1;
  atr.p2[7] += 0.05;
  //update plotattributes like so:
  gl.bindBuffer(gl.ARRAY_BUFFER, atrbuffers.p2);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(atr.p2), gl.DYNAMIC_DRAW);

  //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  //updateuniforms();
  uniforms.t = Math.min(uniforms.t + 0.1, 22);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gldraw(shaders.dotplot, vao);
  window.requestAnimationFrame(renderplot);
}

window.onload = setup();
