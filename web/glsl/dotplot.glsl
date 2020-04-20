#ifdef VERT
precision mediump float;
attribute vec2 p1;
attribute vec2 p2;
attribute vec2 tA;

uniform float t;
uniform float pointsize;
uniform vec2 Nxy;

varying vec2 vpos;

float invmix(float a, float b, float t) {return (t-a)/(b-a);}

vec2 smoothmix(vec2 p1, vec2 p2, vec2 tA, float t) {
  return mix(p1, p2, smoothstep(0.0,1.0, invmix(tA.x, tA.y, t)));
}

void main() {
  vpos = smoothmix(p1, p2, tA, t);
  //vpos.y = vpos.y*0.5625;
  gl_Position = vec4(vpos/Nxy*2.0-1.0, 0.0, 1.0);
  gl_PointSize = pointsize;
}
#endif

///////////////////////////////////////////////////////////////////////////////

#ifdef FRAG
precision mediump float;
varying vec2 vpos;

uniform float t;
uniform float pointsize;
uniform vec2 Nxy;
uniform vec2 mousexy;
uniform float yearsperpoint;
uniform float tonsperpoint;

void main() {
  //length(v)/Nyears = 91/20 = 4.5 //divide by this to make it so that t=1 means year 20 assumig
  float yearsize = pointsize*yearsperpoint/Nxy.x;
  //float tonsize = pointsize*tonsperpoint/Nxy.y / 9000.0;
  float tonsize = 1.0/Nxy.y; //points are scaled already
  //float yearsize = 0.01;
  vec2 p = vpos/Nxy;
  p.y = 1.0-p.y;

  //slider on x
  vec4 color = (p.x < t/4.5) ? vec4(1.0, 0.0, 0, 1.0) : vec4(0.0, 0.0, 1.0, 1.0);

  //tons on y
  //color = ((mousexy.y+0.025 > p.y) && (mousexy.y-0.025 < p.y)) ? vec4(0.0, 0.5, 0.5, 1.0) : color;
  color = ((mousexy.y+tonsize > p.y) && (mousexy.y-tonsize < p.y)) ? vec4(0.0, 0.5, 0.5, 1.0) : color;

  //year on x
  color = ((mousexy.x-yearsize < p.x) && (mousexy.x+yearsize > p.x)) ? vec4(0.0, 1.0, 0.0, 1.0) : color;

  gl_FragColor = color;

  //make circles with a border instead of the standard boxes?
  //float d = length(2.0*gl_PointCoord - 1.0);
  //float edgesize = 1.0;
  //vec4 edgecolor = vec4(vec3(0.0), smoothstep(pointsize, pointsize-2.0, d*pointsize)); //border with faded alpha (antialias)
  //gl_FragColor = mix(gl_FragColor, edgecolor, smoothstep(pointsize-edgesize-2.0, pointsize-edgesize, d*(pointsize+edgesize))); //fade in border
}
#endif