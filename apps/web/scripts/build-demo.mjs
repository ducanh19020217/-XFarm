import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');

const appDir = path.join(webDir, 'src/app');
const adminDir = path.join(appDir, 'admin');
const tempAdminDir = path.join(webDir, '.temp-admin');

const loginDir = path.join(appDir, 'login');
const tempLoginDir = path.join(webDir, '.temp-login');

const middlewareFile = path.join(webDir, 'src/middleware.ts');
const tempMiddlewareFile = path.join(webDir, '.temp-middleware.ts');

const ogProductFile = path.join(appDir, '(public)/san-pham/[slug]/opengraph-image.tsx');
const tempOgProductFile = path.join(webDir, '.temp-og-product.tsx');

const ogTourFile = path.join(appDir, '(public)/tour/[slug]/opengraph-image.tsx');
const tempOgTourFile = path.join(webDir, '.temp-og-tour.tsx');

const outDir = path.join(webDir, 'out');
const nextDir = path.join(webDir, '.next');

const demoNoticePageContent = `

import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function DemoRestrictedPage() {
  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4 text-fg">
      <div className="max-w-md w-full bg-surface rounded-3xl shadow-sm border border-line p-8 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-fg">Bản demo giới hạn</h1>
          <p className="text-sm text-fg-2 leading-relaxed">
            Tính năng quản trị chỉ có ở bản cài đặt đầy đủ.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-surface font-semibold text-sm transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Quay về trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
`;

function getDemoAdminPaths(directory, relativeDirectory = '') {
  const paths = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    const relativePath = path.join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      paths.push(...getDemoAdminPaths(entryPath, relativePath));
      continue;
    }

    if (entry.name !== 'page.tsx' && entry.name !== 'page.ts') continue;
    if (!relativeDirectory) continue;

    const segments = relativeDirectory
      .split(path.sep)
      .map((segment) =>
        segment.replace(/^\[\[?\.\.\.(.+?)\]\]?$/, 'demo').replace(/^\[(.+?)\]$/, 'demo'),
      );
    paths.push(segments);
  }

  return paths;
}

function getDemoAdminStaticParams(directory) {
  const paths = getDemoAdminPaths(directory);
  const params = new Map();

  for (const pathSegments of paths) {
    params.set(JSON.stringify(pathSegments), pathSegments);

    // Static export cannot serve arbitrary dynamic segments. Generate a few
    // representative IDs so every admin/PWA route family still has a demo page.
    if (pathSegments.includes('demo')) {
      for (const value of ['123', 'abc']) {
        const variant = pathSegments.map((segment) => (segment === 'demo' ? value : segment));
        params.set(JSON.stringify(variant), variant);
      }
    }
  }

  return [...params.values()].map((slug) => ({ slug }));
}

function createDemoAdminCatchAllPage(staticParams) {
  return `${demoNoticePageContent}

export function generateStaticParams() {
  return ${JSON.stringify(staticParams)};
}
`;
}

let cleanedUp = false;

function restore() {
  if (cleanedUp) return;
  cleanedUp = true;

  console.log('[build:demo] Restoring original files...');

  // Restore admin
  if (fs.existsSync(tempAdminDir)) {
    try {
      if (fs.existsSync(adminDir)) {
        fs.rmSync(adminDir, { recursive: true, force: true });
      }
      fs.renameSync(tempAdminDir, adminDir);
    } catch (err) {
      console.error('[build:demo] Failed to restore admin dir:', err);
    }
  }

  // Restore login
  if (fs.existsSync(tempLoginDir)) {
    try {
      if (fs.existsSync(loginDir)) {
        fs.rmSync(loginDir, { recursive: true, force: true });
      }
      fs.renameSync(tempLoginDir, loginDir);
    } catch (err) {
      console.error('[build:demo] Failed to restore login dir:', err);
    }
  }

  // Restore middleware
  if (fs.existsSync(tempMiddlewareFile)) {
    try {
      if (fs.existsSync(middlewareFile)) {
        fs.rmSync(middlewareFile, { force: true });
      }
      fs.renameSync(tempMiddlewareFile, middlewareFile);
    } catch (err) {
      console.error('[build:demo] Failed to restore middleware file:', err);
    }
  }

  // Restore dynamic OG images
  if (fs.existsSync(tempOgProductFile)) {
    try {
      if (fs.existsSync(ogProductFile)) {
        fs.rmSync(ogProductFile, { force: true });
      }
      fs.renameSync(tempOgProductFile, ogProductFile);
    } catch (err) {
      console.error('[build:demo] Failed to restore product OG image:', err);
    }
  }

  if (fs.existsSync(tempOgTourFile)) {
    try {
      if (fs.existsSync(ogTourFile)) {
        fs.rmSync(ogTourFile, { force: true });
      }
      fs.renameSync(tempOgTourFile, ogTourFile);
    } catch (err) {
      console.error('[build:demo] Failed to restore tour OG image:', err);
    }
  }

  // Demo compilation creates route type declarations for temporary placeholders.
  // Remove them so a subsequent regular typecheck only sees restored source files.
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
  }
}

process.on('SIGINT', () => {
  restore();
  process.exit(130);
});

process.on('SIGTERM', () => {
  restore();
  process.exit(143);
});

async function main() {
  console.log('[build:demo] Preparing demo build environment...');

  // 1. Stash admin
  if (fs.existsSync(adminDir) && !fs.existsSync(tempAdminDir)) {
    fs.renameSync(adminDir, tempAdminDir);
    fs.mkdirSync(adminDir, { recursive: true });
    fs.writeFileSync(path.join(adminDir, 'page.tsx'), demoNoticePageContent, 'utf-8');

    const adminCatchAllDir = path.join(adminDir, '[...slug]');
    fs.mkdirSync(adminCatchAllDir, { recursive: true });
    fs.writeFileSync(
      path.join(adminCatchAllDir, 'page.tsx'),
      createDemoAdminCatchAllPage(getDemoAdminStaticParams(tempAdminDir)),
      'utf-8',
    );

    // Preserve types needed by mobile-api / offline-queue
    const typesSrc = path.join(tempAdminDir, 'hr/common/types.ts');
    if (fs.existsSync(typesSrc)) {
      const typesDestDir = path.join(adminDir, 'hr/common');
      fs.mkdirSync(typesDestDir, { recursive: true });
      fs.copyFileSync(typesSrc, path.join(typesDestDir, 'types.ts'));
    }
  }

  // 2. Stash login
  if (fs.existsSync(loginDir) && !fs.existsSync(tempLoginDir)) {
    fs.renameSync(loginDir, tempLoginDir);
    fs.mkdirSync(loginDir, { recursive: true });
    fs.writeFileSync(path.join(loginDir, 'page.tsx'), demoNoticePageContent, 'utf-8');
  }

  // 3. Stash middleware
  if (fs.existsSync(middlewareFile) && !fs.existsSync(tempMiddlewareFile)) {
    fs.renameSync(middlewareFile, tempMiddlewareFile);
  }

  // 4. Stash dynamic OG images (only root OG image is exported for demo)
  if (fs.existsSync(ogProductFile) && !fs.existsSync(tempOgProductFile)) {
    fs.renameSync(ogProductFile, tempOgProductFile);
  }
  if (fs.existsSync(ogTourFile) && !fs.existsSync(tempOgTourFile)) {
    fs.renameSync(ogTourFile, tempOgTourFile);
  }

  // 4. Run next build
  const env = {
    ...process.env,
    NEXT_PUBLIC_DEMO: '1',
    NODE_ENV: 'production',
  };

  const code = await new Promise((resolve) => {
    const child = spawn('next', ['build'], {
      cwd: webDir,
      stdio: 'inherit',
      shell: true,
      env,
    });

    child.on('exit', (exitCode) => {
      resolve(exitCode ?? 1);
    });
  });

  if (code !== 0) {
    throw new Error(`next build failed with exit code ${code}`);
  }

  // 5. Create .nojekyll in out directory
  if (fs.existsSync(outDir)) {
    const nojekyllPath = path.join(outDir, '.nojekyll');
    fs.writeFileSync(nojekyllPath, '', 'utf-8');
    console.log(`[build:demo] Created ${nojekyllPath}`);

    const indexTxt = path.join(outDir, 'index.txt');
    if (fs.existsSync(indexTxt)) {
      const xfarmTxt = path.join(outDir, '-XFarm.txt');
      fs.copyFileSync(indexTxt, xfarmTxt);
      console.log(`[build:demo] Created ${xfarmTxt} for RSC prefetch compatibility`);
    }
  } else {
    console.warn(`[build:demo] Warning: Output directory ${outDir} not found`);
  }

  console.log('[build:demo] Demo build completed successfully!');
}

try {
  await main();
} finally {
  restore();
}
