import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import conf from './conf/conf.js';

const app = express();

app.use(cors({
    origin: conf.corsOrigin,
    credentials: true,
}));

// for text forms that will come from client in json
app.use(express.json({limit: '16kb'}));

// for urls, use encoder, because we need to tell express that data may come as params from client side
app.use(express.urlencoded({extended: true, limit: '16kb'}));

// its associated with the public folder to keep static assets
app.use(express.static('public'));

// access/set the cookies in the user's browser from my server. basically i can perform CRUD operations in user's browser. because there are some ways by which i can keep secure cookies in the user's browser, so that the server can read or remove those secure cookies.
app.use(cookieParser());



// ================== import routes ==================
import userRouter from './routes/user.routes.js';
import videoRouter from './routes/video.routes.js'
import likeRouter from './routes/like.routes.js';

// ================== routes declaration ==================
app.use('/api/v1/users', userRouter);    // http://localhost:8000/api/v1/users/
app.use('/api/v1/videos', videoRouter);    // http://localhost:8000/api/v1/videos/
app.use('/api/v1/likes', likeRouter);       // http://localhost:8000/api/v1/likes/


// export default app;
export { app }