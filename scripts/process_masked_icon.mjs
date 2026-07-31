import sharp from 'sharp';
import { resolve } from 'path';
import fs from 'fs';

const colorImgPath = resolve('public/extracted_image_1.png');
const maskImgPath = resolve('public/extracted_image_0.png');

async function processIcon() {
  try {
    console.log('Procesando composición de imagen y máscara para obtener transparencia perfecta...');
    
    // Primero creamos el PNG final aplicando la máscara sobre la imagen a color.
    // En Sharp, la operación 'dest-in' de composite mantiene el color del fondo (dest)
    // sólo donde la imagen de entrada (máscara) tiene píxeles (opacidad).
    // Nota: Como la máscara extraída es una máscara SVG, usaremos dest-in.
    const maskedImageBuffer = await sharp(colorImgPath)
      .composite([{ input: maskImgPath, blend: 'dest-in' }])
      .png()
      .toBuffer();

    console.log('Composición creada. Generando iconos redimensionados...');

    // 1. apple-touch-icon.png (180x180 px para iOS)
    await sharp(maskedImageBuffer)
      .resize(180, 180)
      .png()
      .toFile(resolve('public/apple-touch-icon.png'));
    console.log('Creado public/apple-touch-icon.png');

    // 2. pwa-icon.png (192x192 px para Android)
    await sharp(maskedImageBuffer)
      .resize(192, 192)
      .png()
      .toFile(resolve('public/pwa-icon.png'));
    console.log('Creado public/pwa-icon.png');

    // 3. pwa-icon-512.png (512x512 px para Android)
    await sharp(maskedImageBuffer)
      .resize(512, 512)
      .png()
      .toFile(resolve('public/pwa-icon-512.png'));
    console.log('Creado public/pwa-icon-512.png');

    // Eliminar las imágenes intermedias extraídas para mantener limpio el repositorio
    fs.unlinkSync(colorImgPath);
    fs.unlinkSync(maskImgPath);
    console.log('Imágenes temporales eliminadas.');
    console.log('¡Proceso completado con éxito!');
  } catch (error) {
    console.error('Error al procesar el icono con máscara:', error);
  }
}

processIcon();
