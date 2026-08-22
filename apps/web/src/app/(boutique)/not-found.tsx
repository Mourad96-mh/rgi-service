import Link from 'next/link';
import { routes } from '@/lib/routes';

export default function NotFound() {
  return (
    <div className="wrap grid min-h-[50vh] place-items-center py-16 text-center sm:py-20">
      <div className="max-w-md">
        <p className="t-display grad-text font-display font-bold">404</p>
        <h1 className="t-h1 mt-2 font-display font-bold">Cette page n’existe pas.</h1>
        <p className="mt-3 text-muted">
          Le produit a peut-être été retiré du catalogue ou l’adresse est incorrecte.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href={routes.home} className="btn btn-primary">
            Retour à l’accueil
          </Link>
          <Link href={routes.configurator} className="btn btn-ghost">
            Configurer un PC
          </Link>
        </div>
      </div>
    </div>
  );
}
