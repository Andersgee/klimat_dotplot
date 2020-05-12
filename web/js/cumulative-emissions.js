const ce = {
  myRound(x) {
    if (x == null) return x;
    if (x < 1) return Math.round(100 * x) / 100;
    if (x < 10) return Math.round(10 * x) / 10;
    return Math.round(x);
  },

  myRoundL(x) {
    return this.myRound(x).toLocaleString("sv-SE");
  },

  rangef(n, f) {
    //faster than: return Array.from({length:n}, (e,i)=>f(i));
    const a = new Array(n);
    for (let i = 0; i < n; i++) {
      a[i] = f(i);
    }
    return a;
  },

  fill(n, v) {
    return this.rangef(n, () => v);
  },
  zipmap(a, b, f) {
    return this.rangef(Math.max(a.length, b.length), (i) => f(a[i], b[i]));
  },
  vecadd(a, b) {
    return this.zipmap(a, b, (a, b) =>
      a === undefined ? b : b === undefined ? a : a + b
    );
  },
  vecor(a, b) {
    return this.zipmap(a, b, (a, b) => a || b);
  },

  mapobj(obj, f) {
    let r = {};
    for (let [key, value] of Object.entries(obj)) {
      r[key] = f(value, key, obj);
    }
    return r;
  },

  zipmapobj(a, b, f) {
    let r = {};
    let S = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of S.values()) {
      r[k] = f(a[k], b[k], k, a, b);
    }
    return r;
  },

  calcrate: (last, remaining) =>
    remaining <= 0 ? 0 : Math.exp(-last / remaining),
  rateoffset: (f) => Math.log((f * Math.log(f)) / (f - 1)) / Math.log(f),
  sum0: (a) => a.reduce((a, b) => a + b, 0),

  max: (a) => a.reduce((a, b) => Math.max(a, b), 0),
  cumsum(x) {
    let y = new Array(x.length);
    let c = 0;
    for (let i = 0; i < x.length; i++) {
      c += x[i];
      y[i] = c;
    }
    return y;
  },

  last: (a) => a[a.length - 1],

  distributesectors(municipality_budget, sector_weights, sector_skew) {
    if (sector_skew !== undefined) {
      sector_weights = this.zipmapobj(
        sector_weights,
        sector_skew,
        (a, b) => a * b
      );
    }
    let weight_sum = 0;
    for (const [, v] of Object.entries(sector_weights)) {
      if (!isNaN(v)) weight_sum += v;
    }

    sector_weights["_sum"] = weight_sum;
    return this.mapobj(
      sector_weights,
      (w) => (municipality_budget * w) / weight_sum
    );
  },

  rebase(first_year, budget_year, h, budget, current_year) {
    let passed_years = Math.max(0, current_year - first_year);
    let contextyears = budget_year - first_year;

    let used = 0;
    for (let i = passed_years; i < Math.min(h.length, contextyears); i++)
      used -= h[i];
    for (let i = contextyears; i < Math.min(h.length, passed_years); i++)
      used += h[i];
    return Math.max(0, budget - used);
  },

  // cubic Hermite spline
  spline(x, y, u, downwards) {
    let v = new Array(u.length);
    let j = 0;
    // assumptions
    // * x.length >= 4
    // * no duplicate x values
    // if (downwards)
    // * y is monotonically decreasing

    // continue constant slope at edges
    x = [2 * x[0] - x[1]].concat(x);
    y = [2 * y[0] - y[1]].concat(y);
    x = x.concat(100 * x[x.length - 1] - 99 * x[x.length - 2]);
    y = y.concat(100 * y[y.length - 1] - 99 * y[y.length - 2]);
    x = x.concat(100 * x[x.length - 1] - 99 * x[x.length - 2]);
    y = y.concat(100 * y[y.length - 1] - 99 * y[y.length - 2]);

    for (let i = 0; i < x.length - 2; i++) {
      while (i < x.length - 2 && x[i + 1] <= u[j]) i++;
      let dt1 = x[i] - x[i - 1],
        dt = x[i + 1] - x[i],
        dt2 = x[i + 2] - x[i + 1];
      let dydt1 = (y[i] - y[i - 1]) / dt1,
        dydt = (y[i + 1] - y[i]) / dt,
        dydt2 = (y[i + 2] - y[i + 1]) / dt2;
      //let m0 = (dydt1/dt1 + dydt)/(1/dt1 + 1)
      //    m1 = (dydt2/dt2 + dydt)/(1/dt2 + 1);

      let m0 = (dydt1 / dt1 + dydt / dt) / (1 / dt + 1 / dt1),
        m1 = (dydt2 / dt2 + dydt / dt) / (1 / dt + 1 / dt2);
      m0 *= dt;
      m1 *= dt;

      if (downwards) {
        m0 = Math.max(m0, 3 * dydt1, 3 * dydt); // limit m0 to not be too steep
        m0 = Math.min(m0, 0); // limit m0 to not start upwards
        m1 = Math.max(m1, 3 * dydt2, 3 * dydt); // limit m1 to not be too steep
        m1 = Math.min(m1, 0); // limit m1 to not end upwards
      }

      let p0 = y[i],
        p1 = y[i + 1];
      // loop while x[i] < u[j] <= x[i+1]
      for (; j < u.length && u[j] <= x[i + 1]; j++) {
        let t = Math.max(0, (u[j] - x[i]) / dt);
        let h00 = 2 * t * t * t - 3 * t * t + 1,
          h01 = t * t * t - 2 * t * t + t,
          h10 = -2 * t * t * t + 3 * t * t,
          h11 = t * t * t - t * t;
        v[j] = h00 * p0 + h01 * m0 + h10 * p1 + h11 * m1;
      }
    }
    return v;
  },

  findlastyear(current_year, remaining, future) {
    // TODO return decimal value from linear interpolation on last year
    return current_year + this.cumsum(future).find((x) => x >= remaining) + 1;
  },

  scenario(h, remaining, shape, time_axis, policydata) {
    let R = {
      history: h,
      future: [],
      shape: shape,
      remaining: remaining,
      description: "",
      rate: NaN,
      unit: "",
      leftover: NaN,
      time_axis,
    };

    let current_year = R.time_axis.first_year + h.length;
    let n_years = R.time_axis.last_year - R.time_axis.first_year + 1;
    R.last_year = current_year; // the year when the budget is depleted

    if (h.length == 0) throw "Invalid history: Need at least one data point";

    const h1 = this.last(h);
    let tf = n_years - h.length;

    if (tf < 0) throw "Invalid time_axis: shorter than history";
    if (tf == 0) {
      R.leftover = remaining;
      return R;
    }

    if (shape === "linear") {
      let years = (2 * remaining) / h1;
      R.rate = h1 / years;
      R.unit = "ton CO<sub>2</sub>/&aring;r";
      R.future = this.rangef(tf, (t) => Math.max(0, h1 - R.rate * (0.5 + t)));
      if (years < tf) {
        let year1 = Math.floor(years);
        //R.future[year1] = ((h1 - R.rate * year1) * (years - year1)) / 2
        R.future[year1] = 0;
        R.future[year1] = remaining - this.sum0(R.future);
      }
      R.description =
        this.myRoundL(R.rate) +
        " " +
        R.unit +
        " till nettonoll &aring;r " +
        this.myRound(current_year + years);
      R.last_year = current_year + years;
    } else if (shape === "sshape") {
      // Sum of points on S-curve, not true integral
      let years = (1.75 * remaining) / h1;
      R.future = this.rangef(
        Math.floor(years),
        (t) =>
          (this.last(h) *
            (Math.cos(Math.PI * Math.min(1, (t + 0.5) / years)) + 1)) /
          2
      );
      R.future.push(
        Math.max(
          0,
          Math.min(
            R.future[R.future.length - 1] / 2,
            remaining - this.sum0(R.future)
          )
        )
      );
      let triangle = this.rangef(R.future.length, (t) =>
        Math.max(0, 1 - Math.abs(t - years / 2) / (years / 2))
      );
      let trisum = this.sum0(triangle);
      let r = (remaining - this.sum0(R.future)) / trisum;
      for (let i = 0; i < R.future.length; i++) R.future[i] += r * triangle[i];
      R.future[R.future.length - 1] = 0;
      R.future[R.future.length - 1] = Math.max(
        0,
        remaining - this.sum0(R.future)
      );
      for (let i = R.future.length; i < tf; i++) R.future.push(0);
      R.future.splice(tf);
      R.rate = current_year + years;
      R.unit = "&aring;r med nettonoll";
      R.description =
        "S-kruva till nettonoll &aring;r " + this.myRound(current_year + years);
      R.last_year = current_year + years;
    } else if (shape === "percent") {
      let rate = this.calcrate(h1, remaining);
      let t0 = this.rateoffset(rate);
      R.future = this.rangef(tf, (t) => h1 * Math.pow(rate, 1 + t - t0));
      R.rate = 100 - 100 * rate;
      R.unit = "% per &aring;r";
      R.description = this.myRound(R.rate) + "% per &aring;r";
      R.last_year = current_year + tf;
    } else if (shape === "percent0") {
      let rate = this.calcrate(h1, remaining);
      let t0 = this.rateoffset(rate);
      R.future = this.rangef(tf, (t) => h1 * Math.pow(rate, 1 + t - t0));

      let triangle = this.rangef(R.future.length, (t) =>
        Math.max(0, 1 - Math.abs(t - tf / 2) / (tf / 2))
      );
      let trisum = this.sum0(triangle);
      let r = (remaining - this.sum0(R.future)) / trisum;
      for (let i = 0; i < R.future.length; i++) R.future[i] += r * triangle[i];
      R.future[R.future.length - 1] = 0;
      R.future[R.future.length - 1] = Math.max(
        0,
        remaining - this.sum0(R.future)
      );
      R.rate = 100 - 100 * rate;
      R.unit = "% per &aring;r";
      R.description = this.myRound(R.rate) + "% per &aring;r";
      R.last_year = current_year + tf;
    } else if (shape === "fixed percent") {
      if (policydata === undefined) {
        return undefined;
      } else {
        let rate = 1 - policydata;
        let t0 = this.rateoffset(rate);
        R.future = this.rangef(tf, (t) => h1 * Math.pow(rate, 1 + t - t0));
        R.rate = 100 - 100 * rate;
        R.unit = "% per &aring;r";
        R.description = this.myRound(R.rate) + "% per &aring;r";
        R.last_year = current_year + tf;
      }
    } else if (shape === "policy") {
      if (policydata === undefined) {
        return undefined;
      } else {
        let g = policydata;
        let y0 = current_year - h.length;
        // connect a smooth line with passed history and discard goals before y0

        let x = [1990, 1991].concat(g.year);
        let y = [1, 1].concat(g.emissions).map((e) => e * g.baseline);
        let u = this.rangef(n_years, (i) => y0 + i);
        let v = this.spline(x, y, u, true);
        R.future = v.splice(h.length);
        R.history = v;

        R.rate = policydata;
        R.last_year = this.findlastyear(R.current_year, R.remaining, R.future);
        R.description = policydata.name;
      }
    } else if (shape === "asusual") {
      R.future = this.fill(n_years - h.length, this.last(h));
      R.rate = this.last(h);
      R.unit = "ton CO<sub>2</sub>/&aring;r";
      R.description = "business as usual";
    } else {
      console.log("Unknown shape");
      return undefined;
    }

    R.leftover = Math.max(0, remaining - this.sum0(R.future));

    return R;
  },

  scenariotrack(emissions, budget, shape, current_year, time_axis, policy) {
    let h = this.history(emissions, time_axis.first_year, current_year);
    let remaining = this.rebase(
      time_axis.first_year,
      budget.year,
      emissions,
      budget.tCO2,
      current_year
    );
    let R = this.scenario(h, remaining, shape, time_axis, policy);

    if (R === undefined) return R;

    let { history, future, description, leftover, rate } = R;

    let track = history.concat(future);
    return { track, description, leftover, rate };
  },

  scenariotracks(emissions, budget, shape, current_year, time_axis, policy) {
    let track = {};
    let titletext = {};

    if (policy === undefined) policy = {};

    for (let [s, sh] of Object.entries(emissions)) {
      if ("_sum" in sh) sh = sh._sum;
      let p = s in policy ? policy[s] : policy["_other"];
      let b = { tCO2: budget.sector[s], year: budget.year };
      let R = this.scenariotrack(sh, b, shape, current_year, time_axis, p);
      if (R === undefined) continue;

      titletext[s] = R.description;
      track[s] = R.track;
    }

    if (!("_sum" in track)) track["_sum"] = this.sector_sum(track);

    return { titletext, track };
  },

  total_area(emissions, budget, time_axis) {
    return this.rebase(
      time_axis.first_year,
      budget.year,
      emissions,
      budget.tCO2,
      time_axis.first_year
    );
  },

  smooth_curve(h, first_year = 0, resolution = 5) {
    let n_years = h.length;
    let h_x = this.rangef(n_years, (t) => first_year + t);

    let interpolated_years = this.rangef(
      Math.round(n_years * resolution),
      (t) => first_year + t / resolution
    );
    let interpolated_emissions = this.spline(h_x, h, interpolated_years);

    return { interpolated_years, interpolated_emissions };
  },

  history(h, first_year, current_year) {
    let passed_years = Math.max(0, current_year - first_year);
    return h.slice(0, passed_years);
  },

  used_budget(P, h) {
    const contextyears = P.budget_year - P.first_year;
    return this.sum0(h.slice(contextyears));
  },

  sector_weights(emissions, start, end) {
    let W = {};
    let S = 0;
    for (let [k, v] of Object.entries(emissions)) {
      if (k === "_sum") continue;
      let h = "_sum" in v ? v._sum : v;
      let s = this.sum0(h.slice(start, end));
      W[k] = s;
      S += s;
    }
    return this.mapobj(W, (v) => v / S);
  },

  sector_sum(emissions, skip) {
    if (skip === undefined) skip = ["_sum"];

    let nested = false;
    let r = [];
    for (const [k, v] of Object.entries(emissions)) {
      if (!skip.includes(k)) {
        nested |= "_sum" in v;
        let h = "_sum" in v ? v._sum : v;
        r = this.vecadd(r, h);
      }
    }

    if (nested) r = { _sum: r };

    return r;
  },

  sector_combine_other(emissions, top) {
    let other = this.sector_sum(emissions, top);

    if (other.length == 0) return emissions;

    let R = {};
    // '_other' are those not in 'top'
    R["_other"] = other;
    for (const k of top) R[k] = emissions[k];

    if ("_sum" in emissions) R["_sum"] = emissions._sum;

    return R;
  },

  year_range(first_year, last_year) {
    return this.rangef(last_year - first_year + 1, (y) => first_year + y);
  },

  impute_missing_years(emissions, emissions_years, new_emissions_years) {
    let R = {};
    for (let [k, v] of Object.entries(emissions)) {
      if (Array.isArray(v)) {
        R[k] = this.spline(emissions_years, v, new_emissions_years);
      } else {
        R[k] = this.impute_missing_years(
          v,
          emissions_years,
          new_emissions_years
        );
      }
    }

    return R;
  },

  impute_years_inplace(data, first_history_year, last_history_year) {
    if (first_history_year === undefined) first_history_year = 1990;
    if (last_history_year === undefined) last_history_year = 2020;
    data.country.sparse_emissions = data.country.emissions;
    data.municipality.sparse_emissions = data.municipality.emissions;
    data.sparse_emissions_years = data.emissions_years;

    data.emissions_years = this.year_range(
      first_history_year,
      last_history_year
    );
    data.municipality.emissions = this.impute_missing_years(
      data.municipality.sparse_emissions,
      data.sparse_emissions_years,
      data.emissions_years
    );
    data.country.emissions = this.impute_missing_years(
      data.country.sparse_emissions,
      data.sparse_emissions_years,
      data.emissions_years
    );
    return data;
  },

  split_budget_to_sectors_inplace(data) {
    let w = this.sector_weights(data.municipality.emissions);
    data.municipality.budget.sector = this.distributesectors(
      data.municipality.budget.tCO2,
      w
    );

    w = this.sector_weights(data.country.emissions);
    data.country.budget.sector = this.distributesectors(
      data.country.budget.tCO2,
      w
    );
    return data;
  },

  reduce_other_inplace(data, top_n, start, end) {
    let W = this.sector_weights(data.municipality.emissions, start, end);

    if ("_sum" in data.municipality.emissions) {
      W["_sum"] = 1;
      top_n += 1;
    }

    let top = Object.entries(data.municipality.emissions)
      .sort(([a], [b]) => W[b] - W[a])
      .map(([a]) => a);
    top.splice(top_n);

    this.reduce_nontop_sectors_inplace(data.municipality, top);
    this.reduce_nontop_sectors_inplace(data.country, top);

    return data;
  },

  reduce_nontop_sectors_inplace(data, top) {
    let secb = this.mapobj(data.budget.sector, (x) => [x]);
    secb = this.sector_combine_other(secb, top);
    data.budget.sector = this.mapobj(secb, (x) => x[0]);

    data.emissions = this.sector_combine_other(data.emissions, top);
    if ("sparse_emissions" in data)
      data.sparse_emissions = this.sector_combine_other(
        data.sparse_emissions,
        top
      );

    return data;
  },

  mixedscenariotrack(
    emissions,
    budget,
    policies,
    current_year,
    time_axis,
    overshoot
  ) {
    if (overshoot == undefined) overshoot = 1;
    budget = { tCO2: budget.tCO2 * overshoot, year: budget.year };
    let weight_sum = this.sum0(Object.values(policies));

    let total_track = [];
    let total_leftover = 0;
    for (let [policy, weight] of Object.entries(policies)) {
      let { track, leftover } = this.scenariotrack(
        emissions,
        budget,
        policy,
        current_year,
        time_axis
      );

      total_track = this.vecadd(
        total_track,
        track.map((x) => (x * weight) / weight_sum)
      );
      total_leftover += (leftover * weight) / weight_sum;
    }

    return { track: total_track, leftover: total_leftover };
  },
};

//module.exports = CumulativeEmissions;
