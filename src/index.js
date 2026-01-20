/* SECOND APPROACH (MODULAR) */

import connectDB from './db/index.js';
import { app } from './app.js';
import conf from './conf/conf.js';

const PORT = conf.port || 8001;

connectDB()
    .then(() => {
        const server = app.listen(PORT, () => {
            console.log(`Server is running at: http://localhost:${PORT}`);
        });

        server.on('error', (err) => {
            console.error('ERROR: ', err);
            process.exit(1);
        });
    })
    .catch((err) => {
        console.error(`MONGODB CONNECTION FAILED!!!!: ${err}`);
        process.exit(1);
    })





















/* FIRST APPROACH WITH IIFE, CALLING AND CONNECTING DB WITH ASYNC-AWAIT AND TRY-CATCH, WITH ERROR HANDLING (NOT MODULAR)
import mongoose from 'mongoose'
import { DB_NAME } from './constants'
import express from 'express'

const app = express();

;( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on('error', (error) => {
            console.log(`ERROR: ${error}`);
            throw error;
        });

        app.listen(process.env.PORT, () => {
            console.log(`App is listening to port: ${process.env.PORT}`);
        })
    }
    catch (error) {
        console.error(`DB CONNECT ERROR: ${error}`);
        throw error;
    }
})()
*/
