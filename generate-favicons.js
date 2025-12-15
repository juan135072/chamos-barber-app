const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  const inputPath = path.join(__dirname, 'public', 'chamos-logo.png');
  const outputDir = path.join(__dirname, 'public');

  // Crear directorio si no existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎨 Generando favicons desde:', inputPath);

  try {
    // favicon.ico (32x32) - Este será el favicon principal
    await sharp(inputPath)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(outputDir, 'favicon.ico'));
    console.log('✅ favicon.ico (32x32)');

    // favicon-16x16.png
    await sharp(inputPath)
      .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, 'favicon-16x16.png'));
    console.log('✅ favicon-16x16.png');

    // favicon-32x32.png
    await sharp(inputPath)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, 'favicon-32x32.png'));
    console.log('✅ favicon-32x32.png');

    // apple-touch-icon.png (180x180)
    await sharp(inputPath)
      .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    console.log('✅ apple-touch-icon.png (180x180)');

    // android-chrome-192x192.png
    await sharp(inputPath)
      .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, 'android-chrome-192x192.png'));
    console.log('✅ android-chrome-192x192.png');

    // android-chrome-512x512.png
    await sharp(inputPath)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, 'android-chrome-512x512.png'));
    console.log('✅ android-chrome-512x512.png');

    console.log('\n🎉 ¡Todos los favicons generados exitosamente!');
    
  } catch (error) {
    console.error('❌ Error generando favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
