import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

//Ejecutar el script utilizando el comando pnpm run dev:backend
//Este script es un helper para ayudar a levantar el servidor de vercel para pruebas
//manuales locales durante el desarrollo
const GO_VERSION = '1.22.0';

function getVercelGoCacheDir() {
    const platform = process.platform;
    const arch = process.arch;

    let baseCacheDir;
    let folderName;

    if (platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        baseCacheDir = path.join(localAppData, 'com.vercel.cli', 'Cache', 'golang');
        folderName = `${GO_VERSION}_win32_${arch}`;
    } else if (platform === 'darwin') {
        baseCacheDir = path.join(os.homedir(), 'Library', 'Caches', 'com.vercel.cli', 'golang');
        folderName = `${GO_VERSION}_darwin_${arch}`;
    } else {
        const xdgCache = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
        baseCacheDir = path.join(xdgCache, 'com.vercel.cli', 'golang');
        folderName = `${GO_VERSION}_linux_${arch}`;
    }

    return {
        baseCacheDir,
        targetDir: path.join(baseCacheDir, folderName),
        folderName,
        platform,
        arch,
    };
}

function resolveGoArch(arch) {
    if (arch === 'x64') {
        return 'amd64';
    }
    if (arch === 'ia32') {
        return '386';
    }
    return arch;
}

function cleanBrokenDownloads(baseCacheDir) {
    try {
        const entries = fs.readdirSync(baseCacheDir);
        for (const entry of entries) {
            if (entry.includes('.tmp-')) {
                fs.rmSync(path.join(baseCacheDir, entry), { recursive: true, force: true });
            }
        }
    } catch {
        // Ignorar errores al limpiar temporales huérfanos
    }
}

function downloadArchive(url, tempFile, platform) {
    const curlBinary = platform === 'win32' ? 'curl.exe' : 'curl';
    execSync(`${curlBinary} -L -o "${tempFile}" "${url}"`, { stdio: 'inherit' });
}

function extractArchive(tempFile, targetDir) {
    try {
        execSync(`tar -xf "${tempFile}" -C "${targetDir}" --strip-components 1`, { stdio: 'inherit' });
    } catch (err) {
        console.error('[setup-vercel-go] Error al descomprimir con tar:', err);
        process.exit(1);
    } finally {
        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }
    }
}

async function main() {
    const { baseCacheDir, targetDir, platform, arch } = getVercelGoCacheDir();
    const markerFile = path.join(targetDir, '.vercel-go-install-complete');
    const binaryName = platform === 'win32' ? 'go.exe' : 'go';
    const binaryPath = path.join(targetDir, 'bin', binaryName);

    if (fs.existsSync(markerFile) && fs.existsSync(binaryPath)) {
        console.log(`[setup-vercel-go] ✓ Go ${GO_VERSION} ya está instalado y listo en la caché de Vercel:`);
        console.log(`                   ${targetDir}`);
        return;
    }

    console.log(`[setup-vercel-go] Configurando Go ${GO_VERSION} para Vercel CLI (${platform}_${arch})...`);

    fs.mkdirSync(baseCacheDir, { recursive: true });
    cleanBrokenDownloads(baseCacheDir);

    const ext = platform === 'win32' ? 'zip' : 'tar.gz';
    const goPlatform = platform === 'win32' ? 'windows' : platform;
    const goArch = resolveGoArch(arch);
    const filename = `go${GO_VERSION}.${goPlatform}-${goArch}.${ext}`;
    const url = `https://dl.google.com/go/${filename}`;
    const tempFile = path.join(os.tmpdir(), filename);

    console.log(`[setup-vercel-go] Descargando Go desde ${url}...`);
    downloadArchive(url, tempFile, platform);

    console.log(`[setup-vercel-go] Extrayendo en ${targetDir}...`);
    fs.mkdirSync(targetDir, { recursive: true });
    extractArchive(tempFile, targetDir);

    fs.writeFileSync(markerFile, GO_VERSION, 'utf8');
    console.log(`[setup-vercel-go] ✓ Go ${GO_VERSION} instalado con éxito en la caché de Vercel.`);
}

try {
    await main();
} catch (err) {
    console.error('[setup-vercel-go] Error fatal:', err);
    process.exit(1);
}
