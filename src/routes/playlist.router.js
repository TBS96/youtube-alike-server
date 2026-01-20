import { Router } from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from '../controllers/playlist.controller.js';

const playlistRouter = Router();

playlistRouter.use(verifyJWT);

playlistRouter.route('/create-playlist').post(createPlaylist);
playlistRouter.route('/add-video-to-playlist/:videoId/:playlistId').patch(addVideoToPlaylist);
playlistRouter.route('/remove-video-from-playlist/:videoId/:playlistId').patch(removeVideoFromPlaylist);
playlistRouter.route('/update-playlist/:playlistId').patch(updatePlaylist);
playlistRouter.route('/delete-playlist/:playlistId').delete(deletePlaylist);
playlistRouter.route('/get-playlist-by-id/:playlistId').get(getPlaylistById);
playlistRouter.route('/get-user-playlists/:userId').get(getUserPlaylists);

export default playlistRouter;