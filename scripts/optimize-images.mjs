import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join, extname } from 'path';

const PUBLIC_DIR = './public';
const OUTPUT_WIDTH = 800;
const QUALITY = 75;

async function optimizeImages() {
  const files = await readdir(PUBLIC_DIR);
  
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (!['.jpeg', '.jpg', '.png'].includes(ext)) continue;
    if (file.startsWith('login_bg') && file.includes('optimized')) continue;
    
    const inputPath = join(PUBLIC_DIR, file);
    const outputPath = join(PUBLIC_DIR, file.replace(/\.(jpeg|jpg|png)$/, '.webp'));
    const outputName = file.replace(/\.(jpeg|jpg|png)$/, '.webp');
    
    try {
      await sharp(inputPath)
        .resize(OUTPUT_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 6 })
        .toFile(outputPath);
      
      const originalSize = (await import('fs')).statSync(inputPath).size;
      const optimizedSize = (await import('fs')).statSync(outputPath).size;
      const saved = Math.round((1 - optimizedSize / originalSize) * 100);
      
      console.log(`${file} → ${outputName} (${Math.round(originalSize/1024)}KB → ${Math.round(optimizedSize/1024)}KB, -${saved}%)`);
    } catch (err) {
      console.error(`Error: ${file}`, err.message);
    }
  }
  
  // Optimize logo separately (keep higher quality)
  try {
    const logoInput = join(PUBLIC_DIR, 'logo.png');
    const logoOutput = join(PUBLIC_DIR, 'logo.webp');
    await sharp(logoInput)
      .resize(400, null, { withoutEnlargement: true })
      .webp({ quality: 85, effort: 6 })
      .toFile(logoOutput);
    
    const origSize = (await import('fs')).statSync(logoInput).size;
    const newSize = (await import('fs')).statSync(logoOutput).size;
    console.log(`logo.png → logo.webp (${Math.round(origSize/1024)}KB → ${Math.round(newSize/1024)}KB, -${Math.round((1 - newSize/origSize) * 100)}%)`);
  } catch (err) {
    console.error('Error optimizing logo:', err.message);
  }
}

optimizeImages();
