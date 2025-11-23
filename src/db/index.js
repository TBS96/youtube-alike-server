import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';
import conf from '../conf/conf.js';

const connectDB = async () => {
	try {
		const connectionInstance = await mongoose.connect(`${conf.mongoDBUri}/${DB_NAME}`);
		console.log(`MongoDB connected!! DB HOST: ${connectionInstance.connection.host}`);
		// console.log(`MongoDB URL: ${conf.mongoDBUri}/${DB_NAME}`);
	}
    catch (error) {
		console.error(`MONGODB CONNECTION FAILED: ${error}`);
		// console.log(DB_NAME);
		process.exit(1);
	}
};

export default connectDB;