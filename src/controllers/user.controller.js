import { asyncHandler } from '../utils/asyncHandler.js';

const registerUser = asyncHandler( async (req, res) => {
    res.status(200).json({
        message: 'ok',
        isRequestSuccess: 'Request successful! The server has responded as required.',
    });
});

export {
    registerUser,
};