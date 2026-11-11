import { lazy, Suspense, useEffect, useState } from 'react';
import type { Theme } from '@/theme/theme';
const LightRays = lazy(() => import('./LightRays'));
export function RaysBackdrop({ theme, enabled }: { theme: Theme; enabled: boolean }) {
  const [capable, setCapable] = useState(false);
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const small = matchMedia('(max-width: 600px)');
    const update = () => {
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
      setCapable(!motion.matches && !small.matches && !saveData);
    };
    update(); motion.addEventListener('change', update); small.addEventListener('change', update);
    return () => { motion.removeEventListener('change', update); small.removeEventListener('change', update); };
  }, []);
  return <div className="rays-backdrop" aria-hidden="true" data-animated={theme === 'graphite' && enabled && capable}>
    {theme === 'graphite' && enabled && capable && <Suspense fallback={null}>
      <LightRays raysColor="#78f7a5" raysOrigin="top-right" raysSpeed={0.25}
        lightSpread={0.6} opacity={0.3} followMouse={false} cursorShadow={false}
        clickPulse={false} intro={false} maxDevicePixelRatio={1} />
    </Suspense>}
  </div>;
}
