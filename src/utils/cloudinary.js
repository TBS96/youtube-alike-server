import { v2 as cloudinary } from 'cloudinary'
import fs from 'node:fs'

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return 'Could not find the path';

        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })

        // file has been uploaded successfully
        // console.log(`Local File Path: ${localFilePath}`);
        console.log(`File is uploaded in cloudinary(url): ${response.url}`);
        // console.log(`File is uploaded in cloudinary(secure_url): ${response.secure_url}`);
        // console.log(`File is uploaded in cloudinary(original_filename): ${response.original_filename}`);
        return response;
    }
    catch (error) {
        fs.unlinkSync(localFilePath);   // removes the locally saved temporary file as the upload operation got failed.
        return null;
    }
};

export { uploadOnCloudinary };



// cloudinary.uploader.upload("/home/my_image.jpg", {upload_preset: "my_preset"}, (error, result)=>{
//   console.log(result, error);
// });


// the above code is a reusable utility fn and cloudinary SDK setup