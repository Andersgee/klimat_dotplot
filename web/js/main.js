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

  let b1 = document.getElementById("but1");
  let b2 = document.getElementById("but2");
  let b3 = document.getElementById("but3");
  b1.addEventListener("click", () => {
    change_data(1);
  });
  b2.addEventListener("click", () => {
    change_data(2);
  });
  b3.addEventListener("click", () => {
    change_data(3);
  });

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

    atr_current = plotattributes(
      plotarguments,
      canvas,
      emissions_sum,
      budget_sum
    );

    main();
  });
}

function set_p1(v) {
  atr_current.p1 = v;
  gl.bindBuffer(gl.ARRAY_BUFFER, atrbuffers.p1);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
}

function set_p2(v) {
  atr_current.p2 = v;
  gl.bindBuffer(gl.ARRAY_BUFFER, atrbuffers.p2);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
}

function change_data(i) {
  console.log(i);
  let currentpos = vecsmoothmix(
    atr_current.p1,
    atr_current.p2,
    atr.t1,
    atr.t2,
    uniforms.t
  );
  if (i == 1) {
    set_p1(currentpos);
    set_p2(atr.p1);
    uniforms.t = 0;
  } else if (i == 2) {
    set_p1(currentpos);
    set_p2(atr.p2);
    uniforms.t = 0;
  } else if (i == 3) {
    let newp = atr.p1.slice(0);
    newp[4] = 30;
    newp[5] = 30;
    newp[6] = 20;
    newp[7] = 15;

    //update plotattributes like so:
    gl.bindBuffer(gl.ARRAY_BUFFER, atrbuffers.p1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(atr.p1), gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, atrbuffers.p2);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(newp), gl.DYNAMIC_DRAW);
    uniforms.t = 0;
  }
}

function vecmix(a, b, t) {
  return ce.zipmap(a, b, (a, b) => a * (1 - t) + b * t);
}

function main() {
  renderplot();
}

function renderplot() {
  //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  //updateuniforms();
  uniforms.t = Math.min(uniforms.t + 0.1, 22);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gldraw(shaders.dotplot, vao);
  window.requestAnimationFrame(renderplot);
}

function clamp(x, a, b) {
  return Math.max(a, Math.min(x, b));
}

function mix(a, b, t) {
  return a * (1 - t) + b * t;
}

function invmix(edge0, edge1, x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

function smoothstep(edge0, edge1, x) {
  let t = invmix(edge0, edge1, x);
  return t * t * (3.0 - 2.0 * t);
}

function smoothmix(p1, p2, t1, t2, t) {
  return mix(p1, p2, smoothstep(0.0, 1.0, invmix(t1, t2, t)));
}

function vecsmoothmix(p1, p2, t1, t2, t) {
  let n = t1.length;
  let p = new Float32Array(p1.length);
  for (let i = 0; i < n; i++) {
    let x = i * 2;
    let y = x + 1;
    p[x] = smoothmix(p1[x], p2[x], t1[i], t2[i], t);
    p[y] = smoothmix(p1[y], p2[y], t1[i], t2[i], t);
  }
  return p;
}

window.onload = setup();
