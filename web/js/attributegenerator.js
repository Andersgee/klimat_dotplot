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
  return { tracks, ndots };
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
  let tA = time2attrib_random(t);
  let index = [...Array(t.length).keys()]; //0,1,2,3...

  return { p1, p2, tA, index };
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

function time2attrib(t) {
  const n = t.length;
  const tA = new Float32Array(2 * n);

  for (let i = 0; i < n; i++) {
    tA[2 * i + 0] = t[i];
    tA[2 * i + 1] = t[i] + 1;
  }

  return tA;
}

function time2attrib_random(t) {
  const n = t.length;
  const tA = new Array(2 * n);

  for (let i = 0; i < n; i++) {
    const t1 = Math.floor(t[i]) + Math.random();
    const t2 = t1 + 1;
    tA[2 * i + 0] = t1;
    tA[2 * i + 1] = t2;
  }

  return tA;
}
