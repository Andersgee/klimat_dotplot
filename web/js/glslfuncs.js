function clamp(x, a, b) {
  return Math.max(a, Math.min(x, b));
}

function mix(x, y, a) {
  return x * (1 - a) + y * a;
}

function invmix(edge0, edge1, x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

function smoothstep(edge0, edge1, x) {
  let t = invmix(edge0, edge1, x);
  return t * t * (3.0 - 2.0 * t);
}

//to be able to reproduce dotplot.glsl
function smoothmix(p1, p2, t1, t2, t) {
  return mix(p1, p2, smoothstep(0.0, 1.0, invmix(t1, t2, t)));
}

function vecsmoothmix(p1, p2, t1, t2, t) {
  let p = new Float32Array(p1.length);
  let n = t1.length
  for (let i = 0; i < n; i++) {
    let x = i * 2;
    let y = x + 1;
    p[x] = smoothmix(p1[x], p2[x], t1[i], t2[i], t);
    p[y] = smoothmix(p1[y], p2[y], t1[i], t2[i], t);
  }
  return p;
}