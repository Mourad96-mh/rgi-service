/** @type {import('next').NextConfig} */

/**
 * Two deploy targets from one codebase.
 *
 * `BUILD_TARGET=static` produces a folder of plain HTML/CSS/JS in `out/` for Hostinger's
 * shared hosting, which serves files and nothing else. Anything else builds the normal
 * server app (Vercel), where SSR, ISR, middleware and the admin API routes all work.
 *
 * The static target gives up, unavoidably:
 *   - ISR — every page is frozen at build time, so the catalogue is only as fresh as the
 *     last upload. Prices and stock come from the API in the browser instead.
 *   - middleware — the `/admin/*` session gate cannot run, which is why the admin
 *     dashboard is excluded from this build entirely (see DEPLOY_HOSTINGER.md).
 *   - `next/image` optimisation — replaced below by a Cloudinary loader, which is where
 *     the images already live, so nothing is actually lost.
 */
const isStatic = process.env.BUILD_TARGET === 'static';

const nextConfig = {
  reactStrictMode: true,
  // The shared packages are TypeScript sources consumed directly by the app.
  transpilePackages: ['@rgi/types', '@rgi/config-engine'],

  ...(isStatic
    ? {
        output: 'export',
        // A throttled request waits for the API's Retry-After before retrying (see
        // lib/api.ts). The default 60 s page budget can expire during that wait.
        staticPageGenerationTimeout: 180,
        // Apache serves `/produit/foo/` from `produit/foo/index.html` without a rewrite
        // rule; without the trailing slash every URL needs .htaccess help to resolve.
        trailingSlash: true,
        images: { loader: 'custom', loaderFile: './src/lib/cloudinary-loader.ts' },
      }
    : {
        images: {
          remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
        },
      }),
};

export default nextConfig;
