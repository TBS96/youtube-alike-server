import { asyncHandler } from "../utils/asyncHandler.js";

const getAllVideos = asyncHandler(async (req, res) => {
    // TODO: get all videos based on query, sort, pagination.
    const { page = 1, limit = 10, query, sortBy = 'createdAt', sortType = 'desc', userId } = req.query;
});

export {
    getAllVideos,
}