function plotattributes(P, canvas, emissions, budget) {
  let f = (year) =>
    ce.scenariotrack(
      emissions,
      budget,
      P.targetshape,
      year,
      P.time_axis,
      P.policy
    ).track;
  var vs = ce.rangef(P.time_axis.last_year - P.time_axis.first_year, (x) =>
    f(P.time_axis.first_year + 1 + x)
  );

  var plot_maxyears = 59; //vs[0].length - 1;
  var pointspacing = 5 * devicePixelRatio;
  var Nx = canvas.width / pointspacing;
  var Ny = canvas.height / pointspacing;

  var plot_maxtons = maximum(vs);
  var yearsperpoint = plot_maxyears / Nx;
  var tonsperpointY = plot_maxtons / Ny; //moving one step in y (for a whole year, which has several points)
  var tonsperpoint = tonsperpointY * yearsperpoint;
  console.log("tonsperpoint:", tonsperpoint);

  uniforms.Nxy = [Nx, Ny];
  uniforms.yearsperpoint = yearsperpoint;
  uniforms.tonsperpoint = tonsperpointY;

  let tCO2_sum = ce.total_area(emissions, budget, P.time_axis);
  let { tracks, ndots } = vs2tracks(vs, yearsperpoint, tonsperpointY, tCO2_sum);
  let atr = tracks2attr_dotindices(tracks, ndots);
  atr.plot_maxtons = plot_maxtons;
  return atr;
}

function plotattributes_p2(P, canvas, emissions, budget, year) {
  var vs = [ce.scenariotrack(emissions, budget, P.targetshape, year, P.time_axis, P.policy).track];

  var plot_maxyears = 59; //vs[0].length - 1;
  var pointspacing = 5 * devicePixelRatio;
  var Nx = canvas.width / pointspacing;
  var Ny = canvas.height / pointspacing;

  var plot_maxtons = maximum(vs);
  var yearsperpoint = plot_maxyears / Nx;
  var tonsperpointY = plot_maxtons / Ny; //moving one step in y (for a whole year, which has several points)
  var tonsperpoint = tonsperpointY * yearsperpoint;

  uniforms.Nxy = [Nx, Ny];
  uniforms.yearsperpoint = yearsperpoint;
  uniforms.tonsperpoint = tonsperpointY;

  let tCO2_sum = ce.total_area(emissions, budget, P.time_axis);
  let { tracks, ndots } = vs2tracks(vs, yearsperpoint, tonsperpointY, tCO2_sum);
  let dotinds = track2dotindices(tracks[0], ndots)
  let p2 = dotindices2attrib(dotinds)
  return p2;
}

function maximum(vs) {
  var M = [];
  for (var k in vs) {
    M.push(Math.max(...vs[k]));
  }
  return Math.max(...M);
}
