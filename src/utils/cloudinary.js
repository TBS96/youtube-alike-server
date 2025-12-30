import { v2 as cloudinary } from 'cloudinary'
import fs from 'node:fs'
import conf from '../conf/conf.js';

// console.log(`Cloud Name: ${conf.cloudinaryCloudName}`);
// console.log(`API Key: ${conf.cloudinaryApiKey}`);
// console.log(`API Secret: ${conf.cloudinaryApiSecret}`);

cloudinary.config({ 
  cloud_name: conf.cloudinaryCloudName,
  api_key: conf.cloudinaryApiKey,
  api_secret: conf.cloudinaryApiSecret
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return 'Could not find the path';

        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto',
        })

        // file has been uploaded successfully
        // console.log(`Local File Path: ${localFilePath}`);
        // console.log(`File is uploaded in cloudinary(url): ${response.url}`);
        // console.log(`File is uploaded in cloudinary(secure_url): ${response.secure_url}`);
        // console.log(`File is uploaded in cloudinary(original_filename): ${response.original_filename}`);

        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return response;
    }
    catch (error) {
        console.error('CLOUDIDARY REJECTION ERROR:', error.message);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);   // removes the locally saved temporary file as the upload operation got failed.
        }
        return null;
    }
};

const deleteFromCloudinary = async (publicId, resourceType = 'image')  => {
    try {
        if (!publicId) return null;
    
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        console.log(`Cloudinary deletion result for ID ${publicId}:`, response);
    
        if (response.result !== 'ok' && response.result  !== 'not found') {
            console.error(`Cloudinary  failed to delete the file with public id: ${publicId}  ; Response: ${response.result}`);
        }
    
        return response;
    }
    catch (error) {
        console.error('CLOUDIDARY DELETION ERROR:',error);
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };



// cloudinary.uploader.upload("/home/my_image.jpg", {upload_preset: "my_preset"}, (error, result)=>{
//   console.log(result, error);
// });


// the above code is a reusable utility fn and cloudinary SDK setup