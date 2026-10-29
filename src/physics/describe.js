import { mu, period, hillRadius, AU_KM } from './kepler.js';
import { SUN } from '../data/worlds.js';

const EARTH_MASS = 3.003e-6;
const fmt = (n, d = 2) => n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const km = (n) => `${Math.round(n).toLocaleString('en-US')} km`;
const span = (days) => (days < 1000 ? `${fmt(days, 1)} d` : `${fmt(days / 365.25, 2)} yr`);

// Plain-text orbit summary for a world, e.g. for `$ orbit --elements`.
export function describeOrbit(def, byId) {
  if (def.id === 'star') {
    return [`M  1.00 M☉        R  ${km(SUN.radiusKm)}`, 'spectral type G2V-ish, comfortably main sequence'];
  }
  if (def.trojanOf) {
    const host = byId[def.trojanOf];
    const P = period(host.orbit.a, mu(SUN.mass, host.mass));
    return [
      `L4 of ${host.id}: ${def.lead}° ahead on the same orbit`,
      `a  ${fmt(host.orbit.a, 3)} AU    P  ${span(P)}`,
      'stable: librates ±3° around L4 in a 10,000-year N-body run',
    ];
  }
  const o = def.orbit;
  if (def.parent) {
    const parent = byId[def.parent];
    const P = period(o.a, mu(parent.mass, def.mass));
    const rh = hillRadius(parent.orbit.a, parent.orbit.e, parent.mass);
    return [
      `orbits ${parent.id}   a  ${km(o.a * AU_KM)}   e  ${fmt(o.e, 4)}`,
      `P  ${span(P)}   ${fmt((o.a / rh) * 100, 1)}% of ${parent.id}'s Hill radius`,
      `R  ${km(def.radiusKm)}   tidally locked`,
    ];
  }
  const P = period(o.a, mu(SUN.mass, def.mass));
  const lines = [
    `a  ${fmt(o.a, 3)} AU   e  ${fmt(o.e, 3)}   i  ${fmt(o.i, 1)}°`,
    `P  ${span(P)}   q  ${fmt(o.a * (1 - o.e), 2)} AU   Q  ${fmt(o.a * (1 + o.e), 2)} AU`,
  ];
  if (def.mass) lines.push(`m  ${fmt(def.mass / EARTH_MASS, 2)} M⊕   R  ${km(def.radiusKm)}   tilt  ${fmt(def.tiltDeg, 1)}°`);
  else lines.push('massless: pushed around by railhead, not the other way');
  return lines;
}
