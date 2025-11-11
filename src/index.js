/* SECOND APPROACH (MODULAR) */

import dotenv from 'dotenv';
import connectDB from './db/index.js';
import app from './app.js';

dotenv.config({
  path: './.env',
});

connectDB()
  .then(() => {
    app.on('error', (error) => {
      console.error(`APP ERROR: ${error}`);
    });

    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at PORT: ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error(`MONGODB CONNECTION FAILED!!!: ${err}`);
  });





















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
