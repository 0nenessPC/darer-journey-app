/** Exposure verification — GPS distance checking for diamond rewards */

/** Haversine distance in meters between two lat/lng pairs */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Verify user is near the pinned exposure location.
 * @param {{lat: number, lng: number}} pinnedCoords — coords captured during RISE phase
 * @param {number} thresholdMeters — max allowed distance (default 100)
 * @returns {{verified: boolean, distance: number|null, method: string|null}}
 */
export async function verifyGPS(pinnedCoords, thresholdMeters = 100) {
  if (!pinnedCoords || !pinnedCoords.lat || !pinnedCoords.lng) {
    return { verified: false, distance: null, method: null };
  }
  if (!navigator.geolocation) {
    return { verified: false, distance: null, method: null };
  }
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 30000,
      });
    });
    const distance = haversineDistance(
      pinnedCoords.lat,
      pinnedCoords.lng,
      pos.coords.latitude,
      pos.coords.longitude,
    );
    return {
      verified: distance <= thresholdMeters,
      distance: Math.round(distance),
      method: 'gps',
    };
  } catch {
    return { verified: false, distance: null, method: null };
  }
}

/** Earn diamonds based on boss level for verified exposures */
export function diamondReward(bossLevel) {
  if (bossLevel <= 3) return 1;
  if (bossLevel <= 6) return 2;
  return 3;
}
