import mongoose, {Schema} from "mongoose";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avatar: {
            type: String,   // cloudinary url
            required: true,
        },
        coverImage: {
            type: String,   // cloudinary url
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Video',
            }
        ],
        password: {
            type: String,
            required: [true, 'Password is required'],
        },
        refreshToken: {
            type: String,
        },
    },
    {
        timestamps: true
    }
);

// 'pre' middleware functions from mongoose are executed one after another, when each middleware calls 'next'
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// creating custom mongoose method 'isPasswordCorect' to compare and check whether the password and its hashed version is same or not using 'bcrypt.compare()'. it takes computational power and time to compare, so using async-await.
userSchema.methods.isPasswordCorect = async function (password) {
    return await bcrypt.compare(password, this.password);
}


// creating custom mongoose method 'generateAccessToken' to generate access token with 'jwt.sign()', in which 1st object/string/array will have payload(data), 2nd parameter is the secret/private-key, and 3rd is the sign options, basically object to set the expiry of the token.
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
            // algorithm: 'none',
            // subject: this.email
        }
    )
}

// creating custom mongoose method 'generateRefreshToken' to generate refresh token with 'jwt.sign()', in which 1st object/string/array will have payload(data), 2nd parameter is the secret/private-key, and 3rd is the sign options, basically object to set the expiry of the token.
userSchema.methods.generateRefreshToken = function () {
    jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model('User', userSchema);