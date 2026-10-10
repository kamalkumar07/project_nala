/**
 * imageCompressor.js — client-side image compression utility.
 *
 * Requirements:
 *   • Max dimension 1600px (scales down preserving aspect ratio)
 *   • Outputs JPEG at ~0.8 quality
 *   • Outputs compressed File / Blob and temporary preview URL
 *   • Rejects non-images and memory corruption errors cleanly
 */

export async function compressImage(file, options = {}) {
  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.8;

  if (!file) {
    throw new Error('No file provided for compression.');
  }

  // Validate MIME type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
  if (!file.type.startsWith('image/') && !validTypes.includes(file.type.toLowerCase())) {
    throw new Error('Please select an image file (JPEG, PNG, WebP).');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image from device. Please try again.'));
    };

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Failed to parse image data. Please choose a valid photo.'));
      };

      img.onload = () => {
        let { width, height } = img;

        // Downscale to max 1600px maintaining aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser canvas is unavailable.'));
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with 0.8 quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed.'));
              return;
            }

            const baseName = (file.name || 'hazard-photo').replace(/\.[^.]+$/, '');
            const compressedFileName = `${baseName}-compressed.jpg`;
            const compressedFile = new File([blob], compressedFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            const previewUrl = URL.createObjectURL(blob);

            resolve({
              file: compressedFile,
              previewUrl,
              originalSize: file.size,
              compressedSize: blob.size,
              width,
              height,
            });
          },
          'image/jpeg',
          quality,
        );
      };

      img.src = readerEvent.target?.result;
    };

    reader.readAsDataURL(file);
  });
}
