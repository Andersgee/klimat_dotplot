async function fetchmunicipalitydata(municipality) {
  var baseurl =
    "https://storage.googleapis.com/klimatsekretariatet-static/climate-visualizer/sweden/emissions/";
  var fn = baseurl + municipality.toLowerCase() + ".json";
  return await fetch(fn).then((res) => res.json());
}

async function fetchassets(municipality) {
  var assets = [fetchglsl(), fetchmunicipalitydata(municipality), fetchweapon(municipality)];
  return await Promise.all(assets);
}

function setup() {
  let municipality = "nyköping"
  var canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth * 0.9;
  canvas.height = 300;
  animationspeed = 0.1

  let b1 = document.getElementById("but1");
  let b2 = document.getElementById("but2");
  let b3 = document.getElementById("but3");

  current_plotargs = {
    sector: "_sum",
    time_axis: { first_year: 1999, last_year: 2059 }, //plot x axis
    targetshape: "percent", //"percent", "fixed percent" "linear", "sshape", "percent0"
    policy: "stuff", //ignored if not fixed percent
  };

  gl = webgl(canvas);
  fetchassets(municipality).then((assets) => {
    let weapon = assets[2]
    console.log(weapon)

    atrbuffers = {};
    shaders = shaderprograms(assets[0]);

    data = assets[1];
    console.log(data)
    ce.impute_years_inplace(data, 1999, 2019);
    ce.split_budget_to_sectors_inplace(data);

    let emissions = data.municipality.emissions;
    let tCO2 = data.municipality.budget.sector;
    let year = data.municipality.budget.year;

    let sector = "_sum"
    //let sector = "Arbetsmaskiner"
    let emissions_sector = emissions[sector]["_sum"];
    let budget_sector = {tCO2: tCO2[sector], year: year};
    //delete emissions["_sum"]
    //delete budget["_sum"]

    //convert to attributes for glsl
    atr = plotattributes(current_plotargs, canvas, emissions_sector, budget_sector);
    vao = vertexarray(shaders.dotplot, atr);

    atr_current = plotattributes(current_plotargs, canvas, emissions_sector, budget_sector);
    atr_current.p2 = plotattributes_p2(current_plotargs, canvas, emissions_sector, budget_sector, 2020)

    b1.addEventListener("click", () => {
      //let v = atr.p1
      let plotargs = {
        sector: "_sum", //"Arbetsmaskiner"
        time_axis: { first_year: 1999, last_year: 2059 }, //plot x axis
        targetshape: "percent", //"percent", "fixed percent" "linear", "sshape", "percent0"
        policy: "stuff", //ignored if not fixed percent
      };
      uniforms.animatecolor = 0;
      change_data(plotargs);
    });
    b2.addEventListener("click", () => {
      //let v = atr.p2
      let plotargs = {
        sector: "_sum", //"Arbetsmaskiner"
        time_axis: { first_year: 1999, last_year: 2059 }, //plot x axis
        targetshape: "sshape", //"percent", "fixed percent" "linear", "sshape", "percent0"
        policy: "stuff", //ignored if not fixed percent
      };

      uniforms.animatecolor = 0;
      change_data(plotargs);
    });
    b3.addEventListener("click", () => {
      //let v = atr.p1
      let plotargs = {
        sector: "_sum", //"Arbetsmaskiner"
        time_axis: { first_year: 1999, last_year: 2059 }, //plot x axis
        targetshape: "linear", //"percent", "fixed percent" "linear", "sshape", "percent0"
        policy: "stuff", //ignored if not fixed percent
      };

      uniforms.animatecolor = 0;
      change_data(plotargs);
    });

    main();
  });
}

function set_p1(v) {
  atr_current.p1 = new Float32Array(v);
  gl.bindBuffer(gl.ARRAY_BUFFER, atrbuffers.p1);
  gl.bufferData(gl.ARRAY_BUFFER, atr_current.p1, gl.STATIC_DRAW);

  /*
  atr_current.t1 = new Float32Array(atr.t1.length)
  gl.bindBuffer(gl.ARRAY_BUFFER, atrbuffers.t1);
  gl.bufferData(gl.ARRAY_BUFFER, atr_current.t1, gl.STATIC_DRAW);
  */
}

function set_p2(v) {
  atr_current.p2 = new Float32Array(atr_current.p2.length);
  for (let i=0; i<v.length; i++) {atr_current.p2[i] = v[i]}

  gl.bindBuffer(gl.ARRAY_BUFFER, atrbuffers.p2);
  gl.bufferData(gl.ARRAY_BUFFER, atr_current.p2, gl.STATIC_DRAW);

  /*
  atr_current.t2 = new Float32Array(atr.t2.length)
  atr_current.t2.fill(21)
  gl.bindBuffer(gl.ARRAY_BUFFER, atrbuffers.t2);
  gl.bufferData(gl.ARRAY_BUFFER, atr_current.t2, gl.STATIC_DRAW);
  */
}

function change_data(plotargs) {
  

  let emissions = data.municipality.emissions;
  let tCO2 = data.municipality.budget.sector;
  let year = data.municipality.budget.year;

  let sector = plotargs.sector
  let emissions_sector = emissions[sector]["_sum"];
  let budget_sector = {tCO2: tCO2[sector], year: year};

  //let v = plotattributes(plotargs, canvas, emissions_sector, budget_sector).p2;
  //let v = plotattributes_p2(plotargs, canvas, emissions_sector, budget_sector, 2020)
  let [v_old, v] = ordered_plotattributes_p2(current_plotargs, plotargs, canvas, emissions_sector, budget_sector, 2020)
  
  let currentpos = vecsmoothmix(atr_current.p1, atr_current.p2, atr_current.t1, atr_current.t2, uniforms.t);
  //set_p1(currentpos);

  //let currentpos = vecsmoothmix(atr_current.p1, v_old, atr_current.t1, atr_current.t2, uniforms.t);
  set_p1(v_old);

  set_p2(v);
  uniforms.t = 0;
  //animationspeed = 0.4
  current_plotargs = plotargs;
}
function main() {
  renderplot();
}

function renderplot() {
  //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  //updateuniforms();
  uniforms.t = Math.min(uniforms.t + animationspeed, 22);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gldraw(shaders.dotplot, vao);
  window.requestAnimationFrame(renderplot);
}

window.onload = setup();
