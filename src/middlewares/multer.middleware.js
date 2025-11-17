import multer from 'multer';

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, './public/temp');
	},
	filename: function (req, file, cb) {
		// const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		// cb(null, file.fieldname + '-' + uniqueSuffix);
		cb(null, file.fieldname);
		// cb(null, file.originalname);     // keeping original filename is not the best practice as user might upload several files with same filename
	},
});

export const upload = multer({
    storage,
});