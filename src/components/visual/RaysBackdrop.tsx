import { lazy, memo, Suspense, useEffect, useState } from 'react';
import type { Theme } from '@/theme/theme';
const LightRays = lazy(() => import('./LightRays'));
export const RaysBackdrop = memo(function RaysBackdrop({ theme, enabled }: { theme: Theme; enabled: boolean }) {
  const [capable, setCapable] = useState(false);
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const small = matchMedia('(max-width: 600px)');
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const update = () => {
      setCapable(!motion.matches && !small.matches && !connection?.saveData);
    };
    update(); motion.addEventListener('change', update); small.addEventListener('change', update);
    connection?.addEventListener('change', update);
    return () => {
      motion.removeEventListener('change', update); small.removeEventListener('change', update);
      connection?.removeEventListener('change', update);
    };
  }, []);
  const active = theme === 'graphite' && enabled;
  return <div className="rays-backdrop" aria-hidden="true" hidden={!active} data-animated={active && capable}>
    {active && capable && <Suspense fallback={null}>
      <LightRays raysColor="#78f7a5" raysOrigin="top-right" raysSpeed={0.25}
        lightSpread={0.6} opacity={0.28} followMouse={false} cursorShadow={false}
        clickPulse={false} intro={false} maxDevicePixelRatio={1} />
    </Suspense>}
  </div>;
});
