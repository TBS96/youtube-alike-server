import dotenv from 'dotenv'

dotenv.config({
    path: './.env'
});

const conf = {
    port: process.env.PORT,
    mongoDBUri: process.env.MONGODB_URI,
    corsOrigin: process.env.MONGODB_URI,
    accessTokenSecret: process.env.MONGODB_URI,
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
};

export default conf;