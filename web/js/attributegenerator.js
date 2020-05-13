function vs2tracks(vs, yearsperpoint, tonsperpoint, tCO2_sum) {
  let points_per_year = 1 / yearsperpoint;
  let points_per_tC02 = 1 / tonsperpoint;

  let tracks = vs.map((v) =>
    ce
      .smooth_curve(v, 0, points_per_year)
      .interpolated_emissions.map((e) => Math.round(e * points_per_tC02))
  );

  let ndots = Math.round(tCO2_sum * points_per_tC02 * points_per_year);
  tracks.forEach((t) => track_tail_inplace(t, ndots));
  tracks_same_length_inplace(tracks);
  return [tracks, ndots];
}

function track_tail_inplace(track, n) {
  let remaining = n;
  for (let i = 0; i < track.length; i++) {
    let t = Math.min(remaining, Math.max(1, track[i]));
    track[i] = t;
    remaining -= t;
  }
  if (n > 1e6) throw `Trying to allocate ${Math.floor((8 * n) / 1e6)} MB`;
  for (; remaining > 0; remaining--) track.push(1);
}

function tracks_same_length_inplace(tracks) {
  let maxtracklength = Math.max(...tracks.map((x) => x.length));
  for (let t of tracks) {
    for (let i = t.length; i < maxtracklength; i++) t.push(0);
  }
}

function tracks2attr_dotindices(tracks, n) {
  let { pi1, pi2, t } = animate_tracks_dotindices(tracks, n);

  let p1 = dotindices2attrib(pi1);
  let p2 = dotindices2attrib(pi2);
  let t1 = time2attrib_t1(t);
  let t2 = time2attrib_t2(t1);
  let index = [...Array(t.length).keys()]; //0,1,2,3...

  return { p1, p2, t1, t2, index };
}

function animate_tracks_dotindices(tracks, n) {
  const t = Array.from({ length: n }, () => 0);
  const pi1 = track2dotindices(tracks[0], n);
  const pi2 = track2dotindices(tracks[0], n); // need deep copy

  tracks.forEach((track, i) => {
    if (i == 0) return;
    animate_dotindices_inplace(pi2, t, track, i);
  });

  return { pi1, pi2, t };
}

function track2dotindices(track, N) {
  const r = new Array(track.length);
  let i = 0;
  for (let x = 0; x < track.length; x++) {
    let ny = Math.min(track[x], N - i);
    let a = new Array(ny);
    for (let j = 0; j < ny; j++) a[j] = i + j;
    r[x] = a;
    i += ny;
  }
  for (let x = track.length; i < N; x++) {
    r[x] = [i++];
  }

  return r;
}

function animate_dotindices_inplace(pi, t, track, t_offset) {
  track_tail_inplace(track, t.length);

  const n = pi.length;
  const n_to_move = track
    .map((t, i) => Math.max(0, t - pi[i].length))
    .reduce((a, b) => a + b, 0);
  let i_add = -1,
    i_remove = 0;

  function next_add() {
    for (let i = 0; i < n; i++) {
      i_add = (i_add + 1) % n;
      if (pi[i_add].length < track[i_add]) return true;
    }
    return false;
  }

  function next_remove() {
    for (let i = 0; i < n; i++) {
      i_remove = (i_remove + n - 1) % n;
      let tv = i_remove >= track.length ? 0 : track[i_remove];
      if (pi[i_remove].length > tv) return true;
    }
    return false;
  }

  let moved = 0;
  while (next_add() && next_remove()) {
    const [m] = pi[i_remove].splice(-1);
    pi[i_add].push(m);
    t[m] = t_offset + moved / n_to_move;
    moved++;
  }
}

function dotindices2attrib(pi) {
  const max_each = pi.map((a) => Math.max(...a));
  const N = 1 + Math.max(...max_each);

  const r = new Float32Array(2 * N);
  pi.forEach((a, x) =>
    a.forEach((i, y) => {
      if (i >= 0) {
        r[2 * i] = x;
        r[2 * i + 1] = y;
      }
    })
  );
  return r;
}

function time2attrib_t1(t) {
  const n = t.length;
  const tA = new Array(n);
  for (let i = 0; i < n; i++) {
    tA[i] = Math.floor(t[i]) + Math.random();
  }
  return tA;
}

function time2attrib_t2(t1) {
  const n = t1.length;
  const tA = new Array(n);
  for (let i = 0; i < n; i++) {
    tA[i] = t1[i] + 1;
  }
  return tA;
}

///////////////////////////////////////////////////////////////////////////////

function dotinds_same_length_inplace(pi1,pi2) {
  if (pi1.length>pi2.length) {
    let N = pi1.length-pi2.length
    for (let i=0; i<N; i++) {pi2.push([])}
  }
  else if (pi2.length>pi1.length) {
    let N = pi2.length-pi1.length
    for (let i=0; i<N; i++) {pi1.push([])}
  }
  
}


function ordered_indices2attribs(pi1, pi2) {
  dotinds_same_length_inplace(pi1,pi2)

  const max_each1 = pi1.map((a) => Math.max(...a));
  const N1 = 1 + Math.max(...max_each1);

  const max_each2 = pi2.map((a) => Math.max(...a));
  const N2 = 1 + Math.max(...max_each2);

  const N = 2*Math.max(N1,N2)

  let coord1 = new Float32Array(N);
  let coord2 = new Float32Array(N);

  let i = 0
  let i1=N //reverse index, starting from end
  let i2=N

  for (let x=0; x<pi1.length; x++) {
    let n1 = pi1[x].length
    let n2 = pi2[x].length
    
    //if in both dotindices, place coordinates
    for (let y=0; y<n1 && y<n2; y++) {
      coord1[i] = x;
      coord1[i+1] = y;

      coord2[i] = x;
      coord2[i+1] = y;
      i += 2;
    }

    //note to self:
    //place any remaining coordinates at end of coordinate array, 
    //this way all moving coords come at the end of the coordinate array
    //but more importantly, two points with same coord will fall on the same index in the coordinate array.
    //if (n1>n2) { //not needed but is it faster to have the if statement here?
      for (let y=n2; y<n1; y++) {
        i1 -= 2
        coord1[i1] = x
        coord1[i1+1] = y
      }
    //} else if (n2>n1) {
      for (let y=n1; y<n2; y++) {
        i2 -= 2
        coord2[i2] = x
        coord2[i2+1] = y
      }
    //}
  }
  
  return [coord1,coord2];
}
/*
dotinds1 = [[0,1,2], [3,4], [5,6], [7,8], [9]]
dotinds2 = [[0,1,2], [3,4,5], [6,7], [8], [9]]

let [coord1, coord2] = ordered_indices2attribs(dotinds1, dotinds2)
console.log("coord1",coord1)
console.log("coord2",coord2)
*/