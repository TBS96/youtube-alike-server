import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler( async (req, res) => {
    /* ** algorithm to follow step by step, for user registration **
    1. get user details from frontend
    2. validation - not empty
    3. check if user already exists: we can check either by username or email or both
    4. check for images, check for avatar
    5. if images available, upload them to cloudinary: avatar is required
    6. create user object - create entry in db
    7. if user created, then remove password and refresh token keys from response
    8. check for user creation
    9. if user created, return response with user obj, else return error msg
    */


    // ============= 1. get user details from frontend =============
    const { fullName, email, username, password } = req.body;
    console.log(`Email: ${email}, Full Name: ${fullName}, Username: ${username}, Password: ${password}`);
    console.log(`Req Files (uploaded files):`, req.files);
    // ============= 1. get user details from frontend =============


    // ========== 2. validation - check whether the required fields are empty or not ==========
    // if (fullName === '') {
    //     throw new ApiError(400, 'fullname is required');
    // }

    // better way to check for validation at once with if condition, by passing the keys in an array
    if ([fullName, email, username, password].some((field) => field?.trim() === '')) {
        throw new ApiError(400, 'All fields are required');
    }
    // ========== 2. validation - check whether the required fields are empty or not ==========


    // 3. ======== check whether user exists in the db or not, with either username or email ========
    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    });
    // console.log(`Existing user: ${existingUser}`);

    if (existingUser) {
        throw new ApiError(409, 'User with this email or username already exists');
    }
    // 3. ======== check whether user exists in the db or not, with either username or email ========


    // ============ 4. check for images ============
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // console.log(`Avatar local path: ${avatarLocalPath}`);
    const coverImageLocalPath = req?.files?.coverImage?.[0].path;

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar file is required');
    }
    // ============ 4. check for images ============


    // =========== 5. if images available, upload them to cloudinary ===========
    // const avatar = await uploadOnCloudinary(avatarLocalPath);
    const avatar = avatarLocalPath ? await uploadOnCloudinary(avatarLocalPath) : null;
    // console.log(`Avatar uploaded on cloudinary: ${avatar}`);
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath): null;

    if (!avatar) {
        throw new ApiError(400, 'Avatar file is required');
    }
    // =========== 5. if images available, upload them to cloudinary ===========


    // ============ 6. create user object - create entry in db ============
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || '',
        email,
        password,
        username: username.toLowerCase()
    })
    // ============ 6. create user object - create entry in db ============


    // ======== 7. if user created, then remove password and refresh token keys from response ========
    const createdUser = await User.findById(user._id).select('-password -refreshToken');    // by default in mongodb, all fields are selected, so here, inside 'select()' method we need to pass the keys we wanna exclude with minus sign, as shown in syntax above
    // console.log(`Created user: ${createdUser}`);
    // ======== 7. if user created, then remove password and refresh token keys from response ========

    
    // ============ 8. check for user creation, if not, throw error msg ============
    if (!createdUser) {
        throw new ApiError(500, 'Something went wrong while registering the user.');
    }
    // ============ 8. check for user creation ============


    // ========= 9. if user created, return response with created-user obj =========
    return res.status(201).json(
        new ApiResponse(200, createdUser, 'User registered successfully')
    )
    // ========= 9. if user created, return response with created-user obj =========
});

export {
    registerUser,
};




// writing in steps for logic building in mind