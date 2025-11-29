import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import conf from '../conf/conf.js';
import { options } from '../constants.js';



// reusable fn. to generate access and refresh tokens
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })

        // console.log('Access token', accessToken);
        // console.log('Refresh token', refreshToken);
        return {accessToken, refreshToken};
    }
    catch (error) {
        throw new ApiError(500, 'Something went wrong while generating refresh and access tokens');
    }
}
// reusable fn. to generate access and refresh tokens



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



const loginUser = asyncHandler( async (req, res) => {
    /* ** algorithm to follow step by step, for user login **
    1. get email/username and password from frontend
    2. validation - no email or email
    3. check for user existence in DB -> find the user
    4. password check
    5. generate access & refresh tokens for the user id, if user exists in DB
    6. send access & refresh tokens in cookies
    */

    // ================ 1. get email/username and password from frontend ================
    const { email, username, password } = req.body;
    console.log(`Email: ${email}, Username: ${username}, Password: ${password}`);
    // ================ 1. get email/username and password from frontend ================


    // ================ 2. validation - no email or username ================
    // if (!(username || email)) {
    if (!username && !email) {
        throw new ApiError(400, 'Username or email is required');
    }
    // ================ 2. validation - no email or username ================


    // ================ 3. check for user existence in DB -> find the user ================
    const user = await User.findOne({
        $or: [{email}, {username}]
    });

    if (!user) {
        throw new ApiError(404, 'User does not exist');
    }
    // ================ 3. check for user existence in DB -> find the user ================
    

    // ================ 4. password check ================
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid user credentials');
    }
    // ================ 4. password check ================


    // =========== 5. generate access & refresh tokens for the user id, if user exists in DB ===========
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    // =========== 5. generate access & refresh tokens for the user id, if user exists in DB ===========

    
    // ============ 6. send access & refresh tokens in cookies ============
    // exclude sensitive fields (password, refreshToken) from the User object
    const loggedInUser = await User.findById(user._id).select('-password -refreshToken');
    // console.log(loggedInUser);


    /* NOTE:
    WHY SENDING TOKENS IN BOTH COOKIE + JSON?
    - Cookies → used by web apps (browser automatically stores & sends them)
    - JSON response → required for mobile apps
    
    This makes the API multi-platform compatible.
    - Browser apps use cookies only.
    - Mobile apps pick tokens from JSON and store securely on device.
    */

    return res
    .status(200)
    .cookie('accessToken', accessToken, options)    // for web clients
    .cookie('refreshToken', refreshToken, options)  // for web clients
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken: accessToken,    // for immediate use (web/mobile)
                refreshToken   // needed for mobile apps (no cookies)
            },
            'User logged in successfully'
        )
    )
    // ============ 6. send access & refresh tokens in cookies ============
});



const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(
        new ApiResponse(200, {}, 'User logged out successfully')
    )
});



const refreshTheAccessToken = asyncHandler( async (req, res) => {
    /* ** algorithm to follow step by step, for refreshing the access token **
    1. get incoming refresh token from cookies (web) or request body (mobile / API client)
    2. validate - if no refresh token found, block the request as unauthorized
    3. verify and decode the refresh token using the refreshTokenSecret (jwt.verify)
    4. find the user in DB using the decoded user id
    5. validate - if user not found, treat refresh token as invalid
    6. check that the incoming refresh token matches the refreshToken stored in DB
    7. generate a new access token and a new refresh token for this user (token rotation)
    8. send back the new access & refresh tokens in cookies (for web) and JSON response (for mobile / API clients)
    */

    // ======== 1. incomingRefreshToken is the refresh token sent from the client, coming either from cookies (web browsers) or request body (mobile apps). It is used to request a new access token when the old one expires. Without this token, the server cannot verify if the user session is still valid. ========
    // console.log('req.cookies?.refreshToken:', req.cookies?.refreshToken);
    // console.log('req.body?.refreshToken:', req.body?.refreshToken);
    // console.log("req.header", req.header('Authorization')?.replace('Bearer ', ''));

    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.header('Authorization')?.replace('Bearer ', '');
    // console.log('incoming refresh token:', incomingRefreshToken);
    // ======== 1. incomingRefreshToken is the refresh token sent from the client, coming either from cookies (web browsers) or request body (mobile apps). It is used to request a new access token when the old one expires. Without this token, the server cannot verify if the user session is still valid. ========


    // 2. ======== validate - if no refresh token found, block the request as unauthorized ========
    if (!incomingRefreshToken) {
        throw new ApiError(401, 'Unauthorized request');
    }
    // 2. ======== validate - if no refresh token found, block the request as unauthorized ========


    try {
        // ======== 3. decodedToken verifies and decodes the refresh token to extract the user ID and ensure the token is valid and not expired ========
        const decodedToken = jwt.verify(incomingRefreshToken, conf.refreshTokenSecret);
        // console.log('decoded token:', decodedToken);
        // ======== 3. decodedToken verifies and decodes the refresh token to extract the user ID and ensure the token is valid and not expired ========

    
        // ======== 4. fetches the user from the DB using the decoded user ID to ensure the refresh token belongs to a valid existing user ========
        const user = await User.findById(decodedToken?._id);
        // console.log('user:', user);
        // ======== 4. fetches the user from the DB using the decoded user ID to ensure the refresh token belongs to a valid existing user ========
    
        
        // =========== 5. validate - if user not found, treat refresh token as invalid ===========
        if (!user) {
            throw new ApiError(401, 'Invalid refresh token');
        }
        // =========== 5. validate - if user not found, treat refresh token as invalid ===========

    
        // =========== 6. ensures the provided refresh token from client matches the one stored in the database to prevent reuse of expired or stolen tokens ===========
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, 'Refresh token is expired or used');
        }
        // =========== 6. ensures the provided refresh token from client matches the one stored in the database to prevent reuse of expired or stolen tokens ===========
    
        
        // ======== 7. generate a new access token and a new refresh token for this user (token rotation) ========
        // const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
        // renamed to newRefreshToken => freshly generated refresh token replacing the old one to maintain secure token rotation
        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
        // ======== 7. generate a new access token and a new refresh token for this user (token rotation) ========

    
        // ========== 8. send back the new access & refresh tokens in cookies (for web) and JSON response (for mobile / API clients) ==========
        return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        // .cookie('refreshToken', refreshToken, options)
        .cookie('refreshToken', newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    // refreshToken
                    refreshToken: newRefreshToken
                },
                'Access token refreshed'
            )
        )
        // ========== 8. send back the new access & refresh tokens in cookies (for web) and JSON response (for mobile / API clients) ==========
    }
    catch (error) {
        throw new ApiError(401, error?.message || 'Invalid refresh token');
    }
});



const changeCurrentPassword = asyncHandler( async (req, res) => {
    /* ** algorithm to follow step by step, for change current password **
    1. get oldPassword and newPassword from the request body
    2. find the currently authenticated user using req.user._id (set by verifyJWT middleware)
    3. verify if the provided oldPassword matches the stored password in DB. if incorrect, throw an error for invalid old password
    4. update the user's password with the newPassword and save the updated user to the database (skip validation for refreshToken field)
    5. return a success response confirming password update
    */

    // ============== 1. get oldPassword and newPassword from the request body ==============
    const { oldPassword, newPassword } = req.body;
    // ============== 1. get oldPassword and newPassword from the request body ==============

    
    // =============== 2. find the currently authenticated user using req.user._id (set by verifyJWT middleware) ===============
    const user = await User.findById(req.user?._id);
    // =============== 2. find the currently authenticated user using req.user._id (set by verifyJWT middleware) ===============


    // ========== 3. verify if the provided oldPassword matches the stored password in DB. if incorrect, throw an error for invalid old password ==========
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, 'Invalid Old Password');
    }
    // ========== 3. verify if the provided oldPassword matches the stored password in DB. if incorrect, throw an error for invalid old password ==========


    // ======== 4. update the user's password with the newPassword and save the updated user to the database (skip validation for refreshToken field) ========
    user.password = newPassword;
    await user.save({ validateBeforeSave: false })
    // ======== 4. update the user's password with the newPassword and save the updated user to the database (skip validation for refreshToken field) ========


    // ============ 5. return a success response confirming password update ============
    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, 'Password changed successfully')
    )
    // ============ 5. return a success response confirming password update ============
});



const getCurrentUser = asyncHandler( async (req, res) => {
    /* ** algorithm to follow step by step, for getting current authenticated user **
    1. verifyJWT middleware authenticates the user and attaches the user data to req.user
    2. directly return the req.user object as the currently logged-in user’s info
    3. send a success response with the user details
    */

    return res
    .status(200)
    .json(
        new ApiResponse(200, req.user, 'Current user fetched successfully')
    )
});



const updateAccountDetails = asyncHandler( async (req, res) => {
    /* ** algorithm to follow step by step, for updating account details **
    1. extract fullName and email from the request body
    2. validate that both fields are provided, otherwise throw an error
    3. find the currently authenticated user using req.user._id and update the provided fields in the database and exclude password
    4. send a success response confirming the update
    */

    // ============== 1. extract fullName and email from the request body ==============
    const { fullName, email } = req.body;
    // ============== 1. extract fullName and email from the request body ==============


    // ================ 2. validate that both fields are provided, otherwise throw an error ================
    if (!fullName || !email) {
        throw new ApiError(400, 'All fields are required');
    }
    // ================ 2. validate that both fields are provided, otherwise throw an error ================


    // ========= 3. find the currently authenticated user using req.user._id and update the provided fields in the database and exclude password =========
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select('-password')
    // ========= 3. find the currently authenticated user using req.user._id and update the provided fields in the database and exclude password =========


    // ========== 4. send a success response confirming the update ==========
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, 'Account details updated successfully')
    )
    // ========== 4. send a success response confirming the update ==========
});



const updateUserAvatar = asyncHandler( async (req, res) => {
    /* ** algorithm to follow step by step, for updating user avatar **
    1. extract the uploaded image path from req.file (handled by multer)
    2. validate that an avatar file is provided, otherwise throw an error
    3. upload the avatar image to Cloudinary and get the hosted image URL
    4. validate the upload success by ensuring the returned URL exists
    5. update the authenticated user’s avatar field in the database with the new image URL and exclude password
    6. send a success response confirming the avatar update
    */

    // =========== 1. extract the uploaded image path from req.file (handled by multer) ===========
    const avatarLocalPath = req.file?.path;
    // console.log('Update user avatar path:', avatarLocalPath);
    // =========== 1. extract the uploaded image path from req.file (handled by multer) ===========


    // ========== 2. validate that an avatar file is provided, otherwise throw an error ==========
    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar file is missing');
    }
    // ========== 2. validate that an avatar file is provided, otherwise throw an error ==========


    // ================== 3. upload the avatar image to Cloudinary and get the hosted image URL ==================
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // ================== 3. upload the avatar image to Cloudinary and get the hosted image URL ==================

    
    // ================== 4. validate the upload success by ensuring the returned URL exists ==================
    if (!avatar.url) {
        throw new ApiError(400, 'Error while uploading on avatar');
    }
    // ================== 4. validate the upload success by ensuring the returned URL exists ==================

    
    // =============== 5. update the authenticated user’s avatar field in the database with the new image URL and exclude password ===============
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select('-password');
    // =============== 5. update the authenticated user’s avatar field in the database with the new image URL and exclude password ===============

    
    // ================ 6. send a success response confirming the avatar update ================
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, 'Avatar image updated successfully')
    )
    // ================ 6. send a success response confirming the avatar update ================
});



const updateUserCoverImage = asyncHandler( async (req, res) => {
    /* ** algorithm to follow step by step, for updating user cover image **
    1. extract the uploaded image path from req.file (handled by multer)
    2. validate that cover image file is provided, otherwise throw an error
    3. upload the cover image to Cloudinary and get the hosted image URL
    4. validate the upload success by ensuring the returned URL exists
    5. update the authenticated user’s coverImage field in the database with the new image URL and exclude password
    6. send a success response confirming the coverImage update
    */

    // =========== 1. extract the uploaded image path from req.file (handled by multer) ===========
    const coverImageLocalPath = req.file?.path;
    // console.log('Update user cover path:', coverImageLocalPath);
    // =========== 1. extract the uploaded image path from req.file (handled by multer) ===========


    // ========== 2. validate that cover image file is provided, otherwise throw an error ==========
    if (!coverImageLocalPath) {
        throw new ApiError(400, 'Cover image file is missing');
    }
    // ========== 2. validate that cover image file is provided, otherwise throw an error ==========


    // ================== 3. upload the cover image to Cloudinary and get the hosted image URL ==================
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // ================== 3. upload the cover image to Cloudinary and get the hosted image URL ==================

    
    // ================== 4. validate the upload success by ensuring the returned URL exists ==================
    if (!coverImage.url) {
        throw new ApiError(400, 'Error while uploading on cover image');
    }
    // ================== 4. validate the upload success by ensuring the returned URL exists ==================

    
    // =============== 5. update the authenticated user’s coverImage field in the database with the new image URL and exclude password ===============
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage
            }
        },
        {
            new: true
        }
    ).select('-password');
    // =============== 5. update the authenticated user’s coverImage field in the database with the new image URL and exclude password ===============

    
    // ================ 6. send a success response confirming the coverImage update ================
    return res
    .status(200)
    .json(
        new ApiResponse(200, user, 'Cover image updated successfully')
    )
    // ================ 6. send a success response confirming the coverImage update ================
});


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshTheAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
};




// writing in steps for logic building in mind

/*
** NOTES for access and refresh tokens:**
Why we exclude fields (-password -refreshToken):
- to avoid exposing sensitive information in the API response.

why refreshToken exists in cookies AND JSON:
- to support both browser clients (cookies) and mobile apps (JSON body).

why cookies are used for web apps:
- because browsers automatically store and send HTTP-only cookies securely.

why JSON tokens are required for mobile apps:
- because mobile apps don’t have browser cookies and must store tokens manually.

why this makes the auth system multi-platform and robust:
- because it works securely for both web applications and mobile clients with one unified API.
*/


/*
**NOTES for logoutUser():**
why we delete the stored refreshToken in DB? (using $set)
- to invalidate all existing sessions so the user cannot refresh tokens anymore.

why we clear cookies(accessToken and refreshToken)?
- to remove the client-side tokens so the browser or app cannot make authenticated requests.
*/