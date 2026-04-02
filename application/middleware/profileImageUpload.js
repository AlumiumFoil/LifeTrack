// Middleware for authenticated profile image uploads
// Validates the uploaded file type, saves the original image and enforces
// a size limit before controller logic runs

const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxFileSizeBytes = Number(
    process.env.PROFILE_IMAGE_MAX_BYTES || 5 * 1024 * 1024
);

/**
 * Ensure that a directory exists before Multer writes a file into it
 * @param {string} directoryPath - Absolute directory path
 * @returns {void}
 */
const ensureDirectoryExists = (directoryPath) => {
    fs.mkdirSync(directoryPath, { recursive: true });
};

/**
 * Convert MIME type into a safe file extension for saved uploads
 * @param {string} mimeType - MIME type reported by Multer
 * @returns {string} Safe extension
 */
const getExtensionFromMimeType = (mimeType) => {
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/webp') return '.webp';
    return '.jpg';
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        const uploadDirectory = path.join(
            __dirname,
            '..',
            'public',
            'uploads',
            'profileImages'
        );

        ensureDirectoryExists(uploadDirectory);
        callback(null, uploadDirectory);
    },
    filename: (req, file, callback) => {
        const extension = getExtensionFromMimeType(file.mimetype);
        const uniqueSuffix = `${req.user.account_id}-${Date.now()}-${crypto
            .randomBytes(6)
            .toString('hex')}`;

        callback(null, `${uniqueSuffix}${extension}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: maxFileSizeBytes },
    fileFilter: (req, file, callback) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return callback(
                new Error('Only JPG, PNG, and WEBP profile images are allowed.')
            );
        }

        callback(null, true);
    }
});

/**
 * Route middleware wrapper that converts Multer errors into JSON responses
 * Expects a single multipart file field named profileImage
 * @param {object} req
 * @param {object} res 
 * @param {Function} next
 * @returns {void}
 */
const uploadSingleProfileImage = (req, res, next) => {
    upload.single('profileImage')(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: `Profile image must be ${maxFileSizeBytes} bytes or smaller.`
            });
        }

        return res.status(400).json({
            success: false,
            error: error.message || 'Profile image upload failed.'
        });
    });
};

module.exports = {
    uploadSingleProfileImage,
    maxFileSizeBytes,
    allowedMimeTypes
};