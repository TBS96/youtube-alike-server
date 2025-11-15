// promise version start
const asyncHandler = (requestHandlerFn) => {
    (req, res, next) => {
        Promise.resolve(requestHandlerFn(req, res, next))
            .catch((err) => next(err))
    }
};

export default asyncHandler;






/* //try-catch version start
// const asyncHandler = (fn) => {() => {}};
const asyncHandler = (fn) => async (err, req, res, next) => {
    try {
        await fn(req, res, next);
    }
    catch (error) {
        res.status(err.code || 500).json({
            success: false,
            message: err.message
        })
    }
};

export default asyncHandler;
*/ //try-catch version end




// this is a wrapper function that we'll use everywhere.

// 'next' flag is for middlewares, that'll work between req and res. EG: checking whether user is admin or not while trying to login