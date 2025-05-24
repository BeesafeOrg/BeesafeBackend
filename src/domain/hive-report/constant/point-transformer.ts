export const pointTransformer = {
  to(value?: { lat: number; lng: number }) {
    if (!value) return null;
    return `POINT(${value.lng} ${value.lat})`;
  },
  from(value?: { x: number; y: number } | string) {
    if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
      return { lng: (value as any).x, lat: (value as any).y };
    }
    return null;
  },
};