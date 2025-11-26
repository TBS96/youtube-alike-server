import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';



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

    const options = {
        httpOnly: true,
        secure: true,
    };

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

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(
        new ApiResponse(200, {}, 'User logged out successfully')
    )
});


export {
    registerUser,
    loginUser,
    logoutUser,
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