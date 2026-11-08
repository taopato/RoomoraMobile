export const VERSION_POLICY_URL = 'https://takosware.com/roomora-version.json';
const STORE_URLS = {
  ios: 'https://apps.apple.com/app/id6800784560',
  android: 'https://play.google.com/store/apps/details?id=com.taopato.roomora',
};

export function compareVersions(left, right) {
  const parse = (value) => {
    if (!/^\d+(\.\d+){0,2}$/.test(String(value ?? ''))) return null;
    return String(value).split('.').map(Number);
  };
  const current = parse(left);
  const minimum = parse(right);
  if (!current || !minimum) return null;
  for (let index = 0; index < 3; index += 1) {
    const difference = (current[index] || 0) - (minimum[index] || 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function getRequiredUpdate(policy, platform, installedVersion) {
  if (!['ios', 'android'].includes(platform)) return null;
  const entry = policy?.[platform];
  if (!entry) return null;
  return compareVersions(installedVersion, entry.minimumVersion) === -1
    ? { minimumVersion: entry.minimumVersion, storeUrl: STORE_URLS[platform] }
    : null;
}
