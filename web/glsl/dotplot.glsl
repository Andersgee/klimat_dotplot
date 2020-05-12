#ifdef VERT
precision mediump float;
attribute vec2 p1;
attribute vec2 p2;
attribute vec2 tA;

uniform float t;
uniform float pointsize;
uniform float devicepixelratio;
uniform vec2 Nxy;

varying vec2 vpos;

float invmix(float a, float b, float t) {return (t-a)/(b-a);}

vec2 smoothmix(vec2 p1, vec2 p2, vec2 tA, float t) {
  return mix(p1, p2, smoothstep(0.0,1.0, invmix(tA.x, tA.y, t)));
}

void main() {
  float plot_maxyears = 60.0;
  float showyear = t;
  vpos = smoothmix(p1, p2, tA, showyear);
  gl_Position = vec4((vpos+vec2(0.5,0.5))/Nxy*2.0-1.0, 0.0, 1.0);
  gl_PointSize = pointsize*devicepixelratio;
}
#endif

///////////////////////////////////////////////////////////////////////////////

#ifdef FRAG
precision mediump float;
varying vec2 vpos;

uniform float t;
uniform float pointsize;
uniform float devicepixelratio;
uniform vec2 Nxy;
uniform float yearsperpoint;
uniform float tonsperpoint;
uniform vec3 sectorcolor;
uniform vec3 budgetcolor;
//uniform float hoveropacity;

void main() {
  float plot_maxyears = 60.0;

  vec4 leftcolor = vec4(sectorcolor, 1.0);
  vec4 rightcolor = vec4(budgetcolor, 1.0);

  vec2 p = vpos/Nxy;
  p.y = 1.0-p.y;

  float pointyear = p.x*plot_maxyears; //year of the point, (as float)
  vec4 color = (pointyear > t-2.0) ? rightcolor : leftcolor;

  //float mouseyear = floor(mousexy.x*devicepixelratio*plot_maxyears); //year of the mouse
  //float alpha = ((pointyear < mouseyear) || (pointyear >= mouseyear+1.0)) ? hoveropacity : 1.0;

  float r = length(2.0*gl_PointCoord - 1.0); //distance (in pixels) from center of point
  if (r > 1.0) {
    discard;
  }

  //gl_FragColor = color * alpha;
  gl_FragColor = color;
}
#endif