import multer from 'multer';
const isProd = process.env.NODE_ENV === 'production';
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = isProd ? '/tmp' : process.cwd() + '/uploads';
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = file.originalname.split('.').pop(); // Get file extension
    const filename = file.fieldname + '-' + uniqueSuffix + '.' + extension;
    cb(null, filename);
  },
});
