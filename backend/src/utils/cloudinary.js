const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} buffer - The file buffer (from multer memoryStorage)
 * @param {string} folder - Cloudinary folder name (e.g. 'properties', 'avatars')
 * @returns {Promise<string>} The secure URL of the uploaded file
 */
const uploadToCloudinary = (buffer, folder = 'general') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `property-rental/${folder}`,
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

module.exports = { uploadToCloudinary };
