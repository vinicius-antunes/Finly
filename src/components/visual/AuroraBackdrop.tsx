import { lazy, Suspense, useEffect, useState } from 'react';
import type { Theme } from '@/theme/theme';
const Aurora = lazy(() => import('./Aurora'));
export function AuroraBackdrop({ theme, enabled }: { theme: Theme; enabled: boolean }) {
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
  return <div className="aurora-backdrop" aria-hidden="true" data-animated={theme === 'aurora' && enabled && capable}>
    {theme === 'aurora' && enabled && capable && <Suspense fallback={null}>
      <Aurora colorStops={['#5b8cff', '#8a6cff', '#4ed8ff']} amplitude={0.7} speed={0.15}
        height={0.65} blend={0.6} brightness={0.8} opacity={0.6} mouseInteraction={false} intro={false} dpr={1} />
    </Suspense>}
  </div>;
}
